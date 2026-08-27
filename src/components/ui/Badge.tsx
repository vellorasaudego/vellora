import { VitalStatus, STATUS_LABEL } from "@/lib/vitals";

const STYLES: Record<VitalStatus, string> = {
  good: "bg-[var(--status-good-bg)] text-[var(--status-good)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  critical: "bg-[var(--status-critical-bg)] text-[var(--status-critical)]",
};

const DOT: Record<VitalStatus, string> = {
  good: "bg-[var(--status-good)]",
  warning: "bg-[var(--status-warning)]",
  critical: "bg-[var(--status-critical)]",
};

export function StatusBadge({ status, label }: { status: VitalStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} aria-hidden />
      {label || STATUS_LABEL[status]}
    </span>
  );
}

const NEUTRAL_STYLES: Record<string, string> = {
  ativo: "bg-[var(--accent-light)] text-[var(--accent)]",
  pendente: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  inativo: "bg-gray-100 text-gray-500",
  novo: "bg-[var(--brand-light)] text-[var(--brand-dark)]",
  em_contato: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  em_analise: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
  convertido: "bg-[var(--accent-light)] text-[var(--accent)]",
  aprovado: "bg-[var(--accent-light)] text-[var(--accent)]",
  recusado: "bg-gray-100 text-gray-500",
  aguardando_acesso: "bg-[var(--status-warning-bg)] text-[var(--status-warning)]",
};

const NEUTRAL_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  inativo: "Inativo",
  novo: "Novo",
  em_contato: "Em contato",
  em_analise: "Em análise",
  convertido: "Convertido",
  aprovado: "Aprovado",
  recusado: "Recusado",
  aguardando_acesso: "Aguardando acesso",
};

export function Pill({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${NEUTRAL_STYLES[value] || "bg-gray-100 text-gray-500"}`}>
      {NEUTRAL_LABEL[value] || value}
    </span>
  );
}
