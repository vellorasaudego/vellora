"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Assignment, User } from "@/lib/data";

export function AssignmentsManager({
  patientId,
  assignments,
  caregivers,
}: {
  patientId: string;
  assignments: (Assignment & { caregiverName: string })[];
  caregivers: User[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assignedIds = new Set(assignments.filter((a) => a.active).map((a) => a.caregiver_user_id));
  const available = caregivers.filter((c) => !assignedIds.has(c.id));

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          caregiver_user_id: data.get("caregiver_user_id"),
          start_date: data.get("start_date"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Não foi possível vincular.");
      (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível vincular.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(id: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/assignments/${id}`, { method: "PATCH" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível encerrar o vínculo.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível encerrar o vínculo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="space-y-2 mb-5">
        {assignments.length === 0 && <p className="text-sm text-[var(--muted-2)]">Nenhum cuidador vinculado ainda.</p>}
        {assignments.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm">
            <div>
              <p className="font-medium text-[var(--foreground)]">{a.caregiverName}</p>
              <p className="text-xs text-[var(--muted-2)]">
                Desde {new Date(a.start_date + "T00:00:00").toLocaleDateString("pt-BR")}
                {!a.active && a.end_date ? ` · encerrado em ${new Date(a.end_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}
              </p>
            </div>
            {a.active ? (
              <button
                onClick={() => handleDeactivate(a.id)}
                disabled={loading}
                className="text-xs font-medium text-[var(--status-critical)] hover:underline disabled:opacity-50"
              >
                Encerrar vínculo
              </button>
            ) : (
              <span className="text-xs text-[var(--muted-2)]">Inativo</span>
            )}
          </div>
        ))}
      </div>

      {available.length > 0 ? (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 border-t border-[var(--border)] pt-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Cuidador</label>
            <select name="caregiver_user_id" required className="input">
              {available.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-1">Início</label>
            <input type="date" name="start_date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
          >
            Vincular
          </button>
        </form>
      ) : (
        <p className="text-xs text-[var(--muted-2)] border-t border-[var(--border)] pt-4">
          Todos os cuidadores cadastrados já estão vinculados a este paciente.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-[var(--status-critical)]">{error}</p>}

      <style jsx>{`
        .input {
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
          width: 100%;
        }
      `}</style>
    </div>
  );
}
