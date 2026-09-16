import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  resolveAuthProvider: vi.fn(),
  runtimeValue: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("../src/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("../src/lib/auth-provider", () => ({ resolveAuthProvider: mocks.resolveAuthProvider }));
vi.mock("../src/lib/runtime-config", () => ({ runtimeValue: mocks.runtimeValue }));

import { updateCaregiverUser } from "../src/lib/supabase/data";

const userId = "d6fdb6a1-a266-46cc-bf40-93937c627200";
const profileId = "667eca04-4e35-4c45-9a29-7e7a6a0b6b0b";

function queryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn> | ((resolve: (value: unknown) => unknown) => unknown)> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

function configureClient(...chains: ReturnType<typeof queryChain>[]) {
  const from = vi.fn();
  for (const chain of chains) from.mockReturnValueOnce(chain);
  const requestClient = { from };
  mocks.createSupabaseServerClient.mockResolvedValue(requestClient);
  return { from, requestClient };
}

beforeEach(() => {
  mocks.createClient.mockReset();
  mocks.createSupabaseServerClient.mockReset();
  mocks.resolveAuthProvider.mockReset().mockReturnValue("supabase");
  mocks.runtimeValue.mockReset().mockImplementation((key: string) => {
    if (key === "VELLORA_AUTH_PROVIDER") return "supabase";
    if (key.includes("URL")) return "https://supabase.test";
    if (key.includes("PUBLISHABLE") || key.includes("ANON")) return "publishable-key";
    if (key === "SUPABASE_SECRET_KEY") return "server-secret";
    return undefined;
  });
});

afterEach(() => vi.restoreAllMocks());

describe("updateCaregiverUser no provider Supabase", () => {
  it("atualiza o perfil existente preservando e-mail de acesso e status", async () => {
    const profileLookup = queryChain({ data: { id: profileId }, error: null });
    const userLookup = queryChain({ data: { name: "Anterior", phone: "62999990000" }, error: null });
    const userUpdate = queryChain({ data: null, error: null });
    const profileUpdate = queryChain({ data: null, error: null });
    const { from } = configureClient(profileLookup, userLookup, userUpdate, profileUpdate);

    await expect(
      updateCaregiverUser(userId, {
        name: "Atualizado",
        phone: "62988880000",
        profession: "tecnico_enfermagem",
        availability_days: ["segunda"],
        availability_shifts: ["manha"],
        available_from: "2026-10-01",
      }),
    ).resolves.toEqual({ profileId });

    expect(userUpdate.update).toHaveBeenCalledWith({ name: "Atualizado", phone: "62988880000" });
    expect(profileUpdate.update).toHaveBeenCalledWith({
      name: "Atualizado",
      phone: "62988880000",
      profession: "tecnico_enfermagem",
      availability_days: ["segunda"],
      availability_shifts: ["manha"],
      available_from: "2026-10-01",
    });
    const profileUpdateMock = profileUpdate.update as ReturnType<typeof vi.fn>;
    expect(profileUpdateMock.mock.calls[0][0]).not.toHaveProperty("contact_email");
    expect(profileUpdateMock.mock.calls[0][0]).not.toHaveProperty("account_status");
    expect(from).toHaveBeenCalledTimes(4);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("insere perfil vinculado sem duplicar e preserva os dados Auth", async () => {
    const profileLookup = queryChain({ data: null, error: null });
    const userLookup = queryChain({ data: { name: "Atual", phone: null }, error: null });
    const profileInsert = queryChain({ data: { id: profileId }, error: null });
    const serviceClient = {
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: "ACESSO@EXAMPLE.COM" } }, error: null }) } },
    };
    mocks.createClient.mockReturnValue(serviceClient);
    const { from } = configureClient(profileLookup, userLookup, profileInsert);

    await expect(
      updateCaregiverUser(userId, {
        profession: "cuidador",
        availability_days: [],
        availability_shifts: [],
        available_from: null,
      }),
    ).resolves.toEqual({ profileId });

    expect(profileInsert.insert).toHaveBeenCalledWith({
      user_id: userId,
      name: "Atual",
      contact_email: "acesso@example.com",
      phone: "",
      profession: "cuidador",
      availability_days: [],
      availability_shifts: [],
      available_from: null,
      account_status: "ativo",
      approved_at: expect.any(String),
    });
    expect(from).toHaveBeenCalledTimes(3);
  });
});
