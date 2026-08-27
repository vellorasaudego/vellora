# Vellora Saúde

Site institucional e sistema de gestão de cuidados domiciliares. O projeto reúne:

- formulário público de solicitação de atendimento;
- cadastro profissional em **Trabalhe conosco**;
- painel administrativo para famílias, pacientes, cuidadores, vínculos e contratos;
- área da família para acompanhar os registros;
- área do cuidador para registrar os atendimentos.
- histórico de alterações dos registros diários, com edição do próprio cuidador;
- páginas públicas de Política de Privacidade e Termos de Uso.

## Desenvolvimento local

Requisitos: Node.js 20 ou mais recente e npm.

```bash
npm install
npm run dev
```

Para verificar uma versão de produção:

```bash
npm run build
npm run start
```

## Dados e arquivos

No rollout atual, o runtime de produção usa **Supabase Auth**, **Supabase
Postgres** e **Supabase Storage** para autenticação, dados estruturados,
contratos e fotos. Mantenha `VELLORA_AUTH_PROVIDER=supabase`,
`VELLORA_DATA_PROVIDER=supabase` e `VELLORA_STORAGE_PROVIDER=supabase`.

As migrations SQL do runtime de produção ficam em `supabase/migrations/` e
devem ser revisadas e aplicadas manualmente no projeto Supabase de produção.
`db/schema.ts` e `drizzle/` pertencem ao adaptador legado. Cloudflare D1/R2 e
os artefatos de OpenAI Sites só podem aparecer em um legado ou preview
explicitamente configurado; não são requisitos da produção Supabase.

## Configuração segura

`VELLORA_SESSION_SECRET` só é necessário quando o fallback de autenticação
`legacy` estiver explicitamente selecionado; não é requisito da sessão atual
com Supabase Auth.

Na produção Supabase, provisione o primeiro administrador com
`npm run supabase:provision-user`, usando em um ambiente confiável:

- `SUPABASE_URL`;
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`, somente no servidor;
- `SUPABASE_PROVISION_EMAIL`, `SUPABASE_PROVISION_NAME`,
  `SUPABASE_PROVISION_PASSWORD` (mínimo de 12 caracteres) e
  `SUPABASE_PROVISION_ROLE` (`admin`, `familia` ou `cuidador`).

Remova senha e demais entradas temporárias depois do provisionamento. As
variáveis `VELLORA_BOOTSTRAP_ADMIN_*` e `VELLORA_ADMIN_RECOVERY_*` são
alternativas exclusivas do fallback legacy; chaves e valores reais nunca devem
ser salvos no repositório.

Para ativar **Esqueci minha senha**, configure o envio correspondente ao
provider de autenticação. Com `VELLORA_AUTH_PROVIDER=legacy`, use Resend:

- `RESEND_API_KEY`
- `VELLORA_EMAIL_FROM`
- `VELLORA_APP_URL`

Com `VELLORA_AUTH_PROVIDER=supabase`, a recuperação usa o Supabase Auth e as
variáveis de reset do fluxo legacy não são consultadas. O envio depende da
configuração de e-mail do próprio Supabase.

Para os alertas opcionais de intercorrências por e-mail, configure também:

- `VELLORA_NOTIFICATION_EMAIL` (um ou mais endereços separados por vírgula)

Novos leads e novas candidaturas profissionais são acompanhados nos painéis
`/admin/leads` e `/admin/profissionais`, que são as fontes oficiais desses
registros.

No runtime Supabase, a verificação antiabuso dos formulários públicos exige as
duas chaves do Cloudflare Turnstile:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`

Os formulários contam com honeypot, validação de origem, limite de tentativas e
validação server-side do Turnstile. Sem as duas chaves no provider Supabase, a
entrada pública falha fechada.

## Fluxo principal

1. A solicitação pública aparece em `/admin/leads`.
2. A candidatura profissional aparece em `/admin/profissionais`.
3. O administrador converte a solicitação em paciente e cria ou vincula a conta da família.
4. Candidaturas aprovadas entram automaticamente no banco de cuidadores com acesso pendente.
5. O administrador cria o e-mail e a senha do cuidador aprovado e o vincula a um paciente.
6. Família e cuidador veem os contratos atribuídos em modo somente leitura.
7. O cuidador registra o atendimento; a família acompanha o histórico permitido.
8. O cuidador pode editar seus próprios registros salvos; alterações ficam na trilha de auditoria administrativa.

O rollout atual é direto em produção, sem staging persistente. A decisão e a
opção futura de uma prévia segura estão em [STAGING.md](./STAGING.md). Vercel
será tratado somente na Wave 12.

## Verificações

```bash
npm run check
npm run build
```
