"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/data";

export function FamilyEditForm({ family }: { family: Pick<User, "id" | "name" | "phone" | "email"> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/admin/families/${family.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          phone: data.get("phone"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(result.error || "Não foi possível salvar os dados da família.");
        return;
      }
      setSaved(true);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-5">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setSaved(false);
            setOpen(true);
          }}
          className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]"
        >
          Editar dados
        </button>
        {saved ? <p className="mt-2 text-sm text-[var(--status-good)]" role="status">Alterações salvas.</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div>
        <label htmlFor={`family-name-${family.id}`} className="block text-xs font-medium text-[var(--muted)]">Nome da família *</label>
        <input id={`family-name-${family.id}`} name="name" required defaultValue={family.name} className="input mt-1" />
      </div>
      <div>
        <label htmlFor={`family-phone-${family.id}`} className="block text-xs font-medium text-[var(--muted)]">Telefone</label>
        <input id={`family-phone-${family.id}`} name="phone" defaultValue={family.phone || ""} className="input mt-1" />
      </div>
      <div>
        <p className="text-xs leading-5 text-[var(--muted-2)]">
          E-mail de acesso: <span className="break-words">{family.email}</span>. Para preservar o acesso, o e-mail e a senha não são editados nesta tela.
        </p>
      </div>
      {error ? <p className="text-sm text-[var(--status-critical)]" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={loading} className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-50">
          {loading ? "Salvando..." : "Salvar alterações"}
        </button>
        <button type="button" disabled={loading} onClick={() => setOpen(false)} className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-black/[0.03] disabled:opacity-50">
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
        .input:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px var(--brand-light);
        }
      `}</style>
    </form>
  );
}
