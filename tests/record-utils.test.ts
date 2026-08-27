import { describe, expect, it } from "vitest";
import { dailyRecordFixture } from "./fixtures";
import { diffDailyRecord, snapshotDailyRecord } from "../src/lib/record-utils";

describe("auditoria de registros", () => {
  it("não copia a foto para o snapshot, mas registra sua presença", () => {
    const snapshot = snapshotDailyRecord({ ...dailyRecordFixture, photo_data: "data:image/png;base64,abc" });
    expect(snapshot.photo_data).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("base64");
  });

  it("identifica somente os campos alterados", () => {
    expect(diffDailyRecord(dailyRecordFixture, { ...dailyRecordFixture, notes: "Atualizado" })).toEqual(["notes"]);
    expect(diffDailyRecord(dailyRecordFixture, { ...dailyRecordFixture, photo_data: "foto" })).toEqual(["photo_data"]);
  });
});
