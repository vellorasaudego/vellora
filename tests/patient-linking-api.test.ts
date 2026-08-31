import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiError: vi.fn(),
  createPatient: vi.fn(),
  createUser: vi.fn(),
  deleteFamilyUser: vi.fn(),
  deletePatient: vi.fn(),
  getUserByEmail: vi.fn(),
  requireRole: vi.fn(),
  updateLeadStatus: vi.fn(),
  updatePatient: vi.fn(),
}));

vi.mock("@/lib/api-error", () => ({ apiError: mocks.apiError }));
vi.mock("@/lib/data", () => ({
  createPatient: mocks.createPatient,
  createUser: mocks.createUser,
  deleteFamilyUser: mocks.deleteFamilyUser,
  deletePatient: mocks.deletePatient,
  getUserByEmail: mocks.getUserByEmail,
  updateLeadStatus: mocks.updateLeadStatus,
  updatePatient: mocks.updatePatient,
}));
vi.mock("@/lib/guard", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/user-errors", () => ({
  DUPLICATE_ACCOUNT_EMAIL_MESSAGE:
    "Este e-mail já está cadastrado. Use “Vincular conta existente” ou informe outro e-mail.",
  isDuplicateAccountEmailError: (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return /email_exists|already been registered|already registered/i.test(message);
  },
}));

import { PATCH as updatePatientRoute } from "../src/app/api/admin/patients/[id]/route";
import { POST as createPatientRoute } from "../src/app/api/admin/patients/route";

const patientId = "d6fdb6a1-a266-46cc-bf40-93937c627200";
const familyUser = { id: "family-user-1" };

function request(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function updatePayload() {
  return {
    name: "Paciente de teste",
    new_family_name: "Responsável de teste",
    new_family_email: "familia@example.com",
    new_family_password: "senha-segura-com-12",
  };
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.requireRole.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
  mocks.getUserByEmail.mockResolvedValue(undefined);
  mocks.deleteFamilyUser.mockResolvedValue(undefined);
  mocks.apiError.mockImplementation((_error: unknown, _context: string, message: string) =>
    new Response(JSON.stringify({ error: message }), {
      status: 503,
      headers: { "content-type": "application/json" },
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("vinculação de conta da família", () => {
  it("devolve conflito acionável quando o e-mail já existe no Supabase Auth", async () => {
    mocks.createUser.mockRejectedValue(
      new Error("Não foi possível criar usuário no Supabase Auth: A user with this email address has already been registered"),
    );

    const response = await updatePatientRoute(
      request(`https://vellora.test/api/admin/patients/${patientId}`, updatePayload()),
      { params: Promise.resolve({ id: patientId }) },
    );

    expect(response.status).toBe(409);
    await expect(responseBody(response)).resolves.toEqual({
      error: "Este e-mail já está cadastrado. Use “Vincular conta existente” ou informe outro e-mail.",
      code: "email_already_registered",
    });
    expect(mocks.updatePatient).not.toHaveBeenCalled();
  });

  it("devolve conflito antes de criar conta quando o e-mail já possui perfil ativo", async () => {
    mocks.getUserByEmail.mockResolvedValue({ id: "existing-family" });

    const response = await updatePatientRoute(
      request(`https://vellora.test/api/admin/patients/${patientId}`, updatePayload()),
      { params: Promise.resolve({ id: patientId }) },
    );

    expect(response.status).toBe(409);
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.updatePatient).not.toHaveBeenCalled();
  });

  it("limpa a conta recém-criada se a atualização do paciente falhar", async () => {
    mocks.createUser.mockResolvedValue(familyUser);
    mocks.updatePatient.mockRejectedValue(new Error("falha no update"));

    const response = await updatePatientRoute(
      request(`https://vellora.test/api/admin/patients/${patientId}`, updatePayload()),
      { params: Promise.resolve({ id: patientId }) },
    );

    expect(response.status).toBe(503);
    expect(mocks.deleteFamilyUser).toHaveBeenCalledWith(familyUser.id);
    expect(mocks.apiError).toHaveBeenCalledWith(
      expect.any(Error),
      "api/admin/patients/[id]",
      "Não foi possível salvar o paciente.",
    );
  });

  it("aplica a mesma proteção na criação de um paciente novo", async () => {
    mocks.createUser.mockRejectedValue(new Error("email_exists: already registered"));

    const response = await createPatientRoute(
      new NextRequest("https://vellora.test/api/admin/patients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...updatePayload(), name: "Paciente novo" }),
      }),
    );

    expect(response.status).toBe(409);
    expect(mocks.createPatient).not.toHaveBeenCalled();
  });
});
