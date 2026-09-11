import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8").replaceAll("\r\n", "\n");
}

const listPage = readProjectFile("src/app/admin/familias/page.tsx");
const familyList = readProjectFile("src/components/admin/FamilyAccountsTable.tsx");
const familyDetail = readProjectFile("src/app/admin/familias/[id]/page.tsx");
const deleteButton = readProjectFile("src/components/admin/DeleteButton.tsx");

describe("ADM-FAM-01", () => {
  it("mantém a listagem restrita ao nome e aos pacientes vinculados", () => {
    expect(listPage).toContain("const safeFamilies = families.map(({ id, name }) => ({");
    expect(listPage).not.toContain("listContractDocuments");
    expect(familyList).toContain("href={`/admin/familias/${family.id}`}");
    expect(familyList).toContain("href={`/admin/pacientes/${patient.id}`}");
    expect(familyList).not.toContain("ContractManager");
    expect(familyList).not.toContain("DeleteButton");
  });

  it("orienta o próximo passo quando a família não tem pacientes", () => {
    expect(familyList).toContain("Nenhum paciente vinculado a esta família.");
    expect(familyList).toContain("Para vincular um paciente");
    expect(familyList).toContain('href="/admin/pacientes"');
    expect(familyDetail).toContain("Nenhum paciente vinculado a esta família.");
    expect(familyDetail).toContain("Abra o cadastro de um paciente");
  });

  it("expõe o detalhe com contato, pacientes, contratos e exclusão confirmada", () => {
    expect(familyDetail).toContain("params }: { params: Promise<{ id: string }> }");
    expect(familyDetail).toContain("getUserById(id)");
    expect(familyDetail).toContain('family.role !== "familia"');
    expect(familyDetail).toContain("listPatientsByFamily(family.id)");
    expect(familyDetail).toContain('listContractDocuments("family", family.id)');
    expect(familyDetail).toContain("<ContractManager");
    expect(familyDetail).toContain("<DeleteButton");
    expect(familyDetail).toContain("confirmText={`Excluir a família");
    expect(familyDetail).toContain("href={`/admin/pacientes/${patient.id}`}");
  });

  it("preserva a confirmação antes de qualquer exclusão", () => {
    expect(deleteButton).toContain("if (!window.confirm(confirmText)) return;");
    expect(deleteButton).toContain('fetch(endpoint, { method: "DELETE" })');
    expect(familyDetail).not.toContain("fetch(");
  });
});
