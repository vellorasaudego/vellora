"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function NewCaregiverForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/caregivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        phone: data.get("phone"),
        password: data.get("password"),
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Não foi possível cadastrar.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
      >
        + Novo cuidador
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 max-w-xl">
      <h3 className="font-semibold text-[var(--foreground)] mb-4">Cadastrar cuidador</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nome completo *">
          <input name="name" required className="input" />
        </Field>
        <Field label="Telefone">
          <input name="phone" className="input" />
        </Field>
        <Field label="E-mail de acesso *">
          <input type="email" name="email" required className="input" />
        </Field>
        <Field label="Senha provisória *">
          <input
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
      {error && <p className="mt-3 text-sm text-[var(--status-critical)]">{error}</p>}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--muted)] mb-1">{label}</label>
      {children}
    </div>
  );
}
