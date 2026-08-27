# Preparação de repositório e ambientes

Este documento registra o estado operacional do ticket OPS-01. A produção é o
único ambiente Supabase deste rollout; não será criado um projeto separado de
staging. O proprietário fará push e PRs manualmente.

## Estado atual

- O repositório `https://github.com/vellorasaudego/vellora.git` está configurado
  como `origin`.
- A branch-base local `main` acompanha `origin/main`.
- A branch de trabalho atual é `feature/db-01-supabase-foundation`.
- Pushs e PRs não são executados por este workspace; a publicação fica sob
  responsabilidade manual do proprietário.
- O workflow de CI local existe e os gates locais já passaram.
- O projeto Supabase `punannbkoiekhvbnqqkh` foi confirmado como produção; o MCP
  está autorizado. O alerta `auth_leaked_password_protection` continua como
  WARN porque o plano atual não permite habilitar a proteção contra senhas
  vazadas; o owner aceitou esse risco conhecido neste rollout.
- As migrations `20260827142537/db_01_supabase_foundation`,
  `20260827163652/db_02_domain` e `20260827164147/perf_01_rls` foram aplicadas
  e estão registradas no projeto de produção; as tabelas continuam vazias.
- Staging persistente foi explicitamente dispensado para este rollout. Prévia
  visual sem dados pode continuar usando `VELLORA_SAFE_PREVIEW=true`.
- O runtime de produção atual usa `VELLORA_AUTH_PROVIDER=supabase`,
  `VELLORA_DATA_PROVIDER=supabase` e `VELLORA_STORAGE_PROVIDER=supabase`, com
  Supabase Auth, Postgres e Storage. As migrations SQL de produção ficam em
  `supabase/migrations/`.
- Cloudflare D1/R2 e artefatos de OpenAI Sites são mantidos apenas para
  compatibilidade de legado/preview explicitamente configurado; não são
  requisitos da produção Supabase.
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

Os itens abaixo refletem o estado do rollout: a preparação local, o runtime
Supabase e a fundação de produção já existem; a publicação Git continua sendo
uma operação manual do proprietário. Staging persistente não é pré-requisito.

### Repositório

- [x] Repositório GitHub configurado como `origin`:
      `https://github.com/vellorasaudego/vellora.git`.
- [x] Branch-base local definida como `main`, acompanhando `origin/main`.
- [x] Branch de trabalho local criada: `feature/db-01-supabase-foundation`.
- [ ] Publicar manualmente a branch de trabalho e abrir a PR.
- [ ] Confirmar que `.env`, `.wrangler`, `dist`, `build` gerado e demais
      artefatos locais não foram publicados.
- [ ] Habilitar branch protection depois do primeiro push, exigindo o job
      `Check and build` antes de aceitar mudanças.

A publicação pendente deverá ser feita pelo proprietário a partir da branch de
trabalho, sem adicionar segredos:

```bash
git ls-remote origin
git push -u origin feature/db-01-supabase-foundation
```

### Supabase de produção

- [x] Confirmar `punannbkoiekhvbnqqkh` como projeto de produção.
- [x] Autorizar o MCP e registrar como risco aceito o alerta
      `auth_leaked_password_protection`, limitado pelo plano atual.
- [x] Aplicar e verificar DB-01, DB-02 e PERF-01 no projeto de produção.
- [ ] Aplicar migrations posteriores somente após revisão local, gates e
      confirmação explícita do ticket correspondente.
- [x] Registrar a decisão de não criar staging persistente para este rollout.

### Wave 12 — Vercel e publicação

- Nenhuma configuração de Vercel é necessária nesta wave.
- [ ] Na Wave 12, criar o projeto Vercel e conectá-lo ao repositório após o
      push manual da branch.
- [ ] Na Wave 12, configurar as variáveis de produção no Vercel sem adicionar
      segredos ao repositório.
- [ ] Na Wave 12, executar o deploy, o smoke pós-publicação e o plano de
      rollback depois dos gates finais.

## Critério de desbloqueio

O OPS-01 poderá ser encerrado integralmente quando a branch
`feature/db-01-supabase-foundation` for publicada manualmente, uma PR for
aberta e o workflow de CI executar no GitHub. A criação de staging foi
explicitamente dispensada e não é um bloqueio deste rollout.

O remoto, a branch-base, o workflow local, o runtime Supabase e as migrations
aprovadas de fundação/domínio já estão prontos. O alerta conhecido do Auth está
registrado como risco aceito devido à limitação do plano. A publicação Git e
PRs são passos manuais do proprietário; Vercel fica para a Wave 12.
