import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStorageProvider } from "../src/lib/supabase/storage-config";
import {
  assertStorageContentType,
  assertStoragePath,
  classifyStoragePath,
  STORAGE_BUCKETS,
  STORAGE_LIMITS,
} from "../src/lib/supabase/storage-paths";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260827172106_storage_01_buckets.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const normalizedMigration = migration
  .replace(/--[^\r\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const photoKey =
  "patients/11111111-1111-4111-8111-111111111111/records/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webp";
const contractKey = "contracts/44444444-4444-4444-8444-444444444444.pdf";

describe("STORAGE-01 path and provider boundaries", () => {
  it("keeps provider selection explicit and fail-closed", () => {
    expect(resolveStorageProvider(undefined)).toBe("legacy");
    expect(resolveStorageProvider("legacy")).toBe("legacy");
    expect(resolveStorageProvider(" supabase ")).toBe("supabase");
    expect(() => resolveStorageProvider("r2-and-supabase")).toThrow();
  });

  it("accepts only the documented photo and contract paths", () => {
    expect(classifyStoragePath(photoKey)).toMatchObject({
      kind: "photo",
      bucket: STORAGE_BUCKETS.recordPhotos,
      patientId: "11111111-1111-4111-8111-111111111111",
      recordId: "22222222-2222-4222-8222-222222222222",
      extension: "webp",
    });
    expect(classifyStoragePath(contractKey)).toMatchObject({
      kind: "contract",
      bucket: STORAGE_BUCKETS.contracts,
      contractId: "44444444-4444-4444-8444-444444444444",
    });

    for (const invalidKey of [
      "record-photos/11111111-1111-4111-8111-111111111111/photo.webp",
      "patients/11111111-1111-4111-8111-111111111111/records/22222222-2222-4222-8222-222222222222/../../x.webp",
      "patients/not-a-uuid/records/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webp",
      "contracts/44444444-4444-4444-8444-444444444444.txt",
      "/contracts/44444444-4444-4444-8444-444444444444.pdf",
    ]) {
      expect(classifyStoragePath(invalidKey)).toBeNull();
      expect(() => assertStoragePath(invalidKey)).toThrow();
    }
  });

  it("binds MIME types to the path and enforces bucket limits", () => {
    const photo = assertStoragePath(photoKey);
    const contract = assertStoragePath(contractKey);
    expect(assertStorageContentType(photo, "image/webp")).toBe("image/webp");
    expect(assertStorageContentType(contract, "application/pdf")).toBe("application/pdf");
    expect(() => assertStorageContentType(photo, "image/png")).toThrow();
    expect(() => assertStorageContentType(contract, "application/pdf; charset=binary")).toThrow();
    expect(STORAGE_LIMITS.photoBytes).toBe(3 * 1024 * 1024);
    expect(STORAGE_LIMITS.contractBytes).toBe(4 * 1024 * 1024);
  });
});

describe("STORAGE-01 Supabase migration", () => {
  it("is transactional, idempotent, private, and configures both buckets", () => {
    expect(normalizedMigration).toMatch(/^begin;/);
    expect(normalizedMigration).toMatch(/commit;$/);
    expect(normalizedMigration).toContain("on conflict (id) do update set");
    expect(normalizedMigration).toContain("'record-photos', 'record-photos', false, 3145728");
    expect(normalizedMigration).toContain("'contracts', 'contracts', false, 4194304");
    expect(normalizedMigration).toContain("array['image/jpeg', 'image/png', 'image/webp']::text[]");
    expect(normalizedMigration).toContain("array['application/pdf']::text[]");
    // Supabase owns storage.objects and manages its RLS lifecycle. This
    // migration must not attempt an ownership-sensitive ALTER TABLE.
    expect(normalizedMigration).not.toContain("alter table storage.objects enable row level security");
  });

  it("uses authenticated-only least-privilege policies tied to domain relations", () => {
    for (const policy of [
      "record_photos_select_authorized",
      "record_photos_insert_authorized",
      "record_photos_update_authorized",
      "record_photos_delete_authorized",
      "contracts_select_authorized",
      "contracts_insert_admin",
      "contracts_update_admin",
      "contracts_delete_admin",
    ]) {
      expect(normalizedMigration).toContain(`create policy ${policy}`);
    }

    const policies = normalizedMigration.match(/create policy [\s\S]*?\);/g) ?? [];
    expect(policies).toHaveLength(8);
    expect(policies.every((policy) => policy.includes("to authenticated"))).toBe(true);
    expect(policies.some((policy) => policy.includes("to anon"))).toBe(false);
    expect(normalizedMigration).toContain("private.is_admin()");
    expect(normalizedMigration).toContain("private.is_patient_family(dr.patient_id)");
    expect(normalizedMigration).toContain("private.is_active_caregiver(dr.patient_id)");
    expect(normalizedMigration).toContain("public.daily_records as dr");
    expect(normalizedMigration).toContain("public.contract_documents as cd");
    expect(normalizedMigration).not.toContain("user_metadata");
    expect(normalizedMigration).not.toContain("auth.jwt");
    expect(normalizedMigration).not.toContain("service_role");
    expect(normalizedMigration).not.toContain("public = true");
  });
});

describe("STORAGE-01 server boundary", () => {
  it("does not expose a service key or browser client in storage modules", () => {
    const wrapper = readFileSync(resolve(process.cwd(), "src/lib/storage.ts"), "utf8");
    const adapter = readFileSync(resolve(process.cwd(), "src/lib/supabase/storage.ts"), "utf8");
    expect(wrapper).toContain("VELLORA_STORAGE_PROVIDER");
    expect(wrapper).toContain("putSupabaseFile");
    expect(wrapper).not.toContain("createSupabaseBrowserClient");
    expect(adapter).toContain("createSupabaseServerClient");
    expect(adapter).not.toContain("createSupabaseBrowserClient");
    expect(adapter).not.toContain("NEXT_PUBLIC_SUPABASE");
    expect(adapter).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(adapter).not.toContain("SUPABASE_SECRET_KEY");
    expect(adapter).not.toContain("base64");
  });
});
