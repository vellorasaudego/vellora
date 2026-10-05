import { AdminScheduleDirectory } from "@/components/schedules/AdminScheduleDirectory";
import { getUsersByIds, listPatients } from "@/lib/data";

export default async function AdminSchedulesPage() {
  const patients = await listPatients();
  const familyIds = patients.map((patient) => patient.family_user_id).filter((id): id is string => Boolean(id));
  const families = await getUsersByIds(familyIds);
  const familyNames = new Map(families.map((family) => [family.id, family.name]));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <p className="eyebrow">Administração</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Gerenciamento de escalas</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Pesquise um paciente para consultar e organizar os profissionais escalados.
        </p>
      </header>
      <AdminScheduleDirectory
        patients={patients.map((patient) => ({
          id: patient.id,
          name: patient.name,
          status: patient.status,
          careLevel: patient.care_level,
          familyName: patient.family_user_id ? familyNames.get(patient.family_user_id) ?? null : null,
        }))}
      />
    </div>
  );
}
