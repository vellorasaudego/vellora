import Link from "next/link";
import { listCaregiverProfiles, listLeads, listPatients, listProfessionalApplications } from "@/lib/data";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Badge";

export default async function AdminHomePage() {
  const [leads, patients, caregivers, professionalApplications] = await Promise.all([
    listLeads(),
    listPatients(),
    listCaregiverProfiles(),
    listProfessionalApplications(),
  ]);

  const stats = [
    { label: "Contatos novos", value: leads.filter((l) => l.status === "novo").length, href: "/admin/leads" },
    {
      label: "Candidaturas novas",
      value: professionalApplications.filter((application) => application.status === "novo").length,
      href: "/admin/profissionais",
    },
    { label: "Pacientes ativos", value: patients.filter((p) => p.status === "ativo").length, href: "/admin/pacientes" },
    { label: "Pacientes pendentes", value: patients.filter((p) => p.status === "pendente").length, href: "/admin/pacientes" },
    { label: "Profissionais no banco", value: caregivers.length, href: "/admin/cuidadores" },
  ];

  return (
    <div className="max-w-6xl">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="hover:shadow-md transition-shadow">
              <p className="text-sm text-[var(--muted-2)]">{s.label}</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Contatos recentes</h3>
            <Link href="/admin/leads" className="text-sm text-[var(--brand)] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between text-sm border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{lead.name}</p>
                  <p className="text-[var(--muted-2)]">{lead.phone}</p>
                </div>
                <Pill value={lead.status} />
              </div>
            ))}
            {leads.length === 0 && <p className="text-sm text-[var(--muted-2)]">Nenhum contato recebido ainda.</p>}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--foreground)]">Pacientes recentes</h3>
            <Link href="/admin/pacientes" className="text-sm text-[var(--brand)] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {patients.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{p.name}</p>
                  <p className="text-[var(--muted-2)]">{p.care_level || "Plano a definir"}</p>
                </div>
                <Pill value={p.status} />
              </div>
            ))}
            {patients.length === 0 && <p className="text-sm text-[var(--muted-2)]">Nenhum paciente cadastrado ainda.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
