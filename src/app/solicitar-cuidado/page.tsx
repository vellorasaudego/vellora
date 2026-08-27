import type { Metadata } from "next";
import { ContactForm } from "@/components/ContactForm";
import { LineIcon } from "@/components/LineIcon";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";
import { isTurnstileRequired } from "@/lib/abuse-prevention";
import { runtimeValue } from "@/lib/runtime-config";

export const metadata: Metadata = {
  title: "Solicitar cuidado",
  description: "Conte à Vellora Saúde qual cuidado sua família precisa em Goiânia e região.",
};

const CONTACT_POINTS = [
  {
    title: "Avaliação inicial",
    description: "Nossa equipe entende a rotina, os horários e as necessidades do paciente.",
    icon: "care" as const,
  },
  {
    title: "Orientação clara",
    description: "Você recebe uma proposta de cuidado adequada ao caso da sua família.",
    icon: "shield" as const,
  },
  {
    title: "Atendimento em Goiânia",
    description: "Organizamos opções diurnas, noturnas ou de até 24 horas.",
    icon: "home" as const,
  },
];

export default function RequestCarePage() {
  return (
    <>
      <PublicNav />
      <main className="flex-1 bg-[#f5faf9]">
        <section className="border-b border-[var(--border)] bg-white">
          <div className="container-page py-12 sm:py-16">
            <span className="eyebrow">Fale com a Vellora Saúde</span>
            <h1 className="section-title mt-4 max-w-3xl">Conte como podemos ajudar sua família</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              Preencha os dados essenciais para que nossa equipe entenda a necessidade e entre em contato. Você não precisa enviar documentos ou informações médicas neste primeiro momento.
            </p>
          </div>
        </section>

        <section className="container-page grid items-start gap-10 py-12 sm:py-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <aside className="space-y-4 lg:sticky lg:top-28">
            {CONTACT_POINTS.map((item) => (
              <article key={item.title} className="flex gap-4 rounded-2xl border border-[var(--border)] bg-white p-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-dark)] text-white">
                  <LineIcon name={item.icon} className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
                </div>
              </article>
            ))}
            <div className="rounded-2xl border border-[#cbe9e3] bg-[var(--brand-light)] p-5">
              <p className="text-sm font-semibold text-[var(--brand-deep)]">Prefere conversar?</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Use o botão do WhatsApp no canto da tela para falar diretamente com a empresa.
              </p>
            </div>
          </aside>

          <div className="rounded-2xl border border-[var(--border-strong)] bg-white p-6 shadow-[0_16px_42px_rgba(27,82,75,0.09)] sm:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Formulário de solicitação</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Campos com * são obrigatórios.</p>
            </div>
            <ContactForm
              turnstileSiteKey={runtimeValue("NEXT_PUBLIC_TURNSTILE_SITE_KEY")}
              turnstileRequired={isTurnstileRequired()}
            />
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
