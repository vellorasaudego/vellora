import Link from "next/link";
import { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";
import { Brand } from "./Brand";

export type NavItem = { href: string; label: string; icon: string };

export function DashboardShell({
  title,
  userName,
  roleLabel,
  navItems,
  children,
}: {
  title: string;
  userName: string;
  roleLabel: string;
  navItems: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f4f7f5]">
      <aside className="hidden w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
        <div className="flex h-[5.25rem] items-center border-b border-[var(--border)] px-6">
          <Brand />
        </div>
        <nav aria-label="Navegação da área exclusiva" className="flex-1 space-y-1.5 px-4 py-6">
          <p className="px-3 pb-2 text-[0.64rem] font-bold uppercase tracking-[0.16em] text-[var(--muted-2)]">Menu</p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--brand-light)] hover:text-[var(--brand-dark)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-sm" aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] px-6 py-5 text-xs leading-5 text-[var(--muted-2)]">
          <p className="font-semibold text-[var(--brand-dark)]">Ambiente protegido</p>
          <p>Acesso restrito a usuários autorizados.</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex min-h-[5.25rem] items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <details className="relative md:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-[var(--border)] text-[var(--brand-dark)]" aria-label="Abrir menu">
                <span aria-hidden="true">☰</span>
              </summary>
              <nav className="absolute left-0 top-12 z-50 w-64 space-y-1 rounded-2xl border border-[var(--border)] bg-white p-3 shadow-xl" aria-label="Menu móvel">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--brand-light)]">
                    <span aria-hidden="true">{item.icon}</span>{item.label}
                  </Link>
                ))}
              </nav>
            </details>
            <div className="min-w-0">
              <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[var(--accent-dark)]">{roleLabel}</p>
              <h1 className="truncate text-base font-semibold text-[var(--foreground)]">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-[var(--foreground)]">{userName}</p>
              <p className="text-xs text-[var(--muted-2)]">{roleLabel}</p>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
