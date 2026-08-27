import { afterEach, describe, expect, it, vi } from "vitest";

const workerEnv = vi.hoisted(() => ({}) as Record<string, unknown>);

vi.mock("cloudflare:workers", () => ({ env: workerEnv }));

import {
  isOperationalNotificationConfigured,
  notifySafely,
  sendOperationalNotification,
} from "../src/lib/notifications";

const configKeys = [
  "RESEND_API_KEY",
  "VELLORA_EMAIL_FROM",
  "VELLORA_NOTIFICATION_EMAIL",
] as const;

const notification = {
  idempotencyKey: "lead-123",
  subject: "Novo contato",
  text: "Uma nova solicitação foi recebida.",
};

function setNotificationConfig(
  overrides: Partial<Record<(typeof configKeys)[number], string>> = {},
): void {
  for (const key of configKeys) vi.stubEnv(key, "");
  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value);
  }
}

function clearWorkerEnv(): void {
  for (const key of Object.keys(workerEnv)) delete workerEnv[key];
}

function idempotencyHeader(request: RequestInit | undefined): string | undefined {
  const headers = request?.headers;
  if (!headers || Array.isArray(headers) || headers instanceof Headers) return undefined;

  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === "idempotency-key");
  return entry?.[1];
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  clearWorkerEnv();
});

describe("notificações operacionais", () => {
  it("reconhece destinatários válidos e rejeita configuração incompleta", () => {
    const completeConfig = {
      RESEND_API_KEY: "resend-test-key",
      VELLORA_EMAIL_FROM: "alerts@vellora.test",
      VELLORA_NOTIFICATION_EMAIL: "ops@example.com, admin@example.org",
    };

    setNotificationConfig(completeConfig);
    expect(isOperationalNotificationConfigured()).toBe(true);

    for (const key of configKeys) {
      setNotificationConfig({ ...completeConfig, [key]: "" });
      expect(isOperationalNotificationConfigured()).toBe(false);
    }

    setNotificationConfig({
      ...completeConfig,
      VELLORA_NOTIFICATION_EMAIL: "not-an-email,also-invalid",
    });
    expect(isOperationalNotificationConfigured()).toBe(false);
  });

  it("envia o payload esperado com destinatários normalizados e chave de idempotência", async () => {
    setNotificationConfig({
      RESEND_API_KEY: "resend-test-key",
      VELLORA_EMAIL_FROM: " alerts@vellora.test ",
      VELLORA_NOTIFICATION_EMAIL: " Admin@Example.com, inválido, second@example.org ",
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, status: 202 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendOperationalNotification(notification)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer resend-test-key",
        "Content-Type": "application/json",
        "Idempotency-Key": "vellora-lead-123",
      },
    });
    expect(JSON.parse(String(request?.body))).toEqual({
      from: "alerts@vellora.test",
      to: ["admin@example.com", "second@example.org"],
      subject: notification.subject,
      text: notification.text,
    });
  });

  it("rejeita respostas não-2xx sem fazer nova chamada de rede", async () => {
    setNotificationConfig({
      RESEND_API_KEY: "resend-test-key",
      VELLORA_EMAIL_FROM: "alerts@vellora.test",
      VELLORA_NOTIFICATION_EMAIL: "ops@example.com",
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: false, status: 503 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendOperationalNotification(notification)).rejects.toThrow("503");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("absorve falhas em notifySafely sem propagar a chave administrativa", async () => {
    const secret = "resend-secret-must-not-leak";
    setNotificationConfig({
      RESEND_API_KEY: secret,
      VELLORA_EMAIL_FROM: "alerts@vellora.test",
      VELLORA_NOTIFICATION_EMAIL: "ops@example.com",
    });
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("falha temporária de rede"));
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(notifySafely(notification, "lead-created")).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledOnce();
    expect(JSON.stringify(consoleError.mock.calls[0])).toContain("lead-created");
    expect(JSON.stringify(consoleError.mock.calls[0])).not.toContain(secret);
  });

  it("mantém o mesmo Idempotency-Key para reenvios do mesmo evento", async () => {
    setNotificationConfig({
      RESEND_API_KEY: "resend-test-key",
      VELLORA_EMAIL_FROM: "alerts@vellora.test",
      VELLORA_NOTIFICATION_EMAIL: "ops@example.com",
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({ ok: true, status: 200 } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await sendOperationalNotification(notification);
    await sendOperationalNotification(notification);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstKey = idempotencyHeader(fetchMock.mock.calls[0]?.[1]);
    const secondKey = idempotencyHeader(fetchMock.mock.calls[1]?.[1]);
    expect(firstKey).toBe("vellora-lead-123");
    expect(secondKey).toBe(firstKey);
  });
});
