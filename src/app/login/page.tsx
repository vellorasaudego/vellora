import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { Brand } from "@/components/Brand";
import { isSafePreview } from "@/lib/preview";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const passwordChanged = params.senha === "redefinida";
  const safePreview = isSafePreview();

  return (
    <main className="grid min-h-screen bg-[var(--surface)] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[var(--brand-deep)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-[var(--brand)]/35 blur-3xl" />
        <div className="relative inline-flex self-start rounded-xl bg-white p-3">
          <Brand />
        </div>
        <div className="relative max-w-lg">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e0bd7d]">Área exclusiva</p>
          <h1 className="font-display mt-5 text-5xl leading-[1.05]">O cuidado do dia a dia, organizado para quem precisa acompanhar.</h1>
          <p className="mt-6 text-base leading-7 text-white/68">Famílias, profissionais e gestão conectados em um ambiente com acesso restrito.</p>
        </div>
        <p className="relative text-xs text-white/40">Vellora Saúde · Goiânia e região</p>
      </section>

      <section className="flex flex-col items-center justify-center px-5 py-12 sm:px-10">
        <div className="mb-10 lg:hidden"><Brand /></div>
        <div className="w-full max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-dark)]">Bem-vindo de volta</p>
          <h2 className="font-display mt-3 text-4xl text-[var(--brand-deep)]">Entre na sua área</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {safePreview
              ? "Esta prévia apresenta apenas o site institucional, sem expor contas ou informações de pacientes."
              : "Use o acesso fornecido pela equipe da Vellora para consultar as informações do seu perfil."}
          </p>
          <div className="mt-8 rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_20px_60px_rgba(8,54,49,0.08)] sm:p-8">
            {passwordChanged && (
              <p className="mb-5 rounded-xl bg-[var(--brand-light)] p-4 text-sm font-semibold text-[var(--brand-deep)]" role="status">
                Senha alterada com sucesso. Entre com a nova senha.
              </p>
            )}
            {safePreview ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--brand-light)] p-6">
                <p className="font-semibold text-[var(--brand-deep)]">Prévia segura</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  O login e os painéis de administrador, família e cuidador foram desativados
                  neste endereço de avaliação. Nenhum prontuário ou dado de contato é exibido.
                </p>
              </div>
            ) : (
              <LoginForm next={next} />
            )}
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 text-sm">
            <Link href="/" className="font-semibold text-[var(--muted)] hover:text-[var(--brand-dark)]">← Voltar ao site</Link>
            <Link href="/esqueci-senha" className="font-semibold text-[var(--brand)] hover:text-[var(--brand-dark)]">Recuperar acesso</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
