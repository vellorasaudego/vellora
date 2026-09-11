import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getPatientForPortal, listRecordsForPatient, isCaregiverAssignedToPatient, getCaregiverNamesMap, type DailyRecord } from "@/lib/data";
import { RecordCard } from "@/components/RecordCard";

function groupRecordsByDate(records: DailyRecord[]) {
  const groups = new Map<string, DailyRecord[]>();
  for (const record of records) {
    const group = groups.get(record.record_date);
    if (group) group.push(record);
    else groups.set(record.record_date, [record]);
  }
  return [...groups.entries()].map(([date, groupedRecords]) => ({ date, records: groupedRecords }));
}

function formatGroupDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function HistoricoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const patient = await getPatientForPortal(id);

  if (!patient || !session || !(await isCaregiverAssignedToPatient(session.userId, id))) {
    notFound();
  }

  const records = await listRecordsForPatient(patient.id, 60);
  const namesMap = await getCaregiverNamesMap(records.map((r) => r.caregiver_user_id));
  const recordGroups = groupRecordsByDate(records);

  return (
    <div className="max-w-3xl">
      <Link href="/cuidador" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Meus pacientes
      </Link>
      <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">Histórico — {patient.name}</h2>
      <div className="mt-6 space-y-8">
        {records.length === 0 && <p className="text-sm text-[var(--muted-2)]">Nenhum registro ainda.</p>}
        {recordGroups.map(({ date, records: recordsForDate }) => (
          <section key={date} aria-labelledby={`records-${date}`}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`records-${date}`} className="text-sm font-semibold capitalize text-[var(--foreground)]">
                {formatGroupDate(date)}
              </h3>
              <p className="text-xs text-[var(--muted-2)]">
                {recordsForDate.length} {recordsForDate.length === 1 ? "checagem" : "checagens"}
              </p>
            </div>
            <div className="space-y-4">
              {recordsForDate.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  showDate={false}
                  caregiverName={namesMap[record.caregiver_user_id] || "Cuidador"}
                  editHref={record.caregiver_user_id === session.userId ? `/cuidador/paciente/${patient.id}/registro?recordId=${record.id}` : undefined}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
