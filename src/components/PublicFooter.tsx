import Link from "next/link";
import { Brand } from "./Brand";
import { LineIcon } from "./LineIcon";
import { WhatsAppButton } from "./WhatsAppButton";

export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[var(--brand-deep)] text-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <div>
          <div className="inline-flex rounded-lg bg-white px-3 py-2.5">
            <Brand />
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-white/68">
            Gestão e assistência domiciliar com cuidado humano, organização profissional e informação clara para a família.
          </p>
          <p className="mt-4 text-sm font-medium text-[#a9e8dc]">Atendimento em Goiânia e região</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Navegação</p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-white/72">
            <Link href="/#servicos" className="hover:text-white">Serviços</Link>
            <Link href="/#como-funciona" className="hover:text-white">Como funciona</Link>
            <Link href="/#acompanhamento" className="hover:text-white">Portal da família</Link>
            <Link href="/trabalhe-conosco" className="hover:text-white">Trabalhe conosco</Link>
            <Link href="/privacidade" className="hover:text-white">Política de privacidade</Link>
            <Link href="/termos" className="hover:text-white">Termos de uso</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Acesso</p>
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/68">
            Famílias, profissionais e equipe Vellora entram por um único acesso seguro.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[var(--brand-deep)] shadow-sm hover:-translate-y-0.5"
          >
            Acessar painel
            <LineIcon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between sm:py-5">
          <div>
            <p>© {new Date().getFullYear()} Vellora Saúde. Todos os direitos reservados.</p>
            <p className="mt-1">CNPJ: 68.797.629/0001-48</p>
          </div>
          <p>Dados de saúde exigem acesso restrito e tratamento responsável.</p>
        </div>
      </div>
      <WhatsAppButton />
    </footer>
  );
}
