import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getPatientForPortal, getRecord, isCaregiverAssignedToPatient } from "@/lib/data";
import { DailyRecordForm } from "@/components/DailyRecordForm";
import { saoPauloDateTime } from "@/lib/record-utils";

export default async function RegistroDiarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ recordId?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await getSession();
  const patient = await getPatientForPortal(id);

  if (!patient || !session || !(await isCaregiverAssignedToPatient(session.userId, id))) {
    notFound();
  }

  const measurement = saoPauloDateTime();
  const requestedRecordId = typeof query.recordId === "string" ? query.recordId : undefined;
  const requestedRecord = requestedRecordId ? await getRecord(requestedRecordId) : undefined;
  if (requestedRecordId && (!requestedRecord || requestedRecord.patient_id !== id || requestedRecord.caregiver_user_id !== session.userId)) {
    notFound();
  }
  // A missing recordId means a new check, even when another check exists for
  // the same day. Editing is always explicit and record-specific.
  const existingRecord = requestedRecord;

  return (
    <div className="max-w-3xl">
      <Link href="/cuidador" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Meus pacientes
      </Link>
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {existingRecord ? "Editar registro" : "Novo registro"} — {patient.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {existingRecord
            ? "Atualize esta checagem específica. O histórico manterá o registro da alteração."
            : "Registre uma nova checagem, mesmo que já exista outra no mesmo dia. Os campos de sinais vitais são opcionais quando não aferidos, mas recomendamos preenchê-los sempre que possível."}
        </p>
        <div className="mt-6">
          <DailyRecordForm
            patientId={patient.id}
            patientName={patient.name}
            initialRecordDate={measurement.date}
            initialRecordTime={measurement.time}
            initialRecord={existingRecord}
          />
        </div>
      </div>
    </div>
  );
}
