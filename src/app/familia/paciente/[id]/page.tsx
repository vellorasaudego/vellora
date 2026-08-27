import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getPatient, listRecordsForPatient, getCaregiverNamesMap, listAssignmentsForPatient } from "@/lib/data";
import { RecordCard } from "@/components/RecordCard";
import { BloodPressureChart, HeartRateChart, TemperatureChart, Spo2Chart, GlucoseChart, VitalsPoint } from "@/components/charts/VitalsChart";
import { Pill } from "@/components/ui/Badge";

export default async function FamiliaPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const patient = await getPatient(id);

  if (!patient || !session || patient.family_user_id !== session.userId) {
    notFound();
  }

  const [records, assignments] = await Promise.all([listRecordsForPatient(patient.id, 60), listAssignmentsForPatient(patient.id)]);

  const chartData: VitalsPoint[] = [...records]
    .reverse()
    .map((r) => ({
      date: r.record_date,
      bp_systolic: r.bp_systolic,
      bp_diastolic: r.bp_diastolic,
      heart_rate: r.heart_rate,
      temperature: r.temperature,
      spo2: r.spo2,
      glucose: r.glucose,
    }));

  const activeAssignments = assignments.filter((a) => a.active);
  const namesMap = await getCaregiverNamesMap([
    ...activeAssignments.map((a) => a.caregiver_user_id),
    ...records.map((r) => r.caregiver_user_id),
  ]);
  const caregiverNames = [...new Set(activeAssignments.map((a) => namesMap[a.caregiver_user_id] || "Cuidador"))];

  return (
    <div className="max-w-5xl">
      <Link href="/familia" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        ← Meus familiares
      </Link>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">{patient.name}</h2>
            <p className="text-sm text-[var(--muted-2)]">{patient.condition_summary}</p>
          </div>
          <Pill value={patient.status} />
        </div>
        <div className="mt-4 grid sm:grid-cols-3 gap-4 text-sm border-t border-[var(--border)] pt-4">
          <div>
            <p className="text-[var(--muted-2)]">Plano</p>
            <p className="text-[var(--foreground)]">{patient.care_level || "—"}</p>
          </div>
          <div>
            <p className="text-[var(--muted-2)]">Endereço</p>
            <p className="text-[var(--foreground)]">{patient.address || "—"}</p>
          </div>
          <div>
            <p className="text-[var(--muted-2)]">Cuidador(es) responsável(is)</p>
            <p className="text-[var(--foreground)]">{caregiverNames.join(", ") || "A definir"}</p>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <>
          <h3 className="mt-10 mb-4 text-lg font-semibold text-[var(--foreground)]">Evolução dos sinais vitais</h3>
          <div className="grid md:grid-cols-2 gap-5">
            <BloodPressureChart data={chartData} />
            <HeartRateChart data={chartData} />
            <TemperatureChart data={chartData} />
            <Spo2Chart data={chartData} />
            <GlucoseChart data={chartData} />
          </div>
        </>
      )}

      <h3 className="mt-10 mb-4 text-lg font-semibold text-[var(--foreground)]">Histórico de registros diários</h3>
      <div className="space-y-4">
        {records.length === 0 && (
          <p className="text-sm text-[var(--muted-2)]">Ainda não há registros diários para este paciente.</p>
        )}
        {records.map((r) => (
          <RecordCard key={r.id} record={r} caregiverName={namesMap[r.caregiver_user_id] || "Cuidador"} />
        ))}
      </div>
    </div>
  );
}
