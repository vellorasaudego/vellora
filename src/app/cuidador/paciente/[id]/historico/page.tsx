import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getPatient, listRecordsForPatient, isCaregiverAssignedToPatient, getCaregiverNamesMap } from "@/lib/data";
import { RecordCard } from "@/components/RecordCard";

export default async function HistoricoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const patient = await getPatient(id);

  if (!patient || !session || !(await isCaregiverAssignedToPatient(session.userId, id))) {
    notFound();
  }

  const records = await listRecordsForPatient(patient.id, 60);
  const namesMap = await getCaregiverNamesMap(records.map((r) => r.caregiver_user_id));

  return (
    <div className="max-w-3xl">
      <Link href="/cuidador" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Meus pacientes
      </Link>
      <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">Histórico — {patient.name}</h2>
      <div className="mt-6 space-y-4">
        {records.length === 0 && <p className="text-sm text-[var(--muted-2)]">Nenhum registro ainda.</p>}
        {records.map((r) => (
          <RecordCard
            key={r.id}
            record={r}
            caregiverName={namesMap[r.caregiver_user_id] || "Cuidador"}
            editHref={r.caregiver_user_id === session.userId ? `/cuidador/paciente/${patient.id}/registro?recordId=${r.id}` : undefined}
          />
        ))}
      </div>
    </div>
  );
}
