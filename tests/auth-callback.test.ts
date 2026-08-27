import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  applySupabaseCookieState: vi.fn((response: Response) => response),
  createSupabaseCookieState: vi.fn(),
  createSupabaseRequestClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getAuthProvider: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthProvider: mocks.getAuthProvider,
}));

vi.mock("@/lib/supabase/server", () => ({
  applySupabaseCookieState: mocks.applySupabaseCookieState,
  createSupabaseCookieState: mocks.createSupabaseCookieState,
  createSupabaseRequestClient: mocks.createSupabaseRequestClient,
}));

import { GET } from "../src/app/auth/callback/route";

const BASE_URL = "http://localhost:5173";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`${BASE_URL}/auth/callback${query}`);
}

async function expectRedirect(response: Response, pathname: string): Promise<URL> {
  expect(response.status).toBe(307);

  const location = response.headers.get("location");
  expect(location).not.toBeNull();

  const target = new URL(location!, BASE_URL);
  expect(target.origin).toBe(BASE_URL);
  expect(target.pathname).toBe(pathname);
  return target;
}

describe("callback de autenticação Supabase", () => {
  beforeEach(() => {
    mocks.getAuthProvider.mockReset();
    mocks.createSupabaseCookieState.mockReset();
    mocks.createSupabaseRequestClient.mockReset();
    mocks.exchangeCodeForSession.mockReset();
    mocks.applySupabaseCookieState.mockReset();

    mocks.getAuthProvider.mockReturnValue("supabase");
    mocks.createSupabaseCookieState.mockImplementation(() => ({ cookies: [], headers: {} }));
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.createSupabaseRequestClient.mockReturnValue({
      auth: { exchangeCodeForSession: mocks.exchangeCodeForSession },
    });
    mocks.applySupabaseCookieState.mockImplementation((response: Response) => response);

    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserva um next interno relativo no redirect de sucesso", async () => {
    const response = await GET(makeRequest("?code=test-code&next=%2Fadmin"));

    const target = await expectRedirect(response, "/admin");
    expect(target.search).toBe("");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledOnce();
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example"])(
    "rejeita next externo (%s) e redireciona para a raiz interna",
    async (next) => {
      const query = new URLSearchParams({ code: "test-code", next }).toString();

      const response = await GET(makeRequest(`?${query}`));

      const target = await expectRedirect(response, "/");
      expect(target.hostname).toBe("localhost");
      expect(response.headers.get("location")).not.toContain("evil.example");
    },
  );

  it("retorna para /login?auth=erro quando o code está ausente", async () => {
    const response = await GET(makeRequest());

    const target = await expectRedirect(response, "/login");
    expect(target.search).toBe("?auth=erro");
    expect(mocks.createSupabaseRequestClient).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("retorna para a página de redefinição quando o fluxo de recovery está marcado", async () => {
    const response = await GET(makeRequest("?flow=recovery"));

    const target = await expectRedirect(response, "/redefinir-senha");
    expect(target.search).toBe("?recovery=erro");
    expect(mocks.createSupabaseRequestClient).not.toHaveBeenCalled();
  });

  it("converte erro explícito do Supabase em erro controlado no recovery", async () => {
    const response = await GET(makeRequest("?error=access_denied&flow=recovery"));

    const target = await expectRedirect(response, "/redefinir-senha");
    expect(target.search).toBe("?recovery=erro");
    expect(mocks.createSupabaseRequestClient).not.toHaveBeenCalled();
  });

  it("não cai na home quando um callback de recovery não informa next", async () => {
    const response = await GET(makeRequest("?code=test-code&flow=recovery"));

    const target = await expectRedirect(response, "/redefinir-senha");
    expect(target.search).toBe("");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
  });

  it("retorna para /login?auth=erro quando o exchange devolve erro", async () => {
    mocks.exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: "exchange failed" },
    });

    const response = await GET(makeRequest("?code=test-code&next=%2Fadmin"));

    const target = await expectRedirect(response, "/login");
    expect(target.search).toBe("?auth=erro");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(mocks.applySupabaseCookieState).toHaveBeenCalledOnce();
  });

  it("retorna para /login?auth=erro quando o exchange lança uma exceção", async () => {
    mocks.exchangeCodeForSession.mockRejectedValueOnce(new Error("exchange failed"));

    const response = await GET(makeRequest("?code=test-code"));

    const target = await expectRedirect(response, "/login");
    expect(target.search).toBe("?auth=erro");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(mocks.applySupabaseCookieState).toHaveBeenCalledOnce();
  });
});
