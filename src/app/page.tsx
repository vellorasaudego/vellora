import { LineIcon, type LineIconName } from "@/components/LineIcon";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

const SERVICES: Array<{
  title: string;
  description: string;
  icon: LineIconName;
  tone: "mint" | "peach" | "sun";
}> = [
  {
    title: "Cuidador 12h ou 24h",
    description: "Acompanhamento integral por turno, com profissional presente no domicílio.",
    icon: "care",
    tone: "mint",
  },
  {
    title: "Pós-operatório",
    description: "Apoio na recuperação em casa, na rotina e nos cuidados definidos pela equipe de saúde.",
    icon: "activity",
    tone: "peach",
  },
  {
    title: "Cuidados paliativos",
    description: "Conforto, apoio à rotina e acolhimento ao paciente e à família.",
    icon: "care",
    tone: "sun",
  },
  {
    title: "Fisioterapia domiciliar",
    description: "Atendimento em casa com profissional habilitado, conforme avaliação do caso.",
    icon: "medical",
    tone: "sun",
  },
  {
    title: "Mobilidade reduzida",
    description: "Ajuda com higiene, alimentação, locomoção e companhia ativa.",
    icon: "person",
    tone: "mint",
  },
  {
    title: "Cuidado ao idoso",
    description: "Companhia, apoio nas atividades diárias e atenção à segurança em casa.",
    icon: "home",
    tone: "peach",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Família entra em contato",
    description: "Você preenche o formulário com as necessidades do paciente.",
  },
  {
    number: "02",
    title: "Avaliação do caso",
    description: "Nossa equipe analisa a rotina e indica o perfil de cuidado adequado.",
  },
  {
    number: "03",
    title: "Seleção do profissional",
    description: "Apresentamos profissionais compatíveis com o perfil do paciente.",
  },
  {
    number: "04",
    title: "Acompanhamento",
    description: "A qualidade do atendimento e a necessidade de ajustes são acompanhadas.",
  },
];

const DIFFERENTIALS: Array<{
  title: string;
  description: string;
  icon: LineIconName;
}> = [
  {
    title: "Seleção criteriosa",
    description: "Análise de documentação, referências e experiência profissional.",
    icon: "shield",
  },
  {
    title: "Escalas de até 24 horas",
    description: "Opções diurnas, noturnas ou contínuas, conforme disponibilidade.",
    icon: "clock",
  },
  {
    title: "Atendimento humanizado",
    description: "Cuidado com respeito, atenção à rotina e boa comunicação.",
    icon: "care",
  },
  {
    title: "Supervisão de enfermagem",
    description: "Acompanhamento do plano de cuidado e orientação à equipe.",
    icon: "activity",
  },
];

const HERO_SERVICES: Array<{ label: string; icon: LineIconName }> = [
  { label: "Plantões de até 24h", icon: "clock" },
  { label: "Enfermagem", icon: "medical" },
  { label: "Cuidadores", icon: "person" },
  { label: "Cuidados paliativos", icon: "care" },
];

const TRUST_POINTS: Array<{
  title: string;
  description: string;
  icon: LineIconName;
}> = [
  {
    title: "Escuta da família",
    description: "Entendemos a rotina antes de indicar o cuidado.",
    icon: "care",
  },
  {
    title: "Profissional compatível",
    description: "O perfil é escolhido conforme cada necessidade.",
    icon: "person",
  },
  {
    title: "Acompanhamento próximo",
    description: "A família recebe orientação durante o atendimento.",
    icon: "shield",
  },
];

const CARE_VITALS = [
  { label: "Pressão arterial", value: "128/82", unit: "mmHg" },
  { label: "Frequência cardíaca", value: "76", unit: "bpm" },
  { label: "Saturação de O₂", value: "97", unit: "%" },
  { label: "Temperatura", value: "36,6", unit: "°C" },
];

const CARE_ROUTINE: Array<{
  label: string;
  value: string;
  icon: LineIconName;
}> = [
  { label: "Medicação", value: "Horários registrados", icon: "medical" },
  { label: "Alimentação", value: "Boa aceitação", icon: "check" },
  { label: "Higiene", value: "Cuidados realizados", icon: "care" },
  { label: "Mobilidade", value: "Caminhada assistida", icon: "person" },
];

export default function HomePage() {
  return (
    <>
      <PublicNav />
      <main className="flex-1">
        <section className="home-hero border-b border-[var(--border)] bg-white">
          <span className="hero-orb hero-orb-one" aria-hidden="true" />
          <span className="hero-orb hero-orb-two" aria-hidden="true" />
          <div className="container-page relative z-[1] grid min-h-[680px] items-center gap-14 py-16 lg:grid-cols-[1.03fr_0.97fr] lg:py-20">
            <div>
              <span className="hero-kicker inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]">
                <LineIcon name="shield" className="h-4 w-4" />
                Cuidado profissional em casa
              </span>
              <h1 className="font-display mt-7 max-w-[680px] text-[clamp(3rem,5.7vw,5.25rem)] leading-[0.98] text-[var(--foreground)]">
                Cuidar de quem você ama, <span className="text-[var(--brand)]">com quem cuida por profissão.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                A Vellora Saúde seleciona e gerencia cuidadores e profissionais de saúde para atender seu familiar em casa, com supervisão de enfermagem e acompanhamento contínuo.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/solicitar-cuidado"
                  className="inline-flex min-h-12 items-center justify-center gap-5 rounded-lg bg-[var(--brand-dark)] px-7 text-sm font-semibold text-white shadow-sm hover:bg-[var(--brand-deep)]"
                >
                  Solicitar cuidado
                  <LineIcon name="arrow" className="h-4 w-4" />
                </a>
                <a
                  href="#servicos"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-white px-7 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                >
                  Conhecer serviços
                </a>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[var(--muted)]">
                <span className="inline-flex items-center gap-2">
                  <LineIcon name="check" className="h-4 w-4 text-[var(--brand)]" />
                  Avaliação inicial sem compromisso
                </span>
                <span className="inline-flex items-center gap-2">
                  <LineIcon name="check" className="h-4 w-4 text-[var(--brand)]" />
                  Escalas conforme a necessidade
                </span>
              </div>
            </div>

            <div className="hero-care-card rounded-3xl border border-[#bdeee5] bg-white/94 p-6 shadow-[0_24px_60px_rgba(27,82,75,0.16)] backdrop-blur-[5px] sm:p-8 lg:ml-6">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-dark)] text-white">
                  <LineIcon name="care" className="h-7 w-7" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">Atendimento personalizado</h2>
                  <p className="mt-1 text-base text-[var(--muted)]">Plano de cuidado sob medida</p>
                </div>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {HERO_SERVICES.map((service) => (
                  <div key={service.label} className="flex min-h-14 items-center gap-3 rounded-xl bg-[var(--brand-light)] px-4 text-sm font-medium text-[var(--foreground)]">
                    <LineIcon name={service.icon} className="h-5 w-5 text-[var(--brand-dark)]" />
                    {service.label}
                  </div>
                ))}
              </div>
              <div className="mt-7 flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] px-5 py-4 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-2 font-semibold text-[var(--brand-dark)]">
                  <LineIcon name="home" className="h-4 w-4" />
                  Goiânia e região
                </span>
                <span>Profissional conforme cada necessidade</span>
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)]">
                <span className="flex -space-x-2" aria-hidden="true">
                  <span className="h-8 w-8 rounded-full border-2 border-white bg-[#d9f1ec]" />
                  <span className="h-8 w-8 rounded-full border-2 border-white bg-[#f8dbc2]" />
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[var(--brand-dark)] text-[10px] font-bold text-white">V+</span>
                </span>
                <span><strong className="text-[var(--foreground)]">Cuidado coordenado</strong> para manter a família bem informada.</span>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Compromissos da Vellora Saúde" className="trust-ribbon-wrap">
          <div className="container-page">
            <div className="trust-ribbon grid gap-1 sm:grid-cols-3">
              {TRUST_POINTS.map((item) => (
                <article key={item.title} className="trust-point">
                  <span className="trust-point-icon">
                    <LineIcon name={item.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[var(--foreground)]">{item.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="servicos" className="services-section py-20 sm:py-28">
          <div className="container-page relative z-[1]">
            <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto]">
              <div>
                <span className="eyebrow">Nossos serviços</span>
                <h2 className="section-title mt-4">Cuidado completo, no conforto de casa</h2>
              </div>
              <p className="max-w-md text-base leading-7 text-[var(--muted)] lg:text-right">
                Cada plano é organizado a partir da rotina, das necessidades e das preferências da família.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((service, index) => (
                <article key={service.title} className={`service-card service-card-${service.tone}`}>
                  <div className="flex items-start justify-between gap-4">
                    <span className="service-icon">
                      <LineIcon name={service.icon} className="h-5 w-5" />
                    </span>
                    <span className="service-number">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold tracking-[-0.02em] text-[var(--foreground)]">{service.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{service.description}</p>
                  <a href="/solicitar-cuidado" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[var(--brand-dark)]">
                    Conversar sobre este cuidado
                    <LineIcon name="arrow" className="h-3.5 w-3.5" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="como-funciona" className="process-section py-20 sm:py-28">
          <div className="container-page">
            <span className="eyebrow">Como funciona</span>
            <h2 className="section-title mt-4 max-w-2xl">Do primeiro contato ao cuidado contínuo</h2>
            <div className="process-grid mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => (
                <article key={step.number} className="process-card">
                  <span className="process-number">{step.number}</span>
                  <h3 className="mt-6 text-base font-bold text-[var(--foreground)]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="container-page grid items-stretch gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
            <div className="why-photo-panel">
              <div className="why-photo-content">
                <span className="inline-flex rounded-full bg-white/16 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">Cuidado com presença</span>
                <p className="mt-4 max-w-sm text-2xl font-bold leading-tight tracking-[-0.04em] text-white sm:text-3xl">
                  Organização para a família. Acolhimento para quem recebe o cuidado.
                </p>
                <div className="mt-6 flex items-center gap-3 text-sm text-white/82">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--brand-dark)]">
                    <LineIcon name="care" className="h-5 w-5" />
                  </span>
                  <span>Um plano pensado para a rotina real da casa.</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="eyebrow">Por que a Vellora Saúde</span>
              <h2 className="section-title mt-4 max-w-lg">Profissionais que você pode confiar</h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)]">
                Selecionamos profissionais, conferimos informações e acompanhamos o atendimento. A família recebe orientação e o paciente mantém sua rotina com mais segurança.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {DIFFERENTIALS.map((item) => (
                  <article key={item.title} className="differential-card">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-dark)] text-white shadow-[0_8px_18px_rgba(28,87,79,0.18)]">
                      <LineIcon name={item.icon} className="h-4 w-4" />
                    </span>
                    <h3 className="mt-4 text-sm font-bold text-[var(--foreground)]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-5 text-[var(--muted)]">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="acompanhamento" className="portal-section py-20 sm:py-28">
          <div className="container-page grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <span className="eyebrow eyebrow-light">Portal da família</span>
              <h2 className="section-title mt-4 !text-white">Acompanhe a rotina de cuidado</h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/72">
                Usuários autorizados consultam os registros recentes e o histórico do atendimento em uma área exclusiva.
              </p>
              <div className="mt-6 rounded-2xl border border-white/14 bg-white/9 p-5 backdrop-blur-sm">
                <h3 className="text-sm font-bold text-white">O que é o resumo do cuidado?</h3>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  É uma leitura rápida dos registros do período, como cuidados realizados, sinais vitais, observações da equipe e horário da última atualização.
                </p>
              </div>
              <a href="/login" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[var(--brand-deep)] shadow-lg hover:-translate-y-0.5">
                Acessar o painel
                <LineIcon name="arrow" className="h-4 w-4" />
              </a>
            </div>

            <div className="portal-summary-card overflow-hidden rounded-3xl border border-white/50 bg-white shadow-[0_28px_70px_rgba(6,29,26,0.28)]">
              <div className="flex flex-col gap-3 border-b border-[var(--border)] px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground)]">Resumo do cuidado</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">Hoje · atualização às 14h20</p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-light)] px-3 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                  <span className="h-2 w-2 rounded-full bg-[#24a47d]" />
                  Dentro do esperado
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand)]">Pessoa assistida</p>
                    <p className="mt-1 text-base font-semibold text-[var(--foreground)]">Perfil demonstrativo</p>
                  </div>
                  <span className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]">
                    Dados ilustrativos
                  </span>
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-2">
                    <LineIcon name="activity" className="h-4 w-4 text-[var(--brand)]" />
                    <h4 className="text-sm font-semibold text-[var(--foreground)]">Sinais vitais mais recentes</h4>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {CARE_VITALS.map((item) => (
                      <div key={item.label} className="rounded-xl bg-[var(--surface-soft)] p-4">
                        <p className="text-xs text-[var(--muted)]">{item.label}</p>
                        <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                          {item.value} <span className="text-xs font-medium tracking-normal text-[var(--muted)]">{item.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t border-[var(--border)] pt-5">
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Rotina do cuidado</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {CARE_ROUTINE.map((item) => (
                      <div key={item.label} className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand-dark)]">
                          <LineIcon name={item.icon} className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs text-[var(--muted)]">{item.label}</p>
                          <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[#cbe9e3] bg-[var(--brand-light)] p-5">
                  <div className="flex items-center gap-2">
                    <LineIcon name="check" className="h-4 w-4 text-[var(--brand-dark)]" />
                    <p className="text-sm font-semibold text-[var(--brand-deep)]">Última observação</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    Rotina realizada conforme o plano do período, com boa aceitação das refeições e caminhada assistida.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
                  <span>Registro ilustrativo do profissional responsável</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand)]">
                    <LineIcon name="clock" className="h-3.5 w-3.5" />
                    Atualizado há poucos minutos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contato" className="home-contact bg-[#eafbf8] py-16 sm:py-20">
          <div className="container-page relative z-[1]">
            <div className="flex flex-col gap-7 rounded-3xl border border-[#bfe8e1] bg-white p-7 shadow-[0_16px_42px_rgba(27,82,75,0.08)] sm:p-10 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="eyebrow">Fale com a gente</span>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl">
                  Encontre o cuidado adequado para sua família
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">
                  O formulário agora está em uma página própria, mais simples de preencher. Se preferir, você também pode conversar diretamente pelo WhatsApp.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                <a
                  href="/solicitar-cuidado"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-dark)] px-6 text-sm font-semibold text-white hover:bg-[var(--brand-deep)]"
                >
                  Preencher solicitação
                  <LineIcon name="arrow" className="h-4 w-4" />
                </a>
                <a
                  href="https://wa.me/5562981355553?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20os%20servi%C3%A7os%20da%20Vellora%20Sa%C3%BAde."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--brand-dark)] bg-white px-6 text-sm font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand-light)]"
                >
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
