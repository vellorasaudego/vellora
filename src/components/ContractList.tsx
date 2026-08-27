import type { ContractDocument } from "@/lib/data";

function formatBytes(value: number): string {
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function ContractList({ contracts }: { contracts: ContractDocument[] }) {
  return (
    <section className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-semibold text-[var(--foreground)]">Meus contratos</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Documentos assinados disponibilizados pela Vellora Saúde.</p>
      {contracts.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {contracts.map((contract) => (
            <a
              key={contract.id}
              href={`/api/contracts/${contract.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 hover:border-[var(--brand)]"
            >
              <p className="truncate text-sm font-semibold text-[var(--brand-dark)]">{contract.file_name}</p>
              <p className="mt-1 text-xs text-[var(--muted-2)]">PDF · {formatBytes(contract.file_size)} · Visualizar</p>
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--muted-2)]">Nenhum contrato foi disponibilizado ainda.</p>
      )}
    </section>
  );
}
