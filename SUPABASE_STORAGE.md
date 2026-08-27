# STORAGE-01 — Supabase Storage em produção

O runtime de produção usa Supabase Storage:

```dotenv
VELLORA_STORAGE_PROVIDER=supabase
```

O adapter de Storage usa o cliente SSR request-scoped e a chave pública
publishable/anon. A chave secret/service role não chega ao navegador. O
provider `legacy` mantém compatibilidade com R2/Cloudflare, mas é fallback
operacional; não há mistura automática entre os backends.

## Estado aplicado

A migration `20260827172106_storage_01_buckets.sql` já foi aplicada no projeto
Supabase de produção. Existem 2 buckets privados:

| Bucket | Path aceito | MIME | Limite |
| --- | --- | --- | --- |
| `record-photos` | `patients/<patient-uuid>/records/<record-uuid>/<file-uuid>.<ext>` | JPG, PNG, WEBP | 3 MiB |
| `contracts` | `contracts/<contract-uuid>.pdf` | PDF | 4 MiB |

O `supabase:smoke` confirma, por leitura, a existência, privacidade, limite e
MIME permitido dos dois buckets. Ele não cria buckets, não envia arquivos e
não altera policies.

`photo_storage_key` e `contract_documents.storage_key` guardam somente o path,
nunca uma data URI/base64. O registro diário precisa existir antes do upload
da foto, e paths temporários ou genéricos são rejeitados.

## Autorização

- Administradores podem operar objetos que respeitam a convenção de paths.
- Cuidadores ativos podem inserir, substituir e remover fotos dos pacientes
  com assignment vigente.
- Família e cuidador só baixam fotos quando as policies de `patients` e
  `daily_records` confirmam a autorização.
- Contratos são lidos quando há uma linha visível de
  `contract_documents`; upload, substituição e remoção são exclusivos do
  admin.
- Não há policies para `anon` e nenhum bucket é público.
- As policies usam `private.is_admin`, relações públicas e `auth.uid()`; não
  usam `user_metadata` como autorização.

## Operação segura

Não teste upload, substituição ou remoção contra produção com dados reais. Para
aceitação manual, use somente uma janela controlada, conta autorizada e um
arquivo sem PHI, com limpeza autorizada depois. Não registre conteúdo, URLs
assinadas, tokens ou nomes de pacientes nos logs.

Antes de qualquer DDL destrutivo ou alteração de policy arriscada, faça um
export/snapshot conforme o checklist de `OPERATIONS.md` e registre a migration
forward-only correspondente. Retenção, backup e PITR não são presumidos por
este documento: confirme-os no plano do Supabase antes de depender deles.

Se for necessário um rollback de configuração, altere Auth, dados e Storage
de forma coordenada. Trocar somente Storage faria o aplicativo procurar paths
em outro backend; o fallback R2 não deve ser tratado como cópia automática dos
objetos Supabase.
