# Checklist de release do Supabase

Este documento separa o estado já aplicado em produção dos passos que só
pertencem à Wave 12. O rollout atual é direto em um único projeto Supabase;
não há staging persistente. O proprietário faz push, PR e publicação manual.

## Estado atual já aplicado

- `VELLORA_AUTH_PROVIDER=supabase`;
- `VELLORA_DATA_PROVIDER=supabase`;
- `VELLORA_STORAGE_PROVIDER=supabase`;
- migrations DB-01, DB-02, PERF-01, SEC-02 e Storage aplicadas no projeto de
  produção;
- 10 tabelas públicas essenciais com RLS habilitado;
- buckets privados `record-photos` e `contracts`, com limites e MIME
  esperados;
- 3 usuários Auth e 3 profiles ativos correspondentes;
- leads em `/admin/leads` e candidaturas em `/admin/profissionais`, sem envio
  de e-mail; e
- Resend limitado a alertas de intercorrências, se configurado.

O `supabase:smoke` permanece uma verificação read-only: não aplica migrations,
não cria usuários e não grava dados. Ele apenas confirma Auth, tabelas,
correspondência Auth/profiles e Storage; não envia leads, candidaturas ou
e-mails, não grava arquivos e não publica o aplicativo.

O Security Advisor ainda reporta `auth_leaked_password_protection` como
`WARN`, pois o plano atual não oferece esse recurso. O owner aceitou esse
risco; ele deve permanecer documentado e não constitui uma correção pendente
deste release.

## Gate local deste ticket

Antes de encaminhar a documentação, o coordenador pode executar localmente:

```text
npm run check
npm run build
npm run supabase:smoke
```

O terceiro comando consulta o projeto e é read-only; não deve ser usado como
substituto para um teste de escrita em produção. Para validação funcional,
use uma conta e arquivo de teste sem PHI. Leads e candidaturas reais devem ser
verificados nos painéis depois de uma janela operacional controlada.

## Wave 12 — passos futuros, fora deste ticket

Os itens abaixo não são pré-requisitos executados por esta wave:

1. o proprietário revisa a branch, faz push e abre o PR manualmente;
2. o proprietário configura o host de publicação com as variáveis públicas e
   server-side corretas, mantendo a chave administrativa fora do cliente;
3. a publicação e a configuração da Vercel são tratadas na Wave 12, quando o
   proprietário decidir retornar a esse tema;
4. após a publicação, o proprietário executa o smoke read-only e a aceitação
   manual de Auth, callback, painéis e Storage; e
5. qualquer promoção, rollback ou alteração de configuração segue o
   procedimento de `OPERATIONS.md`.

Não há ação de Vercel, Git, PR, deploy ou Supabase remoto neste checklist.

## Critérios de parada e rollback

Pare a publicação se o smoke detectar provider incompatível, tabela faltante,
bucket público, limite/MIME inesperado, falha da API administrativa ou
inconsistência Auth/profiles. Não altere somente um dos três providers.

Migrations aplicadas são forward-only. Para corrigir schema ou policy, crie uma
nova migration revisada e faça export/snapshot antes de DDL destrutivo. O
rollback de código e configuração deve coordenar Auth, dados e Storage; o
fallback legado não é uma cópia dos dados Supabase.
