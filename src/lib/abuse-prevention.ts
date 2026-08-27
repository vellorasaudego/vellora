import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { query, queryOne } from "./db";
import { runtimeValue } from "./runtime-config";
import { incrementSupabaseRateLimitBucket } from "./supabase/rate-limit";
import {
  resolveRateLimitProvider,
  resolveTurnstileRequired,
} from "./supabase/rate-limit-policy";

type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

type MemoryBucket = { count: number; resetAt: number };

const memoryBuckets = new Map<string, MemoryBucket>();
const MAX_MEMORY_BUCKETS = 5_000;

const MAX_RATE_LIMIT_SCOPE_LENGTH = 80;
const MAX_RATE_LIMIT_LIMIT = 10_000;
const MAX_RATE_LIMIT_WINDOW_SECONDS = 86_400;

export function getClientAddress(request: Pick<Request, "headers">): string {
  const headers = request.headers;
  const direct = headers.get("cf-connecting-ip") || headers.get("x-real-ip");
  if (direct?.trim()) return direct.trim();

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return "unknown";
}

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function memoryRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const current = memoryBuckets.get(key);
  const resetAt = current && current.resetAt > now ? current.resetAt : now + options.windowSeconds * 1000;
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt };
  bucket.count += 1;
  memoryBuckets.set(key, bucket);

  if (memoryBuckets.size > MAX_MEMORY_BUCKETS) {
    for (const [bucketKey, value] of memoryBuckets) {
      if (value.resetAt <= now) memoryBuckets.delete(bucketKey);
      if (memoryBuckets.size <= MAX_MEMORY_BUCKETS) break;
    }
  }

  return {
    allowed: bucket.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function assertRateLimitOptions(scope: string, options: RateLimitOptions): string {
  const normalizedScope = scope.trim();
  if (
    !normalizedScope ||
    normalizedScope.length > MAX_RATE_LIMIT_SCOPE_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(normalizedScope)
  ) {
    throw new Error("O escopo do rate limit n\u00e3o \u00e9 v\u00e1lido.");
  }
  if (
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > MAX_RATE_LIMIT_LIMIT
  ) {
    throw new Error("O limite do rate limit n\u00e3o \u00e9 v\u00e1lido.");
  }
  if (
    !Number.isInteger(options.windowSeconds) ||
    options.windowSeconds < 1 ||
    options.windowSeconds > MAX_RATE_LIMIT_WINDOW_SECONDS
  ) {
    throw new Error("A janela do rate limit n\u00e3o \u00e9 v\u00e1lida.");
  }
  return normalizedScope;
}

function failClosedRateLimit(options: RateLimitOptions, retryAfterSeconds: number): RateLimitResult {
  return {
    allowed: false,
    limit: options.limit,
    remaining: 0,
    retryAfterSeconds: Math.max(1, retryAfterSeconds),
  };
}

/**
 * Uses D1 when available and falls back to a bounded process-local bucket while
 * a migration is being rolled out. The database key contains only a hash of the
 * client address, avoiding storage of a raw IP address.
 */
export async function consumeRateLimit(
  request: NextRequest,
  scope: string,
  options: RateLimitOptions,
  discriminator = ""
): Promise<RateLimitResult> {
  const normalizedScope = assertRateLimitOptions(scope, options);
  const windowIndex = Math.floor(Date.now() / (options.windowSeconds * 1000));
  const identity = `${getClientAddress(request)}\u0000${discriminator}`;
  const bucketKey = `${normalizedScope}:${hashKey(identity)}:${windowIndex}`;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowIndex * options.windowSeconds * 1000 + options.windowSeconds * 1000 - Date.now()) / 1000)
  );

  if (resolveRateLimitProvider(runtimeValue("VELLORA_DATA_PROVIDER")) === "supabase") {
    try {
      const bucket = await incrementSupabaseRateLimitBucket(bucketKey, options.windowSeconds);
      const databaseRetryAfter = Math.max(
        1,
        Math.ceil((Date.parse(bucket.expiresAt) - Date.now()) / 1000),
      );
      return {
        allowed: bucket.count <= options.limit,
        limit: options.limit,
        remaining: Math.max(0, options.limit - bucket.count),
        retryAfterSeconds: databaseRetryAfter,
      };
    } catch (error) {
      // A Supabase production deployment must never silently downgrade its
      // distributed limit to a process-local map. Returning allowed=false
      // makes every caller reject the request while preserving Retry-After.
      console.error("[rate-limit] Supabase indispon\u00edvel; bloqueando a solicita\u00e7\u00e3o.", {
        scope: normalizedScope,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
      return failClosedRateLimit(options, retryAfterSeconds);
    }
  }

  try {
    const row = await queryOne<{ count: number }>(
      `INSERT INTO rate_limit_buckets (bucket_key, count, expires_at)
       VALUES ($1, 1, datetime('now', '+' || $2 || ' seconds'))
       ON CONFLICT(bucket_key) DO UPDATE SET count = rate_limit_buckets.count + 1
       RETURNING count`,
      [bucketKey, options.windowSeconds]
    );
    const count = Number(row?.count || 1);

    if (windowIndex % 16 === 0) {
      await query("DELETE FROM rate_limit_buckets WHERE expires_at <= CURRENT_TIMESTAMP").catch(() => undefined);
    }

    return {
      allowed: count <= options.limit,
      limit: options.limit,
      remaining: Math.max(0, options.limit - count),
      retryAfterSeconds,
    };
  } catch (error) {
    console.warn("[rate-limit] D1 indisponível; usando proteção local temporária.", {
      scope,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return memoryRateLimit(bucketKey, options);
  }
}

export function isSameOriginRequest(request: Pick<Request, "headers" | "url">): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function turnstileSiteKey(): string {
  return runtimeValue("NEXT_PUBLIC_TURNSTILE_SITE_KEY")?.trim() || "";
}

export function isTurnstileRequired(): boolean {
  return resolveTurnstileRequired(
    runtimeValue("VELLORA_DATA_PROVIDER"),
    runtimeValue("VELLORA_TURNSTILE_REQUIRED"),
  );
}

export async function verifyTurnstileToken(
  request: NextRequest,
  token: unknown
): Promise<{ ok: boolean; configured: boolean; required: boolean }> {
  const secret = runtimeValue("CLOUDFLARE_TURNSTILE_SECRET_KEY")?.trim();
  const siteKey = turnstileSiteKey();
  const required = isTurnstileRequired();
  const partiallyConfigured = Boolean(secret || siteKey);
  if (!secret || !siteKey) {
    return {
      ok: !required && !partiallyConfigured,
      configured: false,
      required,
    };
  }
  if (typeof token !== "string" || token.length < 10 || token.length > 2_048) {
    return { ok: false, configured: true, required };
  }

  const body = new URLSearchParams({ secret, response: token });
  const address = getClientAddress(request);
  if (address !== "unknown") body.set("remoteip", address);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) return { ok: false, configured: true, required };
    const result = (await response.json()) as { success?: boolean };
    return { ok: result.success === true, configured: true, required };
  } catch (error) {
    console.error("[turnstile] Não foi possível validar o desafio.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return { ok: false, configured: true, required };
  }
}
