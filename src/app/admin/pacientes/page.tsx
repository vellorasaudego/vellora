import Link from "next/link";
import { listPatients, getUsersByIds } from "@/lib/data";
import { Pill } from "@/components/ui/Badge";

export default async function AdminPatientsPage() {
  const patients = await listPatients();
  const familyIds = patients.map((p) => p.family_user_id).filter((id): id is string => Boolean(id));
  const familyUsers = await getUsersByIds(familyIds);
  const familyById = new Map(familyUsers.map((u) => [u.id, u]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[var(--muted)]">Todos os pacientes cadastrados na Vellora Saúde.</p>
        <Link
          href="/admin/pacientes/novo"
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
        >
          + Novo paciente
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-2)] uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Paciente</th>
              <th className="px-5 py-3 font-medium">Plano</th>
              <th className="px-5 py-3 font-medium">Família vinculada</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => {
              const family = p.family_user_id ? familyById.get(p.family_user_id) : undefined;
              return (
                <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-black/[0.02]">
                  <td className="px-5 py-4">
                    <Link href={`/admin/pacientes/${p.id}`} className="font-medium text-[var(--brand)] hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-[var(--foreground)]">{p.care_level || "—"}</td>
                  <td className="px-5 py-4 text-[var(--foreground)]">{family ? `${family.name} (${family.email})` : "Não vinculada"}</td>
                  <td className="px-5 py-4">
                    <Pill value={p.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {patients.length === 0 && <p className="p-6 text-sm text-[var(--muted-2)]">Nenhum paciente cadastrado ainda.</p>}
      </div>
    </div>
  );
}
