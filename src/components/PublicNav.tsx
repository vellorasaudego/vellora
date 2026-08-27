import Link from "next/link";
import { Brand } from "./Brand";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur-lg">
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-5">
        <Brand />
        <nav aria-label="Navegação principal" className="hidden items-center gap-9 text-sm font-medium text-[var(--muted)] xl:flex">
          <Link href="/#servicos" className="hover:text-[var(--brand-dark)]">Serviços</Link>
          <Link href="/#como-funciona" className="hover:text-[var(--brand-dark)]">Como funciona</Link>
          <Link href="/solicitar-cuidado" className="hover:text-[var(--brand-dark)]">Contato</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-[var(--foreground)] hover:text-[var(--brand-dark)] sm:inline"
          >
            Minha área
          </Link>
          <Link
            href="/trabalhe-conosco"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Trabalhe conosco — abre em uma nova aba"
            className="hidden min-h-10 items-center rounded-lg border border-[var(--brand-dark)] px-3.5 text-sm font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand-light)] md:inline-flex"
          >
            Trabalhe conosco
          </Link>
          <Link
            href="/solicitar-cuidado"
            className="rounded-lg bg-[var(--brand-dark)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-deep)]"
          >
            <span className="hidden sm:inline">Solicitar cuidado</span>
            <span className="sm:hidden">Solicitar</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
