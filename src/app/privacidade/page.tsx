import type { Metadata } from "next";
import Link from "next/link";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicNav } from "@/components/PublicNav";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Vellora Saúde coleta, usa e protege dados pessoais.",
};

export default function PrivacyPage() {
  return (
    <>
      <PublicNav />
      <main className="flex-1 bg-[#f7fbfa]">
        <section className="border-b border-[var(--border)] bg-white">
          <div className="container-page py-12 sm:py-16">
            <span className="eyebrow">Transparência</span>
            <h1 className="section-title mt-4 max-w-3xl">Política de Privacidade</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Última atualização: 26 de agosto de 2026. Esta política explica como a Vellora Saúde trata dados pessoais nos seus canais de contato e áreas de acesso restrito.
            </p>
          </div>
        </section>

        <article className="container-page max-w-4xl py-12 sm:py-16">
          <div className="space-y-9 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[0_12px_35px_rgba(27,82,75,0.06)] sm:p-10">
            <LegalSection title="1. Escopo">
              <p>Esta política se aplica ao site da Vellora Saúde, aos formulários de solicitação de cuidado e de cadastro profissional e às áreas restritas destinadas a administradores, famílias e cuidadores.</p>
              <p>Os dados são tratados de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), considerando a finalidade de cada coleta e o nível de sensibilidade das informações.</p>
            </LegalSection>

            <LegalSection title="2. Dados que podem ser coletados">
              <ul className="list-disc space-y-2 pl-5">
                <li>Solicitações de cuidado: nome, e-mail, telefone, nome do paciente, cidade, tipo e rotina de cuidado e a mensagem enviada.</li>
                <li>Cadastros profissionais: nome, contatos, cidade, profissão, COREN quando aplicável, experiência, disponibilidade e observações profissionais.</li>
                <li>Acesso restrito: dados da conta, vínculos de atendimento, registros de cuidado, sinais vitais, intercorrências, documentos contratuais e fotos anexadas ao atendimento.</li>
                <li>Dados técnicos mínimos necessários para segurança, prevenção de abuso e funcionamento do site.</li>
              </ul>
              <p>Evite enviar documentos ou informações clínicas sensíveis nos formulários públicos. Use a área restrita ou aguarde a orientação da equipe.</p>
            </LegalSection>

            <LegalSection title="3. Para que usamos os dados">
              <ul className="list-disc space-y-2 pl-5">
                <li>Entender a necessidade da família e retornar sobre uma solicitação de cuidado.</li>
                <li>Analisar perfis profissionais e entrar em contato sobre oportunidades compatíveis.</li>
                <li>Organizar escalas, vínculos, contratos e registros de atendimento autorizados.</li>
                <li>Proteger contas, detectar tentativas abusivas, manter trilhas de auditoria e cumprir obrigações legais.</li>
              </ul>
            </LegalSection>

            <LegalSection title="4. Bases legais e dados de saúde">
              <p>A base legal é definida conforme a atividade: consentimento, procedimentos preliminares relacionados a contrato, cumprimento de obrigação legal, exercício regular de direitos ou proteção da vida e da saúde quando aplicável.</p>
              <p>Dados referentes à saúde são tratados como sensíveis. O acesso é limitado ao que cada perfil precisa para cumprir sua função, e o compartilhamento ocorre somente quando necessário para a prestação do cuidado, para cumprir a lei ou com autorização válida.</p>
            </LegalSection>

            <LegalSection title="5. Compartilhamento e armazenamento">
              <p>Podemos usar fornecedores de infraestrutura, armazenamento e envio de e-mails para operar o serviço. Eles recebem apenas os dados necessários para a finalidade contratada e devem manter medidas de segurança adequadas.</p>
              <p>Não vendemos dados pessoais. O armazenamento pode ocorrer em serviços de nuvem, inclusive fora do Brasil, observadas as garantias exigidas pela legislação aplicável.</p>
            </LegalSection>

            <LegalSection title="6. Segurança e retenção">
              <p>Adotamos controle de acesso por perfil, autenticação, proteção de sessão, validações nos formulários, limitação de tentativas e registro de alterações em dados de cuidado. Nenhuma transmissão ou armazenamento é absolutamente invulnerável.</p>
              <p>Os dados são mantidos pelo período necessário às finalidades informadas, à continuidade do cuidado, à defesa de direitos e às obrigações legais. Depois disso, podem ser excluídos, anonimizados ou mantidos de forma restrita quando houver justificativa.</p>
            </LegalSection>

            <LegalSection title="7. Seus direitos">
              <p>Você pode solicitar confirmação de tratamento, acesso, correção, informação sobre compartilhamento, portabilidade quando aplicável, anonimização, bloqueio ou eliminação de dados tratados com base legal que permita o pedido e revogação do consentimento.</p>
              <p>Para solicitar atendimento, use o <a className="font-semibold text-[var(--brand)] underline" href="https://wa.me/5562981355553" target="_blank" rel="noopener noreferrer">WhatsApp da Vellora Saúde</a>. Podemos pedir informações para confirmar sua identidade e preservar a segurança dos dados.</p>
            </LegalSection>

            <LegalSection title="8. Atualizações">
              <p>Esta política pode ser atualizada para refletir mudanças no serviço, na legislação ou nas medidas de segurança. A data no início da página indica a versão vigente.</p>
              <p>Para entender as regras de uso do site e do portal, consulte também os <Link className="font-semibold text-[var(--brand)] underline" href="/termos">Termos de Uso</Link>.</p>
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
