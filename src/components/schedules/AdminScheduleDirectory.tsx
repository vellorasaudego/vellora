"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { SchedulePatientSummary } from "./types";

const STATUS_LABELS = {
  ativo: "Ativo",
  pendente: "Pendente",
  inativo: "Inativo",
} as const;

const STATUS_STYLES = {
  ativo: "bg-[var(--accent-light)] text-[var(--accent-dark)]",
  pendente: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  inativo: "bg-gray-100 text-gray-600",
} as const;

export function AdminScheduleDirectory({ patients }: { patients: SchedulePatientSummary[] }) {
  const searchId = useId();
  const statusId = useId();
  const carePlanId = useId();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [carePlan, setCarePlan] = useState("todos");

  const carePlans = useMemo(
    () => [...new Set(patients.map((patient) => patient.careLevel?.trim()).filter((plan): plan is string => Boolean(plan)))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [patients],
  );

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return patients.filter((patient) => {
      const matchesQuery = !normalizedQuery || `${patient.name} ${patient.familyName || ""}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      const matchesStatus = status === "todos" || patient.status === status;
      const matchesCarePlan = carePlan === "todos" || patient.careLevel === carePlan;
      return matchesQuery && matchesStatus && matchesCarePlan;
    });
  }, [carePlan, patients, query, status]);

  function clearFilters() {
    setQuery("");
    setStatus("todos");
    setCarePlan("todos");
  }

  return (
    <section aria-label="Pesquisar pacientes para consultar escalas" className="space-y-4">
      <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,0.55fr)_minmax(12rem,0.7fr)]">
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor={searchId} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Pesquisar</label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Paciente ou familiar responsável"
            className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)]"
          />
        </div>
        <div>
          <label htmlFor={statusId} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Status do paciente</label>
          <select
            id={statusId}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 text-sm text-[var(--foreground)]"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="pendente">Pendente</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <div>
          <label htmlFor={carePlanId} className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Plano de cuidado</label>
          <select
            id={carePlanId}
            value={carePlan}
            onChange={(event) => setCarePlan(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 text-sm text-[var(--foreground)]"
          >
            <option value="todos">Todos os planos</option>
            {carePlans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]" role="status" aria-live="polite">
          {filteredPatients.length} {filteredPatients.length === 1 ? "paciente encontrado" : "pacientes encontrados"}
        </p>
        {(query || status !== "todos" || carePlan !== "todos") && (
          <button type="button" onClick={clearFilters} className="min-h-10 rounded-lg px-3 text-sm font-medium text-[var(--brand)] underline underline-offset-2 hover:text-[var(--brand-dark)]">
            Limpar filtros
          </button>
        )}
      </div>

      {patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Não há pacientes cadastrados para organizar escalas.
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Nenhum paciente corresponde à pesquisa e aos filtros atuais. Ajuste os filtros para ver outros pacientes.
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredPatients.map((patient) => (
            <li key={patient.id}>
              <Link
                href={`/admin/escalas/${encodeURIComponent(patient.id)}`}
                className="group flex min-h-[5.5rem] flex-col justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--accent)] hover:bg-[var(--brand-light)] sm:flex-row sm:items-center sm:px-5"
              >
                <span className="min-w-0">
                  <span className="block break-words text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--brand-dark)]">{patient.name}</span>
                  <span className="mt-0.5 block break-words text-sm text-[var(--muted-2)]">
                    Familiar responsável: {patient.familyName || "Não vinculado"}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span className="max-w-full truncate rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-medium text-[var(--muted)]">
                    {patient.careLevel || "Plano não informado"}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[patient.status]}`}>
                    {STATUS_LABELS[patient.status]}
                  </span>
                  <span className="ml-auto text-lg text-[var(--brand)] sm:ml-1" aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
