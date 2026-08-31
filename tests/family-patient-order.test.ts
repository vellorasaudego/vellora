import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ordem da área da família", () => {
  it("renderiza o registro atual antes da evolução gráfica e não o repete no histórico", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/familia/paciente/[id]/page.tsx"),
      "utf8",
    );
    const currentRecordPosition = source.indexOf('>Registro atual</h3>');
    const chartsPosition = source.indexOf('>Evolução dos sinais vitais</h3>');
    const historyPosition = source.indexOf('>Histórico de registros diários</h3>');

    expect(currentRecordPosition).toBeGreaterThan(-1);
    expect(currentRecordPosition).toBeLessThan(chartsPosition);
    expect(chartsPosition).toBeLessThan(historyPosition);
    expect(source).toContain("const previousRecords = records.slice(1);");
    expect(source).toContain("{previousRecords.map((r) => (");
  });
});
