# Provisionamento operacional do Supabase em produção

Este procedimento é para o único projeto Supabase de produção
`punannbkoiekhvbnqqkh`. Não há staging persistente neste rollout. O proprietário
faz push, PR e publicação manualmente; este comando não faz commit, push,
deploy ou alteração de schema.

## Estado atual

- `VELLORA_AUTH_PROVIDER=supabase`;
- `VELLORA_DATA_PROVIDER=supabase`;
- `VELLORA_STORAGE_PROVIDER=supabase`;
- As migrations DB-01, DB-02, PERF-01, SEC-02 e Storage já estão aplicadas em
  produção.
- Os três providers de runtime estão configurados como `supabase`.
- Há 3 usuários no Supabase Auth e 3 profiles ativos correspondentes.
- `npm run supabase:smoke` é read-only e não substitui este procedimento.

Na ativação inicial, a ordem operacional foi aplicar as migrations do banco,
aplicar Storage e provisionar a conta Auth. Essa sequência já está concluída no
estado atual; o comando abaixo continua idempotente para novas contas.

O script deste documento é usado somente para criar ou reconciliar contas
Auth e seus profiles. Ele é uma operação de escrita e deve ser executado
deliberadamente por um operador autorizado, em sessão protegida e sem exibir
credenciais.

## Pré-requisitos

- Node.js compatível e dependências instaladas;
- `SUPABASE_URL=https://punannbkoiekhvbnqqkh.supabase.co` no processo seguro;
- exatamente uma credencial administrativa server-side:
  `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`;
- `SUPABASE_PROVISION_EMAIL`, `SUPABASE_PROVISION_NAME`,
  `SUPABASE_PROVISION_PASSWORD` e `SUPABASE_PROVISION_ROLE`;
- role igual a `admin`, `familia` ou `cuidador`; e
- senha com pelo menos 12 caracteres, sem reutilização.

Nunca use uma chave publishable/anon para este comando. Não coloque a chave,
senha ou dados pessoais em arquivos versionados, tickets, screenshots, logs de
CI ou mensagens. Não use variáveis `NEXT_PUBLIC_*` para a chave administrativa.

## Execução segura

Em PowerShell, forneça valores somente para o processo atual:

```powershell
$env:SUPABASE_URL = "https://punannbkoiekhvbnqqkh.supabase.co"
$env:SUPABASE_SECRET_KEY = "<secret-server-side-fora-do-Git>"
$env:SUPABASE_PROVISION_EMAIL = "admin@example.com"
$env:SUPABASE_PROVISION_NAME = "Administrador Vellora"
$env:SUPABASE_PROVISION_PASSWORD = "<senha-temporaria-com-12-ou-mais-caracteres>"
$env:SUPABASE_PROVISION_ROLE = "admin"
npm run supabase:provision-user

Remove-Item Env:SUPABASE_SECRET_KEY, Env:SUPABASE_URL,
  Env:SUPABASE_PROVISION_EMAIL, Env:SUPABASE_PROVISION_NAME,
  Env:SUPABASE_PROVISION_PASSWORD, Env:SUPABASE_PROVISION_ROLE,
  Env:SUPABASE_PROVISION_RESET_PASSWORD -ErrorAction SilentlyContinue
```

Também é possível usar a CLI com placeholders, sem colocar valores reais no
documento:

```powershell
npm run supabase:provision-user -- `
  --url "https://<project-ref>.supabase.co" `
  --email "<email-do-usuario>" `
  --name "<nome-do-usuario>" `
  --password "<senha-temporaria-com-12-ou-mais-caracteres>" `
  --role "admin"
```

As flags podem aparecer no histórico do shell; por isso, variáveis de ambiente
em uma sessão segura ou um gerenciador de segredos são preferíveis.

O comando procura o e-mail normalizado com `auth.admin.listUsers`. Se não
encontrar a conta, cria o usuário com e-mail confirmado; se encontrar uma
única conta, confirma o e-mail e reconcilia o profile pelo UUID retornado pelo
Auth. Reexecuções não criam duplicatas.

Por padrão, a senha de uma conta existente é preservada. Para rotação
deliberada, use `--reset-password` e forneça uma nova senha válida. Se houver
mais de uma conta com o mesmo e-mail normalizado, o script falha sem alterar o
profile; resolva o conflito no dashboard antes de tentar novamente.

Flags também são aceitas, mas podem aparecer no histórico do shell; prefira
variáveis de ambiente. Nunca copie a saída do comando para um ticket se ela
contiver identificadores ou erros sensíveis.

## Pós-execução

1. Confirme no dashboard, sem expor a senha, que o usuário está no projeto
   correto e que o profile tem `active = true` e a role esperada.
2. Execute `npm run supabase:smoke` para a validação read-only de Auth,
   profiles, tabelas e Storage.
3. Faça login manual somente com a conta autorizada e sem dados de saúde; não
   execute endpoints de escrita para “testar” a conta contra dados reais.
4. Remova as variáveis temporárias da sessão e revogue/rotacione a chave se
   ela tiver sido exposta ou usada fora do processo protegido.

## Limites e recuperação

O script não altera flags do host, não aplica migrations e não migra dados de
D1/R2. O rollback de Auth deve ser coordenado com os providers de dados e
Storage; não troque somente `VELLORA_AUTH_PROVIDER`. Em caso de incidente,
pare o procedimento, preserve os logs sanitizados e siga
`OPERATIONS.md`.
