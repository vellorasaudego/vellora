# Publicação da Vellora Saúde

O rollout atual publica diretamente usando o runtime **Supabase de produção**:
Supabase Auth, Supabase Postgres e Supabase Storage. O proprietário do projeto
faz push e abre PR manualmente; este documento não executa essas operações.

O host de produção é a **Vercel**, usando o domínio `vellorasaude.com.br`.
Bindings Cloudflare e a configuração de OpenAI Sites são compatibilidade de
legado/preview, quando explicitamente selecionadas, e não fazem parte do
runtime de produção atual.

## Configuração da Vercel

Crie ou vincule um projeto Vercel ao repositório `vellorasaudego/vellora`,
com a raiz do projeto neste diretório. O repositório já declara:

- install command: `npm ci`;
- build command: `npm run build:vercel`;
- output directory: `.next`;
- framework: Next.js, detectado pelo `package.json`.

Adicione `vellorasaude.com.br` como domínio principal do projeto. Se também
for usado `www.vellorasaude.com.br`, configure-o como domínio alternativo com
redirecionamento para o domínio principal. No registrador DNS, aplique os
registros exibidos pela Vercel e aguarde a verificação do certificado SSL.

No Supabase Auth, atualize também:

- Site URL: `https://vellorasaude.com.br`;
- Redirect URL: `https://vellorasaude.com.br/auth/callback`.

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

Configure `VELLORA_APP_URL=https://vellorasaude.com.br` na Vercel. Não use
`VELLORA_SESSION_SECRET`, `SUPABASE_PROVISION_*`, `VELLORA_BOOTSTRAP_*` ou
`VELLORA_ADMIN_RECOVERY_*` na Vercel: essas variáveis pertencem a operações
locais e excepcionais, não ao runtime Supabase de produção.

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

npm run build:vercel
npm run supabase:smoke
```

Depois do push para `main`, confirme na Vercel que o deployment terminou com
status `Ready`, que o domínio está verificado e que `/`, `/login`,
`/esqueci-senha` e `/auth/callback` respondem no domínio de produção. Valide
as rotas protegidas somente com uma conta de teste sem dados sensíveis.

Não altere migrations que já foram publicadas. Toda mudança posterior de
schema deve gerar um novo arquivo, passar pelos gates locais e ser aplicada
manualmente em produção.
