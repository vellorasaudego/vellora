import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  listContractDocuments,
  listPatientsByFamily,
  listRecordsForPatient,
  getCaregiverNamesMap,
} from "@/lib/data";
import { Pill, StatusBadge } from "@/components/ui/Badge";
import { ContractList } from "@/components/ContractList";
import { statusBP, statusHeartRate, statusTemperature, statusSpo2, statusGlucose, worstStatus } from "@/lib/vitals";

export default async function FamiliaHomePage() {
  const session = await getSession();
  const [patients, contracts] = session
    ? await Promise.all([
        listPatientsByFamily(session.userId),
        listContractDocuments("family", session.userId),
      ])
    : [[], []];
  const latestByPatient = await Promise.all(patients.map((p) => listRecordsForPatient(p.id, 1)));
  const latests = latestByPatient.map((records) => records[0]);
  const namesMap = await getCaregiverNamesMap(latests.filter(Boolean).map((r) => r!.caregiver_user_id));

  return (
    <div className="max-w-4xl">
      <p className="text-sm text-[var(--muted)] mb-6">
        Acompanhe aqui o cuidado dos seus familiares atendidos pela Vellora Saúde.
      </p>

      <ContractList contracts={contracts} />

      {patients.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">
          Nenhum familiar vinculado à sua conta ainda. Assim que o contrato for confirmado pela nossa equipe, ele
          aparecerá aqui.
        </div>
      )}

      <div className="space-y-4">
        {patients.map((patient, i) => {
          const latest = latests[i];
          const overall = latest
            ? worstStatus(
                statusBP(latest.bp_systolic, latest.bp_diastolic),
                statusHeartRate(latest.heart_rate),
                statusTemperature(latest.temperature),
                statusSpo2(latest.spo2),
                statusGlucose(latest.glucose)
              )
            : null;

          return (
            <Link
              key={patient.id}
              href={`/familia/paciente/${patient.id}`}
              className="block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{patient.name}</p>
                  <p className="text-sm text-[var(--muted-2)]">{patient.care_level || "Plano de cuidado a definir"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill value={patient.status} />
                  {overall && <StatusBadge status={overall} />}
                </div>
              </div>
              {latest ? (
                <p className="mt-4 text-sm text-[var(--muted)] border-t border-[var(--border)] pt-4">
                  Último registro em {new Date(latest.record_date + "T00:00:00").toLocaleDateString("pt-BR")} por{" "}
                  {namesMap[latest.caregiver_user_id] || "Cuidador"}
                  {latest.notes ? ` — "${latest.notes}"` : ""}
                </p>
              ) : (
                <p className="mt-4 text-sm text-[var(--muted-2)] border-t border-[var(--border)] pt-4">
                  Ainda não há registros diários para este paciente.
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
