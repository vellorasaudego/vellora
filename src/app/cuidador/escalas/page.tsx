import { ScheduleCalendar } from "@/components/schedules/ScheduleCalendar";
import { getSession } from "@/lib/auth";
import { listPatientsByCaregiver } from "@/lib/data";

export default async function CaregiverSchedulesPage() {
  const session = await getSession();
  const patients = session ? await listPatientsByCaregiver(session.userId) : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <p className="eyebrow">Área profissional</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Minhas escalas</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Consulte seus plantões e os pacientes atendidos em cada data.
        </p>
      </header>
      <ScheduleCalendar
        mode="professional"
        patients={patients.map((patient) => ({ id: patient.id, name: patient.name }))}
      />
    </div>
  );
}
