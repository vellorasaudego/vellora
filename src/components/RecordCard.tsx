import { DailyRecord } from "@/lib/data";
import { statusBP, statusHeartRate, statusTemperature, statusSpo2, statusGlucose, worstStatus } from "@/lib/vitals";
import { StatusBadge } from "./ui/Badge";
import Link from "next/link";

const MOOD_LABEL: Record<string, string> = {
  bem: "😊 Bem",
  neutro: "😐 Neutro",
  triste: "😔 Triste / desanimado",
  cansado: "😴 Cansado",
  agitado: "😣 Agitado / inquieto",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export function RecordCard({
  record,
  caregiverName,
  editHref,
}: {
  record: DailyRecord;
  caregiverName?: string;
  editHref?: string;
}) {
  const overall = worstStatus(
    statusBP(record.bp_systolic, record.bp_diastolic),
    statusHeartRate(record.heart_rate),
    statusTemperature(record.temperature),
    statusSpo2(record.spo2),
    statusGlucose(record.glucose)
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)] capitalize">{formatDate(record.record_date)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[var(--muted-2)]">
            <span>{record.record_time ? `Sinais vitais medidos às ${record.record_time}` : "Horário da medição não informado"}</span>
            {caregiverName && (
              <>
                <span aria-hidden="true">•</span>
                <span>Registrado por {caregiverName}</span>
              </>
            )}
            {record.updated_at && record.updated_at !== record.created_at && (
              <>
                <span aria-hidden="true">•</span>
                <span>Atualizado posteriormente</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {record.incident === 1 && <StatusBadge status="critical" label="Intercorrência" />}
          <StatusBadge status={overall} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4 text-sm">
        <VitalCell label="Pressão" value={record.bp_systolic && record.bp_diastolic ? `${record.bp_systolic}/${record.bp_diastolic}` : "—"} unit="mmHg" />
        <VitalCell label="Freq. cardíaca" value={record.heart_rate ?? "—"} unit="bpm" />
        <VitalCell label="Temperatura" value={record.temperature ?? "—"} unit="°C" />
        <VitalCell label="Sat. O2" value={record.spo2 ?? "—"} unit="%" />
        <VitalCell label="Glicemia" value={record.glucose ?? "—"} unit="mg/dL" />
      </div>

      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-[var(--border)] pt-4">
        {record.medications && (
          <div>
            <dt className="text-[var(--muted-2)]">Medicação</dt>
            <dd className="text-[var(--foreground)]">{record.medications}</dd>
          </div>
        )}
        {record.feeding && (
          <div>
            <dt className="text-[var(--muted-2)]">Alimentação</dt>
            <dd className="text-[var(--foreground)]">{record.feeding}</dd>
          </div>
        )}
        {record.hygiene && (
          <div>
            <dt className="text-[var(--muted-2)]">Higiene</dt>
            <dd className="text-[var(--foreground)]">{record.hygiene}</dd>
          </div>
        )}
        {record.mobility && (
          <div>
            <dt className="text-[var(--muted-2)]">Mobilidade / atividades</dt>
            <dd className="text-[var(--foreground)]">{record.mobility}</dd>
          </div>
        )}
        {record.mood && (
          <div>
            <dt className="text-[var(--muted-2)]">Humor</dt>
            <dd className="text-[var(--foreground)]">{MOOD_LABEL[record.mood] || record.mood}</dd>
          </div>
        )}
        {record.pain_level != null && (
          <div>
            <dt className="text-[var(--muted-2)]">Nível de dor</dt>
            <dd className="text-[var(--foreground)]">{record.pain_level}/10</dd>
          </div>
        )}
      </dl>

      {record.notes && (
        <p className="mt-4 text-sm text-[var(--muted)] border-t border-[var(--border)] pt-4">
          <span className="text-[var(--muted-2)]">Observações: </span>
          {record.notes}
        </p>
      )}

      {record.incident === 1 && record.incident_description && (
        <div className="mt-4 rounded-xl bg-[var(--status-critical-bg)] p-4 text-sm text-[var(--status-critical)]">
          <p className="font-medium mb-1">Intercorrência relatada</p>
          <p>{record.incident_description}</p>
        </div>
      )}

      {record.photo_data && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={record.photo_data}
          alt="Foto anexada ao registro"
          className="mt-4 max-h-64 rounded-xl border border-[var(--border)] object-cover"
        />
      )}

      {editHref && (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <Link
            href={editHref}
            className="inline-flex rounded-lg border border-[var(--border-strong)] px-3.5 py-2 text-sm font-semibold text-[var(--brand-dark)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]"
          >
            Editar registro
          </Link>
        </div>
      )}
    </div>
  );
}

function VitalCell({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div className="rounded-xl bg-black/[0.02] p-3">
      <p className="text-xs text-[var(--muted-2)]">{label}</p>
      <p className="font-semibold text-[var(--foreground)]">
        {value} <span className="text-xs font-normal text-[var(--muted-2)]">{unit}</span>
      </p>
    </div>
  );
}
