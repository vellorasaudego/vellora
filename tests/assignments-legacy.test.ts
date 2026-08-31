import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDataProvider: vi.fn(),
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock("../src/lib/db", () => ({
  executeBatch: vi.fn(),
  query: mocks.query,
  queryOne: mocks.queryOne,
}));
vi.mock("../src/lib/supabase/data", () => ({
  SupabaseDataError: class SupabaseDataError extends Error {},
  getDataProvider: mocks.getDataProvider,
}));

import { createAssignment } from "../src/lib/data";

const input = {
  patient_id: "patient-1",
  caregiver_user_id: "caregiver-1",
  start_date: "2026-08-31",
};

const inactiveAssignment = {
  id: "assignment-inactive",
  patient_id: input.patient_id,
  caregiver_user_id: input.caregiver_user_id,
  start_date: input.start_date,
  end_date: "2026-08-31",
  active: 0,
  created_at: "2026-08-31T00:00:00.000Z",
};

const restoredAssignment = {
  ...inactiveAssignment,
  end_date: null,
  active: 1,
};

beforeEach(() => {
  mocks.getDataProvider.mockReset();
  mocks.query.mockReset();
  mocks.queryOne.mockReset();
  mocks.getDataProvider.mockReturnValue("legacy");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createAssignment no adapter legado", () => {
  it("reativa o histórico exato e não tenta inserir outra linha", async () => {
    mocks.query.mockResolvedValueOnce([inactiveAssignment]).mockResolvedValueOnce([restoredAssignment]);
    mocks.queryOne.mockResolvedValue(undefined);

    await expect(createAssignment(input)).resolves.toEqual(restoredAssignment);

    expect(mocks.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("start_date = $3"),
      [input.patient_id, input.caregiver_user_id, input.start_date],
    );
    expect(mocks.query).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/SET active = 1, end_date = NULL/),
      [inactiveAssignment.id],
    );
    expect(mocks.query).not.toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO caregiver_assignments"),
      expect.anything(),
    );
  });

  it("recusa vínculo ativo com erro de domínio e código explícito", async () => {
    mocks.query.mockResolvedValueOnce([]);
    mocks.queryOne.mockResolvedValue({ ...restoredAssignment, id: "assignment-active", active: 1 });

    await expect(createAssignment(input)).rejects.toMatchObject({
      name: "AssignmentConflictError",
      code: "active_duplicate",
      message: "Este cuidador já possui um vínculo ativo com este paciente.",
    });
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("não escolhe arbitrariamente entre históricos duplicados", async () => {
    mocks.query.mockResolvedValueOnce([
      inactiveAssignment,
      { ...inactiveAssignment, id: "assignment-inactive-2" },
    ]);

    await expect(createAssignment(input)).rejects.toMatchObject({
      name: "AssignmentConflictError",
      code: "duplicate_history",
    });
    expect(mocks.queryOne).not.toHaveBeenCalled();
  });
});
