import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveRateLimitProvider,
  resolveTurnstileRequired,
} from "../src/lib/supabase/rate-limit-policy";

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8").replaceAll("\r\n", "\n");
}

const abuseSource = readProjectFile("src/lib/abuse-prevention.ts");
const rateLimitSource = readProjectFile("src/lib/supabase/rate-limit.ts");
const migration = readProjectFile(
  "supabase/migrations/20260827173533_sec_02_rate_limit.sql",
);
const normalizedMigration = migration
  .replace(/--[^\r\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const rateLimitConsumers = [
  "src/lib/public-lead-request.ts",
  "src/app/api/professionals/route.ts",
  "src/app/api/auth/login/route.ts",
  "src/app/api/auth/forgot-password/route.ts",
  "src/app/api/auth/reset-password/route.ts",
  "src/app/api/records/route.ts",
];

const genericUnavailableMessage =
  "O serviço está temporariamente indisponível. Tente novamente em alguns instantes.";

function rateDecisionSection(source: string): string {
  const start = source.indexOf("const rate = await consumeRateLimit");
  const end = source.indexOf("\n\n", start);
  if (start < 0 || end < 0) throw new Error("Bloco de decisão do rate limit não encontrado.");
  return source.slice(start, end);
}

function sectionBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) throw new Error(`Seção não encontrada: ${start}`);
  return source.slice(startIndex, endIndex);
}

describe("SEC-02 provider e política", () => {
  it("só habilita o backend Supabase com a seleção explícita", () => {
    expect(resolveRateLimitProvider(undefined)).toBe("legacy");
    expect(resolveRateLimitProvider("legacy")).toBe("legacy");
    expect(resolveRateLimitProvider(" supabase ")).toBe("supabase");
    expect(resolveRateLimitProvider("unknown")).toBe("legacy");
  });

  it("exige Turnstile no provider Supabase e aceita opt-in no legado", () => {
    expect(resolveTurnstileRequired("legacy", undefined)).toBe(false);
    expect(resolveTurnstileRequired("legacy", "true")).toBe(true);
    expect(resolveTurnstileRequired("supabase", undefined)).toBe(true);
    expect(resolveTurnstileRequired("supabase", "false")).toBe(true);
  });

  it("não usa o fallback em memória no caminho Supabase", () => {
    expect(abuseSource).toContain("incrementSupabaseRateLimitBucket");
    expect(abuseSource).toContain("return failClosedRateLimit(options, retryAfterSeconds)");
    expect(abuseSource).toContain("resolveRateLimitProvider(runtimeValue(\"VELLORA_DATA_PROVIDER\"))");
    const supabaseBranchStart = abuseSource.indexOf(
      'if (resolveRateLimitProvider(runtimeValue("VELLORA_DATA_PROVIDER")) === "supabase")',
    );
    const legacyBranchStart = abuseSource.indexOf("\n  try {", supabaseBranchStart);
    expect(supabaseBranchStart).toBeGreaterThanOrEqual(0);
    expect(legacyBranchStart).toBeGreaterThan(supabaseBranchStart);
    expect(abuseSource.slice(supabaseBranchStart, legacyBranchStart)).not.toContain(
      "memoryRateLimit(",
    );
  });

  it("mantém o contrato reason nos caminhos permitido, limite excedido e provider indisponível", () => {
    const memoryPath = sectionBetween(abuseSource, "function memoryRateLimit", "function assertRateLimitOptions");
    const supabaseSuccessPath = sectionBetween(abuseSource, "const databaseRetryAfter", "    } catch (error)");
    const failClosedPath = sectionBetween(abuseSource, "function failClosedRateLimit", "function safeOperation");

    expect(abuseSource).toContain(
      'reason: "allowed" | "limit_exceeded" | "provider_unavailable"',
    );
    expect(memoryPath).toContain('reason: bucket.count <= options.limit ? "allowed" : "limit_exceeded"');
    expect(supabaseSuccessPath).toContain('reason: bucket.count <= options.limit ? "allowed" : "limit_exceeded"');
    expect(failClosedPath).toContain("allowed: false");
    expect(failClosedPath).toContain('reason: "provider_unavailable"');
  });
});

describe("SEC-02 RPC atômica e privilégios", () => {
  it("é idempotente, limita parâmetros e faz upsert atômico", () => {
    expect(normalizedMigration).toContain(
      "create or replace function public.increment_rate_limit_bucket(",
    );
    expect(normalizedMigration).toContain("security definer");
    expect(normalizedMigration).toContain("set search_path = pg_catalog");
    expect(normalizedMigration).toContain("insert into public.rate_limit_buckets as buckets");
    expect(normalizedMigration).toContain("on conflict (bucket_key) do update");
    expect(normalizedMigration).toContain("set count = buckets.count + 1");
    expect(normalizedMigration).toContain("p_window_seconds > 86400");
    expect(normalizedMigration).toContain("length(p_bucket_key) > 200");
    expect(normalizedMigration).not.toContain("select count(*)");
    expect(normalizedMigration).not.toContain("user_metadata");
    expect(normalizedMigration).not.toContain("auth.jwt");
  });

  it("restringe EXECUTE ao service_role e não altera tabelas gerenciadas", () => {
    expect(normalizedMigration).toContain(
      "revoke execute on function public.increment_rate_limit_bucket(text, integer) from public, anon, authenticated, service_role",
    );
    expect(normalizedMigration).toContain(
      "grant execute on function public.increment_rate_limit_bucket(text, integer) to service_role",
    );
    expect(normalizedMigration).not.toMatch(
      /grant execute on function public\.increment_rate_limit_bucket\(text, integer\) to (?:public|anon|authenticated)/,
    );
    expect(normalizedMigration).not.toContain("alter table auth.");
    expect(normalizedMigration).not.toContain("alter table storage.");
    expect(normalizedMigration).not.toContain("create table");
  });
});

describe("SEC-02 fronteira server-side e respostas", () => {
  it("não expõe chave administrativa em cliente/browser", () => {
    expect(rateLimitSource).toContain("if (typeof window !== \"undefined\")");
    expect(rateLimitSource).not.toContain("createBrowserClient");
    expect(rateLimitSource).not.toMatch(/NEXT_PUBLIC_SUPABASE_(?:SECRET|SERVICE_ROLE)/i);
    expect(readProjectFile("src/lib/supabase/client.ts")).not.toMatch(
      /SUPABASE_(?:SERVICE_ROLE|SECRET)[_-]?KEY/i,
    );
    expect(abuseSource).toContain("CLOUDFLARE_TURNSTILE_SECRET_KEY");
  });

  it("mantém Retry-After em todos os consumidores do rate limit", () => {
    for (const consumer of rateLimitConsumers) {
      const source = readProjectFile(consumer);
      expect(source, consumer).toMatch(/status:\s*429[\s\S]{0,300}Retry-After/);
    }
  });

  it("trata provider_unavailable como 503 genérico e reserva 429 ao limite real", () => {
    for (const consumer of rateLimitConsumers) {
      const source = readProjectFile(consumer);
      const decision = rateDecisionSection(source);
      const unavailableStart = decision.indexOf('if (rate.reason === "provider_unavailable")');
      const exceededStart = decision.indexOf("if (!rate.allowed)");
      expect(unavailableStart, consumer).toBeGreaterThanOrEqual(0);
      expect(exceededStart, consumer).toBeGreaterThan(unavailableStart);

      const unavailableBranch = decision.slice(unavailableStart, exceededStart);
      const exceededBranch = decision.slice(exceededStart);

      const usesRecordResponseHelper = consumer === "src/app/api/records/route.ts";
      if (usesRecordResponseHelper) {
        expect(unavailableBranch, consumer).toContain("rateLimitUnavailableResponse()");
        expect(source, consumer).toContain(genericUnavailableMessage);
        expect(source, consumer).toContain("{ status: 503 }");
      } else {
        expect(unavailableBranch, consumer).toContain(genericUnavailableMessage);
        expect(unavailableBranch, consumer).toContain("status: 503");
      }
      expect(unavailableBranch, consumer).not.toContain("status: 429");
      expect(unavailableBranch, consumer).not.toContain("Retry-After");
      expect(unavailableBranch, consumer).not.toContain("error.message");
      expect(unavailableBranch, consumer).not.toContain("sanitizedTechnicalReason");

      if (usesRecordResponseHelper) {
        expect(exceededBranch, consumer).toContain("rateLimitedResponse(rate.retryAfterSeconds)");
        expect(source, consumer).toContain("status: 429");
      } else {
        expect(exceededBranch, consumer).toContain("status: 429");
      }
      if (usesRecordResponseHelper) {
        expect(source, consumer).toContain("Retry-After");
      } else {
        expect(exceededBranch, consumer).toContain("Retry-After");
      }
      expect(exceededBranch, consumer).toContain("rate.retryAfterSeconds");
    }
  });

  it("emite nos logs somente operação, motivo técnico sanitizado e correlação validada", () => {
    const providerLog = sectionBetween(
      abuseSource,
      'console.error("[rate-limit] Provider',
      "return failClosedRateLimit",
    );
    const legacyFallbackLog = sectionBetween(
      abuseSource,
      'console.warn("[rate-limit] D1 indisponível; usando proteção local temporária."',
      "return memoryRateLimit",
    );

    for (const log of [providerLog, legacyFallbackLog]) {
      expect(log).toContain("operation:");
      expect(log).toContain("reason: sanitizedTechnicalReason(error)");
      expect(log).not.toContain("scope:");
      expect(log).not.toContain("getClientAddress");
      expect(log).not.toContain("patient_id");
      expect(log).not.toContain("form");
      expect(log).not.toContain("error.message");
    }
    expect(providerLog).toContain("operation: safeOperation(normalizedScope)");
    expect(legacyFallbackLog).toContain("operation: safeOperation(scope)");
    expect(providerLog).toContain("correlationId");
    expect(legacyFallbackLog).toContain("correlationId");
  });
});
