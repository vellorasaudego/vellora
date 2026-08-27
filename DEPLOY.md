# Publicação da Vellora Saúde

O rollout atual publica diretamente usando o runtime **Supabase de produção**:
Supabase Auth, Supabase Postgres e Supabase Storage. O proprietário do projeto
faz push e abre PR manualmente; este documento não executa essas operações.

Vercel será tratado somente na Wave 12 e não é requisito desta etapa. Bindings
Cloudflare e a configuração de OpenAI Sites são compatibilidade de
legado/preview, quando explicitamente selecionadas, e não fazem parte do
runtime de produção atual.

## Recursos obrigatórios

- `VELLORA_AUTH_PROVIDER=supabase`.
- `VELLORA_DATA_PROVIDER=supabase`.
- `VELLORA_STORAGE_PROVIDER=supabase`.
- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou a
  nomenclatura legada `NEXT_PUBLIC_SUPABASE_ANON_KEY`) para o cliente.
- `SUPABASE_URL` e `SUPABASE_SECRET_KEY` (ou
  `SUPABASE_SERVICE_ROLE_KEY`) somente no servidor para operações internas.
- `VELLORA_NOTIFICATION_EMAIL` somente se forem desejados alertas por e-mail
  de intercorrências.
- Novos leads e novas candidaturas profissionais são acompanhados nos painéis
  `/admin/leads` e `/admin/profissionais`, que são as fontes oficiais.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `CLOUDFLARE_TURNSTILE_SECRET_KEY`; no
  provider Supabase, as duas chaves são necessárias para a proteção Turnstile.

As migrations SQL de `supabase/migrations/` devem ser revisadas e aplicadas
manualmente no projeto de produção antes da publicação correspondente. Não
crie tabelas em rotas, componentes ou funções executadas por requisição.

## Primeiro administrador

Provisione o primeiro administrador no Supabase a partir de um ambiente
confiável, usando `npm run supabase:provision-user` e estas entradas:

- `SUPABASE_URL`;
- `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_PROVISION_EMAIL`, `SUPABASE_PROVISION_NAME`,
  `SUPABASE_PROVISION_PASSWORD` com 12 ou mais caracteres;
- `SUPABASE_PROVISION_ROLE` (`admin`, `familia` ou `cuidador`);
- `SUPABASE_PROVISION_PHONE`, se desejado.

Nunca exponha a chave server-side no cliente ou no repositório. Remova senha e
demais entradas temporárias após o provisionamento. As variáveis
`VELLORA_BOOTSTRAP_ADMIN_*` e `VELLORA_ADMIN_RECOVERY_*` só podem ser usadas
como fallback legacy explicitamente selecionado.

## Recuperação normal de senha

Com o provider legacy, configure `RESEND_API_KEY`, `VELLORA_EMAIL_FROM` e
`VELLORA_APP_URL`. O link expira em 30 minutos, funciona uma vez e invalida as
sessões anteriores após a troca. Com Supabase Auth, a recuperação usa a
configuração de e-mail do próprio Supabase.

Novos leads e novas candidaturas profissionais não enviam e-mail: devem ser
acompanhados nos painéis `/admin/leads` e `/admin/profissionais`, que são as
fontes oficiais. Se configurado, o Resend pode enviar somente alertas
operacionais de intercorrências.
Sem `VELLORA_NOTIFICATION_EMAIL`, os dados continuam sendo gravados e esses
alertas opcionais não são enviados.

## Conferência antes de publicar

```bash
npm run check
npm run build
npm run supabase:smoke
```

Não altere migrations que já foram publicadas. Toda mudança posterior de
schema deve gerar um novo arquivo, passar pelos gates locais e ser aplicada
manualmente em produção.
