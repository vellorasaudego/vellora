"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { type ProfessionalApplication } from "@/lib/data";
import { Pill } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/admin/DeleteButton";

const STATUS_OPTIONS: ProfessionalApplication["status"][] = ["novo", "em_analise", "aprovado", "recusado"];

const DAY_LABELS: Record<string, string> = {
  segunda: "Seg",
  terca: "Ter",
  quarta: "Qua",
  quinta: "Qui",
  sexta: "Sex",
  sabado: "Sáb",
  domingo: "Dom",
};

const SHIFT_LABELS: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  plantao_12h_diurno: "12h diurno",
  plantao_12h_noturno: "12h noturno",
  plantao_24h: "24h",
};

const STATUS_LABELS: Record<ProfessionalApplication["status"], string> = {
  novo: "Novo",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const PROFESSION_LABELS: Record<ProfessionalApplication["profession"], string> = {
  cuidador: "Cuidador(a)",
  tecnico_enfermagem: "Técnico(a) de enfermagem",
  enfermeiro: "Enfermeiro(a)",
  outros: "Outros",
};

function formatDate(value: string | null): string {
  if (!value) return "A combinar";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

export function ProfessionalApplicationsTable({ applications }: { applications: ProfessionalApplication[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateStatus(id: string, status: ProfessionalApplication["status"]) {
    setUpdatingId(id);
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/professionals/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error("Não foi possível atualizar o status.");
        router.refresh();
      } catch (updateError) {
        setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar o cadastro.");
      } finally {
        setUpdatingId(null);
      }
    });
  }

  return (
    <div>
      {error ? <p className="mb-4 text-sm text-[var(--status-critical)]" role="alert">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted-2)]">
              <th className="px-5 py-3 font-medium">Profissional</th>
              <th className="px-5 py-3 font-medium">Área</th>
              <th className="px-5 py-3 font-medium">Disponibilidade</th>
              <th className="px-5 py-3 font-medium">Experiência</th>
              <th className="px-5 py-3 font-medium">Observações</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <tr key={application.id} className="border-b border-[var(--border)] align-top last:border-0">
                <td className="px-5 py-4">
                  <p className="font-medium text-[var(--foreground)]">{application.name}</p>
                  <p className="mt-1 text-[var(--muted-2)]">{application.phone}</p>
                  <p className="text-[var(--muted-2)]">{application.email}</p>
                  <p className="mt-1 text-xs text-[var(--muted-2)]">{application.city || "Cidade não informada"}</p>
                  <p className="mt-2 text-xs text-[var(--muted-2)]">
                    {application.lgpd_consent_at
                      ? `Consentimento LGPD: ${formatDate(application.lgpd_consent_at)}`
                      : "Consentimento LGPD sem data registrada"}
                  </p>
                </td>
                <td className="px-5 py-4 text-[var(--foreground)]">
                  <p className="font-medium">{PROFESSION_LABELS[application.profession]}</p>
                  <p className="mt-1 text-xs text-[var(--muted-2)]">COREN: {application.coren || "Não se aplica"}</p>
                  <p className="mt-2 text-xs text-[var(--muted-2)]">Recebido em {formatDate(application.created_at)}</p>
                </td>
                <td className="max-w-[260px] px-5 py-4">
                  <p className="font-medium text-[var(--foreground)]">{application.availability_days.map((day) => DAY_LABELS[day] || day).join(", ")}</p>
                  <p className="mt-1 text-[var(--muted)]">{application.availability_shifts.map((shift) => SHIFT_LABELS[shift] || shift).join(", ")}</p>
                  <p className="mt-2 text-xs text-[var(--muted-2)]">Início: {formatDate(application.available_from)}</p>
                </td>
                <td className="px-5 py-4 text-[var(--foreground)]">{application.experience || "—"}</td>
                <td className="max-w-[260px] whitespace-pre-wrap px-5 py-4 text-[var(--muted)]">{application.notes || "—"}</td>
                <td className="min-w-[150px] px-5 py-4">
                  <select
                    value={application.status}
                    aria-label={`Status de ${application.name}`}
                    disabled={pending && updatingId === application.id}
                    onChange={(event) => updateStatus(application.id, event.target.value as ProfessionalApplication["status"])}
                    className="rounded-lg border border-[var(--border)] bg-white px-2 py-1.5 text-xs"
                  >
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                  </select>
                  <div className="mt-2"><Pill value={application.status} /></div>
                  {application.status === "aprovado" ? (
                    <p className="mt-2 text-xs leading-5 text-[var(--accent)]">Incluído no banco de cuidadores.</p>
                  ) : null}
                </td>
                <td className="min-w-[150px] px-5 py-4">
                  <DeleteButton
                    endpoint={`/api/admin/professionals/${application.id}`}
                    confirmText={`Excluir definitivamente a candidatura de ${application.name}? O perfil aprovado no banco de cuidadores será preservado.`}
                    label="Excluir formulário"
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {applications.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted-2)]">Nenhuma candidatura recebida ainda.</p>
        ) : null}
      </div>
    </div>
  );
}
