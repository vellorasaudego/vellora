"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FamilyPatientServiceRate, Patient, ProfessionalApplication } from "@/lib/data";
import { PROFESSION_LABELS } from "@/components/schedules/date-utils";

type Profession = ProfessionalApplication["profession"];
type PatientOption = Pick<Patient, "id" | "name">;
type ServiceDraft = { selected: boolean; amount: string };
type PatientDraft = Record<Profession, ServiceDraft>;
type Drafts = Record<string, PatientDraft>;

const professions = Object.keys(PROFESSION_LABELS) as Profession[];
const inputClassName =
  "min-h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

function emptyPatientDraft(): PatientDraft {
  return {
    cuidador: { selected: false, amount: "" },
    tecnico_enfermagem: { selected: false, amount: "" },
    enfermeiro: { selected: false, amount: "" },
    outros: { selected: false, amount: "" },
  };
}

function draftsFromRates(patients: PatientOption[], rates: FamilyPatientServiceRate[]): Drafts {
  const result: Drafts = {};
  for (const patient of patients) result[patient.id] = emptyPatientDraft();
  for (const rate of rates) {
    if (rate.valid_to !== null || !result[rate.patient_id]) continue;
    result[rate.patient_id][rate.profession] = {
      selected: true,
      amount: (rate.amount_cents / 100).toFixed(2),
    };
  }
  return result;
}

function amountToCents(value: string): number | null {
  if (!value.trim()) return null;
  const normalized = value.trim().replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  return Math.round(amount * 100);
}

export function FamilyPatientServiceRatesManager({
  familyId,
  patients,
  rates,
  today,
  available,
}: {
  familyId: string;
  patients: PatientOption[];
  rates: FamilyPatientServiceRate[];
  today: string;
  available: boolean;
}) {
  const router = useRouter();
  const initialDrafts = useMemo(() => draftsFromRates(patients, rates), [patients, rates]);
  const [drafts, setDrafts] = useState<Drafts>(initialDrafts);
  const currentMonth = today.slice(0, 7);
  const [competenceMonth, setCompetenceMonth] = useState(currentMonth);
  const [savingPatientId, setSavingPatientId] = useState<string | null>(null);
  const [messageByPatient, setMessageByPatient] = useState<Record<string, string>>({});
  const [errorByPatient, setErrorByPatient] = useState<Record<string, string>>({});

  function changeService(patientId: string, profession: Profession, update: Partial<ServiceDraft>) {
    setDrafts((current) => ({
      ...current,
      [patientId]: {
        ...(current[patientId] || emptyPatientDraft()),
        [profession]: {
          ...(current[patientId]?.[profession] || emptyPatientDraft()[profession]),
          ...update,
        },
      },
    }));
    setMessageByPatient((current) => ({ ...current, [patientId]: "" }));
    setErrorByPatient((current) => ({ ...current, [patientId]: "" }));
  }

  async function submit(event: FormEvent<HTMLFormElement>, patient: PatientOption) {
    event.preventDefault();
    const currentDraft = drafts[patient.id] || emptyPatientDraft();
    const selectedRates: Array<{ profession: Profession; amount_cents: number }> = [];
    for (const profession of professions) {
      const service = currentDraft[profession];
      if (!service.selected) continue;
      const amountCents = amountToCents(service.amount);
      if (!amountCents) {
        setErrorByPatient((current) => ({
          ...current,
          [patient.id]: `Informe um valor por plantão válido para ${PROFESSION_LABELS[profession]}.`,
        }));
        setMessageByPatient((current) => ({ ...current, [patient.id]: "" }));
        return;
      }
      selectedRates.push({ profession, amount_cents: amountCents });
    }

    setSavingPatientId(patient.id);
    setMessageByPatient((current) => ({ ...current, [patient.id]: "" }));
    setErrorByPatient((current) => ({ ...current, [patient.id]: "" }));
    try {
      const response = await fetch(`/api/admin/families/${familyId}/service-rates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patient.id,
          effective_from: `${competenceMonth}-01`,
          rates: selectedRates,
        }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Não foi possível salvar os valores.");

      setMessageByPatient((current) => ({ ...current, [patient.id]: "Valores salvos. Os plantões da competência foram sincronizados." }));
      router.refresh();
    } catch (submissionError) {
      setErrorByPatient((current) => ({
        ...current,
        [patient.id]: submissionError instanceof Error
          ? submissionError.message
          : "Não foi possível salvar os valores. Tente novamente.",
      }));
    } finally {
      setSavingPatientId(null);
    }
  }

  return (
    <section className="mt-8" aria-labelledby="family-service-rates-heading">
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="family-service-rates-heading" className="text-lg font-semibold text-[var(--foreground)]">
            Serviços contratados e custo por plantão
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            Configure cada paciente separadamente. A tarifa vale para todo o mês selecionado, mesmo nos plantões anteriores ao cadastro.
          </p>
        </div>
        {patients.length > 0 && (
          <label className="w-full text-sm font-medium text-[var(--muted)] sm:max-w-56">
            Competência da tarifa
            <input
              type="month"
              value={competenceMonth}
              min={currentMonth}
              disabled={!available}
              onChange={(event) => setCompetenceMonth(event.target.value)}
              className={`${inputClassName} mt-1 disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)] disabled:opacity-70`}
            />
          </label>
        )}
      </header>

      {!available && (
        <div role="status" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          A configuração está aguardando a migration no banco. Você pode visualizar esta área, mas os valores só poderão ser editados e salvos depois que a migration for aplicada.
        </div>
      )}

      {patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-5 text-sm text-[var(--muted)]">
          Vincule pacientes a esta família antes de configurar os valores dos serviços.
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => {
            const patientDraft = drafts[patient.id] || emptyPatientDraft();
            const selectedCount = professions.filter((profession) => patientDraft[profession]?.selected).length;
            const saving = savingPatientId === patient.id;
            return (
              <details
                key={patient.id}
                className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden sm:px-5">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-[var(--foreground)]">{patient.name}</span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      {selectedCount ? `${selectedCount} serviço${selectedCount === 1 ? "" : "s"} configurado${selectedCount === 1 ? "" : "s"}` : "Nenhum serviço configurado"}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-lg text-[var(--brand)] transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <form onSubmit={(event) => void submit(event, patient)} className="border-t border-[var(--border)] px-4 py-4 sm:px-5">
                  <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
                    Marque somente as funções previstas no contrato para este paciente. Pagamentos já efetuados e valores ajustados manualmente serão preservados.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {professions.map((profession) => {
                      const service = patientDraft[profession] || emptyPatientDraft()[profession];
                      const inputId = `family-rate-${patient.id}-${profession}`;
                      return (
                        <div key={profession} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
                          <label htmlFor={`${inputId}-selected`} className="flex min-h-8 cursor-pointer items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                            <input
                              id={`${inputId}-selected`}
                              type="checkbox"
                              checked={service.selected}
                              disabled={!available}
                              onChange={(event) => changeService(patient.id, profession, { selected: event.target.checked })}
                              className="h-4 w-4 accent-[var(--brand)] disabled:cursor-not-allowed"
                            />
                            {PROFESSION_LABELS[profession]}
                          </label>
                          {service.selected && (
                            <label htmlFor={inputId} className="mt-3 block text-xs font-medium text-[var(--muted)]">
                              Custo por plantão (R$)
                              <input
                                id={inputId}
                                type="number"
                                min="0.01"
                                max="1000000"
                                step="0.01"
                                inputMode="decimal"
                                required
                                value={service.amount}
                                disabled={!available}
                                onChange={(event) => changeService(patient.id, profession, { amount: event.target.value })}
                                className={`${inputClassName} mt-1 disabled:cursor-not-allowed disabled:bg-[var(--surface-soft)] disabled:opacity-70`}
                              />
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p role="status" aria-live="polite" className="text-sm text-[var(--status-good)]">
                      {messageByPatient[patient.id] || ""}
                    </p>
                    <button
                      type="submit"
                      disabled={!available || saving || !competenceMonth}
                      className="min-h-11 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Salvando…" : "Salvar valores deste paciente"}
                    </button>
                  </div>
                  {errorByPatient[patient.id] && (
                    <p role="alert" aria-live="assertive" className="mt-3 text-sm text-[var(--status-critical)]">
                      {errorByPatient[patient.id]}
                    </p>
                  )}
                </form>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
