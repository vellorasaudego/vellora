import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/guard";
import {
  createRecord,
  getRecord,
  getPatient,
  isCaregiverAssignedToPatient,
  updateRecord,
  type DailyRecord,
} from "@/lib/data";
import { consumeRateLimit, isSameOriginRequest } from "@/lib/abuse-prevention";
import { cleanText, isValidIsoDate, isValidTime, parseOptionalNumber } from "@/lib/validation";
import { notifySafely } from "@/lib/notifications";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VALID_MOODS = new Set(["bem", "neutro", "cansado", "triste", "agitado"]);

const NUMERIC_FIELDS = {
  bp_systolic: { min: 50, max: 260, integer: true },
  bp_diastolic: { min: 30, max: 160, integer: true },
  heart_rate: { min: 20, max: 220, integer: true },
  temperature: { min: 30, max: 43 },
  spo2: { min: 50, max: 100, integer: true },
  glucose: { min: 30, max: 600, integer: true },
  pain_level: { min: 0, max: 10, integer: true },
} as const;

type RecordFieldValues = Omit<
  DailyRecord,
  "id" | "created_at" | "updated_at" | "patient_id" | "caregiver_user_id" | "photo_data"
>;

type PhotoReadResult = {
  provided: boolean;
  data: string | null;
  error?: string;
};

function limitedText(form: FormData, key: string, maxLength: number): string | null {
  const value = cleanText(form.get(key), maxLength);
  return value || null;
}

function validImageSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (type === "image/png") {
    return bytes.length >= 8 && bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
  }
  if (type === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

async function readPhoto(form: FormData): Promise<PhotoReadResult> {
  const photo = form.get("photo");
  if (!photo || typeof photo === "string" || photo.size === 0) {
    return { provided: false, data: null };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { provided: true, data: null, error: "Foto muito grande (máx. 3 MB)." };
  }
  if (!ALLOWED_TYPES.has(photo.type)) {
    return { provided: true, data: null, error: "Formato de imagem não suportado. Use JPG, PNG ou WEBP." };
  }

  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!validImageSignature(photo.type, bytes)) {
    return { provided: true, data: null, error: "O arquivo enviado não parece ser uma imagem válida." };
  }
  const buffer = Buffer.from(bytes);
  return { provided: true, data: `data:${photo.type};base64,${buffer.toString("base64")}` };
}

function parseRecordFields(form: FormData): { values?: RecordFieldValues; error?: string } {
  const recordDate = limitedText(form, "record_date", 10);
  const recordTime = limitedText(form, "record_time", 5);
  if (!recordDate || !isValidIsoDate(recordDate)) {
    return { error: "Informe uma data de medição válida." };
  }
  if (!recordTime || !isValidTime(recordTime)) {
    return { error: "Informe um horário de medição válido." };
  }

  const numbers: Record<string, number | null> = {};
  for (const [field, options] of Object.entries(NUMERIC_FIELDS)) {
    const parsed = parseOptionalNumber(form.get(field), options);
    if (!parsed.valid) return { error: `Informe um valor válido para ${field.replaceAll("_", " ")}.` };
    numbers[field] = parsed.value;
  }

  const mood = limitedText(form, "mood", 30);
  if (mood && !VALID_MOODS.has(mood)) return { error: "Selecione um humor válido." };

  const incident = form.get("incident") === "on" || form.get("incident") === "true" ? 1 : 0;
  const incidentDescription = limitedText(form, "incident_description", 2_000);
  if (incident && !incidentDescription) {
    return { error: "Descreva a intercorrência antes de salvar o registro." };
  }

  return {
    values: {
      record_date: recordDate,
      record_time: recordTime,
      bp_systolic: numbers.bp_systolic ?? null,
      bp_diastolic: numbers.bp_diastolic ?? null,
      heart_rate: numbers.heart_rate ?? null,
      temperature: numbers.temperature ?? null,
      spo2: numbers.spo2 ?? null,
      glucose: numbers.glucose ?? null,
      medications: limitedText(form, "medications", 2_000),
      feeding: limitedText(form, "feeding", 2_000),
      hygiene: limitedText(form, "hygiene", 2_000),
      mobility: limitedText(form, "mobility", 2_000),
      mood,
      pain_level: numbers.pain_level ?? null,
      notes: limitedText(form, "notes", 3_000),
      incident,
      incident_description: incident ? incidentDescription : null,
    },
  };
}

function isPhotoRemovalRequested(form: FormData): boolean {
  const value = form.get("remove_photo");
  return value === "on" || value === "true";
}

function photoFieldsForPatch(form: FormData, photo: PhotoReadResult): { photo_data?: string | null } {
  if (photo.provided) return { photo_data: photo.data };
  if (isPhotoRemovalRequested(form)) return { photo_data: null };
  return {};
}

function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

async function parseForm(req: NextRequest): Promise<FormData | NextResponse> {
  try {
    return await req.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  return saveRecord(req, "create");
}

export async function PATCH(req: NextRequest) {
  return saveRecord(req, "update");
}

async function saveRecord(req: NextRequest, mode: "create" | "update") {
  const guard = await requireRole("cuidador");
  if ("error" in guard) return guard.error;
  const { session } = guard;

  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 });
  }

  const form = await parseForm(req);
  if (form instanceof NextResponse) return form;

  const patientId = cleanText(form.get("patient_id"), 100);
  const recordId = cleanText(form.get("record_id"), 100);
  const rate = await consumeRateLimit(req, `records:${session.userId}`, { limit: 60, windowSeconds: 3_600 }, patientId);
  if (!rate.allowed) return rateLimitedResponse(rate.retryAfterSeconds);

  if (!patientId || !(await isCaregiverAssignedToPatient(session.userId, patientId))) {
    return NextResponse.json({ error: "Você não está vinculado a este paciente." }, { status: 403 });
  }

  const parsed = parseRecordFields(form);
  if (!parsed.values) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const photo = await readPhoto(form);
  if (photo.error) return NextResponse.json({ error: photo.error }, { status: 400 });

  try {
    if (mode === "create") {
      const record = await createRecord(
        {
          ...parsed.values,
          patient_id: patientId,
          caregiver_user_id: session.userId,
          photo_data: photo.data,
        },
        { userId: session.userId, name: session.name }
      );
      if (record.incident === 1) {
        const patient = await getPatient(patientId);
        await notifySafely(
          {
            idempotencyKey: `incident-${record.id}`,
            subject: "Intercorrência registrada — Vellora Saúde",
            text:
              `Uma intercorrência foi registrada no atendimento.\n\n` +
              `Paciente: ${patient?.name || patientId}\n` +
              `Data: ${record.record_date} às ${record.record_time || "horário não informado"}\n` +
              `Cuidador: ${session.name}\n\n` +
              `${record.incident_description || "Sem descrição."}`,
          },
          "Não foi possível enviar o alerta de intercorrência."
        );
      }
      return NextResponse.json({ ok: true, id: record.id, updated: false });
    }

    if (!recordId) return NextResponse.json({ error: "Registro não informado." }, { status: 400 });
    const existing = await getRecord(recordId);
    if (!existing || existing.patient_id !== patientId || existing.caregiver_user_id !== session.userId) {
      return NextResponse.json({ error: "Registro não encontrado ou sem permissão para edição." }, { status: 404 });
    }

    const updated = await updateRecord(
      recordId,
      {
        ...parsed.values,
        ...photoFieldsForPatch(form, photo),
      },
      { userId: session.userId, name: session.name }
    );
    if (!updated) return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
    const incidentChanged =
      updated.incident === 1 &&
      (existing.incident !== updated.incident || existing.incident_description !== updated.incident_description);
    if (incidentChanged) {
      const patient = await getPatient(patientId);
      await notifySafely(
        {
          idempotencyKey: `incident-${updated.id}-${updated.updated_at}`,
          subject: "Intercorrência atualizada — Vellora Saúde",
          text:
            `Uma intercorrência foi atualizada no atendimento.\n\n` +
            `Paciente: ${patient?.name || patientId}\n` +
            `Data: ${updated.record_date} às ${updated.record_time || "horário não informado"}\n` +
            `Cuidador: ${session.name}\n\n` +
            `${updated.incident_description || "Sem descrição."}`,
        },
        "Não foi possível enviar o alerta de intercorrência atualizada."
      );
    }
    return NextResponse.json({ ok: true, id: updated.id, updated: true });
  } catch (error) {
    console.error(`[api/records/${mode}] Não foi possível salvar o registro.`, {
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    return NextResponse.json(
      { error: "Não foi possível salvar o registro agora. Tente novamente em alguns instantes." },
      { status: 503 }
    );
  }
}
