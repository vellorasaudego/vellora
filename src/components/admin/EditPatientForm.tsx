"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Patient, User } from "@/lib/data";

const CARE_LEVELS = ["Período diurno (8h/dia)", "Período noturno (12h/dia)", "Integral (12h/dia)", "24 horas"];

export function EditPatientForm({ patient, familyUsers, currentFamily }: { patient: Patient; familyUsers: User[]; currentFamily?: User }) {
  const router = useRouter();
  const [familyMode, setFamilyMode] = useState<"keep" | "existing" | "new">("keep");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const data = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: data.get("name"),
      birth_date: data.get("birth_date") || null,
      address: data.get("address") || null,
      care_level: data.get("care_level") || null,
      condition_summary: data.get("condition_summary") || null,
      notes: data.get("notes") || null,
      status: data.get("status"),
    };
    if (familyMode === "existing") {
      payload.family_user_id = data.get("family_user_id");
    } else if (familyMode === "new") {
      payload.new_family_name = data.get("new_family_name");
      payload.new_family_email = data.get("new_family_email");
      payload.new_family_phone = data.get("new_family_phone");
      payload.new_family_password = data.get("new_family_password");
    }

    try {
      const res = await fetch(`/api/admin/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Não foi possível salvar.");
        setLoading(false);
        return;
      }
      setSaved(true);
      setFamilyMode("keep");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Dados do paciente</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome completo *">
            <input name="name" required defaultValue={patient.name} className="input" />
          </Field>
          <Field label="Data de nascimento">
            <input type="date" name="birth_date" defaultValue={patient.birth_date || ""} className="input" />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <input name="address" defaultValue={patient.address || ""} className="input" />
          </Field>
          <Field label="Plano de cuidado">
            <select name="care_level" className="input" defaultValue={patient.care_level || CARE_LEVELS[0]}>
              {CARE_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" className="input" defaultValue={patient.status}>
              <option value="pendente">Pendente</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </Field>
          <Field label="Resumo da condição de saúde" className="sm:col-span-2">
            <textarea name="condition_summary" rows={2} defaultValue={patient.condition_summary || ""} className="input" />
          </Field>
          <Field label="Observações internas" className="sm:col-span-2">
            <textarea name="notes" rows={2} defaultValue={patient.notes || ""} className="input" />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Conta da família</h3>
        {currentFamily && familyMode === "keep" && (
          <p className="text-sm text-[var(--muted)] mb-3">
            Vinculada a <strong>{currentFamily.name}</strong> ({currentFamily.email}).
          </p>
        )}
        {!currentFamily && familyMode === "keep" && (
          <p className="text-sm text-[var(--muted-2)] mb-3">Nenhuma conta de família vinculada ainda.</p>
        )}
        <div className="flex gap-2 mb-4">
          <ModeButton active={familyMode === "keep"} onClick={() => setFamilyMode("keep")} label="Manter" />
          <ModeButton active={familyMode === "existing"} onClick={() => setFamilyMode("existing")} label="Vincular conta existente" />
          <ModeButton active={familyMode === "new"} onClick={() => setFamilyMode("new")} label="Criar nova conta" />
        </div>

        {familyMode === "existing" && (
          <Field label="Selecione a conta da família">
            <select name="family_user_id" className="input" required>
              <option value="">Selecione...</option>
              {familyUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </Field>
        )}

        {familyMode === "new" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome do responsável *">
              <input name="new_family_name" required className="input" />
            </Field>
            <Field label="Telefone">
              <input name="new_family_phone" className="input" />
            </Field>
            <Field label="E-mail de acesso *">
              <input type="email" name="new_family_email" required className="input" />
            </Field>
            <Field label="Senha provisória *">
              <input
                type="password"
                name="new_family_password"
                required
                minLength={12}
                autoComplete="new-password"
                placeholder="Crie uma senha provisória segura"
                className="input"
              />
            </Field>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-[var(--status-critical)]">{error}</p>}
      {saved && <p className="text-sm text-[var(--status-good)]">Alterações salvas.</p>}

      <div className="border-t border-[var(--border)] pt-6">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--brand)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
        }
        .input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-light);
        }
      `}</style>
    </form>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-xs font-medium border ${
        active ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "border-[var(--border)] text-[var(--muted)] hover:bg-black/[0.03]"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-[var(--muted)] mb-1">{label}</label>
      {children}
    </div>
  );
}
