import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { getAuthProvider } from "@/lib/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; recovery?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const recoveryError = params.recovery === "erro";
  const provider = getAuthProvider();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-alt)] px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-9 flex justify-center"><Brand /></div>
        <section className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(8,54,49,0.08)] sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-dark)]">Nova senha</p>
          <h1 className="font-display mt-3 text-4xl text-[var(--brand-deep)]">Crie uma senha segura</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Use pelo menos 12 caracteres. Depois da troca, os acessos anteriores serão encerrados.
          </p>
          <div className="mt-7">
            <ResetPasswordForm
              token={token}
              provider={provider}
              initialError={recoveryError ? "Este link de recuperação é inválido ou expirou. Solicite um novo e-mail." : undefined}
            />
          </div>
        </section>
        <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]">
          ← Voltar para o login
        </Link>
      </div>
    </main>
  );
}
