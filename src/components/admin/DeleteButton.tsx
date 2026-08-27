"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteButton({
  endpoint,
  confirmText,
  label = "Excluir",
  redirectTo,
  compact = false,
}: {
  endpoint: string;
  confirmText: string;
  label?: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(confirmText)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Não foi possível excluir.");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (removalError) {
      setError(removalError instanceof Error ? removalError.message : "Erro ao excluir o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={loading}
        className={
          compact
            ? "text-xs font-semibold text-[var(--status-critical)] hover:underline disabled:opacity-50"
            : "rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--status-critical)] hover:bg-red-50 disabled:opacity-50"
        }
      >
        {loading ? "Excluindo..." : label}
      </button>
      {error ? <span className="max-w-xs text-xs text-[var(--status-critical)]" role="alert">{error}</span> : null}
    </span>
  );
}
