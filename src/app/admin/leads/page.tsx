import { listLeads } from "@/lib/data";
import { LeadsTable } from "@/components/admin/LeadsTable";

export default async function AdminLeadsPage() {
  const leads = await listLeads();
  return (
    <div>
      <p className="text-sm text-[var(--muted)] mb-6">
        Novas solicitações ficam disponíveis aqui. Este painel é a fonte oficial para acompanhar o contato, atualizar o
        status e converter em paciente quando o serviço for contratado.
      </p>
      <LeadsTable leads={leads} />
    </div>
  );
}
