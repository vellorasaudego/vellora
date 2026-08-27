import { NextRequest, NextResponse } from "next/server";
import { createProfessionalApplication } from "@/lib/data";
import { isSafePreview } from "@/lib/preview";
import { consumeRateLimit, isSameOriginRequest, verifyTurnstileToken } from "@/lib/abuse-prevention";
import { cleanText, isValidEmail, normalizedPhoneDigits } from "@/lib/validation";

const VALID_PROFESSIONS = new Set(["cuidador", "tecnico_enfermagem", "enfermeiro", "outros"]);
const PRIVACY_NOTICE_VERSION = "2026-08-21";
const VALID_DAYS = new Set(["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]);
const VALID_SHIFTS = new Set([
  "manha",
  "tarde",
  "noite",
  "plantao_12h_diurno",
  "plantao_12h_noturno",
  "plantao_24h",
]);

function cleanSelection(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && allowed.has(item)))];
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const rate = await consumeRateLimit(req, "professional-application", { limit: 3, windowSeconds: 600 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Muitas solicitações em pouco tempo. Aguarde alguns minutos e tente novamente." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados de cadastro inválidos." }, { status: 400 });
  }

  if (cleanText(body.company, 100)) {
    return NextResponse.json({ ok: true });
  }

  const name = cleanText(body.name, 120);
  const email = cleanText(body.email, 160).toLowerCase();
  const phone = cleanText(body.phone, 30);
  const city = cleanText(body.city, 100);
  const profession = cleanText(body.profession, 40);
  const coren = cleanText(body.coren, 40);
  const experience = cleanText(body.experience, 80);
  const availabilityDays = cleanSelection(body.availability_days, VALID_DAYS);
  const availabilityShifts = cleanSelection(body.availability_shifts, VALID_SHIFTS);
  const availableFrom = cleanText(body.available_from, 10);
  const notes = cleanText(body.notes, 1200);

  if (!name || !email || !phone || !city || !experience) {
    return NextResponse.json({ error: "Preencha os campos obrigatórios." }, { status: 400 });
  }
  if (!VALID_PROFESSIONS.has(profession)) {
    return NextResponse.json({ error: "Selecione uma área profissional válida." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (normalizedPhoneDigits(phone).length < 10) {
    return NextResponse.json({ error: "Informe um telefone com DDD." }, { status: 400 });
  }
  if ((profession === "tecnico_enfermagem" || profession === "enfermeiro") && !coren) {
    return NextResponse.json({ error: "Informe o COREN para profissionais de enfermagem." }, { status: 400 });
  }
  if (availabilityDays.length === 0 || availabilityShifts.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos um dia e um horário disponível." }, { status: 400 });
  }
  if (availableFrom && !/^\d{4}-\d{2}-\d{2}$/.test(availableFrom)) {
    return NextResponse.json({ error: "Informe uma data de disponibilidade válida." }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "É necessário autorizar o uso dos dados para concluir o cadastro." }, { status: 400 });
  }

  const turnstile = await verifyTurnstileToken(req, body.turnstile_token);
  if (!turnstile.ok) {
    if (turnstile.configured === false) {
      return NextResponse.json(
        { error: "A proteção de segurança está indisponível. O cadastro não pode ser enviado agora." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "A verificação de segurança expirou ou é inválida. Conclua-a novamente e tente enviar." },
      { status: 400 },
    );
  }

  if (isSafePreview()) {
    return NextResponse.json({ ok: true, preview: true });
  }

  try {
    const application = await createProfessionalApplication({
      name,
      email,
      phone,
      city,
      profession: profession as "cuidador" | "tecnico_enfermagem" | "enfermeiro" | "outros",
      coren,
      experience,
      availability_days: availabilityDays,
      availability_shifts: availabilityShifts,
      available_from: availableFrom,
      notes,
      lgpd_consent: true,
      privacy_notice_version: PRIVACY_NOTICE_VERSION,
    });

    return NextResponse.json({ ok: true, id: application.id });
  } catch (error) {
    console.error("[api/professionals] Não foi possível gravar a candidatura.", {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível enviar o cadastro agora. Tente novamente em alguns instantes." },
      { status: 503 }
    );
  }
}
