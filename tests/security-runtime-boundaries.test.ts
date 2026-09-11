import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientAddress } from "../src/lib/abuse-prevention";
import {
  adminMutationSecurityError,
  enforceAdminMutationSecurity,
  isAdminMutationRequest,
} from "../src/lib/request-security";
import { setRuntimeBindings } from "../src/lib/runtime-config";

const supabaseMocks = vi.hoisted(() => ({
  createServerClient: vi.fn(() => ({})),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: supabaseMocks.createServerClient,
}));

import {
  createSupabaseCookieState,
  createSupabaseRequestClient,
} from "../src/lib/supabase/server";

function request(method: string, headers: Record<string, string> = {}): Request {
  return new Request("https://www.vellorasaude.com.br/api/admin/test", {
    method,
    headers,
  });
}

afterEach(() => {
  setRuntimeBindings({});
  supabaseMocks.createServerClient.mockClear();
});

describe("SEC-RUNTIME-BOUNDARIES: identificação do cliente", () => {
  it("não aceita cf-connecting-ip sem a configuração dupla de proxy confiável", () => {
    setRuntimeBindings({});
    expect(
      getClientAddress({
        headers: new Headers({ "cf-connecting-ip": "198.51.100.10" }),
      }),
    ).toBe("unknown");

    setRuntimeBindings({ VELLORA_TRUSTED_PROXY: "cloudflare" });
    expect(
      getClientAddress({
        headers: new Headers({ "cf-connecting-ip": "198.51.100.10" }),
      }),
    ).toBe("unknown");
  });

  it("usa o header de edge documentado e depois o primeiro encaminhado", () => {
    setRuntimeBindings({});
    expect(
      getClientAddress({
        headers: new Headers({
          "x-real-ip": "198.51.100.11",
          "x-forwarded-for": "198.51.100.12, 198.51.100.13",
        }),
      }),
    ).toBe("198.51.100.11");

    expect(
      getClientAddress({
        headers: new Headers({ "x-forwarded-for": "198.51.100.12, 198.51.100.13" }),
      }),
    ).toBe("198.51.100.12");
  });

  it("aceita o header Cloudflare somente com as duas flags explícitas", () => {
    setRuntimeBindings({
      VELLORA_TRUSTED_PROXY: "cloudflare",
      VELLORA_TRUST_CF_CONNECTING_IP: "true",
    });
    expect(
      getClientAddress({
        headers: new Headers({
          "cf-connecting-ip": "198.51.100.14",
          "x-real-ip": "198.51.100.15",
        }),
      }),
    ).toBe("198.51.100.14");
  });
});

describe("SEC-RUNTIME-BOUNDARIES: mutações administrativas", () => {
  it("aplica a checagem somente a métodos mutáveis de /api/admin", () => {
    expect(isAdminMutationRequest(request("GET"))).toBe(false);
    expect(isAdminMutationRequest(request("POST"))).toBe(true);
    expect(
      isAdminMutationRequest(
        new Request("https://www.vellorasaude.com.br/api/adminish/test", { method: "POST" }),
      ),
    ).toBe(false);
  });

  it("permite origem igual e clientes sem metadados de navegador", () => {
    expect(adminMutationSecurityError(request("POST"))).toBeNull();
    expect(
      adminMutationSecurityError(
        request("PATCH", { Origin: "https://www.vellorasaude.com.br" }),
      ),
    ).toBeNull();
    expect(
      adminMutationSecurityError(
        request("DELETE", { "Sec-Fetch-Site": "same-site" }),
      ),
    ).toBeNull();
  });

  it("bloqueia origem e Fetch Metadata cross-site com resposta sem cache", async () => {
    const crossOrigin = enforceAdminMutationSecurity(
      request("POST", { Origin: "https://evil.example" }),
    );
    expect(crossOrigin?.status).toBe(403);
    expect(crossOrigin?.headers.get("Cache-Control")).toBe("no-store");

    expect(
      adminMutationSecurityError(request("PUT", { "Sec-Fetch-Site": "cross-site" })),
    ).toBe("Origem da solicitação não autorizada.");
  });
});

describe("SEC-RUNTIME-BOUNDARIES: cookies Supabase", () => {
  it("aplica Secure em HTTPS sem forçar HttpOnly incompatível com o browser client", () => {
    setRuntimeBindings({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      VELLORA_APP_URL: "http://localhost:5173",
    });

    const set = vi.fn();
    const state = createSupabaseCookieState();
    const requestClient = {
      url: "https://www.vellorasaude.com.br/auth/callback",
      cookies: {
        getAll: () => [],
        set,
      },
    } as unknown as Parameters<typeof createSupabaseRequestClient>[0];

    createSupabaseRequestClient(requestClient, state);
    const createCall = supabaseMocks.createServerClient.mock.calls[0] as unknown as [
      unknown,
      unknown,
      {
      cookies: { setAll: (items: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void };
      },
    ];
    const options = createCall[2];
    options.cookies.setAll([
      { name: "sb-session", value: "token", options: { path: "/", httpOnly: false } },
    ]);

    expect(state.cookies[0]?.options.secure).toBe(true);
    expect(state.cookies[0]?.options.httpOnly).toBe(false);
    expect(set).toHaveBeenCalledWith("sb-session", "token");
  });
});

describe("SEC-RUNTIME-BOUNDARIES: projeções dos portais", () => {
  it("mantém a projeção portal sem notes e os reads administrativos completos", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const supabaseSource = readFileSync(resolve(process.cwd(), "src/lib/supabase/data.ts"), "utf8");
    const legacySource = readFileSync(resolve(process.cwd(), "src/lib/data.ts"), "utf8");

    expect(supabaseSource).toContain("const PORTAL_PATIENT_COLUMNS");
    expect(supabaseSource).toContain('.select(PORTAL_PATIENT_COLUMNS)');
    expect(legacySource).toContain("const PORTAL_PATIENT_COLUMNS");
    expect(legacySource).toContain("SELECT ${PORTAL_PATIENT_COLUMNS}");
    expect(legacySource).toContain("SELECT p.${PORTAL_PATIENT_COLUMNS.replaceAll");

    expect(supabaseSource).toContain('client.from("patients").select("*")');
    expect(legacySource).toContain('query<Patient>("SELECT * FROM patients ORDER BY created_at DESC")');
    expect(legacySource).toContain('queryOne<Patient>("SELECT * FROM patients WHERE id = $1", [id])');
  });
});
