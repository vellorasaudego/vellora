import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  resolveAuthProvider: vi.fn(),
  runtimeValue: vi.fn(),
}));

vi.mock("../src/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("../src/lib/auth-provider", () => ({ resolveAuthProvider: mocks.resolveAuthProvider }));
vi.mock("../src/lib/runtime-config", () => ({ runtimeValue: mocks.runtimeValue }));

import { createAssignment } from "../src/lib/supabase/data";

const input = {
  patient_id: "11111111-1111-4111-8111-111111111111",
  caregiver_user_id: "22222222-2222-4222-8222-222222222222",
  start_date: "2026-08-31",
};

const inactiveAssignment = {
  id: "33333333-3333-4333-8333-333333333333",
  patient_id: input.patient_id,
  caregiver_user_id: input.caregiver_user_id,
  start_date: input.start_date,
  end_date: "2026-08-31",
  active: false,
  created_at: "2026-08-31T00:00:00.000Z",
};

function queryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: unknown) => unknown) => unknown)> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function configureClient(...chains: ReturnType<typeof queryChain>[]) {
  const from = vi.fn();
  for (const chain of chains) from.mockReturnValueOnce(chain);
  mocks.createSupabaseServerClient.mockResolvedValue({ from });
  return from;
}

beforeEach(() => {
  mocks.createSupabaseServerClient.mockReset();
  mocks.resolveAuthProvider.mockReset().mockReturnValue("supabase");
  mocks.runtimeValue.mockReset().mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createAssignment no adapter Supabase", () => {
  it("reativa o histórico exato e limpa end_date", async () => {
    const historyLookup = queryChain({ data: [inactiveAssignment], error: null });
    const activeLookup = queryChain({ data: null, error: null });
    const restore = queryChain({ data: { ...inactiveAssignment, active: true, end_date: null }, error: null });
    const from = configureClient(historyLookup, activeLookup, restore);

    await expect(createAssignment(input)).resolves.toMatchObject({
      id: inactiveAssignment.id,
      active: 1,
      end_date: null,
    });

    expect(restore.update).toHaveBeenCalledWith({
      active: true,
      end_date: null,
      updated_at: expect.any(String),
    });
    expect(from).toHaveBeenCalledTimes(3);
  });

  it("recusa vínculo ativo com conflito de domínio", async () => {
    const historyLookup = queryChain({ data: [], error: null });
    const activeLookup = queryChain({
      data: { ...inactiveAssignment, active: true, end_date: null },
      error: null,
    });
    const from = configureClient(historyLookup, activeLookup);

    await expect(createAssignment(input)).rejects.toMatchObject({
      name: "AssignmentConflictError",
      code: "active_duplicate",
    });
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("converte colisão única não recuperável em conflito de domínio", async () => {
    const historyLookup = queryChain({ data: [], error: null });
    const activeLookup = queryChain({ data: null, error: null });
    const insert = queryChain({
      data: null,
      error: {
        code: "23505",
        message: "duplicate key violates caregiver_assignments_patient_caregiver_start_key",
      },
    });
    configureClient(historyLookup, activeLookup, insert);

    await expect(createAssignment(input)).rejects.toMatchObject({
      name: "AssignmentConflictError",
      code: "duplicate_assignment",
      message: "Já existe um vínculo para este cuidador, paciente e data.",
    });
  });
});
