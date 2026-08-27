import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Regras para uso do site e das áreas restritas da Vellora Saúde.",
};

export default function TermsPage() {
  return (
    <>
      <PublicNav />
      <main className="flex-1 bg-[#f7fbfa]">
        <section className="border-b border-[var(--border)] bg-white">
          <div className="container-page py-12 sm:py-16">
            <span className="eyebrow">Uso responsável</span>
            <h1 className="section-title mt-4 max-w-3xl">Termos de Uso</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Última atualização: 26 de agosto de 2026. Ao usar o site ou uma área restrita da Vellora Saúde, você concorda com estas regras.
            </p>
          </div>
        </section>

        <article className="container-page max-w-4xl py-12 sm:py-16">
          <div className="space-y-9 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[0_12px_35px_rgba(27,82,75,0.06)] sm:p-10">
            <LegalSection title="1. O serviço">
              <p>A Vellora Saúde utiliza este site para apresentar serviços de cuidado domiciliar, receber solicitações de atendimento e cadastrar profissionais interessados em oportunidades.</p>
              <p>O envio de um formulário inicia uma conversa. Ele não confirma contratação, escala, diagnóstico, vaga ou prazo de atendimento.</p>
            </LegalSection>

            <LegalSection title="2. Acesso ao portal">
              <p>As áreas de administrador, família e cuidador são restritas a pessoas autorizadas pela equipe. A conta é pessoal e não deve ser compartilhada.</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Use uma senha forte e mantenha seus dados de acesso em sigilo.</li>
                <li>Avise a equipe imediatamente se suspeitar de acesso indevido.</li>
                <li>Consulte apenas as informações necessárias para sua função.</li>
                <li>Não copie, baixe, divulgue ou use dados de pacientes fora da finalidade autorizada.</li>
              </ul>
            </LegalSection>

            <LegalSection title="3. Registros de cuidado">
              <p>Os registros devem refletir o atendimento realizado de forma objetiva e respeitosa. O cuidador é responsável por conferir os dados antes de salvar e corrigir eventuais erros pelo próprio portal ou comunicar a administração.</p>
              <p>O portal não substitui avaliação clínica, prescrição, orientação de emergência ou contato com os serviços públicos de urgência. Em situação de risco imediato, procure o serviço de emergência adequado.</p>
            </LegalSection>

            <LegalSection title="4. Formulários públicos">
              <p>Informe dados verdadeiros, atualizados e necessários. Não envie documentos, senhas, dados bancários ou informações clínicas detalhadas nos formulários públicos. A equipe indicará um canal apropriado quando esses dados forem indispensáveis.</p>
              <p>É proibido automatizar envios, tentar contornar mecanismos de segurança ou enviar conteúdo ilícito, ofensivo ou que viole direitos de terceiros.</p>
            </LegalSection>

            <LegalSection title="5. Disponibilidade e segurança">
              <p>Buscamos manter o serviço disponível e seguro, mas podem ocorrer manutenções, falhas de rede ou indisponibilidade de fornecedores. Podemos suspender contas ou acessos quando necessário para proteger pessoas, dados ou a operação.</p>
              <p>As regras sobre coleta e tratamento de dados estão na <Link className="font-semibold text-[var(--brand)] underline" href="/privacidade">Política de Privacidade</Link>.</p>
            </LegalSection>

            <LegalSection title="6. Conteúdo e propriedade">
              <p>Textos, marca, identidade visual e materiais do site pertencem à Vellora Saúde ou são usados com autorização. O conteúdo não pode ser reproduzido para fins comerciais sem autorização prévia.</p>
            </LegalSection>

            <LegalSection title="7. Alterações e contato">
              <p>Podemos atualizar estes termos para acompanhar mudanças no serviço ou na legislação. A data no início da página identifica a versão vigente.</p>
              <p>Em caso de dúvida sobre o serviço ou sobre seu acesso, fale com a equipe pelo <a className="font-semibold text-[var(--brand)] underline" href="https://wa.me/5562981355553" target="_blank" rel="noopener noreferrer">WhatsApp da Vellora Saúde</a>.</p>
            </LegalSection>
          </div>
        </article>
      </main>
      <PublicFooter />
    </>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 text-sm leading-7 text-[var(--muted)]">
      <h2 className="text-lg font-semibold leading-6 text-[var(--foreground)]">{title}</h2>
      {children}
    </section>
  );
}
