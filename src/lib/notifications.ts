import { runtimeValue } from "./runtime-config";

type OperationalNotification = {
  idempotencyKey: string;
  subject: string;
  text: string;
};

function recipients(): string[] {
  return (runtimeValue("VELLORA_NOTIFICATION_EMAIL") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => /^\S+@\S+\.\S+$/.test(value));
}

export function isOperationalNotificationConfigured(): boolean {
  return Boolean(runtimeValue("RESEND_API_KEY") && runtimeValue("VELLORA_EMAIL_FROM")?.trim() && recipients().length);
}

/** Sends a short operational alert without putting application secrets in the browser. */
export async function sendOperationalNotification(input: OperationalNotification): Promise<boolean> {
  const apiKey = runtimeValue("RESEND_API_KEY");
  const from = runtimeValue("VELLORA_EMAIL_FROM")?.trim();
  const to = recipients();
  if (!apiKey || !from || to.length === 0) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `vellora-${input.idempotencyKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: input.subject,
      text: input.text,
    }),
  });

  if (!response.ok) throw new Error(`Falha no envio da notificação (${response.status}).`);
  return true;
}

export async function notifySafely(input: OperationalNotification, context: string): Promise<void> {
  try {
    await sendOperationalNotification(input);
  } catch (error) {
    console.error(`[notifications] ${context}`, {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
