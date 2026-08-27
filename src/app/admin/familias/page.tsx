import {
  listContractDocuments,
  listPatients,
  listUsersByRole,
  type ContractDocument,
  type Patient,
} from "@/lib/data";
import { FamilyAccountsTable } from "@/components/admin/FamilyAccountsTable";

export default async function AdminFamiliesPage() {
  const [families, patients] = await Promise.all([listUsersByRole("familia"), listPatients()]);
  const contractEntries = await Promise.all(
    families.map(async (family) => [family.id, await listContractDocuments("family", family.id)] as const)
  );

  const patientsByFamily: Record<string, Patient[]> = {};
  for (const patient of patients) {
    if (!patient.family_user_id) continue;
    (patientsByFamily[patient.family_user_id] ||= []).push(patient);
  }

  const contractsByFamily: Record<string, ContractDocument[]> = Object.fromEntries(contractEntries);
  const safeFamilies = families.map(({ id, name, email, phone, created_at }) => ({
    id,
    name,
    email,
    phone,
    created_at,
  }));

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Famílias</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Gerencie os acessos, pacientes vinculados e contratos assinados de cada família.
        </p>
      </div>
      <FamilyAccountsTable
        families={safeFamilies}
        patientsByFamily={patientsByFamily}
        contractsByFamily={contractsByFamily}
      />
    </div>
  );
}
