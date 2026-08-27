# Runtime de dados Supabase em produção

O módulo `src/lib/data.ts` mantém a API usada pelas páginas e rotas, mas o
runtime de produção está no Supabase:

```dotenv
VELLORA_AUTH_PROVIDER=supabase
VELLORA_DATA_PROVIDER=supabase
VELLORA_STORAGE_PROVIDER=supabase
```

`D1/R2` permanece somente como fallback de compatibilidade do adapter legado.
Não é o estado atual de produção; o domínio de produção está no schema
Supabase aplicado.

## Estado aplicado

As migrations abaixo já foram aplicadas no projeto Supabase de produção:

- `20260827142537_db_01_supabase_foundation.sql` (DB-01);
- `20260827163652_db_02_domain.sql` (DB-02);
- `20260827164147_perf_01_rls.sql` (PERF-01);
- `20260827173533_sec_02_rate_limit.sql` (SEC-02); e
- `20260827172106_storage_01_buckets.sql` (Storage).

Existem 10 tabelas públicas essenciais, todas com RLS habilitado:

`profiles`, `patients`, `caregiver_assignments`, `leads`,
`professional_applications`, `caregiver_profiles`, `daily_records`,
`daily_record_audit_events`, `rate_limit_buckets` e `contract_documents`.

O smoke confirmou 3 usuários Auth e 3 profiles ativos correspondentes. A
validação é de leitura; ela não provisiona contas nem insere dados.

## Fronteiras de acesso

Operações comuns usam o cliente Supabase SSR associado à requisição e passam
por RLS. O cliente privilegiado fica restrito ao server-side e é usado apenas
quando o fluxo exige privilégio explícito, como:

- criar ou reconciliar uma conta Auth e seu `public.profiles`;
- receber formulários públicos de leads e candidaturas profissionais, que são
  deliberadamente bloqueados para `anon`;
- registrar auditoria, cuja inserção é restrita a `service_role`; e
- executar operações administrativas que atravessam várias relações.

Leads e candidaturas profissionais aparecem nos painéis
`/admin/leads` e `/admin/profissionais` e não enviam e-mail. Resend fica
reservado aos alertas de intercorrências, se configurado.

Configure `SUPABASE_SECRET_KEY` (preferencial) ou
`SUPABASE_SERVICE_ROLE_KEY` somente no ambiente de servidor. Nunca use essas
variáveis com prefixo `NEXT_PUBLIC_`, no navegador ou em logs.

## Fotos e contratos

O campo legado `DailyRecord.photo_data` permanece na API para compatibilidade,
mas o provider Supabase grava o objeto no Storage e somente
`photo_storage_key` no Postgres. Data URIs/base64 não devem ser armazenados no
banco. Os paths são validados pelo adapter e pelas policies.

Consulte [SUPABASE_STORAGE.md](./SUPABASE_STORAGE.md) para buckets, MIME,
limites e autorização. Consulte [OPERATIONS.md](./OPERATIONS.md) antes de
qualquer ação de recuperação ou DDL.

## Validação e evolução

Use `npm run supabase:smoke` para uma checagem read-only do contrato de
produção. Não teste endpoints de escrita com dados reais de produção. Leads e
candidaturas devem ser conferidos nos respectivos painéis depois de uma janela
operacional controlada, sem expectativa de envio por e-mail.

As migrations de produção são forward-only. Uma correção de schema deve ser
uma nova migration revisada; não edite ou reverta uma migration já aplicada e
não execute DDL destrutivo sem export/snapshot previamente verificado. O
procedimento de backup, recuperação e rollback está em `OPERATIONS.md`.
