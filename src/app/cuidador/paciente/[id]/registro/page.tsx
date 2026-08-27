import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getPatient, getRecord, getRecordForCaregiverOnDate, isCaregiverAssignedToPatient } from "@/lib/data";
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
  const patient = await getPatient(id);

  if (!patient || !session || !(await isCaregiverAssignedToPatient(session.userId, id))) {
    notFound();
  }

  const measurement = saoPauloDateTime();
  const requestedRecordId = typeof query.recordId === "string" ? query.recordId : undefined;
  const requestedRecord = requestedRecordId ? await getRecord(requestedRecordId) : undefined;
  if (requestedRecordId && (!requestedRecord || requestedRecord.patient_id !== id || requestedRecord.caregiver_user_id !== session.userId)) {
    notFound();
  }
  const existingToday = requestedRecord || (await getRecordForCaregiverOnDate(id, session.userId, measurement.date));

  return (
    <div className="max-w-3xl">
      <Link href="/cuidador" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Meus pacientes
      </Link>
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {existingToday ? "Editar registro" : "Registro diário"} — {patient.name}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {existingToday
            ? "Atualize as informações salvas. O histórico manterá o registro da alteração."
            : "Preencha as informações do atendimento de hoje. Os campos de sinais vitais são opcionais quando não aferidos, mas recomendamos preenchê-los sempre que possível."}
        </p>
        <div className="mt-6">
          <DailyRecordForm
            patientId={patient.id}
            patientName={patient.name}
            initialRecordDate={measurement.date}
            initialRecordTime={measurement.time}
            initialRecord={existingToday}
          />
        </div>
      </div>
    </div>
  );
}
