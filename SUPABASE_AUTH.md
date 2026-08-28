# AUTH-01 — Supabase Auth em produção

O projeto usa Supabase como provider de autenticação no runtime de produção.
Não há staging persistente neste rollout.

```dotenv
VELLORA_AUTH_PROVIDER=supabase
```

O adapter usa Supabase Auth com cookies SSR e valida o perfil ativo em
`public.profiles`. O fallback `legacy` continua no código apenas para
compatibilidade e recuperação controlada; ele não descreve o estado atual de
produção e não deve ser ativado isoladamente.

## Estado aplicado

- `VELLORA_AUTH_PROVIDER=supabase` está ativo no runtime de produção.
- A migration de fundação `20260827142537_db_01_supabase_foundation.sql` e as
  migrations de domínio, performance, rate limit e Storage foram aplicadas no
  projeto de produção.
- Existem 3 usuários no Supabase Auth e 3 perfis ativos correspondentes.
- Os perfis autorizados usam `role` igual a `admin`, `familia` ou `cuidador`.
- A autorização consulta `public.profiles`; não usa `user_metadata` como fonte
  de autorização.

## Configuração

As variáveis públicas e de servidor devem ser configuradas no ambiente de
execução sem adicionar valores reais ao Git:

```dotenv
VELLORA_AUTH_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VELLORA_APP_URL=https://vellorasaude.com.br
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` é aceito somente como compatibilidade quando o
projeto ainda não tiver uma publishable key. A chave administrativa
server-side fica exclusivamente no servidor, para operações administrativas
como provisionamento. Consulte `SUPABASE_PROVISIONING.md` para os nomes das
variáveis e o procedimento; nunca coloque essa chave em `NEXT_PUBLIC_*`, código
do navegador, tickets, screenshots ou logs.

A URL `https://vellorasaude.com.br/auth/callback` deve estar na lista de
redirect URLs do Supabase Auth. O callback aceita somente destinos internos e
não deve ser usado para redirecionar para uma URL externa.

## Recuperação de senha e remetente

O fluxo de recuperação usa `token_hash`: o e-mail leva o hash de uso único para
`/auth/callback`, o servidor valida esse hash com `verifyOtp({ type:
"recovery" })`, grava a sessão em cookies SSR e redireciona para
`/redefinir-senha`. Assim, o link não depende do navegador que solicitou o
e-mail. Links antigos baseados em PKCE continuam aceitos pelo callback apenas
para compatibilidade; novos e-mails devem usar o template abaixo.

Para o ambiente local, mantenha `VELLORA_APP_URL=http://localhost:5173`; na
Vercel, use `VELLORA_APP_URL=https://vellorasaude.com.br`.

No painel do Supabase, em Authentication → URL Configuration, configure a Site
URL da produção e autorize estes callbacks:

- `http://localhost:5173/auth/callback`
- `https://vellorasaude.com.br/auth/callback`

Em Authentication → Email Templates → Reset Password, substitua o link padrão
que usa `{{ .ConfirmationURL }}` por este template mínimo. O `&amp;` é
intencional: ele mantém o HTML válido e vira `&` no endereço final.

```html
<h2>Redefina sua senha</h2>
<p>Recebemos uma solicitação para criar uma nova senha para sua conta.</p>
<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">
    Criar nova senha
  </a>
</p>
<p>Se você não solicitou essa alteração, ignore este e-mail.</p>
```

Esse template foi salvo no projeto Supabase de produção. Alterar somente o
código não muda o template que o Supabase já armazenou; se ele for restaurado
no painel, reaplique o conteúdo acima. O hash é sensível, de uso único e deve
desaparecer no primeiro redirect; o callback também envia `Cache-Control:
no-store` e `Referrer-Policy: no-referrer`. Depois de qualquer alteração,
solicite um novo e-mail. Não reutilize links anteriores.

O remetente padrão `Supabase Auth <noreply@mail.app.supabase.io>` só muda quando
o Custom SMTP é habilitado no painel. Para enviar como `Vellora Saúde
<vellorasaudego@gmail.com>` usando Gmail, informe no SMTP do Supabase:

- Host: `smtp.gmail.com`
- Porta: `587` com STARTTLS (ou `465` com SSL)
- Usuário/remetente: `vellorasaudego@gmail.com`
- Nome do remetente: `Vellora Saúde`
- Senha: uma App Password do Google, com verificação em duas etapas habilitada

Use a senha de aplicativo somente no campo protegido do painel; nunca a coloque
no Git, no `.env` do navegador ou no chat. `VELLORA_EMAIL_FROM` e as variáveis
do Resend da aplicação não alteram os e-mails emitidos pelo Supabase Auth.

## Validação operacional

`npm run supabase:smoke` é read-only. Ele verifica a API administrativa do
Auth, as 10 tabelas essenciais, a correspondência entre usuários Auth e
profiles e os 2 buckets privados. Não cria usuários, não altera profiles, não
envia e-mail, não grava dados e não testa uma senha real no navegador.

Para uma aceitação manual, use uma conta de teste autorizada e sem dados de
saúde: login, logout, recuperação de senha e retorno por `/auth/callback`.
Faça essa validação em uma janela controlada e não use fluxos de escrita com
dados reais de pacientes, leads ou candidaturas. Consulte
`OPERATIONS.md` para o checklist completo.

## Risco conhecido: leaked password protection

O Security Advisor do projeto de produção reporta
`auth_leaked_password_protection` como `WARN`. O plano atual não permite
habilitar a proteção contra senhas vazadas. O owner aceitou formalmente esse
risco para o rollout atual; o alerta não está corrigido e deve continuar
registrado como risco aceito.

Isso significa que o Supabase Auth não compara novas senhas com bases públicas
de senhas comprometidas. A equipe deve manter senhas fortes, evitar senhas
reutilizadas e reavaliar a decisão se o plano mudar. Não se deve declarar o
Advisor limpo enquanto esse recurso permanecer indisponível.

Se um upgrade do plano disponibilizar a opção, o owner deve habilitá-la no
dashboard e executar novamente o Security Advisor antes de remover o risco do
registro. Nenhuma alteração remota é feita por este documento.

## Provisionamento e recuperação

O provisionamento é uma operação separada e pode gravar no Supabase. Siga
`SUPABASE_PROVISIONING.md`; nunca use a chave administrativa no cliente.

Em caso de rollback de configuração, Auth, dados e Storage devem ser tratados
como um conjunto. Trocar somente o provider de Auth pode separar usuários Auth
de seus dados. O fallback `legacy` não importa automaticamente contas, senhas
ou perfis do Supabase e só pode ser considerado depois de confirmar a
compatibilidade do ambiente legado e dos dados.
