"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { DailyRecord } from "@/lib/data";

const MOODS = [
  { value: "bem", label: "😊 Bem" },
  { value: "neutro", label: "😐 Neutro" },
  { value: "cansado", label: "😴 Cansado" },
  { value: "triste", label: "😔 Triste / desanimado" },
  { value: "agitado", label: "😣 Agitado / inquieto" },
];

function fieldValue(value: string | number | null | undefined): string | number {
  return value ?? "";
}

export function DailyRecordForm({
  patientId,
  patientName,
  initialRecordDate,
  initialRecordTime,
  initialRecord,
}: {
  patientId: string;
  patientName: string;
  initialRecordDate: string;
  initialRecordTime: string;
  initialRecord?: DailyRecord | null;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialRecord);
  const [incident, setIncident] = useState(initialRecord?.incident === 1);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordDate, setRecordDate] = useState(initialRecord?.record_date || initialRecordDate);
  const [recordTime, setRecordTime] = useState(initialRecord?.record_time || initialRecordTime);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    formData.set("patient_id", patientId);
    if (initialRecord?.id) formData.set("record_id", initialRecord.id);
    if (!incident) formData.delete("incident_description");

    try {
      const response = await fetch("/api/records", {
        method: isEditing ? "PATCH" : "POST",
        body: formData,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "Não foi possível salvar o registro.");
        setLoading(false);
        return;
      }
      router.push("/cuidador");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:p-5">
        <h3 className="mb-1 text-sm font-semibold text-[var(--foreground)]">Quando os sinais vitais foram medidos?</h3>
        <p className="mb-4 text-xs leading-5 text-[var(--muted-2)]">
          Preenchemos com a data e a hora atuais. Ajuste se a medição tiver sido realizada em outro momento.
        </p>
        <div className="grid max-w-lg gap-4 sm:grid-cols-2">
          <Field label="Data da medição">
            <input
              type="date"
              name="record_date"
              value={recordDate}
              onChange={(event) => setRecordDate(event.target.value)}
              required
              className="input"
            />
          </Field>
          <Field label="Horário da medição">
            <input
              type="time"
              name="record_time"
              value={recordTime}
              onChange={(event) => setRecordTime(event.target.value)}
              required
              className="input"
            />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Sinais vitais</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Pressão sistólica (mmHg)">
            <input type="number" name="bp_systolic" min={50} max={260} defaultValue={fieldValue(initialRecord?.bp_systolic)} className="input" placeholder="Ex.: 130" />
          </Field>
          <Field label="Pressão diastólica (mmHg)">
            <input type="number" name="bp_diastolic" min={30} max={160} defaultValue={fieldValue(initialRecord?.bp_diastolic)} className="input" placeholder="Ex.: 85" />
          </Field>
          <Field label="Frequência cardíaca (bpm)">
            <input type="number" name="heart_rate" min={20} max={220} defaultValue={fieldValue(initialRecord?.heart_rate)} className="input" placeholder="Ex.: 76" />
          </Field>
          <Field label="Temperatura (°C)">
            <input type="number" step="0.1" name="temperature" min={30} max={43} defaultValue={fieldValue(initialRecord?.temperature)} className="input" placeholder="Ex.: 36,6" />
          </Field>
          <Field label="Saturação O₂ (%)">
            <input type="number" name="spo2" min={50} max={100} defaultValue={fieldValue(initialRecord?.spo2)} className="input" placeholder="Ex.: 97" />
          </Field>
          <Field label="Glicemia (mg/dL)">
            <input type="number" name="glucose" min={30} max={600} defaultValue={fieldValue(initialRecord?.glucose)} className="input" placeholder="Ex.: 110" />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Medicação e cuidados</h3>
        <div className="grid gap-4">
          <Field label="Medicação administrada">
            <textarea name="medications" rows={2} defaultValue={initialRecord?.medications || ""} className="input" placeholder="Nome, dose e horário de cada medicamento" />
          </Field>
          <Field label="Alimentação">
            <textarea name="feeding" rows={2} defaultValue={initialRecord?.feeding || ""} className="input" placeholder="Refeições realizadas, aceitação, hidratação..." />
          </Field>
          <Field label="Higiene">
            <textarea name="hygiene" rows={2} defaultValue={initialRecord?.hygiene || ""} className="input" placeholder="Banho, troca de roupa, cuidados de pele..." />
          </Field>
          <Field label="Mobilidade / atividades">
            <textarea name="mobility" rows={2} defaultValue={initialRecord?.mobility || ""} className="input" placeholder="Caminhadas, exercícios, tempo em cadeira/cama..." />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Humor e estado geral</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Humor predominante">
            <select name="mood" className="input" defaultValue={initialRecord?.mood || "bem"}>
              {MOODS.map((mood) => (
                <option key={mood.value} value={mood.value}>{mood.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Nível de dor relatado (0 a 10)">
            <input type="number" name="pain_level" min={0} max={10} defaultValue={fieldValue(initialRecord?.pain_level ?? 0)} className="input" />
          </Field>
        </div>
        <Field label="Observações gerais">
          <textarea name="notes" rows={3} defaultValue={initialRecord?.notes || ""} className="input mt-3" placeholder="Como foi o dia, comportamento, qualquer detalhe relevante..." />
        </Field>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Intercorrências</h3>
        <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
          <input
            type="checkbox"
            name="incident"
            checked={incident}
            onChange={(event) => setIncident(event.target.checked)}
            className="h-4 w-4"
          />
          Houve alguma intercorrência hoje (queda, mal-estar, alteração súbita etc.)
        </label>
        {incident && (
          <textarea
            name="incident_description"
            rows={3}
            required={incident}
            defaultValue={initialRecord?.incident_description || ""}
            className="input mt-3"
            placeholder="Descreva o que aconteceu, horário e as providências tomadas."
          />
        )}
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Foto (opcional)</h3>
        {initialRecord?.photo_data && (
          <label className="mb-3 flex items-center gap-2 text-sm text-[var(--muted)]">
            <input
              type="checkbox"
              name="remove_photo"
              checked={removePhoto}
              onChange={(event) => setRemovePhoto(event.target.checked)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            Remover a foto atual
          </label>
        )}
        <input
          type="file"
          name="photo"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            if (event.target.files?.length) setRemovePhoto(false);
          }}
          className="text-sm"
        />
        <p className="mt-1 text-xs text-[var(--muted-2)]">JPG, PNG ou WEBP, até 3 MB.</p>
      </section>

      {error && <p className="text-sm text-[var(--status-critical)]" role="alert" aria-live="polite">{error}</p>}

      <div className="flex items-center gap-3 border-t border-[var(--border)] pt-6">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {loading ? "Salvando..." : isEditing ? `Atualizar registro de ${patientName}` : `Salvar registro de ${patientName}`}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
        }
        .input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-light);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}
