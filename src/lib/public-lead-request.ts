import { NextRequest, NextResponse } from "next/server";
import { createLead } from "./data";
import { isSafePreview } from "./preview";
import { consumeRateLimit, isSameOriginRequest, verifyTurnstileToken } from "./abuse-prevention";
import { cleanText, isValidEmail, normalizedPhoneDigits } from "./validation";
import { notifySafely } from "./notifications";

export async function handlePublicLeadRequest(req: NextRequest, logLabel: string) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const rate = await consumeRateLimit(req, logLabel, { limit: 5, windowSeconds: 600 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados da solicitação inválidos." }, { status: 400 });
  }

  if (cleanText(body.company, 100)) {
    return NextResponse.json({ ok: true });
  }

  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 160).toLowerCase();
  const phone = cleanText(body.phone, 30);
  const patientName = cleanText(body.patient_name, 120);
  const careType = cleanText(body.care_type, 100);
  const message = cleanText(body.message, 1800);

  if (!name || !email || !phone || !patientName || !careType) {
    return NextResponse.json(
      { error: "Preencha os campos obrigatórios da solicitação." },
      { status: 400 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (normalizedPhoneDigits(phone).length < 10) {
    return NextResponse.json({ error: "Informe um telefone com DDD." }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "É necessário autorizar o uso dos dados para enviar a solicitação." },
      { status: 400 }
    );
  }

  const turnstile = await verifyTurnstileToken(req, body.turnstile_token);
  if (!turnstile.ok) {
    return NextResponse.json({ error: "Confirme a verificação de segurança e tente novamente." }, { status: 400 });
  }

  if (isSafePreview()) {
    return NextResponse.json({ ok: true, preview: true });
  }

  try {
    const lead = await createLead({
      name,
      email,
      phone,
      patient_name: patientName,
      care_type: careType,
      message: message || undefined,
    });
    await notifySafely(
      {
        idempotencyKey: `lead-${lead.id}`,
        subject: "Nova solicitação de cuidado — Vellora Saúde",
        text:
          `Nova solicitação recebida.\n\n` +
          `Nome: ${lead.name}\n` +
          `Paciente: ${lead.patient_name || "Não informado"}\n` +
          `Telefone: ${lead.phone}\n` +
          `E-mail: ${lead.email}\n` +
          `Tipo de cuidado: ${lead.care_type || "Não informado"}\n\n` +
          `${lead.message || "Sem mensagem adicional."}`,
      },
      "Não foi possível enviar o alerta de nova solicitação."
    );
    return NextResponse.json({ ok: true, id: lead.id });
  } catch (error) {
    console.error(`[${logLabel}] Não foi possível gravar a solicitação.`, {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível registrar a solicitação agora. Tente novamente em alguns instantes." },
      { status: 503 }
    );
  }
}
