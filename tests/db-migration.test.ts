import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260827142537_db_01_supabase_foundation.sql",
);
const sql = readFileSync(migrationPath, "utf8");
const normalized = sql.replace(/\s+/g, " ").trim().toLowerCase();

describe("DB-01 Supabase foundation migration", () => {
  it("is transactional and creates the three required tables", () => {
    expect(normalized).toMatch(/^begin;/);
    expect(normalized).toMatch(/commit;$/);

    for (const table of ["profiles", "patients", "caregiver_assignments"]) {
      expect(normalized).toContain(`create table public.${table}`);
    }

    expect(normalized).toContain(
      "id uuid primary key references auth.users(id) on delete cascade",
    );
    expect(normalized).toContain(
      "unique (patient_id, caregiver_user_id, start_date)",
    );
    expect(normalized).toContain(
      "check (end_date is null or end_date >= start_date)",
    );
  });

  it("enables RLS and replaces default table privileges with explicit grants", () => {
    for (const table of ["profiles", "patients", "caregiver_assignments"]) {
      expect(normalized).toContain(
        `revoke all on table public.${table} from public, anon, authenticated`,
      );
      expect(normalized).toContain(
        `grant select, insert, update, delete on table public.${table} to authenticated`,
      );
      expect(normalized).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  it("defines private helpers with constrained execution privileges", () => {
    expect(normalized).toContain("create schema if not exists private");

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

    expect(normalized).not.toContain("user_metadata");
    expect(normalized).not.toMatch(
      /create(?:\s+or\s+replace)?\s+function\s+public\.[^(]+\([^)]*\)[\s\S]*?security\s+definer/,
    );

    const securityDefinerFunctions = [
      "current_role",
      "current_active",
      "is_patient_family",
      "is_active_caregiver",
    ];
    for (const helper of securityDefinerFunctions) {
      expect(normalized).toMatch(
        new RegExp(
          `create or replace function private\\.${helper}\\([^)]*\\)[\\s\\S]*?security definer[\\s\\S]*?set search_path = pg_catalog`,
        ),
      );
    }
  });

  it("evaluates active caregiver assignment dates explicitly in UTC", () => {
    const helper = normalized.match(
      /create or replace function private\.is_active_caregiver\(target_patient_id uuid\)[\s\S]*?\$\$;/,
    )?.[0];

    expect(helper).toBeDefined();
    expect(helper).toContain(
      "ca.start_date <= (now() at time zone 'utc')::date",
    );
    expect(helper).toContain(
      "ca.end_date >= (now() at time zone 'utc')::date",
    );
    expect(helper).not.toMatch(/\bcurrent_date\b/);
  });

  it("requires matching roles for family and caregiver relationships", () => {
    const familyHelper = normalized.match(
      /create or replace function private\.is_patient_family\(target_patient_id uuid\)[\s\S]*?\$\$;/,
    )?.[0];
    const caregiverHelper = normalized.match(
      /create or replace function private\.is_active_caregiver\(target_patient_id uuid\)[\s\S]*?\$\$;/,
    )?.[0];
    const assignmentSelectPolicy = normalized.match(
      /create policy assignments_select_authorized[\s\S]*?\);/,
    )?.[0];

    expect(familyHelper).toBeDefined();
    expect(familyHelper).toContain("private.current_active()");
    expect(familyHelper).toContain("private.current_role() = 'familia'");

    expect(caregiverHelper).toBeDefined();
    expect(caregiverHelper).toContain("private.current_active()");
    expect(caregiverHelper).toContain("private.current_role() = 'cuidador'");

    expect(assignmentSelectPolicy).toBeDefined();
    expect(assignmentSelectPolicy).toMatch(
      /caregiver_user_id = auth\.uid\(\)[\s\S]*?private\.current_active\(\)[\s\S]*?private\.current_role\(\) = 'cuidador'/,
    );
  });

  it("creates the required read and mutation policies", () => {
    for (const policy of [
      "profiles_select_self_or_admin",
      "profiles_insert_admin",
      "profiles_update_admin",
      "profiles_update_self",
      "profiles_delete_admin",
      "patients_select_authorized",
      "patients_insert_admin",
      "patients_update_admin",
      "patients_delete_admin",
      "assignments_select_authorized",
      "assignments_insert_admin",
      "assignments_update_admin",
      "assignments_delete_admin",
    ]) {
      expect(normalized).toContain(`create policy ${policy}`);
    }

    expect(normalized).toContain("id = auth.uid() or private.is_admin()");
    expect(normalized).toContain("or private.is_patient_family(id)");
    expect(normalized).toContain("or private.is_active_caregiver(id)");
    expect(normalized).toContain("or private.is_patient_family(patient_id)");
  });

  it("gives every UPDATE policy both USING and WITH CHECK clauses", () => {
    const updatePolicies = normalized.match(
      /create policy [a-z0-9_]+ on public\.[a-z0-9_]+ for update to authenticated using \([\s\S]*?\) with check \([\s\S]*?\);/g,
    );

    expect(updatePolicies).toHaveLength(4);
    for (const policy of updatePolicies ?? []) {
      expect(policy).toContain(" using (");
      expect(policy).toContain(" with check (");
    }

    expect(normalized).toMatch(
      /create policy profiles_update_self[\s\S]*?with check \([\s\S]*?role = private\.current_role\(\)[\s\S]*?active = true[\s\S]*?\);/,
    );
  });

  it("does not bootstrap production identities or touch unrelated legacy objects", () => {
    expect(normalized).not.toMatch(/insert\s+into/);
    expect(normalized).not.toContain("public.rls_auto_enable");
    expect(normalized).not.toMatch(/\b(daily_records|contract_documents|leads)\b/);
  });
});
