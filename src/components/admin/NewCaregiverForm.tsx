"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PROFESSION_OPTIONS } from "@/components/admin/caregiver-directory";

export function NewCaregiverForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/caregivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          password: data.get("password"),
          profession: data.get("profession"),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Não foi possível cadastrar.");
        return;
      }
      (e.target as HTMLFormElement).reset();
      setSaved(true);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erro de conexão. O profissional não foi cadastrado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={() => {
            setError(null);
            setSaved(false);
            setOpen(true);
          }}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
        >
          + Novo profissional
        </button>
        {saved ? <p className="mt-2 text-sm text-[var(--status-good)]" role="status">Profissional cadastrado.</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 max-w-xl">
      <h3 className="font-semibold text-[var(--foreground)] mb-4">Cadastrar profissional</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field id="manual-professional-name" label="Nome completo *">
          <input id="manual-professional-name" name="name" required className="input" />
        </Field>
        <Field id="manual-professional-phone" label="Telefone">
          <input id="manual-professional-phone" name="phone" className="input" />
        </Field>
        <Field id="manual-professional-role" label="Área profissional *">
          <select id="manual-professional-role" name="profession" required defaultValue="cuidador" className="input">
            {PROFESSION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="manual-professional-email" label="E-mail de acesso *">
          <input id="manual-professional-email" type="email" name="email" required className="input" />
        </Field>
        <Field id="manual-professional-password" label="Senha provisória *">
          <input
            id="manual-professional-password"
            type="password"
            name="password"
            required
            minLength={12}
            autoComplete="new-password"
            placeholder="Crie uma senha provisória segura"
            className="input"
          />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm text-[var(--status-critical)]" role="alert">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {loading ? "Salvando..." : "Cadastrar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-black/[0.03]"
        >
          Cancelar
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
      `}</style>
    </form>
  );
}

function Field({ id, label, children }: { id?: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-[var(--muted)] mb-1">{label}</label>
      {children}
    </div>
  );
}
