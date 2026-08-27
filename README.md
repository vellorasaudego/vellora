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

- O banco estruturado usa **Cloudflare D1**, com o binding `DB`.
- Contratos PDF usam **Cloudflare R2**, com o binding `BUCKET`.
- O schema é definido em `db/schema.ts`.
- As migrações versionadas ficam em `drizzle/` e são aplicadas pela hospedagem.
- O código de execução não cria nem altera tabelas; mudanças de schema devem sempre gerar uma nova migração.

Depois de alterar `db/schema.ts`, gere e confira a migração:

```bash
npx drizzle-kit generate
```

## Configuração segura

`VELLORA_SESSION_SECRET` é obrigatório para assinar os cookies de sessão.

No primeiro banco vazio, o administrador pode ser criado temporariamente com:

- `VELLORA_BOOTSTRAP_ADMIN_EMAIL`
- `VELLORA_BOOTSTRAP_ADMIN_PASSWORD` (mínimo de 12 caracteres)
- `VELLORA_BOOTSTRAP_ADMIN_NAME` (opcional)
- `VELLORA_BOOTSTRAP_ADMIN_PHONE` (opcional)

Remova as variáveis de bootstrap depois de confirmar o primeiro acesso. As variáveis reais nunca devem ser salvas no repositório.

Para ativar **Esqueci minha senha**, configure:

- `RESEND_API_KEY`
- `VELLORA_EMAIL_FROM`
- `VELLORA_APP_URL`

Para ativar os alertas operacionais por e-mail, configure também:

- `VELLORA_NOTIFICATION_EMAIL` (um ou mais endereços separados por vírgula)

Para exigir a verificação antiabuso nos formulários públicos, configure as duas chaves do Cloudflare Turnstile:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `CLOUDFLARE_TURNSTILE_SECRET_KEY`

Os formulários já contam com honeypot, validação de origem, limite de tentativas e validação server-side do Turnstile quando as chaves estão presentes.

## Fluxo principal

1. A solicitação pública aparece em `/admin/leads`.
2. O administrador converte a solicitação em paciente e cria ou vincula a conta da família.
3. Candidaturas aprovadas entram automaticamente no banco de cuidadores com acesso pendente.
4. O administrador cria o e-mail e a senha do cuidador aprovado e o vincula a um paciente.
5. Família e cuidador veem os contratos atribuídos em modo somente leitura.
6. O cuidador registra o atendimento; a família acompanha o histórico permitido.
7. O cuidador pode editar seus próprios registros salvos; alterações ficam na trilha de auditoria administrativa.

O fluxo de operação e os cuidados para um ambiente separado estão em [STAGING.md](./STAGING.md).

## Verificações

```bash
npm run check
npm run build
```
