"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lead } from "@/lib/data";
import { Pill } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";

const STATUS_OPTIONS: Lead["status"][] = ["novo", "em_contato", "convertido", "recusado"];

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateStatus(id: string, status: Lead["status"]) {
    setUpdatingId(id);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error("Não foi possível atualizar o status da solicitação.");
        router.refresh();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar a solicitação.");
      } finally {
        setUpdatingId(null);
      }
    });
  }

  return (
    <div>
      {error ? <p className="mb-4 text-sm text-[var(--status-critical)]" role="alert">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-2)] uppercase tracking-wide">
            <th className="px-5 py-3 font-medium">Contato</th>
            <th className="px-5 py-3 font-medium">Familiar / Paciente</th>
            <th className="px-5 py-3 font-medium">Tipo de cuidado</th>
            <th className="px-5 py-3 font-medium">Mensagem</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-[var(--border)] last:border-0 align-top">
              <td className="px-5 py-4">
                <p className="font-medium text-[var(--foreground)]">{lead.name}</p>
                <p className="text-[var(--muted-2)]">{lead.phone}</p>
                <p className="text-[var(--muted-2)]">{lead.email}</p>
              </td>
              <td className="px-5 py-4 text-[var(--foreground)]">{lead.patient_name || "—"}</td>
              <td className="px-5 py-4 text-[var(--foreground)]">{lead.care_type || "—"}</td>
              <td className="px-5 py-4 text-[var(--muted)] max-w-[220px]">{lead.message || "—"}</td>
              <td className="px-5 py-4">
                <select
                  value={lead.status}
                  disabled={pending && updatingId === lead.id}
                  onChange={(e) => updateStatus(lead.id, e.target.value as Lead["status"])}
                  className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <Pill value={lead.status} />
                </div>
              </td>
              <td className="px-5 py-4 min-w-[140px]">
                <div className="flex flex-col items-start gap-3">
                  <Link
                    href={`/admin/pacientes/novo?lead=${lead.id}`}
                    className="text-[var(--brand)] hover:underline"
                  >
                    Converter em paciente
                  </Link>
                  <DeleteButton
                    endpoint={`/api/admin/leads/${lead.id}`}
                    confirmText={`Excluir definitivamente a solicitação de ${lead.name}?`}
                    label="Excluir formulário"
                    compact
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        {leads.length === 0 && <p className="p-6 text-sm text-[var(--muted-2)]">Nenhum contato recebido ainda.</p>}
      </div>
    </div>
  );
}
