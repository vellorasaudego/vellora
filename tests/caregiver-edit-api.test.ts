import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiError: vi.fn(),
  getCaregiverProfile: vi.fn(),
  getCaregiverProfileByUserId: vi.fn(),
  getUserById: vi.fn(),
  requireRole: vi.fn(),
  updateCaregiverProfile: vi.fn(),
  updateCaregiverUser: vi.fn(),
}));

vi.mock("@/lib/api-error", () => ({ apiError: mocks.apiError }));
vi.mock("@/lib/data", () => ({
  getCaregiverProfile: mocks.getCaregiverProfile,
  getCaregiverProfileByUserId: mocks.getCaregiverProfileByUserId,
  getUserById: mocks.getUserById,
  updateCaregiverProfile: mocks.updateCaregiverProfile,
  updateCaregiverUser: mocks.updateCaregiverUser,
}));
vi.mock("@/lib/guard", () => ({ requireRole: mocks.requireRole }));
vi.mock(
  "@/lib/caregiver-update",
  async () => import("../src/lib/caregiver-update"),
);

import { PATCH as updateCaregiverProfileRoute } from "../src/app/api/admin/caregivers/[id]/route";
import { PATCH as updateCaregiverUserRoute } from "../src/app/api/admin/caregiver-users/[id]/route";

const profileId = "667eca04-4e35-4c45-9a29-7e7a6a0b6b0b";
const userId = "d6fdb6a1-a266-46cc-bf40-93937c627200";

const editableProfile = {
  name: "Henrique Gonçalves",
  contact_email: "henrique@example.com",
  phone: "62981355553",
  city: "Goiânia",
  profession: "enfermeiro",
  coren: "COREN-GO 123456",
  experience: "8 anos de experiência",
  availability_days: ["segunda", "quarta"],
  availability_shifts: ["manha", "noite"],
  available_from: "2026-10-01",
  notes: "Disponível para plantões alternados.",
};

function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function malformedRequest(url: string): NextRequest {
  return new NextRequest(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: "{invalid-json",
  });
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

function guardError(status: 401 | 403, message: string) {
  return { error: NextResponse.json({ error: message }, { status }) };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();

  mocks.requireRole.mockResolvedValue({ session: { userId: "admin-1", role: "admin" } });
  mocks.getCaregiverProfile.mockResolvedValue({ id: profileId });
  mocks.getCaregiverProfileByUserId.mockResolvedValue(undefined);
  mocks.getUserById.mockResolvedValue({ id: userId, role: "cuidador", deleted_at: null });
  mocks.updateCaregiverProfile.mockResolvedValue(undefined);
  mocks.updateCaregiverUser.mockResolvedValue(undefined);
  mocks.apiError.mockImplementation((_error: unknown, _context: string, message: string) =>
    NextResponse.json({ error: message }, { status: 503 }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PATCH /api/admin/caregivers/[id]", () => {
  it("bloqueia usuário não autenticado antes de chamar o adapter", async () => {
    mocks.requireRole.mockResolvedValue(guardError(401, "Não autenticado."));

    const response = await updateCaregiverProfileRoute(
      jsonRequest(`https://vellora.test/api/admin/caregivers/${profileId}`, editableProfile),
      routeParams(profileId),
    );

    expect(response.status).toBe(401);
    expect(mocks.updateCaregiverProfile).not.toHaveBeenCalled();
  });

  it("bloqueia usuário não-admin antes de chamar o adapter", async () => {
    mocks.requireRole.mockResolvedValue(guardError(403, "Sem permissão."));

    const response = await updateCaregiverProfileRoute(
      jsonRequest(`https://vellora.test/api/admin/caregivers/${profileId}`, editableProfile),
      routeParams(profileId),
    );

    expect(response.status).toBe(403);
    expect(mocks.updateCaregiverProfile).not.toHaveBeenCalled();
  });

  it.each([
    ["body JSON inválido", malformedRequest(`https://vellora.test/api/admin/caregivers/${profileId}`)],
    [
      "campo somente leitura",
      jsonRequest(`https://vellora.test/api/admin/caregivers/${profileId}`, {
        ...editableProfile,
        email: "login@example.com",
        password: "nao-alterar",
        role: "admin",
        status: "inativo",
      }),
    ],
  ])("rejeita %s sem alterar o adapter", async (_caseName, request) => {
    const response = await updateCaregiverProfileRoute(request, routeParams(profileId));

    expect(response.status).toBe(400);
    expect(mocks.updateCaregiverProfile).not.toHaveBeenCalled();
  });

  it.each([
    ["profissão fora do enum", { profession: "Enfermeiro" }],
    ["dia fora da lista", { availability_days: ["feriado"] }],
    ["data inexistente", { available_from: "2026-02-30" }],
    ["telefone curto", { phone: "123" }],
    ["e-mail inválido", { contact_email: "nao-e-mail" }],
  ])("rejeita %s sem chamar o provider", async (_caseName, payload) => {
    const response = await updateCaregiverProfileRoute(
      jsonRequest(`https://vellora.test/api/admin/caregivers/${profileId}`, payload),
      routeParams(profileId),
    );

    expect(response.status).toBe(400);
    expect(mocks.getCaregiverProfile).not.toHaveBeenCalled();
    expect(mocks.updateCaregiverProfile).not.toHaveBeenCalled();
  });

  it("aceita atualização parcial sem exigir o nome", async () => {
    const payload = { phone: "62999990000" };
    const response = await updateCaregiverProfileRoute(
      jsonRequest(`https://vellora.test/api/admin/caregivers/${profileId}`, payload),
      routeParams(profileId),
    );

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({ ok: true });
    expect(mocks.updateCaregiverProfile).toHaveBeenCalledWith(profileId, payload);
  });

  it("responde 404 quando o perfil aprovado não existe", async () => {
    mocks.getCaregiverProfile.mockResolvedValue(undefined);

    const response = await updateCaregiverProfileRoute(
      jsonRequest(`https://vellora.test/api/admin/caregivers/${profileId}`, { phone: "62999990000" }),
      routeParams(profileId),
    );

    expect(response.status).toBe(404);
    expect(mocks.updateCaregiverProfile).not.toHaveBeenCalled();
  });

  it("aceita somente os campos editáveis e encaminha o payload completo", async () => {
    const response = await updateCaregiverProfileRoute(
      jsonRequest(`https://vellora.test/api/admin/caregivers/${profileId}`, editableProfile),
      routeParams(profileId),
    );

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({ ok: true });
    expect(mocks.updateCaregiverProfile).toHaveBeenCalledOnce();
    expect(mocks.updateCaregiverProfile).toHaveBeenCalledWith(profileId, editableProfile);
  });

  it("converte erro do provider em resposta apropriada", async () => {
    const error = new Error("falha de conexão com o provider");
    mocks.updateCaregiverProfile.mockRejectedValue(error);

    const response = await updateCaregiverProfileRoute(
      jsonRequest(`https://vellora.test/api/admin/caregivers/${profileId}`, editableProfile),
      routeParams(profileId),
    );

    expect(response.status).toBe(503);
    await expect(responseBody(response)).resolves.toEqual({
      error: expect.any(String),
    });
    expect(mocks.apiError).toHaveBeenCalledWith(
      error,
      expect.stringContaining("api/admin/caregivers"),
      expect.any(String),
    );
  });
});

describe("PATCH /api/admin/caregiver-users/[id]", () => {
  it.each([
    [401, "Não autenticado."],
    [403, "Sem permissão."],
  ] as const)("bloqueia usuário com resposta %s antes de chamar o adapter", async (status, message) => {
    mocks.requireRole.mockResolvedValue(guardError(status, message));

    const response = await updateCaregiverUserRoute(
      jsonRequest(`https://vellora.test/api/admin/caregiver-users/${userId}`, {
        name: "Cuidador Manual",
        phone: "62999990000",
      }),
      routeParams(userId),
    );

    expect(response.status).toBe(status);
    expect(mocks.updateCaregiverUser).not.toHaveBeenCalled();
  });

  it("aceita somente name e phone para cadastro manual", async () => {
    const payload = { name: "Cuidador Manual", phone: "62999990000" };
    const response = await updateCaregiverUserRoute(
      jsonRequest(`https://vellora.test/api/admin/caregiver-users/${userId}`, payload),
      routeParams(userId),
    );

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({ ok: true });
    expect(mocks.updateCaregiverUser).toHaveBeenCalledOnce();
    expect(mocks.updateCaregiverUser).toHaveBeenCalledWith(userId, payload);
    expect(mocks.getCaregiverProfileByUserId).toHaveBeenCalledWith(userId);
  });

  it("rejeita email, status, senha e outros campos de conta manual", async () => {
    const response = await updateCaregiverUserRoute(
      jsonRequest(`https://vellora.test/api/admin/caregiver-users/${userId}`, {
        name: "Cuidador Manual",
        phone: "62999990000",
        email: "login@example.com",
        password: "nao-alterar",
        status: "ativo",
        role: "admin",
      }),
      routeParams(userId),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateCaregiverUser).not.toHaveBeenCalled();
  });

  it("rejeita payload manual inválido sem chamar o provider", async () => {
    const response = await updateCaregiverUserRoute(
      malformedRequest(`https://vellora.test/api/admin/caregiver-users/${userId}`),
      routeParams(userId),
    );

    expect(response.status).toBe(400);
    expect(mocks.updateCaregiverUser).not.toHaveBeenCalled();
  });

  it("responde 404 quando o cadastro manual não existe", async () => {
    mocks.getUserById.mockResolvedValue(undefined);

    const response = await updateCaregiverUserRoute(
      jsonRequest(`https://vellora.test/api/admin/caregiver-users/${userId}`, {
        phone: "62999990000",
      }),
      routeParams(userId),
    );

    expect(response.status).toBe(404);
    expect(mocks.updateCaregiverUser).not.toHaveBeenCalled();
  });

  it("rejeita cadastro manual quando o usuário já possui perfil aprovado", async () => {
    mocks.getCaregiverProfileByUserId.mockResolvedValue({ id: profileId, user_id: userId });

    const response = await updateCaregiverUserRoute(
      jsonRequest(`https://vellora.test/api/admin/caregiver-users/${userId}`, {
        name: "Cuidador Manual",
        phone: "62999990000",
      }),
      routeParams(userId),
    );

    expect(response.status).toBe(404);
    expect(mocks.getCaregiverProfileByUserId).toHaveBeenCalledWith(userId);
    expect(mocks.updateCaregiverUser).not.toHaveBeenCalled();
  });

  it("converte erro do provider manual em resposta apropriada", async () => {
    const error = new Error("falha ao salvar conta manual");
    mocks.updateCaregiverUser.mockRejectedValue(error);

    const response = await updateCaregiverUserRoute(
      jsonRequest(`https://vellora.test/api/admin/caregiver-users/${userId}`, {
        name: "Cuidador Manual",
        phone: "62999990000",
      }),
      routeParams(userId),
    );

    expect(response.status).toBe(503);
    await expect(responseBody(response)).resolves.toEqual({
      error: expect.any(String),
    });
    expect(mocks.apiError).toHaveBeenCalledWith(
      error,
      expect.stringContaining("api/admin/caregiver-users"),
      expect.any(String),
    );
  });
});
