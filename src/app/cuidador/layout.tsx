import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

export default async function CuidadorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <DashboardShell
      title="Área do cuidador"
      userName={session?.name || ""}
      roleLabel="Cuidador"
      navItems={[{ href: "/cuidador", label: "Meus pacientes", icon: "🩺" }]}
    >
      {children}
    </DashboardShell>
  );
}
