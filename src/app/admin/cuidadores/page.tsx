import {
  listCaregiverProfiles,
  listContractDocuments,
  listPatientsByCaregiver,
  listUsersByRole,
} from "@/lib/data";
import { CaregiverBank } from "@/components/admin/CaregiverBank";
import { NewCaregiverForm } from "@/components/admin/NewCaregiverForm";
import { ContractManager } from "@/components/admin/ContractManager";
import { DeleteButton } from "@/components/admin/DeleteButton";

export default async function AdminCaregiversPage() {
  const [profiles, caregiverUsers] = await Promise.all([
    listCaregiverProfiles(),
    listUsersByRole("cuidador"),
  ]);
  const [patientLists, profileContractLists, manualContractLists] = await Promise.all([
    Promise.all(caregiverUsers.map((caregiver) => listPatientsByCaregiver(caregiver.id))),
    Promise.all(profiles.map((profile) => listContractDocuments("caregiver_profile", profile.id))),
    Promise.all(caregiverUsers.map((caregiver) => listContractDocuments("caregiver_user", caregiver.id))),
  ]);
  const patientNamesByUser = new Map(
    caregiverUsers.map((caregiver, index) => [
      caregiver.id,
      patientLists[index].map((patient) => patient.name),
    ])
  );
  const patientsByProfile = Object.fromEntries(
    profiles.map((profile) => [
      profile.id,
      profile.user_id ? patientNamesByUser.get(profile.user_id) || [] : [],
    ])
  );
  const contractsByProfile = Object.fromEntries(
    profiles.map((profile, index) => [profile.id, profileContractLists[index]])
  );
  const contractsByManualUser = Object.fromEntries(
    caregiverUsers.map((caregiver, index) => [caregiver.id, manualContractLists[index]])
  );
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
        patientsByProfile={patientsByProfile}
        contractsByProfile={contractsByProfile}
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

        {manuallyCreatedUsers.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted-2)]">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Contato</th>
                  <th className="px-5 py-3 font-medium">Pacientes atribuídos</th>
                  <th className="px-5 py-3 font-medium">Contratos e ações</th>
                </tr>
              </thead>
              <tbody>
                {manuallyCreatedUsers.map((caregiver) => (
                  <tr key={caregiver.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-5 py-4 font-medium text-[var(--foreground)]">{caregiver.name}</td>
                    <td className="px-5 py-4 text-[var(--muted)]">
                      {caregiver.email}
                      <br />
                      {caregiver.phone}
                    </td>
                    <td className="px-5 py-4 text-[var(--foreground)]">
                      {(patientNamesByUser.get(caregiver.id) || []).join(", ") || "Nenhum"}
                    </td>
                    <td className="min-w-[380px] px-5 py-4">
                      <ContractManager
                        ownerType="caregiver_user"
                        ownerId={caregiver.id}
                        contracts={contractsByManualUser[caregiver.id] || []}
                      />
                      <div className="mt-3">
                        <DeleteButton
                          endpoint={`/api/admin/caregiver-users/${caregiver.id}`}
                          confirmText={`Excluir o cadastro de ${caregiver.name}? O acesso será encerrado, vínculos ativos serão removidos e os registros históricos serão preservados sem os dados pessoais.`}
                          label="Excluir cuidador"
                          compact
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-2)]">
            Nenhum cuidador foi criado manualmente.
          </p>
        )}
      </section>
    </div>
  );
}
