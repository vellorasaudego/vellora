import {
  listCaregiverProfiles,
  listUsersByRole,
} from "@/lib/data";
import { CaregiverBank } from "@/components/admin/CaregiverBank";
import { CaregiverDirectoryTable } from "@/components/admin/CaregiverDirectoryTable";
import { NewCaregiverForm } from "@/components/admin/NewCaregiverForm";
import { manualAccountDirectoryEntry } from "@/components/admin/caregiver-directory";

export default async function AdminCaregiversPage() {
  const [profiles, caregiverUsers] = await Promise.all([
    listCaregiverProfiles(),
    listUsersByRole("cuidador"),
  ]);
  const linkedUserIds = new Set(profiles.map((profile) => profile.user_id).filter(Boolean));
  const manuallyCreatedUsers = caregiverUsers.filter((caregiver) => !linkedUserIds.has(caregiver.id));

  return (
    <div className="max-w-6xl">
      <div className="mb-6 max-w-3xl">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Banco de cuidadores e técnicos</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Ao aprovar uma candidatura, o perfil entra automaticamente nesta lista. O acesso ao painel só é ativado
          quando você definir o e-mail e uma senha provisória.
        </p>
      </div>

      <CaregiverBank
        profiles={profiles}
      />

      <section className="mt-10 border-t border-[var(--border)] pt-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">Cadastros manuais</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Use somente quando o profissional não tiver enviado uma candidatura pelo site.
            </p>
          </div>
          <NewCaregiverForm />
        </div>
        <CaregiverDirectoryTable
          entries={manuallyCreatedUsers.map(manualAccountDirectoryEntry)}
          emptyMessage="Nenhum cuidador foi criado manualmente."
        />
      </section>
    </div>
  );
}
