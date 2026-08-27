import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveRateLimitProvider,
  resolveTurnstileRequired,
} from "../src/lib/supabase/rate-limit-policy";

function readProjectFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
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
    const consumers = [
      "src/lib/public-lead-request.ts",
      "src/app/api/professionals/route.ts",
      "src/app/api/auth/login/route.ts",
      "src/app/api/auth/forgot-password/route.ts",
      "src/app/api/auth/reset-password/route.ts",
      "src/app/api/records/route.ts",
    ];

    for (const consumer of consumers) {
      const source = readProjectFile(consumer);
      expect(source, consumer).toMatch(/status:\s*429[\s\S]{0,300}Retry-After/);
    }
  });
});
