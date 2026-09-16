import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8").replaceAll("\r\n", "\n");
}

function readProjectFileIfPresent(relativePath: string): string {
  return existsSync(join(process.cwd(), relativePath)) ? readProjectFile(relativePath) : "";
}

const profileDetails = readProjectFile("src/components/admin/CaregiverProfileDetails.tsx");
const accountDetails = readProjectFile("src/components/admin/CaregiverAccountDetails.tsx");
const sharedForm = readProjectFileIfPresent("src/components/admin/CaregiverEditForm.tsx");
const uiSource = [sharedForm, profileDetails, accountDetails].join("\n");

const PROFILE_FIELDS = [
  "name",
  "contact_email",
  "phone",
  "city",
  "profession",
  "coren",
  "experience",
  "availability_days",
  "availability_shifts",
  "available_from",
  "notes",
] as const;

const FORBIDDEN_ACCOUNT_FIELDS = ["access_email", "password", "account_status", "role", "status"] as const;

function namedControls(source: string): string[] {
  return [...source.matchAll(/\bname=["']([^"']+)["']/g)].map((match) => match[1]);
}

function functionSource(source: string, functionName: string, nextFunctionName: string): string {
  const start = source.indexOf(`function ${functionName}`);
  const end = source.indexOf(`\nfunction ${nextFunctionName}`, start + 1);
  return source.slice(start, end === -1 ? source.length : end);
}

function objectKeys(block: string): ReadonlyArray<string> {
  return [...block.matchAll(/(?:^|,)\s*([a-z_]+)\s*:/gm)].map((match) => match[1]);
}

function sorted(values: ReadonlyArray<string>): string[] {
  return [...values].sort();
}

function manualPatchPayload(source: string): string {
  const manualStart = source.indexOf("function ManualEditForm");
  const manualForm = source.slice(manualStart);
  const match = manualForm.match(/const payload = \{([\s\S]*?)\n\s*\};/);
  return match?.[1] || "";
}

describe("ADM-CARE-03 edição de cuidadores", () => {
  it("usa um componente compartilhado de edição integrado aos dois detalhes", () => {
    expect(sharedForm, "o formulário compartilhado da Wave 3 deve existir").not.toBe("");
    expect(profileDetails).toContain('<CaregiverEditForm mode="profile"');
    expect(accountDetails).toContain('<CaregiverEditForm mode="manual"');
  });

  it("integra o acionador de edição nos detalhes de perfil aprovado e cadastro manual", () => {
    expect(profileDetails).toMatch(/CaregiverEditForm|Editar dados/);
    expect(accountDetails).toMatch(/CaregiverEditForm|Editar dados/);
  });

  it("usa PATCH nos endpoints distintos para perfil aprovado e cadastro manual", () => {
    expect(sharedForm).toContain("/api/admin/caregivers/");
    expect(sharedForm).toContain("/api/admin/caregiver-users/");
    expect(sharedForm.match(/method:\s*["']PATCH["']/g)).toHaveLength(2);
  });

  it("expõe todos os campos editáveis do perfil e os dados profissionais no cadastro manual", () => {
    const profileForm = functionSource(sharedForm, "ProfileEditForm", "ManualEditForm");
    const manualForm = functionSource(sharedForm, "ManualEditForm", "CaregiverEditForm");
    const profileControls = new Set(namedControls(profileForm));
    const manualControls = new Set(namedControls(manualForm));

    for (const field of PROFILE_FIELDS) {
      expect(profileControls, `o campo ${field} precisa estar ligado a um controle do formulário`).toContain(field);
    }
    expect([...manualControls].sort()).toEqual([
      "availability_days",
      "availability_shifts",
      "available_from",
      "name",
      "phone",
      "profession",
    ]);
  });

  it("não envia e-mail de acesso, senha ou status da conta nos payloads de edição", () => {
    const profilePayloadMatch = sharedForm.match(/const payload = \{([\s\S]*?)\n\s*\};/);
    const profilePayload = profilePayloadMatch?.[1] || "";
    const manualPayload = manualPatchPayload(sharedForm);

    expect(profilePayload, "o perfil aprovado deve declarar um payload de edição").not.toBe("");
    expect(manualPayload, "o cadastro manual deve declarar um payload de edição").not.toBe("");
    expect(sorted(objectKeys(profilePayload))).toEqual(sorted([...PROFILE_FIELDS]));
    expect(sorted(objectKeys(manualPayload))).toEqual(
      sorted(["name", "phone", "profession", "availability_days", "availability_shifts", "available_from"]),
    );

    for (const payload of [profilePayload, manualPayload]) {
      for (const field of FORBIDDEN_ACCOUNT_FIELDS) {
        expect(payload, `o payload de edição não pode conter ${field}`).not.toMatch(
          new RegExp(`(?:^|[,{\\s])${field}(?:[\\s:},]|$)`),
        );
      }
    }
  });

  it("oferece cancelamento e feedback acessível para carregamento, sucesso e erro", () => {
    expect(uiSource).toContain("Editar dados");
    expect(uiSource).toContain("Cancelar");
    expect(uiSource).toContain("Salvando...");
    expect(uiSource).toMatch(/role=["']status["']/);
    expect(uiSource).toMatch(/role=["']alert["']/);
    expect(uiSource).toContain("aria-live=\"polite\"");
    expect(uiSource).toContain("aria-live=\"assertive\"");
    expect(uiSource).toContain("disabled={saving}");
  });

  it("atualiza a tela após sucesso e preserva a navegação sem chamada real ao provider no teste", () => {
    expect(uiSource).toMatch(/router\.refresh\(\)/);
    expect(sharedForm).toContain("profileId");
    expect(sharedForm).toMatch(/router\.replace\(`\/admin\/cuidadores\/perfil\/\$\{result\.profileId\}`\)/);
    expect(uiSource).toMatch(/response\.ok|res\.ok/);
    expect(uiSource).toMatch(/catch/);
  });

  it("mantém credenciais e status fora da edição manual e como consulta", () => {
    expect(accountDetails).toContain("E-mail de acesso");
    expect(accountDetails).toContain("Senha");
    expect(accountDetails).toContain("Status");
    expect(accountDetails).toContain("Somente leitura");
    expect(manualPatchPayload(sharedForm)).not.toMatch(/email|password|status/i);
  });

  it("cancela a edição restaurando o snapshot original nos dois modos", () => {
    const cancelBlocks = [...sharedForm.matchAll(/function cancelEditing\(\) \{([\s\S]*?)\n\s*\}/g)].map(
      (match) => match[1],
    );

    expect(cancelBlocks).toHaveLength(2);
    expect(cancelBlocks[0]).toContain("profileDraft(caregiver)");
    expect(cancelBlocks[1]).toContain("manualDraft(caregiver)");
    for (const block of cancelBlocks) {
      expect(block).toContain("setMessage(null)");
      expect(block).toContain("setError(null)");
      expect(block).toContain("setEditing(false)");
    }
  });
});
