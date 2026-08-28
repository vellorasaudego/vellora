"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Brand } from "./Brand";
import { LineIcon } from "./LineIcon";

const NAV_LINKS = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/solicitar-cuidado", label: "Contato" },
] as const;

export function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(true);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const actionsBarRef = useRef<HTMLDivElement>(null);
  const actionsVisibleRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const suppressScrollUntilRef = useRef(0);

  useEffect(() => {
    if (!menuOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }

    function handleOutsidePointer(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("pointerdown", handleOutsidePointer);
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) setMenuOpen(false);
    };

    closeOnDesktop();
    desktopQuery.addEventListener("change", closeOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    function handleScroll() {
      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;

      if (currentScrollY <= 16) {
        actionsVisibleRef.current = true;
        setActionsVisible(true);
        return;
      }

      if (
        performance.now() < suppressScrollUntilRef.current ||
        Math.abs(scrollDelta) < 4 ||
        actionsBarRef.current?.contains(document.activeElement)
      ) {
        return;
      }

      const nextVisibility = scrollDelta < 0;
      if (actionsVisibleRef.current === nextVisibility) return;

      actionsVisibleRef.current = nextVisibility;
      suppressScrollUntilRef.current = performance.now() + 260;
      setActionsVisible(nextVisibility);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  const showActionsBar = actionsVisible || menuOpen;

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur-lg">
      <div className="container-page flex min-h-[4.5rem] items-center justify-between gap-5">
        <Brand />

        <nav aria-label="Navegação principal" className="hidden items-center gap-9 text-sm font-medium text-[var(--muted)] xl:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[var(--brand-dark)]">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--brand-dark)]"
          >
            Acessar painel
          </Link>
          <Link
            href="/trabalhe-conosco"
            className="inline-flex min-h-10 items-center rounded-lg border border-[var(--brand-dark)] px-3.5 text-sm font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand-light)]"
          >
            Trabalhe conosco
          </Link>
          <Link
            href="/solicitar-cuidado"
            className="rounded-lg bg-[var(--brand-dark)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-deep)]"
          >
            Solicitar cuidado
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-white text-[var(--brand-dark)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)] xl:hidden"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={menuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2">
            {menuOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      <div
        ref={actionsBarRef}
        aria-hidden={!showActionsBar}
        inert={!showActionsBar}
        className={`border-t border-[var(--border)] bg-white overflow-hidden transition-[max-height,opacity,padding,transform] duration-200 ease-out motion-reduce:transition-none xl:hidden ${
          showActionsBar
            ? "max-h-52 translate-y-0 py-3 opacity-100 sm:max-h-28"
            : "pointer-events-none max-h-0 -translate-y-1 py-0 opacity-0"
        }`}
      >
        <div className="container-page grid gap-2 sm:grid-cols-3">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]"
          >
            Acessar painel
          </Link>
          <Link
            href="/trabalhe-conosco"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--brand-dark)] px-4 text-sm font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand-light)]"
          >
            Trabalhe conosco
          </Link>
          <Link
            href="/solicitar-cuidado"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--brand-dark)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-deep)]"
          >
            Solicitar cuidado
            <LineIcon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {menuOpen ? (
        <div id={menuId} className="border-t border-[var(--border)] bg-white xl:hidden">
          <div className="container-page py-4">
            <nav aria-label="Navegação mobile" className="grid gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--brand-light)] hover:text-[var(--brand-dark)]"
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
