import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listContractDocumentsForCaregiver, listPatientsByCaregiver, listRecordsForPatient } from "@/lib/data";
import { Pill } from "@/components/ui/Badge";
import { ContractList } from "@/components/ContractList";
import { saoPauloDateTime } from "@/lib/record-utils";

export default async function CuidadorHomePage() {
  const session = await getSession();
  const [patients, contracts] = session
    ? await Promise.all([
        listPatientsByCaregiver(session.userId),
        listContractDocumentsForCaregiver(session.userId),
      ])
    : [[], []];
  const today = saoPauloDateTime().date;
  const latestByPatient = await Promise.all(patients.map((p) => listRecordsForPatient(p.id, 1)));

  return (
    <div className="max-w-4xl">
      <p className="text-sm text-[var(--muted)] mb-6">Pacientes sob seus cuidados atualmente.</p>

      <ContractList contracts={contracts} />

      {patients.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          Você ainda não está vinculado(a) a nenhum paciente. Fale com a administração da Vellora Saúde.
        </div>
      )}

      <div className="space-y-4">
        {patients.map((patient, i) => {
          const [latest] = latestByPatient[i];
          const filledToday = latest?.record_date === today;

          return (
            <div key={patient.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{patient.name}</p>
                  <p className="text-sm text-[var(--muted-2)]">{patient.address}</p>
                </div>
                <Pill value={patient.status} />
              </div>
              <p className="mt-2 text-xs text-[var(--muted-2)]">{patient.condition_summary}</p>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--border)] pt-4">
                <Link
                  href={filledToday
                    ? `/cuidador/paciente/${patient.id}/registro?recordId=${latest.id}`
                    : `/cuidador/paciente/${patient.id}/registro`}
                  className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                    filledToday ? "bg-[var(--accent)] hover:brightness-95" : "bg-[var(--brand)] hover:bg-[var(--brand-dark)]"
                  }`}
                >
                  {filledToday ? "✓ Editar registro de hoje" : "Preencher registro de hoje"}
                </Link>
                <Link
                  href={`/cuidador/paciente/${patient.id}/historico`}
                  className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-black/[0.03]"
                >
                  Ver histórico
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
