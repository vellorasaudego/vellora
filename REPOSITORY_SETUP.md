# Preparação de repositório e ambientes

Este documento registra o estado operacional do ticket OPS-01. Ele pode ser
seguido quando o repositório GitHub e o ambiente de staging forem criados.

## Estado atual

- Este workspace ainda não possui `.git`, remoto, branch-base ou workflow
  conectado a um provedor Git.
- O projeto Supabase `punannbkoiekhvbnqqkh` foi confirmado como produção.
- Ainda não existe um projeto Supabase de staging.
- O runtime atual ainda usa Cloudflare D1/R2. A migração para Supabase,
  incluindo schema, autenticação, Storage e variáveis específicas, pertence a
  tickets posteriores e não é feita pelo OPS-01.
- O arquivo `.env` local é ignorado pelo Git. Segredos nunca devem ser
  adicionados ao repositório, a issues ou a logs de CI.

## CI preparado

O workflow `.github/workflows/ci.yml` executa, em pushes, pull requests e
disparos manuais:

1. instalação determinística com `npm ci`;
2. `npm run check` (typecheck, lint e testes);
3. `npm run build`.

O job usa Node.js 22.x, não precisa de secrets, banco ou Storage e não faz
deploy. A validação local equivalente é:

```bash
npm run check
npm run build
```

## Checklist para o proprietário do projeto

Estas ações continuam bloqueadas até que o usuário crie os recursos externos;
nenhuma delas foi executada por este ticket:

### Repositório

- [ ] Criar um repositório privado no GitHub, de preferência vazio (sem README
      ou licença gerados automaticamente).
- [ ] Escolher e registrar a branch-base do projeto; não assumir `main` sem
      essa decisão.
- [ ] Inicializar o Git no workspace, adicionar o remoto e publicar a branch
      escolhida.
- [ ] Confirmar que `.env`, `.wrangler`, `dist`, `build` gerado e demais
      artefatos locais não foram publicados.
- [ ] Habilitar branch protection depois do primeiro push, exigindo o job
      `Check and build` antes de aceitar mudanças.

Exemplo de sequência a executar pelo proprietário depois de criar o remoto
(substitua os valores entre `<...>` e confira o caminho antes):

```bash
git init
git add .
git status
git commit -m "chore: initial project import"
git branch -M <branch-base>
git remote add origin <url-do-repositorio>
git push -u origin <branch-base>
```

### Supabase staging

- [ ] Criar um segundo projeto Supabase persistente para staging, separado do
      projeto de produção `punannbkoiekhvbnqqkh`.
- [ ] Guardar URL e chaves do staging somente no provedor de hospedagem e no
      ambiente local apropriado; jamais no Git.
- [ ] Definir uma política para dados fictícios/anonimizados. Não copiar
      pacientes, documentos ou fotos reais para staging.
- [ ] Registrar o project ref do staging em um gerenciador seguro quando ele
      existir.

### Vercel e ambientes

- [ ] Criar o projeto Vercel e conectá-lo ao repositório depois do primeiro
      push.
- [ ] Configurar variáveis separadamente para Preview/Staging e Production.
- [ ] Manter `VELLORA_SAFE_PREVIEW=true` em uma prévia visual sem dados até a
      integração funcional ser concluída.
- [ ] Não configurar deploy automático de produção antes de concluir a
      migração e os gates de segurança dos próximos tickets.

## Critério de desbloqueio

O OPS-01 poderá ser encerrado integralmente quando houver um remoto Git
acessível, uma branch-base explicitamente escolhida, o workflow rodando nesse
remoto e um projeto Supabase de staging identificado. Até lá, os artefatos
locais deste ticket são seguros para versionamento e o ticket permanece
parcialmente bloqueado por dependências externas.
