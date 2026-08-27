import type { DailyRecordAuditEvent } from "@/lib/data";
import { DAILY_RECORD_FIELD_LABELS } from "@/lib/record-utils";

function formatDate(value: string): string {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function RecordAuditTimeline({ events }: { events: DailyRecordAuditEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--muted-2)]">Nenhuma alteração registrada ainda.</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const fields = event.changed_fields
          .map((field) => DAILY_RECORD_FIELD_LABELS[field as keyof typeof DAILY_RECORD_FIELD_LABELS] || field)
          .join(", ");
        return (
          <li key={event.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[var(--foreground)]">
                {event.action === "created" ? "Registro criado" : "Registro atualizado"}
              </p>
              <time className="text-xs text-[var(--muted-2)]" dateTime={event.created_at}>
                {formatDate(event.created_at)}
              </time>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">Por {event.actor_name}</p>
            {fields && <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Campos: {fields}.</p>}
          </li>
        );
      })}
    </ol>
  );
}
