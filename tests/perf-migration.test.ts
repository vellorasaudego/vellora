import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260827164147_perf_01_rls.sql",
);
const sql = readFileSync(migrationPath, "utf8");
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

describe("PERF-01 RLS performance migration", () => {
  it("is transactional and adds the assigned_by foreign-key index", () => {
    expect(normalized).toMatch(/^begin;/);
    expect(normalized).toMatch(/commit;$/);
    expect(normalized).toContain(
      "create index if not exists caregiver_assignments_assigned_by_idx on public.caregiver_assignments (assigned_by)",
    );
    expect(normalized).not.toMatch(/drop\s+index/);
  });

  it("keeps RLS enabled and does not broaden table grants", () => {
    for (const table of [
      "profiles",
      "patients",
      "caregiver_assignments",
      "rate_limit_buckets",
    ]) {
      expect(normalized).toContain(
        `alter table public.${table} enable row level security`,
      );
    }

    expect(normalized).not.toMatch(
      /grant\s+[^;]*\s+to\s+(public|anon)(?:\s|,|;)/,
    );
    expect(normalized).not.toMatch(
      /security definer[\s\S]*create\s+or\s+replace\s+function\s+public\./,
    );
  });

  it("makes the service-only rate-limit intent explicit without client grants", () => {
    expect(normalized).toContain(
      "drop policy if exists rate_limit_buckets_deny_authenticated on public.rate_limit_buckets",
    );
    expect(normalized).toContain(
      "create policy rate_limit_buckets_deny_authenticated on public.rate_limit_buckets for all to authenticated using (false) with check (false)",
    );
    expect(normalized).not.toMatch(
      /create policy rate_limit_buckets_deny_authenticated[\s\S]*to anon/,
    );
    expect(normalized).not.toMatch(
      /create policy[\s\S]*\bto\s+anon\b/,
    );
    expect(normalized).not.toMatch(
      /grant\s+[^;]*on table public\.rate_limit_buckets/,
    );
    expect(normalized).not.toMatch(
      /(?:grant|revoke)[^;]*on table public\.rate_limit_buckets[^;]*\b(?:anon|authenticated)\b/,
    );
    expect(normalized).not.toMatch(
      /(?:grant|revoke)[^;]*on table public\.rate_limit_buckets[^;]*service_role/,
    );
  });

  it("consolidates profiles UPDATE policies without changing authorization", () => {
    expect(normalized).toContain(
      "drop policy if exists profiles_update_admin on public.profiles",
    );
    expect(normalized).toContain(
      "drop policy if exists profiles_update_self on public.profiles",
    );
    expect(normalized).toContain(
      "create policy profiles_update_admin_or_self on public.profiles for update to authenticated",
    );
    expect(normalized).not.toContain("create policy profiles_update_admin ");
    expect(normalized).not.toContain("create policy profiles_update_self ");

    const updatePolicy = normalized.match(
      /create policy profiles_update_admin_or_self[\s\S]*?\);/,
    )?.[0];

    expect(updatePolicy).toBeDefined();
    expect(updatePolicy).toContain("using (");
    expect(updatePolicy).toContain("with check (");
    expect(updatePolicy).toMatch(
      /using \([\s\S]*?\(select private\.is_admin\(\)\)[\s\S]*?id = \(select auth\.uid\(\)\)[\s\S]*?\(select private\.current_active\(\)\)/,
    );
    expect(updatePolicy).toMatch(
      /with check \([\s\S]*?\(select private\.is_admin\(\)\)[\s\S]*?id = \(select auth\.uid\(\)\)[\s\S]*?role = \(select private\.current_role\(\)\)[\s\S]*?active = true/,
    );
  });

  it("wraps auth-dependent calls in helpers and policies", () => {
    const authUidCalls = [...normalized.matchAll(/auth\.uid\(\)/g)].map(
      (match) => normalized.slice(Math.max(0, (match.index ?? 0) - 20), (match.index ?? 0) + 12),
    );

    expect(authUidCalls.length).toBeGreaterThanOrEqual(6);
    expect(authUidCalls.every((context) => /select\s+auth\.uid\(\)/.test(context))).toBe(
      true,
    );
    expect(normalized).not.toMatch(/(?<!select\s)auth\.uid\(\)/);

    for (const helper of [
      "current_role",
      "current_active",
      "is_patient_family",
      "is_active_caregiver",
    ]) {
      const helperBody = normalized.match(
        new RegExp(
          `create or replace function private\\.${helper}\\([\\s\\S]*?as \\\$\\$[\\s\\S]*?\\$\\$;`,
        ),
      )?.[0];

      expect(helperBody).toBeDefined();
      expect(helperBody).toContain("(select auth.uid())");
      expect(helperBody).toContain("security definer");
      expect(helperBody).toContain("set search_path = pg_catalog");
    }

    expect(normalized).toContain(
      "create or replace function private.is_admin()",
    );
    const adminHelper = normalized.match(
      /create or replace function private\.is_admin\(\)[\s\S]*?as \$\$[\s\S]*?\$\$;/,
    )?.[0];

    expect(adminHelper).toBeDefined();
    expect(adminHelper).toContain("set search_path = pg_catalog");
    expect(adminHelper).not.toContain("security definer");
  });

  it("retains both USING and WITH CHECK for every UPDATE policy", () => {
    const updateStatements = [
      "profiles_update_admin_or_self",
      "patients_update_admin",
      "assignments_update_admin",
    ].map((policy) =>
      normalized.match(
        new RegExp(`(?:create|alter) policy ${policy}[\\s\\S]*?;`),
      )?.[0],
    );

    expect(updateStatements).toHaveLength(3);
    for (const statement of updateStatements) {
      expect(statement).toBeDefined();
      expect(statement).toContain("using (");
      expect(statement).toContain("with check (");
    }
  });

  it("does not remove DB-01 objects or introduce unsafe authorization patterns", () => {
    expect(normalized).not.toMatch(/drop\s+(table|function|schema)/);
    expect(normalized).not.toContain("user_metadata");
    expect(normalized).not.toContain("public.rls_auto_enable");
    expect(normalized).not.toMatch(/insert\s+into/);

    for (const helper of [
      "current_role()",
      "current_active()",
      "is_admin()",
      "is_patient_family(uuid)",
      "is_active_caregiver(uuid)",
    ]) {
      expect(normalized).toContain(
        `revoke execute on function private.${helper} from public, anon`,
      );
      expect(normalized).toContain(
        `grant execute on function private.${helper} to authenticated`,
      );
    }
  });
});
