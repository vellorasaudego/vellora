import Link from "next/link";
import { Pill } from "@/components/ui/Badge";
import type { CaregiverDirectoryEntry } from "./caregiver-directory";

export function CaregiverDirectoryTable({
  entries,
  emptyMessage,
}: {
  entries: CaregiverDirectoryEntry[];
  emptyMessage: string;
}) {
  if (!entries.length) {
    return (
      <p className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-4 text-sm text-[var(--muted-2)]">
        {emptyMessage}
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 sm:hidden" aria-label="Diretório de profissionais">
        {entries.map((entry) => (
          <article key={`${entry.href}-${entry.id}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={entry.href}
                className="min-w-0 break-words font-semibold text-[var(--brand)] underline-offset-4 hover:underline focus-visible:rounded-sm"
              >
                {entry.name}
              </Link>
              <Pill value={entry.status} />
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <dt className="font-medium text-[var(--muted-2)]">Telefone:</dt>
                <dd className="text-[var(--foreground)]">{entry.phone || "Não informado"}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <dt className="font-medium text-[var(--muted-2)]">Profissão:</dt>
                <dd className="text-[var(--foreground)]">{entry.profession}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] sm:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Diretório de profissionais</caption>
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted-2)]">
              <th className="w-[35%] px-3 py-3 font-medium sm:px-5">Nome</th>
              <th className="w-[23%] px-3 py-3 font-medium sm:px-5">Telefone</th>
              <th className="w-[27%] px-3 py-3 font-medium sm:px-5">Profissão</th>
              <th className="w-[15%] px-3 py-3 font-medium sm:px-5">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.href}-${entry.id}`} className="border-b border-[var(--border)] align-top last:border-0">
                <td className="break-words px-3 py-4 sm:px-5">
                  <Link
                    href={entry.href}
                    className="font-medium text-[var(--brand)] underline-offset-4 hover:underline focus-visible:rounded-sm"
                  >
                    {entry.name}
                  </Link>
                </td>
                <td className="break-words px-3 py-4 text-[var(--foreground)] sm:px-5">
                  {entry.phone || "Telefone não informado"}
                </td>
                <td className="break-words px-3 py-4 text-[var(--foreground)] sm:px-5">{entry.profession}</td>
                <td className="px-3 py-4 sm:px-5">
                  <Pill value={entry.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
