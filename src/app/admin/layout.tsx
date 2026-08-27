import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <DashboardShell
      title="Painel administrativo"
      userName={session?.name || ""}
      roleLabel="Administrador"
      navItems={[
        { href: "/admin", label: "Visão geral", icon: "📊" },
        { href: "/admin/leads", label: "Contatos recebidos", icon: "📨" },
        { href: "/admin/profissionais", label: "Candidaturas", icon: "📋" },
        { href: "/admin/pacientes", label: "Pacientes", icon: "🧑‍🤝‍🧑" },
        { href: "/admin/familias", label: "Famílias", icon: "👪" },
        { href: "/admin/cuidadores", label: "Cuidadores", icon: "🩺" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
