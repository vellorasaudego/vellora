import { listPatients, listUsersByRole, type Patient } from "@/lib/data";
import { FamilyAccountsTable } from "@/components/admin/FamilyAccountsTable";

export default async function AdminFamiliesPage() {
  const [families, patients] = await Promise.all([listUsersByRole("familia"), listPatients()]);

  const patientsByFamily: Record<string, Patient[]> = {};
  for (const patient of patients) {
    if (!patient.family_user_id) continue;
    (patientsByFamily[patient.family_user_id] ||= []).push(patient);
  }

  const safeFamilies = families.map(({ id, name }) => ({
    id,
    name,
  }));

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Famílias</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Consulte as famílias e os pacientes vinculados a cada conta.
        </p>
      </div>
      <FamilyAccountsTable
        families={safeFamilies}
        patientsByFamily={patientsByFamily}
      />
    </div>
  );
}
