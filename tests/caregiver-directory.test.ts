import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isValidCaregiverId,
  manualAccountDirectoryEntry,
  profileDirectoryEntry,
  PROFESSION_OPTIONS,
} from "../src/components/admin/caregiver-directory";

function readProjectFile(...parts: string[]): string {
  return readFileSync(join(process.cwd(), ...parts), "utf8");
}

const approvedProfile = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  application_id: "550e8400-e29b-41d4-a716-446655440001",
  user_id: null,
  name: "Ana Cuidadora",
  contact_email: "ana@example.com",
  access_email: null,
  phone: "(62) 99999-9999",
  city: "Goiânia",
  profession: "cuidador" as const,
  coren: null,
  experience: null,
  availability_days: ["segunda"],
  availability_shifts: ["manha"],
  available_from: null,
  notes: null,
  account_status: "aguardando_acesso" as const,
  approved_at: "2026-09-01T12:00:00.000Z",
  created_at: "2026-09-01T12:00:00.000Z",
};

describe("ADM-CARE-01 diretório de cuidadores", () => {
  it("aceita UUIDs de rota e rejeita IDs inválidos sem consultar dados", () => {
    expect(isValidCaregiverId(approvedProfile.id)).toBe(true);
    expect(isValidCaregiverId("not-a-caregiver-id")).toBe(false);
    expect(isValidCaregiverId("550e8400-e29b-61d4-a716-446655440000")).toBe(false);
  });

  it("gera links distintos para perfis aprovados e cadastros manuais", () => {
    expect(profileDirectoryEntry(approvedProfile)).toMatchObject({
      profession: "Cuidador(a)",
      status: "aguardando_acesso",
      href: `/admin/cuidadores/perfil/${approvedProfile.id}`,
    });
    expect(
      manualAccountDirectoryEntry({ id: approvedProfile.id, name: approvedProfile.name, phone: approvedProfile.phone }),
    ).toMatchObject({
      profession: "Cuidador(a)",
      status: "ativo",
      href: `/admin/cuidadores/conta/${approvedProfile.id}`,
    });
  });

  it("mantém as mesmas quatro opções profissionais usadas no formulário público", () => {
    expect(PROFESSION_OPTIONS).toEqual([
      { value: "cuidador", label: "Cuidador(a)" },
      { value: "tecnico_enfermagem", label: "Técnico(a) de enfermagem" },
      { value: "enfermeiro", label: "Enfermeiro(a)" },
      { value: "outros", label: "Outros" },
    ]);
  });

  it("mantém a listagem compacta e desloca dados e ações para os detalhes", () => {
    const listPage = readProjectFile("src", "app", "admin", "cuidadores", "page.tsx");
    const bank = readProjectFile("src", "components", "admin", "CaregiverBank.tsx");
    const directory = readProjectFile("src", "components", "admin", "CaregiverDirectoryTable.tsx");

    expect(listPage).not.toContain("listContractDocuments");
    expect(listPage).not.toContain("listPatientsByCaregiver");
    expect(listPage).not.toContain("ContractManager");
    expect(listPage).not.toContain("DeleteButton");
    expect(bank).not.toContain("fetch(");
    expect(bank).not.toContain("ContractManager");
    expect(bank).not.toContain("DeleteButton");
    expect(directory).toContain("Nome");
    expect(directory).toContain("Telefone");
    expect(directory).toContain("Profissão");
    expect(directory).toContain("Status");
    expect(directory).toContain("<Link");
    expect(directory).not.toContain("Contrato");
  });

  it("protege as duas rotas de detalhe com notFound e estados vazios", () => {
    const profilePage = readProjectFile("src", "app", "admin", "cuidadores", "perfil", "[id]", "page.tsx");
    const accountPage = readProjectFile("src", "app", "admin", "cuidadores", "conta", "[id]", "page.tsx");
    const profileDetails = readProjectFile("src", "components", "admin", "CaregiverProfileDetails.tsx");
    const accountDetails = readProjectFile("src", "components", "admin", "CaregiverAccountDetails.tsx");
    const contractManager = readProjectFile("src", "components", "admin", "ContractManager.tsx");

    expect(profilePage).toContain("if (!isValidCaregiverId(id)) notFound();");
    expect(profilePage).toContain("if (!profile) notFound();");
    expect(accountPage).toContain("if (!isValidCaregiverId(id)) notFound();");
    expect(accountPage).toContain("if (!caregiver || caregiver.role !== \"cuidador\" || caregiver.deleted_at) notFound();");
    expect(accountPage).toContain("if (linkedProfile) notFound();");
    expect(profileDetails).toContain("Nenhum paciente vinculado.");
    expect(accountDetails).toContain("Nenhum paciente vinculado.");
    expect(contractManager).toContain("Nenhum contrato anexado.");
    expect(accountDetails).toContain("Nenhuma disponibilidade foi informada");
    expect(profileDetails).toContain("<ContractManager");
    expect(accountDetails).toContain("<ContractManager");
  });
});
