import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeBatch: vi.fn(),
  getDataProvider: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock("../src/lib/db", () => ({
  executeBatch: mocks.executeBatch,
  query: vi.fn(),
  queryOne: mocks.queryOne,
}));
vi.mock("../src/lib/supabase/data", () => ({
  SupabaseDataError: class SupabaseDataError extends Error {},
  getDataProvider: mocks.getDataProvider,
  updateCaregiverUser: vi.fn(),
}));

import { updateCaregiverUser } from "../src/lib/data";

const userId = "d6fdb6a1-a266-46cc-bf40-93937c627200";
const profileId = "667eca04-4e35-4c45-9a29-7e7a6a0b6b0b";

const user = {
  id: userId,
  name: "Cuidador antigo",
  email: "acesso@example.com",
  password_hash: "hash-preservado",
  role: "cuidador" as const,
  phone: "62999990000",
  session_version: 0,
  deleted_at: null,
  created_at: "2026-09-01T00:00:00.000Z",
};

const fields = {
  name: "Cuidador atualizado",
  phone: "62988880000",
  profession: "enfermeiro" as const,
  availability_days: ["segunda", "quarta"],
  availability_shifts: ["manha"],
  available_from: "2026-10-01",
};

beforeEach(() => {
  mocks.executeBatch.mockReset();
  mocks.getDataProvider.mockReset().mockReturnValue("legacy");
  mocks.queryOne.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("updateCaregiverUser no provider legado", () => {
  it("atualiza usuário e perfil existente sem tocar em credenciais ou status", async () => {
    mocks.queryOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({
        id: profileId,
        user_id: userId,
        contact_email: "contato-preservado@example.com",
        account_status: "inativo",
      });

    await expect(updateCaregiverUser(userId, fields)).resolves.toEqual({ profileId });

    expect(mocks.executeBatch).toHaveBeenCalledOnce();
    const commands = mocks.executeBatch.mock.calls[0][0] as Array<{ text: string; params: unknown[] }>;
    expect(commands).toHaveLength(2);
    expect(commands[0].text).toContain("UPDATE users SET name = $1, phone = $2");
    expect(commands[0].text.split(" WHERE ")[0]).not.toMatch(/email|password|role|status|session_version/i);
    expect(commands[1].text).toContain("UPDATE caregiver_profiles SET");
    expect(commands[1].text).not.toMatch(/contact_email|account_status|password|user_id/i);
  });

  it("cria uma vez e retorna o mesmo perfil quando a operação é repetida", async () => {
    mocks.queryOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: profileId })
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ id: profileId, user_id: userId });

    await expect(updateCaregiverUser(userId, fields)).resolves.toEqual({ profileId });
    await expect(updateCaregiverUser(userId, fields)).resolves.toEqual({ profileId });

    expect(mocks.executeBatch).toHaveBeenCalledTimes(2);
    const firstCommands = mocks.executeBatch.mock.calls[0][0] as Array<{ text: string }>;
    const secondCommands = mocks.executeBatch.mock.calls[1][0] as Array<{ text: string }>;
    expect(firstCommands.some((command) => command.text.includes("INSERT INTO caregiver_profiles"))).toBe(true);
    expect(secondCommands.some((command) => command.text.includes("INSERT INTO caregiver_profiles"))).toBe(false);
    expect(firstCommands[0].text.split(" WHERE ")[0]).not.toMatch(/email|password|role|status|session_version/i);
  });
});
