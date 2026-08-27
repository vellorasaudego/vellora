import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260827163652_db_02_domain.sql",
);
const sql = readFileSync(migrationPath, "utf8");
const executableSql = sql
  .replace(/--[^\r\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const normalized = executableSql.replace(/\s+/g, " ").trim().toLowerCase();

const tables = [
  "leads",
  "professional_applications",
  "caregiver_profiles",
  "daily_records",
  "daily_record_audit_events",
  "rate_limit_buckets",
  "contract_documents",
] as const;

describe("DB-02 Supabase domain migration", () => {
  it("is transactional and creates only the seven requested domain tables", () => {
    expect(normalized).toMatch(/^begin;/);
    expect(normalized).toMatch(/commit;$/);

    const createdTables = [...normalized.matchAll(/create table public\.([a-z0-9_]+)/g)].map(
      (match) => match[1],
    );
    expect(createdTables).toHaveLength(tables.length);
    expect(createdTables).toEqual(expect.arrayContaining([...tables]));

    for (const table of tables) {
      expect(normalized).toContain(`create table public.${table}`);
    }

    expect(normalized).toContain("id uuid primary key default gen_random_uuid()");
    expect(normalized).toContain("references public.profiles(id)");
    expect(normalized).toContain("references public.patients(id)");
    expect(normalized).toContain("references public.daily_records(id)");
    expect(normalized).toContain("references public.professional_applications(id)");
    expect(normalized).toContain("num_nonnulls(family_user_id, caregiver_profile_id, caregiver_user_id) = 1");
  });

  it("uses Postgres-native domain types and Storage keys instead of base64 photos", () => {
    expect(normalized).toContain("availability_days text[] not null default '{}'::text[]");
    expect(normalized).toContain("availability_shifts text[] not null default '{}'::text[]");
    expect(normalized).toContain("lgpd_consent boolean not null default false");
    expect(normalized).toContain("record_date date not null");
    expect(normalized).toContain("record_time time without time zone");
    expect(normalized).toContain("incident boolean not null default false");
    expect(normalized).toContain("changed_fields text[] not null default '{}'::text[]");
    expect(normalized).toContain("before_data jsonb");
    expect(normalized).toContain("after_data jsonb");
    expect(normalized).toContain("photo_storage_key text");
    expect(normalized).toContain("storage_key text not null");
    expect(normalized).not.toContain("photo_data");
    expect(normalized).toContain("photo_storage_key !~ '^data:[^;]+;base64,'");
    expect(normalized).toContain("storage_key !~ '^data:[^;]+;base64,'");
  });

  it("adds foreign-key indexes and explicit business constraints", () => {
    for (const indexName of [
      "professional_applications_reviewed_by_idx",
      "daily_records_patient_date_idx",
      "daily_records_caregiver_date_idx",
      "daily_record_audit_record_created_at_idx",
      "daily_record_audit_patient_created_at_idx",
      "daily_record_audit_actor_idx",
      "contract_documents_family_created_at_idx",
      "contract_documents_profile_created_at_idx",
      "contract_documents_caregiver_created_at_idx",
      "contract_documents_uploaded_by_idx",
    ]) {
      expect(normalized).toContain(`create index ${indexName}`);
    }

    expect(normalized).toContain("constraint professional_applications_lgpd_consent_check");
    expect(normalized).toContain("constraint daily_records_incident_description_check");
    expect(normalized).toContain("constraint contract_documents_file_size_check check (file_size > 0)");
    expect(normalized).toContain("constraint contract_documents_single_owner check");
    expect(normalized).toContain("constraint caregiver_profiles_application_unique unique (application_id)");
    expect(normalized).toContain("constraint caregiver_profiles_user_unique unique (user_id)");
  });

  it("makes daily-record patient and caregiver links immutable for non-admin users", () => {
    const guardFunction = normalized.match(
      /create or replace function private\.prevent_daily_record_links_update\(\)[\s\S]*?\$\$;/,
    )?.[0];

    expect(guardFunction).toBeDefined();
    expect(guardFunction).toContain("returns trigger");
    expect(guardFunction).toContain("security invoker");
    expect(guardFunction).toContain("set search_path = pg_catalog");
    expect(guardFunction).toContain("private.is_admin()");
    expect(guardFunction).toContain("current_user not in ('postgres', 'service_role')");
    expect(guardFunction).toContain("new.patient_id is distinct from old.patient_id");
    expect(guardFunction).toContain(
      "new.caregiver_user_id is distinct from old.caregiver_user_id",
    );
    expect(guardFunction).toContain("raise exception");
    expect(guardFunction).not.toContain("from public.daily_records");

    expect(normalized).toContain(
      "create trigger daily_records_immutable_links_before_update before update on public.daily_records for each row execute function private.prevent_daily_record_links_update()",
    );
    expect(normalized).toContain(
      "revoke execute on function private.prevent_daily_record_links_update() from public, anon, authenticated, service_role",
    );
  });

  it("enables RLS and grants only backend/authenticated capabilities", () => {
    for (const table of tables) {
      expect(normalized).toContain(
        `revoke all on table public.${table} from public, anon, authenticated, service_role`,
      );
      expect(normalized).toContain(`alter table public.${table} enable row level security`);
    }

    for (const table of [
      "leads",
      "professional_applications",
      "caregiver_profiles",
      "daily_records",
      "contract_documents",
    ]) {
      expect(normalized).toContain(
        `grant select, insert, update, delete on table public.${table} to authenticated, service_role`,
      );
    }

    expect(normalized).toContain(
      "grant select, insert on table public.daily_record_audit_events to service_role",
    );
    expect(normalized).toContain(
      "grant select, insert, update, delete on table public.rate_limit_buckets to service_role",
    );
    expect(normalized).not.toMatch(
      /grant\s+[^;]+\s+on\s+table\s+public\.rate_limit_buckets\s+to\s+(?:anon|authenticated)/,
    );
    expect(normalized).not.toMatch(
      /grant\s+[^;]+\s+on\s+table\s+public\.[a-z0-9_]+\s+to\s+anon/,
    );
  });

  it("restricts public submissions, reads, mutations, audit, and contracts by role/assignment", () => {
    for (const policy of [
      "leads_admin_all",
      "professional_applications_admin_all",
      "caregiver_profiles_select_admin_or_self",
      "caregiver_profiles_insert_admin",
      "caregiver_profiles_update_admin",
      "caregiver_profiles_delete_admin",
      "daily_records_select_authorized",
      "daily_records_insert_authorized",
      "daily_records_update_authorized",
      "daily_records_delete_admin",
      "daily_record_audit_select_authorized",
      "contract_documents_select_authorized",
      "contract_documents_insert_admin",
      "contract_documents_update_admin",
      "contract_documents_delete_admin",
    ]) {
      expect(normalized).toContain(`create policy ${policy}`);
    }

    expect(normalized).toContain("private.is_admin()");
    expect(normalized).toContain("private.is_patient_family(patient_id)");
    expect(normalized).toContain("private.is_active_caregiver(patient_id)");
    expect(normalized).toContain("caregiver_user_id = (select auth.uid())");
    expect(normalized).toContain("family_user_id = (select auth.uid())");
    expect(normalized).toContain("private.current_role() = 'familia'");
    expect(normalized).toContain("private.current_role() = 'cuidador'");
    expect(normalized).toContain("cp.user_id = (select auth.uid())");

    const updatePolicies = normalized.match(
      /create policy [a-z0-9_]+ on public\.[a-z0-9_]+ for update to authenticated[\s\S]*?;/g,
    );
    expect(updatePolicies).toHaveLength(3);
    for (const policy of updatePolicies ?? []) {
      expect(policy).toContain(" using (");
      expect(policy).toContain(" with check (");
    }
  });

  it("does not expose user metadata/service role or touch DB-01/unrelated objects", () => {
    expect(normalized).not.toContain("user_metadata");
    expect(normalized).not.toContain("next_public");
    expect(normalized).not.toContain("public.rls_auto_enable");
    expect(normalized).not.toMatch(
      /create\s+(?:or\s+replace\s+)?function\s+public\./,
    );

    const policies = normalized.match(/create policy [a-z0-9_]+[\s\S]*?;/g) ?? [];
    expect(policies.length).toBeGreaterThan(0);
    expect(policies.every((policy) => !policy.includes("service_role"))).toBe(true);

    for (const publishedTable of ["profiles", "patients", "caregiver_assignments"]) {
      expect(normalized).not.toContain(`create table public.${publishedTable}`);
    }

    for (const unrelatedObject of ["password_reset_tokens", "admin_recovery_events", "notifications"]) {
      expect(normalized).not.toContain(`create table public.${unrelatedObject}`);
    }
  });
});
