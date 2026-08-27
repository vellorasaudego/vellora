# SEC-02 — rate limit e Turnstile em produção

## Estado aplicado

A migration `20260827173533_sec_02_rate_limit.sql` já foi aplicada no projeto
Supabase de produção. O runtime usa Supabase para o rate limit porque
`VELLORA_DATA_PROVIDER=supabase` está ativo. O comportamento em D1/memória
continua apenas como fallback de compatibilidade e não é o estado atual.

## Rate limit

Quando o provider é Supabase, `consumeRateLimit` chama a RPC
`public.increment_rate_limit_bucket` com uma chave administrativa server-side.
O incremento usa `INSERT ... ON CONFLICT DO UPDATE` dentro de uma função
`SECURITY DEFINER`, com `search_path = pg_catalog` e limites de parâmetros.

A função está no schema `public` porque o cliente Supabase a acessa via
PostgREST. `EXECUTE` é revogado de `public`, `anon` e `authenticated` e é
concedido somente a `service_role`; nenhuma chave administrativa chega ao
navegador.

Se a RPC, a URL ou a chave administrativa não estiver disponível no provider
Supabase, a requisição falha fechando. Não há fallback silencioso para mapa de
memória no runtime Supabase.

Observe os logs da aplicação, erros Postgres/RPC e a evolução de bloqueios de
rate limit. Não faça testes de estouro que gravem buckets contra produção com
dados reais. Uma validação manual deve usar uma janela controlada e dados
fictícios/autorizados; o smoke continua read-only.

## Turnstile

O token é verificado exclusivamente no servidor contra a API do Cloudflare.
Quando utilizado, produção deve configurar:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, chave pública do widget; e
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`, segredo somente no server-side.

Com `VELLORA_DATA_PROVIDER=supabase`, a proteção de formulário é obrigatória
para os fluxos configurados pelo adapter. Configuração parcial, token inválido,
resposta negativa, falha HTTP ou erro de rede devem bloquear o envio. O segredo
nunca pode aparecer em logs ou no código client.

Leads e candidaturas profissionais são recebidos no backend e aparecem nos
painéis `/admin/leads` e `/admin/profissionais`; eles não enviam e-mail.
Resend fica reservado para alertas de intercorrências, se estiver configurado.

## Checklist operacional

1. Confirmar no histórico do Supabase a migration SEC-02 e a função de rate
   limit.
2. Confirmar que a chave administrativa é server-side e que os três providers
   permanecem `supabase`.
3. Conferir logs sanitizados de rejeições Turnstile, falhas da RPC e respostas
   4xx/5xx, sem registrar PHI, tokens ou chaves.
4. Para uma janela operacional controlada, verificar novos leads e
   candidaturas nos painéis; não esperar notificação por e-mail.
5. Executar o smoke read-only quando a checagem de infraestrutura for
   necessária.

Qualquer nova falha de privilégio, execução da RPC por role indevida, aumento
inesperado de erros ou exposição de segredo deve ser tratada como incidente
conforme `OPERATIONS.md`.
