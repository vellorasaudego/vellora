"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContractDocument, ContractOwnerType } from "@/lib/data";

function formatBytes(value: number): string {
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

export function ContractManager({
  ownerType,
  ownerId,
  contracts,
}: {
  ownerType: ContractOwnerType;
  ownerId: string;
  contracts: ContractDocument[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("owner_type", ownerType);
    data.set("owner_id", ownerId);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/contracts", { method: "POST", body: data });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível anexar o contrato.");
      form.reset();
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Erro ao anexar o contrato.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string, fileName: string) {
    if (!window.confirm(`Excluir o contrato “${fileName}”? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/contracts/${id}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível excluir o contrato.");
      router.refresh();
    } catch (removalError) {
      setError(removalError instanceof Error ? removalError.message : "Erro ao excluir o contrato.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[var(--foreground)]">Contratos assinados</h4>
          <p className="text-xs text-[var(--muted)]">PDF de até 4 MB. O titular pode apenas visualizar.</p>
        </div>
      </div>

      {contracts.length ? (
        <ul className="mt-3 space-y-2">
          {contracts.map((contract) => (
            <li key={contract.id} className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <a
                  href={`/api/contracts/${contract.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-semibold text-[var(--brand)] hover:underline"
                >
                  {contract.file_name}
                </a>
                <p className="text-xs text-[var(--muted-2)]">{formatBytes(contract.file_size)} · {formatDate(contract.created_at)}</p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => remove(contract.id, contract.file_name)}
                className="text-xs font-semibold text-[var(--status-critical)] hover:underline disabled:opacity-50"
              >
                Excluir arquivo
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[var(--muted-2)]">Nenhum contrato anexado.</p>
      )}

      <form onSubmit={upload} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          accept="application/pdf,.pdf"
          required
          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--brand-light)] file:px-3 file:py-1.5 file:font-semibold file:text-[var(--brand-dark)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-10 rounded-lg bg-[var(--brand-dark)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Anexar PDF"}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs text-[var(--status-critical)]" role="alert">{error}</p> : null}
    </section>
  );
}
