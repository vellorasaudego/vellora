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
VELLORA_APP_URL=https://<dominio-publicado>
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` é aceito somente como compatibilidade quando o
projeto ainda não tiver uma publishable key. A chave administrativa
server-side fica exclusivamente no servidor, para operações administrativas
como provisionamento. Consulte `SUPABASE_PROVISIONING.md` para os nomes das
variáveis e o procedimento; nunca coloque essa chave em `NEXT_PUBLIC_*`, código
do navegador, tickets, screenshots ou logs.

A URL `https://<dominio-publicado>/auth/callback` deve estar na lista de
redirect URLs do Supabase Auth. O callback aceita somente destinos internos e
não deve ser usado para redirecionar para uma URL externa.

## Recuperação de senha e remetente

O fluxo de recuperação usa PKCE: o e-mail retorna para `/auth/callback`, a
sessão é trocada no servidor e o usuário segue para `/redefinir-senha`. Para o
ambiente local, mantenha `VELLORA_APP_URL=http://localhost:5173`; para produção,
use a origem HTTPS publicada.

No painel do Supabase, em Authentication → URL Configuration, configure a Site
URL da produção e autorize estes callbacks:

- `http://localhost:5173/auth/callback`
- `https://<dominio-publicado>/auth/callback`

Se o painel exigir correspondência exata dos parâmetros, autorize também o
callback de recuperação gerado pela aplicação ou use o padrão curinga aceito
pelo painel. Não reutilize links antigos depois de alterar essas URLs; solicite
um novo e-mail.

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
