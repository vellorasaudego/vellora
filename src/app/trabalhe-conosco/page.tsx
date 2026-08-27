import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { LineIcon } from "@/components/LineIcon";
import { ProfessionalApplicationForm } from "@/components/ProfessionalApplicationForm";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { isTurnstileRequired } from "@/lib/abuse-prevention";
import { runtimeValue } from "@/lib/runtime-config";

export const metadata: Metadata = {
  title: "Trabalhe conosco",
  description:
    "Cadastre seu perfil para oportunidades como cuidador, técnico de enfermagem, enfermeiro ou outro profissional na Vellora Saúde.",
  robots: { index: true, follow: true },
};

const PROFESSIONAL_BENEFITS = [
  {
    title: "Cadastro para oportunidades",
    description: "Seu perfil poderá ser analisado quando surgir uma escala compatível com sua experiência.",
    icon: "person" as const,
  },
  {
    title: "Disponibilidade flexível",
    description: "Informe os dias, turnos e tipos de plantão que combinam com a sua rotina.",
    icon: "clock" as const,
  },
  {
    title: "Processo responsável",
    description: "Documentos e referências serão solicitados somente nas etapas seguintes da seleção.",
    icon: "shield" as const,
  },
];

export default function WorkWithUsPage() {
  return (
    <>
      <header className="border-b border-[var(--border)] bg-white">
        <div className="container-page flex min-h-[4.5rem] items-center justify-between gap-5 py-3">
          <Brand />
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--brand-dark)] hover:border-[var(--brand)] hover:bg-[var(--brand-light)]"
          >
            <span aria-hidden="true">←</span>
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="flex-1 bg-[#f7fbfa]">
        <section className="border-b border-[var(--border)] bg-white">
          <div className="container-page py-14 sm:py-16">
            <span className="eyebrow">Oportunidades profissionais</span>
            <h1 className="section-title mt-4 max-w-3xl">Faça parte da rede de cuidado da Vellora Saúde</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Esta página é destinada a cuidadores, técnicos de enfermagem, enfermeiros e outros profissionais interessados em atendimentos domiciliares em Goiânia e região.
            </p>
          </div>
        </section>

        <section className="container-page grid items-start gap-10 py-14 sm:py-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <aside className="lg:sticky lg:top-8">
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Antes de preencher</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Informe seus dados profissionais e sua disponibilidade real. O cadastro não cria acesso ao painel e não garante contratação imediata.
            </p>
            <div className="mt-7 space-y-4">
              {PROFESSIONAL_BENEFITS.map((item) => (
                <article key={item.title} className="flex gap-4 rounded-xl border border-[var(--border)] bg-white p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-dark)] text-white">
                    <LineIcon name={item.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-[#cbe9e3] bg-[var(--brand-light)] p-5">
              <p className="text-sm font-semibold text-[var(--brand-deep)]">Privacidade dos seus dados</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Não envie documentos pessoais neste formulário. Caso seu perfil avance, a equipe explicará os próximos passos diretamente a você.
              </p>
            </div>
          </aside>

          <div className="rounded-xl border border-[var(--border-strong)] bg-white p-6 shadow-[0_12px_35px_rgba(27,82,75,0.08)] sm:p-8">
            <div className="mb-7">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Cadastro profissional</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Campos com * são obrigatórios.</p>
            </div>
            <ProfessionalApplicationForm
              turnstileSiteKey={runtimeValue("NEXT_PUBLIC_TURNSTILE_SITE_KEY")}
              turnstileRequired={isTurnstileRequired()}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[var(--brand-deep)] text-white">
        <div className="container-page flex flex-col gap-3 py-7 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Vellora Saúde.</p>
          <Link href="/" className="font-semibold text-[#a9e8dc] hover:text-white">Ir para o site das famílias</Link>
        </div>
      </footer>
      <WhatsAppButton />
    </>
  );
}
