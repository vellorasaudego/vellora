"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { type CaregiverProfile, type ContractDocument } from "@/lib/data";
import { Pill } from "@/components/ui/Badge";
import { ContractManager } from "@/components/admin/ContractManager";
import { DeleteButton } from "@/components/admin/DeleteButton";

const DAY_LABELS: Record<string, string> = {
  segunda: "Seg",
  terca: "Ter",
  quarta: "Qua",
  quinta: "Qui",
  sexta: "Sex",
  sabado: "Sáb",
  domingo: "Dom",
};

const SHIFT_LABELS: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  plantao_12h_diurno: "12h diurno",
  plantao_12h_noturno: "12h noturno",
  plantao_24h: "24h",
};

const PROFESSION_LABELS: Record<CaregiverProfile["profession"], string> = {
  cuidador: "Cuidador(a)",
  tecnico_enfermagem: "Técnico(a) de enfermagem",
  enfermeiro: "Enfermeiro(a)",
  outros: "Outros",
};

export function CaregiverBank({
  profiles,
  patientsByProfile,
  contractsByProfile,
}: {
  profiles: CaregiverProfile[];
  patientsByProfile: Record<string, string[]>;
  contractsByProfile: Record<string, ContractDocument[]>;
}) {
  const router = useRouter();
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAccess(event: FormEvent<HTMLFormElement>, profileId: string) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch(`/api/admin/caregivers/${profileId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || "Não foi possível criar o acesso.");
      }
      setOpenProfileId(null);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Erro ao criar acesso.");
    } finally {
      setLoading(false);
    }
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] p-8 text-center">
        <p className="font-medium text-[var(--foreground)]">O banco de profissionais está vazio.</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Quando uma candidatura for aprovada, o perfil aparecerá aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {profiles.map((profile) => {
        const isCreatingAccess = openProfileId === profile.id;
        const patients = patientsByProfile[profile.id] || [];

        return (
          <article key={profile.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-[var(--foreground)]">{profile.name}</h3>
                  <Pill value={profile.account_status} />
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {PROFESSION_LABELS[profile.profession]}
                  {profile.coren ? ` · COREN ${profile.coren}` : ""}
                </p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]">Contato</p>
                    <p className="mt-1 text-[var(--foreground)]">{profile.phone}</p>
                    <p className="break-all text-[var(--muted)]">{profile.contact_email}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]">Disponibilidade</p>
                    <p className="mt-1 text-[var(--foreground)]">
                      {profile.availability_days.map((day) => DAY_LABELS[day] || day).join(", ")}
                    </p>
                    <p className="text-[var(--muted)]">
                      {profile.availability_shifts.map((shift) => SHIFT_LABELS[shift] || shift).join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]">Acesso e escala</p>
                    <p className="mt-1 text-[var(--foreground)]">
                      {profile.access_email || "Acesso ainda não criado"}
                    </p>
                    <p className="text-[var(--muted)]">{patients.join(", ") || "Sem paciente atribuído"}</p>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                {profile.account_status === "aguardando_acesso" && !profile.user_id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setOpenProfileId(isCreatingAccess ? null : profile.id);
                    }}
                    className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
                  >
                    {isCreatingAccess ? "Cancelar" : "Criar e-mail e senha"}
                  </button>
                ) : null}
                <DeleteButton
                  endpoint={`/api/admin/caregivers/${profile.id}`}
                  confirmText={`Excluir o cadastro de ${profile.name}? O acesso será encerrado, vínculos ativos serão removidos e os registros históricos serão preservados sem os dados pessoais do profissional.`}
                  label="Excluir cuidador"
                  compact
                />
              </div>
            </div>

            {isCreatingAccess ? (
              <form
                onSubmit={(event) => createAccess(event, profile.id)}
                className="mt-5 grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
              >
                <div>
                  <label htmlFor={`access-email-${profile.id}`} className="block text-xs font-medium text-[var(--muted)]">
                    E-mail de acesso *
                  </label>
                  <input
                    id={`access-email-${profile.id}`}
                    name="email"
                    type="email"
                    required
                    defaultValue={profile.contact_email}
                    autoComplete="off"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`access-password-${profile.id}`} className="block text-xs font-medium text-[var(--muted)]">
                    Senha provisória *
                  </label>
                  <input
                    id={`access-password-${profile.id}`}
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="Mínimo de 12 caracteres"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-10 rounded-lg bg-[var(--brand-dark)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50"
                >
                  {loading ? "Criando..." : "Ativar acesso"}
                </button>
                {error ? <p className="text-sm text-[var(--status-critical)] sm:col-span-2 lg:col-span-3" role="alert">{error}</p> : null}
                <p className="text-xs leading-5 text-[var(--muted-2)] sm:col-span-2 lg:col-span-3">
                  Oriente o profissional a trocar a senha provisória usando “Esqueci minha senha” após o primeiro acesso.
                </p>
              </form>
            ) : null}

            <ContractManager
              ownerType="caregiver_profile"
              ownerId={profile.id}
              contracts={contractsByProfile[profile.id] || []}
            />
          </article>
        );
      })}
    </div>
  );
}
