import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiError: vi.fn(),
  createCaregiverScheduleEntries: vi.fn(),
  getPatient: vi.fn(),
  parseRecurringScheduleMutation: vi.fn(),
  requireRole: vi.fn(),
  resolveRecurringScheduleMutation: vi.fn(),
}));

vi.mock("@/lib/api-error", () => ({ apiError: mocks.apiError }));
vi.mock("@/lib/data", () => ({
  createCaregiverScheduleEntries: mocks.createCaregiverScheduleEntries,
  getPatient: mocks.getPatient,
}));
vi.mock("@/lib/guard", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/schedule-admin", () => ({
  parseRecurringScheduleMutation: mocks.parseRecurringScheduleMutation,
  resolveRecurringScheduleMutation: mocks.resolveRecurringScheduleMutation,
}));

import { POST } from "../src/app/api/admin/schedules/recurring/route";

const mutation = { patient_id: "11111111-1111-4111-8111-111111111111" };
const entries = [{ scheduled_date: "2026-10-05" }, { scheduled_date: "2026-10-06" }];

function request() {
  return new NextRequest("https://vellora.test/api/admin/schedules/recurring", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ session: { userId: "admin-id", role: "admin" } });
  mocks.parseRecurringScheduleMutation.mockReturnValue({ data: mutation });
  mocks.getPatient.mockResolvedValue({ id: mutation.patient_id });
  mocks.resolveRecurringScheduleMutation.mockResolvedValue({ data: entries });
  mocks.createCaregiverScheduleEntries.mockResolvedValue(2);
  mocks.apiError.mockImplementation((_error: unknown, _context: string, message: string) =>
    Response.json({ error: message }, { status: 503 }),
  );
});

describe("POST /api/admin/schedules/recurring", () => {
  it("exige admin antes de validar ou consultar dados", async () => {
    mocks.requireRole.mockResolvedValue({ error: Response.json({ error: "forbidden" }, { status: 403 }) });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.parseRecurringScheduleMutation).not.toHaveBeenCalled();
    expect(mocks.getPatient).not.toHaveBeenCalled();
  });

  it("expande e grava o lote somente depois da pré-validação", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, created_count: 2 });
    expect(mocks.createCaregiverScheduleEntries).toHaveBeenCalledWith(entries, "admin-id");
  });

  it("não grava quando a pré-validação encontra conflito", async () => {
    mocks.resolveRecurringScheduleMutation.mockResolvedValue({ conflict: true, error: "Conflito" });

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.createCaregiverScheduleEntries).not.toHaveBeenCalled();
  });
});
