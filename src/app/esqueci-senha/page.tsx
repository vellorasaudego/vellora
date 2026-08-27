import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-alt)] px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-9 flex justify-center"><Brand /></div>
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(8,54,49,0.08)] sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-dark)]">Recuperar acesso</p>
          <h1 className="font-display mt-3 text-4xl text-[var(--brand-deep)]">Esqueceu sua senha?</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Informe o e-mail usado na área exclusiva. Se houver uma conta cadastrada, enviaremos um link seguro para criar uma nova senha.
          </p>
          <div className="mt-7"><ForgotPasswordForm /></div>
        </section>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]">
          ← Voltar para o login
        </Link>
      </div>
    </main>
  );
}
