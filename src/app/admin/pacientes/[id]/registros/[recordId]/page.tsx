import Link from "next/link";
import { notFound } from "next/navigation";
import { DailyRecordForm } from "@/components/DailyRecordForm";
import { getPatient, getRecord } from "@/lib/data";

export default async function AdminPatientRecordPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const { id: patientId, recordId } = await params;
  const [patient, record] = await Promise.all([getPatient(patientId), getRecord(recordId)]);

  if (!patient || !record || record.patient_id !== patient.id) notFound();

  return (
    <div className="max-w-4xl">
      <Link href={`/admin/pacientes/${patient.id}`} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Detalhe do paciente
      </Link>
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Editar registro — {patient.name}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          A alteração ficará registrada no histórico para manter a rastreabilidade do atendimento.
        </p>
        <div className="mt-6">
          <DailyRecordForm
            patientId={patient.id}
            patientName={patient.name}
            initialRecordDate={record.record_date}
            initialRecordTime={record.record_time || "00:00"}
            initialRecord={record}
            endpoint={`/api/admin/patients/${patient.id}/records/${record.id}`}
            redirectTo={`/admin/pacientes/${patient.id}`}
          />
        </div>
      </div>
    </div>
  );
}
