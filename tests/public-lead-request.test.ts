import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  createLead: vi.fn(),
  isSafePreview: vi.fn(),
  isSameOriginRequest: vi.fn(),
  notifySafely: vi.fn(),
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("../src/lib/abuse-prevention", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  isSameOriginRequest: mocks.isSameOriginRequest,
  verifyTurnstileToken: mocks.verifyTurnstileToken,
}));
vi.mock("../src/lib/data", () => ({ createLead: mocks.createLead }));
vi.mock("../src/lib/notifications", () => ({ notifySafely: mocks.notifySafely }));
vi.mock("../src/lib/preview", () => ({ isSafePreview: mocks.isSafePreview }));

import { handlePublicLeadRequest } from "../src/lib/public-lead-request";

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const lead = {
  id: "lead-123",
  name: "Maria da Silva",
  email: "maria@example.com",
  phone: "62999999999",
  patient_name: "João da Silva",
  care_type: "Cuidador 12h",
  message: "Preciso de apoio durante a recuperação.",
  status: "novo" as const,
  created_at: "2026-08-27T12:00:00.000Z",
};

const validPayload = {
  name: "Maria da Silva",
  email: "Maria@Example.com",
  phone: "(62) 99999-9999",
  patient_name: "João da Silva",
  care_type: "Cuidador 12h",
  message: "Preciso de apoio durante a recuperação.",
  consent: true,
};

function requestFor(payload: Record<string, unknown>): Request {
  return new Request("https://vellora.test/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://vellora.test" },
    body: JSON.stringify(payload),
  });
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  mocks.consumeRateLimit.mockResolvedValue({
    allowed: true,
    limit: 5,
    remaining: 4,
    retryAfterSeconds: 600,
  });
  mocks.createLead.mockResolvedValue(lead);
  mocks.isSafePreview.mockReturnValue(false);
  mocks.isSameOriginRequest.mockReturnValue(true);
  mocks.notifySafely.mockResolvedValue(undefined);
  mocks.verifyTurnstileToken.mockResolvedValue({ ok: true, configured: false, required: false });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("W8-LEAD-01 canal oficial de leads", () => {
  it("persiste e responde sucesso sem chamar Resend", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handlePublicLeadRequest(requestFor(validPayload) as never, "test/leads");

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({ ok: true, id: lead.id });
    expect(mocks.createLead).toHaveBeenCalledWith({
      name: validPayload.name,
      email: "maria@example.com",
      phone: validPayload.phone,
      patient_name: validPayload.patient_name,
      care_type: validPayload.care_type,
      message: validPayload.message,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.notifySafely).not.toHaveBeenCalled();
  });

  it("diferencia configuração ausente de token inválido", async () => {
    mocks.verifyTurnstileToken.mockResolvedValue({ ok: false, configured: false, required: true });
    let response = await handlePublicLeadRequest(requestFor(validPayload) as never, "test/leads");
    expect(response.status).toBe(503);
    await expect(responseBody(response)).resolves.toEqual({
      error: "A proteção de segurança está indisponível. A solicitação não pode ser enviada agora.",
    });
    expect(mocks.createLead).not.toHaveBeenCalled();

    mocks.verifyTurnstileToken.mockResolvedValue({ ok: false, configured: true, required: true });
    response = await handlePublicLeadRequest(requestFor(validPayload) as never, "test/leads");
    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      error: "A verificação de segurança expirou ou é inválida. Conclua-a novamente e tente enviar.",
    });
    expect(mocks.createLead).not.toHaveBeenCalled();
  });

  it.each([
    ["campos obrigatórios", { name: "" }],
    ["e-mail inválido", { email: "não-é-e-mail" }],
    ["telefone sem DDD", { phone: "999999999" }],
    ["consentimento ausente", { consent: false }],
  ])("continua rejeitando falhas de validação: %s", async (_label, overrides) => {
    const response = await handlePublicLeadRequest(
      requestFor({ ...validPayload, ...overrides }) as never,
      "test/leads",
    );

    expect(response.status).toBe(400);
    expect(mocks.createLead).not.toHaveBeenCalled();
    expect(mocks.notifySafely).not.toHaveBeenCalled();
  });
});

describe("W8-LEAD-01 contratos de escopo", () => {
  it("bloqueia o formulário quando a proteção obrigatória não está configurada", () => {
    const form = readProjectFile("src/components/ContactForm.tsx");
    const widget = readProjectFile("src/components/TurnstileWidget.tsx");
    const page = readProjectFile("src/app/solicitar-cuidado/page.tsx");

    expect(page).toContain("turnstileRequired={isTurnstileRequired()}");
    expect(form).toContain("turnstileUnavailable");
    expect(form).toContain("disabled={status === \"sending\" || turnstileUnavailable || turnstilePending}");
    expect(widget).toContain("Proteção de segurança indisponível");
  });

  it("só permite envio com token quando o widget está configurado", () => {
    const form = readProjectFile("src/components/ContactForm.tsx");
    const widget = readProjectFile("src/components/TurnstileWidget.tsx");
    expect(form).toContain("if (turnstilePending)");
    expect(form).toContain("required={turnstileRequired}");
    expect(widget).toContain("Verificação concluída.");
    expect(widget).toContain("A verificação expirou");
  });

  it("deixa o painel como fonte explícita de acompanhamento", () => {
    const page = readProjectFile("src/app/admin/leads/page.tsx");

    expect(page).toContain("Novas solicitações ficam disponíveis aqui");
    expect(page).toContain("fonte oficial para acompanhar o contato");
  });

  it("remove as notificações de leads e candidaturas e preserva alertas de intercorrências", () => {
    const leadHandler = readProjectFile("src/lib/public-lead-request.ts");
    const professionalHandler = readProjectFile("src/app/api/professionals/route.ts");
    const recordsHandler = readProjectFile("src/app/api/records/route.ts");

    expect(leadHandler).not.toContain("notifySafely");
    expect(leadHandler).not.toContain("./notifications");
    expect(professionalHandler).not.toContain("notifySafely");
    expect(professionalHandler).not.toContain("professional-application-");
    expect(professionalHandler).not.toContain("@/lib/notifications");
    expect(recordsHandler).toContain("notifySafely");
    expect(recordsHandler).toContain("incident-");
  });
});
