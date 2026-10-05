import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiError: vi.fn(),
  getPatient: vi.fn(),
  getUsersByIds: vi.fn(),
  listAssignmentsForPatient: vi.fn(),
  listCaregiverProfiles: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/api-error", () => ({ apiError: mocks.apiError }));
vi.mock("@/lib/data", () => ({
  getPatient: mocks.getPatient,
  getUsersByIds: mocks.getUsersByIds,
  listAssignmentsForPatient: mocks.listAssignmentsForPatient,
  listCaregiverProfiles: mocks.listCaregiverProfiles,
}));
vi.mock("@/lib/guard", () => ({ requireRole: mocks.requireRole }));

import { GET } from "../src/app/api/admin/schedules/professionals/route";

const patientId = "2bf5979c-afbb-40c4-8774-42cf597411f7";
const caregiverId = "11111111-1111-4111-8111-111111111111";

function request(url = `https://vellora.test/api/admin/schedules/professionals?patient_id=${patientId}&month=2026-10`) {
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ session: { userId: "admin-1", role: "admin" } });
  mocks.getPatient.mockResolvedValue({ id: patientId });
  mocks.apiError.mockImplementation((_error: unknown, _context: string, message: string) =>
    new Response(JSON.stringify({ error: message }), { status: 503 }),
  );
});

describe("GET /api/admin/schedules/professionals", () => {
  it("returns active professionals linked during the month without reading the schedule table", async () => {
    mocks.listAssignmentsForPatient.mockResolvedValue([
      { id: "a1", caregiver_user_id: caregiverId, start_date: "2026-08-01", end_date: null, active: 1 },
      { id: "a2", caregiver_user_id: "22222222-2222-4222-8222-222222222222", start_date: "2026-11-01", end_date: null, active: 1 },
      { id: "a3", caregiver_user_id: "33333333-3333-4333-8333-333333333333", start_date: "2026-08-01", end_date: null, active: 0 },
    ]);
    mocks.getUsersByIds.mockResolvedValue([
      { id: caregiverId, name: "Ana Profissional", role: "cuidador", phone: "62999990000" },
    ]);
    mocks.listCaregiverProfiles.mockResolvedValue([
      { id: "p1", user_id: caregiverId, profession: "enfermeiro", account_status: "ativo" },
    ]);

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      professionals: [{
        user_id: caregiverId,
        name: "Ana Profissional",
        profession: "enfermeiro",
        phone: "62999990000",
        start_date: "2026-08-01",
        end_date: null,
      }],
    });
    expect(mocks.getUsersByIds).toHaveBeenCalledWith([caregiverId]);
  });

  it("requires an administrator before reading assignment data", async () => {
    mocks.requireRole.mockResolvedValue({ error: new Response("forbidden", { status: 403 }) });

    const response = await GET(request());

    expect(response.status).toBe(403);
    expect(mocks.getPatient).not.toHaveBeenCalled();
    expect(mocks.listAssignmentsForPatient).not.toHaveBeenCalled();
  });
});
