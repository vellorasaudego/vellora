import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), "utf8").replaceAll("\r\n", "\n");
}

describe("SEC-PORTAL-PROJECTION", () => {
  it("mantém getPatient completo e cria uma projeção de portal sem notes nos dois providers", () => {
    const supabase = readProjectFile("src/lib/supabase/data.ts");
    const legacy = readProjectFile("src/lib/data.ts");
    const columns = supabase.match(/const PORTAL_PATIENT_COLUMNS\s*=\s*"([^"]+)"/)?.[1];

    expect(columns).toBeTruthy();
    expect(columns).not.toMatch(/\bnotes\b/);
    expect(supabase).toMatch(
      /export async function getPatientForPortal[\s\S]*?\.select\(PORTAL_PATIENT_COLUMNS\)/,
    );
    expect(legacy).toMatch(
      /export async function getPatientForPortal[\s\S]*?SELECT \$\{PORTAL_PATIENT_COLUMNS\}/,
    );
    expect(supabase).toMatch(
      /export async function getPatient\(id: string\)[\s\S]*?\.select\("\*"\)/,
    );
    expect(legacy).toMatch(
      /export async function getPatient\(id: string\)[\s\S]*?SELECT \* FROM patients/,
    );
  });

  it("usa a projeção limitada em todos os detalhes de família e cuidador", () => {
    const portalPages = [
      "src/app/familia/paciente/[id]/page.tsx",
      "src/app/cuidador/paciente/[id]/historico/page.tsx",
      "src/app/cuidador/paciente/[id]/registro/page.tsx",
    ];

    for (const pagePath of portalPages) {
      const page = readProjectFile(pagePath);
      expect(page).toContain("getPatientForPortal");
      expect(page).toMatch(/getPatientForPortal\(id\)/);
      expect(page).not.toMatch(/\bgetPatient\(/);
    }
  });
});
