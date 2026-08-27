import Link from "next/link";
import type { ContractDocument, Patient, User } from "@/lib/data";
import { ContractManager } from "./ContractManager";
import { DeleteButton } from "./DeleteButton";

type FamilyAccount = Pick<User, "id" | "name" | "email" | "phone" | "created_at">;

export function FamilyAccountsTable({
  families,
  patientsByFamily,
  contractsByFamily,
}: {
  families: FamilyAccount[];
  patientsByFamily: Record<string, Patient[]>;
  contractsByFamily: Record<string, ContractDocument[]>;
}) {
  if (!families.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        Nenhuma conta de família cadastrada.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {families.map((family) => {
        const patients = patientsByFamily[family.id] || [];
        return (
          <article key={family.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-[var(--foreground)]">{family.name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">{family.email}</p>
                <p className="mt-1 text-sm text-[var(--muted-2)]">{family.phone || "Telefone não informado"}</p>
              </div>
              <DeleteButton
                endpoint={`/api/admin/families/${family.id}`}
                label="Excluir família"
                confirmText={`Excluir o acesso de ${family.name}? A conta será removida, os contratos serão apagados e os pacientes ficarão sem vínculo familiar. Os registros de cuidado serão preservados.`}
              />
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <h4 className="text-sm font-semibold text-[var(--foreground)]">Pacientes vinculados</h4>
              {patients.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {patients.map((patient) => (
                    <Link
                      key={patient.id}
                      href={`/admin/pacientes/${patient.id}`}
                      className="rounded-full bg-[var(--brand-light)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-dark)] hover:brightness-95"
                    >
                      {patient.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--muted-2)]">Nenhum paciente vinculado.</p>
              )}
            </div>

            <ContractManager
              ownerType="family"
              ownerId={family.id}
              contracts={contractsByFamily[family.id] || []}
            />
          </article>
        );
      })}
    </div>
  );
}
