"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaregiverProfile, User } from "@/lib/data";
import {
  DAY_LABELS,
  PROFESSION_LABELS,
  SHIFT_LABELS,
} from "@/components/admin/caregiver-directory";

export type CaregiverAccountData = Pick<User, "id" | "name" | "email" | "phone">;

type ProfileDraft = {
  name: string;
  contact_email: string;
  phone: string;
  city: string;
  profession: CaregiverProfile["profession"];
  coren: string;
  experience: string;
  availability_days: string[];
  availability_shifts: string[];
  available_from: string;
  notes: string;
};

type ManualDraft = {
  name: string;
  phone: string;
};

type CaregiverEditFormProps =
  | { mode: "profile"; caregiver: CaregiverProfile }
  | { mode: "manual"; caregiver: CaregiverAccountData };

const dayOptions = Object.entries(DAY_LABELS);
const shiftOptions = Object.entries(SHIFT_LABELS);
const professionOptions = Object.entries(PROFESSION_LABELS);
const inputClassName =
  "min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

function profileDraft(caregiver: CaregiverProfile): ProfileDraft {
  return {
    name: caregiver.name,
    contact_email: caregiver.contact_email,
    phone: caregiver.phone,
    city: caregiver.city || "",
    profession: caregiver.profession,
    coren: caregiver.coren || "",
    experience: caregiver.experience || "",
    availability_days: [...caregiver.availability_days],
    availability_shifts: [...caregiver.availability_shifts],
    available_from: caregiver.available_from || "",
    notes: caregiver.notes || "",
  };
}

function manualDraft(caregiver: CaregiverAccountData): ManualDraft {
  return {
    name: caregiver.name,
    phone: caregiver.phone || "",
  };
}

function Feedback({
  message,
  error,
  feedbackRef,
  }: {
  message: string | null;
  error: string | null;
  feedbackRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={feedbackRef} tabIndex={-1} className="mt-4 space-y-1">
      <p role="status" aria-live="polite" className="text-sm text-[var(--status-good)]">
        {message || ""}
      </p>
      <p role="alert" aria-live="assertive" className="text-sm text-[var(--status-critical)]">
        {error || ""}
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  children,
  className = "",
}: {
  id?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-medium text-[var(--muted)]">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EditSection({
  title,
  description,
  editing,
  saving,
  onEdit,
  onCancel,
  children,
  message,
  error,
  feedbackRef,
}: {
  title: string;
  description: string;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  message: string | null;
  error: string | null;
  feedbackRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section
      aria-labelledby="caregiver-edit-heading"
      aria-busy={saving}
      className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="caregiver-edit-heading" className="font-semibold text-[var(--foreground)]">
            {title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
        <button
          type="button"
          onClick={editing ? onCancel : onEdit}
          className="min-h-10 shrink-0 rounded-lg border border-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          {editing ? "Cancelar" : "Editar dados"}
        </button>
      </div>
      {editing ? children : null}
      <Feedback message={message} error={error} feedbackRef={feedbackRef} />
    </section>
  );
}

function ProfileEditForm({ caregiver }: { caregiver: CaregiverProfile }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(() => profileDraft(caregiver));
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message || error) feedbackRef.current?.focus();
  }, [message, error]);

  function startEditing() {
    setDraft(profileDraft(caregiver));
    setMessage(null);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(profileDraft(caregiver));
    setMessage(null);
    setError(null);
    setEditing(false);
  }

  function toggleSelection(field: "availability_days" | "availability_shifts", value: string) {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      name: draft.name.trim(),
      contact_email: draft.contact_email.trim(),
      phone: draft.phone.trim(),
      city: draft.city.trim() || null,
      profession: draft.profession,
      coren: draft.coren.trim() || null,
      experience: draft.experience.trim() || null,
      availability_days: draft.availability_days,
      availability_shifts: draft.availability_shifts,
      available_from: draft.available_from || null,
      notes: draft.notes.trim() || null,
    };

    try {
      const response = await fetch(`/api/admin/caregivers/${caregiver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Não foi possível salvar os dados.");

      setMessage("Dados do profissional atualizados com sucesso.");
      setEditing(false);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditSection
      title="Dados cadastrais"
      description="Atualize os dados profissionais e a disponibilidade. E-mail de acesso, senha e status permanecem somente para consulta."
      editing={editing}
      saving={saving}
      onEdit={startEditing}
      onCancel={cancelEditing}
      message={message}
      error={error}
      feedbackRef={feedbackRef}
    >
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field id={`caregiver-name-${caregiver.id}`} label="Nome completo *">
          <input
            id={`caregiver-name-${caregiver.id}`}
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <Field id={`caregiver-contact-email-${caregiver.id}`} label="E-mail de contato *">
          <input
            id={`caregiver-contact-email-${caregiver.id}`}
            name="contact_email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={draft.contact_email}
            onChange={(event) => setDraft((current) => ({ ...current, contact_email: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <Field id={`caregiver-phone-${caregiver.id}`} label="Telefone *">
          <input
            id={`caregiver-phone-${caregiver.id}`}
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            value={draft.phone}
            onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <Field id={`caregiver-city-${caregiver.id}`} label="Cidade">
          <input
            id={`caregiver-city-${caregiver.id}`}
            name="city"
            maxLength={100}
            autoComplete="address-level2"
            value={draft.city}
            onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <Field id={`caregiver-profession-${caregiver.id}`} label="Profissão">
          <select
            id={`caregiver-profession-${caregiver.id}`}
            name="profession"
            value={draft.profession}
            onChange={(event) =>
              setDraft((current) => ({ ...current, profession: event.target.value as ProfileDraft["profession"] }))
            }
            className={inputClassName}
          >
            {professionOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`caregiver-coren-${caregiver.id}`} label="COREN">
          <input
            id={`caregiver-coren-${caregiver.id}`}
            name="coren"
            maxLength={40}
            value={draft.coren}
            onChange={(event) => setDraft((current) => ({ ...current, coren: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <Field id={`caregiver-available-from-${caregiver.id}`} label="Disponível a partir de">
          <input
            id={`caregiver-available-from-${caregiver.id}`}
            name="available_from"
            type="date"
            value={draft.available_from}
            onChange={(event) => setDraft((current) => ({ ...current, available_from: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-medium text-[var(--muted)]">Dias disponíveis</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {dayOptions.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <input
                  type="checkbox"
                  name="availability_days"
                  value={value}
                  checked={draft.availability_days.includes(value)}
                  onChange={() => toggleSelection("availability_days", value)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-medium text-[var(--muted)]">Turnos disponíveis</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shiftOptions.map(([value, label]) => (
              <label
                key={value}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <input
                  type="checkbox"
                  name="availability_shifts"
                  value={value}
                  checked={draft.availability_shifts.includes(value)}
                  onChange={() => toggleSelection("availability_shifts", value)}
                  className="h-4 w-4 accent-[var(--brand)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id={`caregiver-experience-${caregiver.id}`} label="Experiência" className="sm:col-span-2">
          <textarea
            id={`caregiver-experience-${caregiver.id}`}
            name="experience"
            rows={4}
            maxLength={2000}
            value={draft.experience}
            onChange={(event) => setDraft((current) => ({ ...current, experience: event.target.value }))}
            className={`${inputClassName} resize-y`}
          />
        </Field>
        <Field id={`caregiver-notes-${caregiver.id}`} label="Observações" className="sm:col-span-2">
          <textarea
            id={`caregiver-notes-${caregiver.id}`}
            name="notes"
            rows={4}
            maxLength={2000}
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            className={`${inputClassName} resize-y`}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-10 rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-wait disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          <span className="text-xs text-[var(--muted-2)]">As credenciais de acesso não são alteradas por este formulário.</span>
        </div>
      </form>
    </EditSection>
  );
}

function ManualEditForm({ caregiver }: { caregiver: CaregiverAccountData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManualDraft>(() => manualDraft(caregiver));
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message || error) feedbackRef.current?.focus();
  }, [message, error]);

  function startEditing() {
    setDraft(manualDraft(caregiver));
    setMessage(null);
    setError(null);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(manualDraft(caregiver));
    setMessage(null);
    setError(null);
    setEditing(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/caregiver-users/${caregiver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name.trim(), phone: draft.phone.trim() || null }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "Não foi possível salvar os dados.");

      setMessage("Dados do profissional atualizados com sucesso.");
      setEditing(false);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditSection
      title="Dados cadastrais"
      description="Atualize o nome e o telefone deste cadastro manual. E-mail de acesso, senha e status permanecem somente para consulta."
      editing={editing}
      saving={saving}
      onEdit={startEditing}
      onCancel={cancelEditing}
      message={message}
      error={error}
      feedbackRef={feedbackRef}
    >
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field id={`manual-caregiver-name-${caregiver.id}`} label="Nome completo *">
          <input
            id={`manual-caregiver-name-${caregiver.id}`}
            name="name"
            required
            maxLength={120}
            autoComplete="name"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <Field id={`manual-caregiver-phone-${caregiver.id}`} label="Telefone">
          <input
            id={`manual-caregiver-phone-${caregiver.id}`}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={draft.phone}
            onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
            className={inputClassName}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="min-h-10 rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-wait disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          <span className="text-xs text-[var(--muted-2)]">O e-mail de acesso e a senha não são alterados por este formulário.</span>
        </div>
      </form>
    </EditSection>
  );
}

export function CaregiverEditForm(props: CaregiverEditFormProps) {
  return (
    <>
      {props.mode === "profile" ? (
        <ProfileEditForm caregiver={props.caregiver} />
      ) : (
        <ManualEditForm caregiver={props.caregiver} />
      )}
    </>
  );
}
