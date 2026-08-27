import { ProfessionalApplicationsTable } from "@/components/admin/ProfessionalApplicationsTable";
import { listProfessionalApplications } from "@/lib/data";

export default async function AdminProfessionalsPage() {
  const applications = await listProfessionalApplications();

  return (
    <div>
      <div className="mb-6 max-w-3xl">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Candidaturas profissionais</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Novas candidaturas ficam disponíveis neste painel, que é a fonte oficial para acompanhar cada processo.
          Analise experiência, COREN e disponibilidade. Ao marcar uma candidatura como aprovada, o perfil é
          incluído automaticamente no banco de cuidadores; depois, basta criar o e-mail e a senha de acesso.
        </p>
      </div>
      <ProfessionalApplicationsTable applications={applications} />
    </div>
  );
}
