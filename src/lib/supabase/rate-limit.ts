import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { runtimeValue } from "../runtime-config";
import {
  resolveRateLimitProvider,
  type RateLimitProvider,
} from "./rate-limit-policy";

export type SupabaseRateLimitBucket = {
  count: number;
  expiresAt: string;
};

export class SupabaseRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseRateLimitError";
  }
}

export function getRateLimitProvider(): RateLimitProvider {
  return resolveRateLimitProvider(runtimeValue("VELLORA_DATA_PROVIDER"));
}

function serverOnly(): void {
  if (typeof window !== "undefined") {
    throw new SupabaseRateLimitError("O rate limit Supabase s\u00f3 pode ser usado no servidor.");
  }
}

function serviceConfig(): { url: string; key: string } {
  const url = (
    runtimeValue("SUPABASE_URL") || runtimeValue("NEXT_PUBLIC_SUPABASE_URL")
  )?.trim();
  const key = (
    runtimeValue("SUPABASE_SECRET_KEY") || runtimeValue("SUPABASE_SERVICE_ROLE_KEY")
  )?.trim();

  if (!url || !key) {
    throw new SupabaseRateLimitError(
      "Rate limit Supabase exige SUPABASE_URL e uma chave administrativa somente no servidor.",
    );
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("URL inv\u00e1lida");
    }
  } catch {
    throw new SupabaseRateLimitError("SUPABASE_URL deve ser uma URL HTTP(S) v\u00e1lida.");
  }

  return { url, key };
}

function serviceClient(): SupabaseClient {
  serverOnly();
  const { url, key } = serviceConfig();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function assertRpcParameters(bucketKey: string, windowSeconds: number): void {
  if (
    typeof bucketKey !== "string" ||
    bucketKey.length < 1 ||
    bucketKey.length > 200 ||
    /[\u0000-\u001f\u007f]/.test(bucketKey)
  ) {
    throw new SupabaseRateLimitError("A chave do bucket de rate limit n\u00e3o \u00e9 v\u00e1lida.");
  }
  if (!Number.isInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86_400) {
    throw new SupabaseRateLimitError("A janela do rate limit est\u00e1 fora dos limites permitidos.");
  }
}

function operationError(error: unknown): SupabaseRateLimitError {
  const message =
    error && typeof error === "object" && "message" in error && typeof error.message === "string"
      ? error.message
      : "erro desconhecido";
  return new SupabaseRateLimitError(`N\u00e3o foi poss\u00edvel incrementar o bucket Supabase: ${message}`);
}

/**
 * Calls the atomic SECURITY DEFINER RPC. It intentionally never reads and
 * writes the bucket in separate requests, and it never uses a browser client.
 */
export async function incrementSupabaseRateLimitBucket(
  bucketKey: string,
  windowSeconds: number,
): Promise<SupabaseRateLimitBucket> {
  assertRpcParameters(bucketKey, windowSeconds);

  const { data, error } = await serviceClient().rpc("increment_rate_limit_bucket", {
    p_bucket_key: bucketKey,
    p_window_seconds: windowSeconds,
  });
  if (error) throw operationError(error);

  const row = (Array.isArray(data) ? data[0] : data) as
    | { count?: unknown; expires_at?: unknown }
    | null
    | undefined;
  const count = Number(row?.count);
  if (!Number.isSafeInteger(count) || count < 1 || typeof row?.expires_at !== "string") {
    throw new SupabaseRateLimitError("A RPC de rate limit retornou um bucket inv\u00e1lido.");
  }
  if (!Number.isFinite(Date.parse(row.expires_at))) {
    throw new SupabaseRateLimitError("A RPC de rate limit retornou uma expira\u00e7\u00e3o inv\u00e1lida.");
  }

  return { count, expiresAt: row.expires_at };
}
