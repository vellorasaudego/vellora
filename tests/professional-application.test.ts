import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
  createProfessionalApplication: vi.fn(),
  isSafePreview: vi.fn(),
  isSameOriginRequest: vi.fn(),
  notifySafely: vi.fn(),
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/abuse-prevention", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
  isSameOriginRequest: mocks.isSameOriginRequest,
  verifyTurnstileToken: mocks.verifyTurnstileToken,
}));
vi.mock("@/lib/data", () => ({
  createProfessionalApplication: mocks.createProfessionalApplication,
}));
vi.mock("@/lib/notifications", () => ({ notifySafely: mocks.notifySafely }));
vi.mock("@/lib/preview", () => ({ isSafePreview: mocks.isSafePreview }));
vi.mock("@/lib/validation", async () => await import("../src/lib/validation"));

import { POST } from "../src/app/api/professionals/route";

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

const application = {
  id: "application-123",
};

const validPayload = {
  name: "Ana da Silva",
  email: "Ana@Example.com",
  phone: "(62) 99999-9999",
  city: "Goiânia",
  profession: "cuidador",
  coren: "",
  experience: "Cinco anos de experiência",
  availability_days: ["segunda", "quarta"],
  availability_shifts: ["manha", "tarde"],
  available_from: "2026-09-01",
  notes: "Disponível para atendimento domiciliar.",
  consent: true,
};

function requestFor(payload: Record<string, unknown>): Request {
  return new Request("https://vellora.test/api/professionals", {
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
    limit: 3,
    remaining: 2,
    retryAfterSeconds: 600,
  });
  mocks.createProfessionalApplication.mockResolvedValue(application);
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

describe("W9-PRO-01 canal oficial de candidaturas", () => {
  it("persiste e responde sucesso sem chamar Resend", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(requestFor(validPayload) as never);

    expect(response.status).toBe(200);
    await expect(responseBody(response)).resolves.toEqual({ ok: true, id: application.id });
    expect(mocks.createProfessionalApplication).toHaveBeenCalledWith({
      name: validPayload.name,
      email: "ana@example.com",
      phone: validPayload.phone,
      city: validPayload.city,
      profession: validPayload.profession,
      coren: validPayload.coren,
      experience: validPayload.experience,
      availability_days: validPayload.availability_days,
      availability_shifts: validPayload.availability_shifts,
      available_from: validPayload.available_from,
      notes: validPayload.notes,
      lgpd_consent: true,
      privacy_notice_version: "2026-08-21",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.notifySafely).not.toHaveBeenCalled();
  });

  it.each([
    ["campos obrigatórios", { name: "" }],
    ["e-mail inválido", { email: "não-é-e-mail" }],
    ["telefone sem DDD", { phone: "999999999" }],
    ["profissão inválida", { profession: "profissao-invalida" }],
    ["disponibilidade sem dia", { availability_days: [] }],
    ["disponibilidade sem turno", { availability_shifts: [] }],
    ["COREN ausente para enfermagem", { profession: "enfermeiro", coren: "" }],
    ["consentimento ausente", { consent: false }],
  ])("continua rejeitando falhas de validação: %s", async (_label, overrides) => {
    const response = await POST(requestFor({ ...validPayload, ...overrides }) as never);

    expect(response.status).toBe(400);
    expect(mocks.createProfessionalApplication).not.toHaveBeenCalled();
    expect(mocks.notifySafely).not.toHaveBeenCalled();
  });
});

describe("W9-PRO-01 barreiras de entrada", () => {
  it("mantém origem, rate limit e Turnstile antes da persistência", async () => {
    mocks.isSameOriginRequest.mockReturnValue(false);
    let response = await POST(requestFor(validPayload) as never);
    expect(response.status).toBe(403);

    mocks.isSameOriginRequest.mockReturnValue(true);
    mocks.consumeRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 37 });
    response = await POST(requestFor(validPayload) as never);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("37");

    mocks.consumeRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 600 });
    mocks.verifyTurnstileToken.mockResolvedValue({ ok: false, configured: true, required: true });
    response = await POST(requestFor(validPayload) as never);
    expect(response.status).toBe(400);
    expect(mocks.createProfessionalApplication).not.toHaveBeenCalled();
  });

  it("diferencia configuração ausente de token inválido", async () => {
    mocks.verifyTurnstileToken.mockResolvedValue({ ok: false, configured: false, required: true });
    let response = await POST(requestFor(validPayload) as never);
    expect(response.status).toBe(503);
    await expect(responseBody(response)).resolves.toEqual({
      error: "A proteção de segurança está indisponível. O cadastro não pode ser enviado agora.",
    });
    expect(mocks.createProfessionalApplication).not.toHaveBeenCalled();

    mocks.verifyTurnstileToken.mockResolvedValue({ ok: false, configured: true, required: true });
    response = await POST(requestFor(validPayload) as never);
    expect(response.status).toBe(400);
    await expect(responseBody(response)).resolves.toEqual({
      error: "A verificação de segurança expirou ou é inválida. Conclua-a novamente e tente enviar.",
    });
    expect(mocks.createProfessionalApplication).not.toHaveBeenCalled();
  });
});

describe("W9-PRO-01 contratos do canal", () => {
  it("bloqueia o formulário quando a proteção obrigatória não está configurada", () => {
    const form = readProjectFile("src/components/ProfessionalApplicationForm.tsx");
    const widget = readProjectFile("src/components/TurnstileWidget.tsx");
    const page = readProjectFile("src/app/trabalhe-conosco/page.tsx");

    expect(page).toContain("turnstileRequired={isTurnstileRequired()}");
    expect(form).toContain("turnstileUnavailable");
    expect(form).toContain("disabled={status === \"sending\" || !lgpdAuthorized || turnstileUnavailable || turnstilePending}");
    expect(widget).toContain("Proteção de segurança indisponível");
  });

  it("só permite envio com token quando o widget está configurado", () => {
    const form = readProjectFile("src/components/ProfessionalApplicationForm.tsx");
    const widget = readProjectFile("src/components/TurnstileWidget.tsx");
    expect(form).toContain("if (turnstilePending)");
    expect(form).toContain("required={turnstileRequired}");
    expect(widget).toContain("Verificação concluída.");
    expect(widget).toContain("A verificação expirou");
  });

  it("declara o painel como fonte oficial de acompanhamento", () => {
    const page = readProjectFile("src/app/admin/profissionais/page.tsx");

    expect(page).toContain("Novas candidaturas ficam disponíveis neste painel");
    expect(page).toContain("fonte oficial para acompanhar cada processo");
  });

  it("remove o dispatch de nova candidatura e preserva os alertas de intercorrências", () => {
    const professionalRoute = readProjectFile("src/app/api/professionals/route.ts");
    const recordsRoute = readProjectFile("src/app/api/records/route.ts");

    expect(professionalRoute).not.toContain("@/lib/notifications");
    expect(professionalRoute).not.toContain("notifySafely");
    expect(professionalRoute).not.toContain("professional-application-");
    expect(recordsRoute).toContain('import { notifySafely } from "@/lib/notifications";');
    expect(recordsRoute).toContain("notifySafely(");
    expect(recordsRoute).toContain("incident-${record.id}");
    expect(recordsRoute).toContain("incident-${updated.id}-${updated.updated_at}");
  });
});
