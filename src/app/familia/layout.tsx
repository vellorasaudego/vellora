import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

export default async function FamiliaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <DashboardShell
      title="Área da família"
      userName={session?.name || ""}
      roleLabel="Família"
      navItems={[{ href: "/familia", label: "Meus familiares", icon: "🏠" }]}
    >
      {children}
    </DashboardShell>
  );
}
