import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeValue = vi.hoisted(() => vi.fn());

vi.mock("../src/lib/runtime-config", () => ({ runtimeValue }));

import { getSupabasePasswordResetRedirectUrl } from "../src/lib/supabase/auth";

describe("redirect de recuperação de senha Supabase", () => {
  beforeEach(() => {
    runtimeValue.mockReset();
  });

  it("usa a origem HTTP da própria requisição em localhost", () => {
    runtimeValue.mockReturnValue("https://localhost:5173");

    const redirect = new URL(
      getSupabasePasswordResetRedirectUrl("http://localhost:5173/api/auth/forgot-password"),
    );

    expect(redirect.origin).toBe("http://localhost:5173");
    expect(redirect.pathname).toBe("/auth/callback");
    expect(redirect.searchParams.get("next")).toBe("/redefinir-senha");
    expect(redirect.searchParams.get("flow")).toBe("recovery");
  });

  it("preserva a origem HTTPS configurada em um host de produção", () => {
    runtimeValue.mockReturnValue("https://app.vellorasaude.com.br");

    const redirect = new URL(
      getSupabasePasswordResetRedirectUrl("https://app.vellorasaude.com.br/api/auth/forgot-password"),
    );

    expect(redirect.origin).toBe("https://app.vellorasaude.com.br");
    expect(redirect.pathname).toBe("/auth/callback");
  });

  it("mantém a origem configurada mesmo quando o proxy informa HTTP no host remoto", () => {
    runtimeValue.mockReturnValue("https://app.vellorasaude.com.br");

    const redirect = new URL(
      getSupabasePasswordResetRedirectUrl("http://app.vellorasaude.com.br/api/auth/forgot-password"),
    );

    expect(redirect.origin).toBe("https://app.vellorasaude.com.br");
  });

  it.each([
    "http://app.vellorasaude.com.br",
    "javascript:alert(1)",
    "https://app.vellorasa.com.br/outro-caminho",
  ])("rejeita uma VELLORA_APP_URL insegura (%s)", (configuredUrl) => {
    runtimeValue.mockReturnValue(configuredUrl);

    expect(() =>
      getSupabasePasswordResetRedirectUrl("https://app.vellorasaude.com.br/api/auth/forgot-password"),
    ).toThrow();
  });
});
