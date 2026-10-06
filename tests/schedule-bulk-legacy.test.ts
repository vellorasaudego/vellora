import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeBatch: vi.fn(),
  getDataProvider: vi.fn(),
}));

vi.mock("../src/lib/db", () => ({
  executeBatch: mocks.executeBatch,
  query: vi.fn(),
  queryOne: vi.fn(),
}));
vi.mock("../src/lib/supabase/data", () => ({
  SupabaseDataError: class SupabaseDataError extends Error {},
  getDataProvider: mocks.getDataProvider,
}));
vi.mock("../src/lib/auth-provider", () => ({ resolveAuthProvider: () => "legacy" }));
vi.mock("../src/lib/runtime-config", () => ({ runtimeValue: () => undefined }));

import { createCaregiverScheduleEntries } from "../src/lib/data";

const inputs = [
  { caregiver_assignment_id: "11111111-1111-4111-8111-111111111111", scheduled_date: "2026-10-05", start_time: "08:00", end_time: "20:00", ends_next_day: false, profession: "cuidador" as const },
  { caregiver_assignment_id: "11111111-1111-4111-8111-111111111111", scheduled_date: "2026-10-06", start_time: "08:00", end_time: "20:00", ends_next_day: false, profession: "cuidador" as const },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDataProvider.mockReturnValue("legacy");
  mocks.executeBatch.mockResolvedValue(undefined);
});

describe("createCaregiverScheduleEntries legado", () => {
  it("envia todas as ocorrências juntas para o batch atômico", async () => {
    await expect(createCaregiverScheduleEntries(inputs, "22222222-2222-4222-8222-222222222222")).resolves.toBe(2);

    expect(mocks.executeBatch).toHaveBeenCalledTimes(1);
    const commands = mocks.executeBatch.mock.calls[0][0];
    expect(commands).toHaveLength(2);
    expect(commands[0].text).toContain("INSERT INTO caregiver_schedule_entries");
    expect(commands.map((command: { params: unknown[] }) => command.params[2])).toEqual(["2026-10-05", "2026-10-06"]);
  });

  it("rejeita lotes acima do limite antes de acessar persistência", async () => {
    await expect(createCaregiverScheduleEntries(Array.from({ length: 367 }, () => inputs[0]), "admin"))
      .rejects.toThrow("entre 1 e 366");
    expect(mocks.executeBatch).not.toHaveBeenCalled();
  });
});
