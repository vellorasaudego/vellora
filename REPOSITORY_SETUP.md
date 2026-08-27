# Preparação de repositório e ambientes

Este documento registra o estado operacional do ticket OPS-01. Ele pode ser
seguido quando o repositório GitHub e o ambiente de staging forem criados.

## Estado atual

- O repositório `https://github.com/vellorasaudego/vellora.git` está configurado
  como `origin`.
- A branch-base local `main` acompanha `origin/main`.
- A branch de trabalho atual é `feature/db-01-supabase-foundation`.
- `git ls-remote` falhou neste ambiente com `SEC_E_NO_CREDENTIALS`; por isso o
  push da branch de trabalho e a abertura da PR ainda estão pendentes.
- O workflow de CI local existe e os gates locais já passaram.
- O projeto Supabase `punannbkoiekhvbnqqkh` foi confirmado como produção; o MCP
  está autorizado, o SEC-01 foi corrigido e o advisor de segurança está vazio.
- Ainda não existe um projeto Supabase de staging.
- As migrations remotas do Supabase continuam vazias.
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

Os itens abaixo refletem o estado misto do ticket: a preparação local e a
configuração básica do repositório já existem, enquanto a publicação remota e
os recursos externos continuam pendentes.

### Repositório

- [x] Repositório GitHub configurado como `origin`:
      `https://github.com/vellorasaudego/vellora.git`.
- [x] Branch-base local definida como `main`, acompanhando `origin/main`.
- [x] Branch de trabalho local criada: `feature/db-01-supabase-foundation`.
- [ ] Corrigir as credenciais deste ambiente, repetir `git ls-remote`, publicar
      a branch de trabalho e abrir a PR.
- [ ] Confirmar que `.env`, `.wrangler`, `dist`, `build` gerado e demais
      artefatos locais não foram publicados.
- [ ] Habilitar branch protection depois do primeiro push, exigindo o job
      `Check and build` antes de aceitar mudanças.

Depois que a autenticação estiver disponível, a publicação pendente deverá ser
feita pelo proprietário a partir da branch de trabalho, sem adicionar segredos:

```bash
git ls-remote origin
git push -u origin feature/db-01-supabase-foundation
```

### Supabase e staging

- [x] Confirmar `punannbkoiekhvbnqqkh` como projeto de produção.
- [x] Autorizar o MCP, corrigir o SEC-01 e confirmar advisor de segurança vazio.
- [ ] Criar um segundo projeto Supabase persistente para staging, separado do
      projeto de produção `punannbkoiekhvbnqqkh`.
- [ ] Guardar URL e chaves do staging somente no provedor de hospedagem e no
      ambiente local apropriado; jamais no Git.
- [ ] Definir uma política para dados fictícios/anonimizados. Não copiar
      pacientes, documentos ou fotos reais para staging.
- [ ] Registrar o project ref do staging em um gerenciador seguro quando ele
      existir.
- [ ] Aplicar e verificar as migrations do ambiente somente nos tickets de
      banco aprovados; no momento, as migrations remotas continuam vazias.

### Vercel e ambientes

- [ ] Criar o projeto Vercel e conectá-lo ao repositório depois do primeiro
      push da branch inicial.
- [ ] Configurar variáveis separadamente para Preview/Staging e Production.
- [ ] Manter `VELLORA_SAFE_PREVIEW=true` em uma prévia visual sem dados até a
      integração funcional ser concluída.
- [ ] Não configurar deploy automático de produção antes de concluir a
      migração e os gates de segurança dos próximos tickets.

## Critério de desbloqueio

O OPS-01 poderá ser encerrado integralmente quando as credenciais permitirem
que `git ls-remote` funcione, a branch
`feature/db-01-supabase-foundation` for publicada, uma PR for aberta e o
workflow de CI executar no GitHub. Também deverá existir um projeto Supabase de
staging identificado para os testes separados de produção.

O remoto, a branch-base, o workflow local e a preparação de segurança do
Supabase já estão prontos. A ausência de migrations remotas continua
intencional até os tickets de banco; a migração do runtime não faz parte do
OPS-01. Até a autenticação Git e o staging serem resolvidos, o ticket permanece
parcialmente bloqueado por dependências externas.
