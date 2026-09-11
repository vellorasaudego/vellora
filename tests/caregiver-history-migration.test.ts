import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const historyMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260911202352_allow_caregiver_patient_history_read.sql",
  ),
  "utf8",
);
const normalizedHistoryMigration = historyMigration
  .replace(/--[^\r\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const foundationMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260827142537_db_01_supabase_foundation.sql",
  ),
  "utf8",
)
  .replace(/--[^\r\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

describe("caregiver patient history migration", () => {
  it("changes only the daily-record SELECT policy", () => {
    expect(normalizedHistoryMigration).toContain(
      "alter policy daily_records_select_authorized on public.daily_records using",
    );
    expect(normalizedHistoryMigration).toContain("(select private.is_admin())");
    expect(normalizedHistoryMigration).toContain(
      "(select private.is_patient_family(patient_id))",
    );
    expect(normalizedHistoryMigration).toContain(
      "(select private.is_active_caregiver(patient_id))",
    );
    expect(normalizedHistoryMigration).not.toContain("create table");
    expect(normalizedHistoryMigration).not.toContain("drop table");
    expect(normalizedHistoryMigration).not.toContain("insert into");
    expect(normalizedHistoryMigration).not.toContain("delete from");
    expect(normalizedHistoryMigration).not.toContain("alter table");
    expect(normalizedHistoryMigration).not.toContain("daily_records_insert_authorized");
    expect(normalizedHistoryMigration).not.toContain("daily_records_update_authorized");
    expect(normalizedHistoryMigration).not.toContain("daily_records_delete_admin");
  });

  it("keeps custom care plans compatible with the existing patients schema", () => {
    expect(foundationMigration).toContain("care_level text");
    expect(foundationMigration).not.toContain("care_level_check");
  });
});
