import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class MockAssignmentConflictError extends Error {
    readonly code: "active_duplicate" | "duplicate_assignment" | "duplicate_history";

    constructor(
      code: "active_duplicate" | "duplicate_assignment" | "duplicate_history",
      message: string,
    ) {
      super(message);
      this.name = "AssignmentConflictError";
      this.code = code;
    }
  }

  return {
    AssignmentConflictError: MockAssignmentConflictError,
    apiError: vi.fn(),
    createAssignment: vi.fn(),
    requireRole: vi.fn(),
  };
});

vi.mock("@/lib/assignment-errors", () => ({
  AssignmentConflictError: mocks.AssignmentConflictError,
}));
vi.mock("@/lib/api-error", () => ({ apiError: mocks.apiError }));
vi.mock("@/lib/data", () => ({ createAssignment: mocks.createAssignment }));
vi.mock("@/lib/guard", () => ({ requireRole: mocks.requireRole }));

import { POST } from "../src/app/api/admin/assignments/route";

const payload = {
  patient_id: "patient-1",
  caregiver_user_id: "caregiver-1",
  start_date: "2026-08-31",
};

function request(body: unknown): NextRequest {
  return new NextRequest("https://vellora.test/api/admin/assignments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function body(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  mocks.createAssignment.mockReset();
  mocks.apiError.mockReset();
  mocks.requireRole.mockReset();
  mocks.requireRole.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
  mocks.apiError.mockImplementation((_error: unknown, _context: string, message: string) => {
    return new Response(JSON.stringify({ error: message }), {
      status: 503,
      headers: { "content-type": "application/json" },
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/assignments", () => {
  it("responde sucesso quando o adapter cria ou reativa o vínculo", async () => {
    mocks.createAssignment.mockResolvedValue({ id: "assignment-1" });

    const response = await POST(request(payload));

    expect(response.status).toBe(200);
    await expect(body(response)).resolves.toEqual({ ok: true, id: "assignment-1" });
    expect(mocks.createAssignment).toHaveBeenCalledWith(payload);
  });

  it("expõe duplicidade ativa como conflito 409 com código de domínio", async () => {
    mocks.createAssignment.mockRejectedValue(
      new mocks.AssignmentConflictError(
        "active_duplicate",
        "Este cuidador já possui um vínculo ativo com este paciente.",
      ),
    );

    const response = await POST(request(payload));

    expect(response.status).toBe(409);
    await expect(body(response)).resolves.toEqual({
      error: "Este cuidador já possui um vínculo ativo com este paciente.",
      code: "active_duplicate",
    });
  });

  it("expõe duplicidade não recuperável como conflito 409 sem transformar em 503", async () => {
    mocks.createAssignment.mockRejectedValue(
      new mocks.AssignmentConflictError(
        "duplicate_assignment",
        "Já existe um vínculo para este cuidador, paciente e data.",
      ),
    );

    const response = await POST(request(payload));

    expect(response.status).toBe(409);
    await expect(body(response)).resolves.toEqual({
      error: "Já existe um vínculo para este cuidador, paciente e data.",
      code: "duplicate_assignment",
    });
  });

  it("mantém 503 para falhas reais desconhecidas", async () => {
    const error = new Error("falha de conexão");
    mocks.createAssignment.mockRejectedValue(error);

    const response = await POST(request(payload));

    expect(response.status).toBe(503);
    await expect(body(response)).resolves.toEqual({
      error: "Não foi possível vincular o cuidador.",
    });
    expect(mocks.apiError).toHaveBeenCalledWith(
      error,
      "api/admin/assignments",
      "Não foi possível vincular o cuidador.",
    );
  });
});
