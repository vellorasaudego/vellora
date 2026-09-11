import Link from "next/link";
import type { Patient, User } from "@/lib/data";

type FamilyAccount = Pick<User, "id" | "name">;

export function FamilyAccountsTable({
  families,
  patientsByFamily,
}: {
  families: FamilyAccount[];
  patientsByFamily: Record<string, Patient[]>;
}) {
  if (!families.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--muted)]">
        Nenhuma família cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {families.map((family) => {
        const patients = patientsByFamily[family.id] || [];
        return (
          <article key={family.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <h3 className="font-semibold text-[var(--foreground)]">
              <Link href={`/admin/familias/${family.id}`} className="text-[var(--brand)] hover:underline">
                {family.name}
              </Link>
            </h3>

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
                <div className="mt-2 space-y-1 text-sm text-[var(--muted-2)]">
                  <p>Nenhum paciente vinculado a esta família.</p>
                  <p>
                    Para vincular um paciente, abra o cadastro dele e selecione esta família em <strong>Conta da família</strong>.
                  </p>
                  <Link href="/admin/pacientes" className="inline-block pt-1 font-semibold text-[var(--brand)] hover:underline">
                    Ver pacientes
                  </Link>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
