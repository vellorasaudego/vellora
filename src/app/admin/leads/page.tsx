import { listLeads } from "@/lib/data";
import { LeadsTable } from "@/components/admin/LeadsTable";

export default async function AdminLeadsPage() {
  const leads = await listLeads();
  return (
    <div>
      <p className="text-sm text-[var(--muted)] mb-6">
        Solicitações recebidas pelo site. Atualize o status conforme o contato avança e converta em paciente quando o
        serviço for contratado.
      </p>
      <LeadsTable leads={leads} />
    </div>
  );
}
