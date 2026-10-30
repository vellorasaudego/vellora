import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-error";
import { requireRole } from "@/lib/guard";
import {
  getPatient,
  getUserById,
  listFamilyPatientServiceRates,
  saveFamilyPatientServiceRates,
  type FamilyPatientServiceRateInput,
  type ProfessionalApplication,
} from "@/lib/data";
import { isValidIsoDate } from "@/lib/validation";

const PROFESSIONS = new Set<ProfessionalApplication["profession"]>([
  "cuidador",
  "tecnico_enfermagem",
  "enfermeiro",
  "outros",
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function brazilToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function getFamily(id: string) {
  const family = await getUserById(id);
  return family?.role === "familia" && !family.deleted_at ? family : undefined;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Família não encontrada." }, { status: 404 });

  try {
    if (!(await getFamily(id))) return NextResponse.json({ error: "Família não encontrada." }, { status: 404 });
    const rates = await listFamilyPatientServiceRates(id);
    return NextResponse.json({ rates });
  } catch (error) {
    return apiError(error, "api/admin/families/service-rates", "Não foi possível carregar os valores dos serviços.");
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole("admin");
  if ("error" in guard) return guard.error;

  const { id: familyId } = await params;
  if (!UUID_PATTERN.test(familyId)) return NextResponse.json({ error: "Família não encontrada." }, { status: 404 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Informe os valores dos serviços." }, { status: 400 });
  }
  const patientId = body.patient_id;
  const effectiveFrom = body.effective_from;
  const rawRates = body.rates;
  if (typeof patientId !== "string" || !UUID_PATTERN.test(patientId)) {
    return NextResponse.json({ error: "Selecione um paciente válido." }, { status: 400 });
  }
  if (typeof effectiveFrom !== "string" || !isValidIsoDate(effectiveFrom)) {
    return NextResponse.json({ error: "Informe uma data de início válida." }, { status: 400 });
  }
  const currentMonth = brazilToday().slice(0, 7);
  if (effectiveFrom.slice(0, 7) < currentMonth) {
    return NextResponse.json({ error: "A competência da tarifa deve ser o mês atual ou um mês futuro." }, { status: 400 });
  }
  const effectiveMonthStart = `${effectiveFrom.slice(0, 7)}-01`;
  if (!Array.isArray(rawRates) || rawRates.length > PROFESSIONS.size) {
    return NextResponse.json({ error: "A lista de serviços é inválida." }, { status: 400 });
  }

  const rates: FamilyPatientServiceRateInput["rates"] = [];
  const selected = new Set<string>();
  for (const item of rawRates) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return NextResponse.json({ error: "Informe um serviço e valor válidos." }, { status: 400 });
    }
    const rate = item as Record<string, unknown>;
    if (
      typeof rate.profession !== "string"
      || !PROFESSIONS.has(rate.profession as ProfessionalApplication["profession"])
      || selected.has(rate.profession)
      || typeof rate.amount_cents !== "number"
      || !Number.isSafeInteger(rate.amount_cents)
      || rate.amount_cents < 1
      || rate.amount_cents > 100_000_000
    ) {
      return NextResponse.json({ error: "Informe valores positivos e únicos para os serviços contratados." }, { status: 400 });
    }
    selected.add(rate.profession);
    rates.push({
      profession: rate.profession as ProfessionalApplication["profession"],
      amount_cents: rate.amount_cents,
    });
  }

  try {
    const [family, patient] = await Promise.all([getFamily(familyId), getPatient(patientId)]);
    if (!family) return NextResponse.json({ error: "Família não encontrada." }, { status: 404 });
    if (!patient || patient.family_user_id !== family.id) {
      return NextResponse.json({ error: "Este paciente não está vinculado à família selecionada." }, { status: 400 });
    }

    await saveFamilyPatientServiceRates({
      family_user_id: family.id,
      patient_id: patient.id,
      effective_from: effectiveMonthStart,
      rates,
    });
    const savedRates = await listFamilyPatientServiceRates(family.id);
    return NextResponse.json({
      ok: true,
      rates: savedRates.filter((rate) => rate.patient_id === patient.id),
    });
  } catch (error) {
    return apiError(error, "api/admin/families/service-rates", "Não foi possível salvar os valores dos serviços.");
  }
}
