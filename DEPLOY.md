# Publicação da Vellora Saúde

Este projeto está configurado para **OpenAI Sites** em `.openai/hosting.json`.

## Recursos obrigatórios

- D1 no binding `DB` para dados estruturados.
- R2 no binding `BUCKET` para contratos PDF.
- `VELLORA_SESSION_SECRET` como variável secreta do ambiente publicado.
- `VELLORA_NOTIFICATION_EMAIL` somente se os alertas operacionais por e-mail forem desejados.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` e `CLOUDFLARE_TURNSTILE_SECRET_KEY` para ativar a proteção Turnstile.

As migrações de `drizzle/` são aplicadas durante a publicação. Não crie tabelas em rotas, componentes ou funções executadas por requisição.

## Primeiro administrador

Em um banco vazio, configure temporariamente:

- `VELLORA_BOOTSTRAP_ADMIN_EMAIL`
- `VELLORA_BOOTSTRAP_ADMIN_PASSWORD` com 12 ou mais caracteres
- `VELLORA_BOOTSTRAP_ADMIN_NAME` e `VELLORA_BOOTSTRAP_ADMIN_PHONE`, se desejado

Depois de confirmar o primeiro login, remova as variáveis de bootstrap. Para recuperação excepcional, use temporariamente `VELLORA_ADMIN_RECOVERY_EMAIL` e `VELLORA_ADMIN_RECOVERY_PASSWORD`, publique, confirme o acesso e remova ambas.

## Recuperação normal de senha

Configure `RESEND_API_KEY`, `VELLORA_EMAIL_FROM` e `VELLORA_APP_URL`. O link expira em 30 minutos, funciona uma vez e invalida as sessões anteriores após a troca.

Os alertas de novos contatos, candidaturas e intercorrências usam o mesmo Resend quando `VELLORA_NOTIFICATION_EMAIL` está configurada. Sem essa variável, os dados continuam sendo gravados e nenhum e-mail operacional é enviado.

## Conferência antes de publicar

```bash
npm run check
npm run build
```

Não altere migrações que já foram publicadas. Toda mudança posterior de schema deve gerar um novo arquivo.
