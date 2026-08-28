# Staging da Vellora Saúde

Não há projeto de staging persistente neste rollout. A aplicação será validada
e publicada diretamente no projeto Supabase de produção, após os gates locais e
a revisão manual do proprietário. Staging não é pré-requisito para concluir as
waves atuais.

## Prévia segura

Uma prévia visual sem dados pode usar `.env.staging.example` como referência e
`VELLORA_SAFE_PREVIEW=true`:

- os painéis e o login ficam bloqueados;
- os formulários públicos validam os campos, mas não gravam dados;
- nenhum contrato, paciente, foto ou registro é exibido.

Essa prévia não representa um ambiente funcional, não recebe dados reais e não
substitui a validação do runtime Supabase de produção.

## Ambiente isolado futuro

Se um ambiente funcional for criado em uma etapa posterior, ele deverá usar um
projeto Supabase separado, com Auth, Postgres e Storage isolados, dados
fictícios e credenciais próprias. Não deverá usar dados reais nem ser tratado
como o projeto de produção. D1/R2 e OpenAI Sites não são requisitos desse
ambiente futuro; qualquer uso será apenas legado/preview explicitamente
configurado.

## Checklist do rollout direto em produção

Antes da publicação manual pelo proprietário, execute localmente:

```bash
npm run check
npm run build
npm run supabase:smoke
```

Depois, valide os fluxos no projeto de produção conforme a janela de rollout:

- solicitação de cuidado em `/solicitar-cuidado` e conferência em
  `/admin/leads`;
- candidatura profissional em `/trabalhe-conosco` e conferência em
  `/admin/profissionais`;
- login, registro diário, edição de registro, remoção de foto e logout;
- alerta de intercorrência, quando o Resend estiver configurado;
- páginas de privacidade e termos.

Leads e candidaturas não dependem de e-mail: os painéis são suas fontes
oficiais. O deploy de produção é feito na Vercel com
`https://vellorasaude.com.br`; este arquivo descreve somente uma eventual
prévia segura e não cria um ambiente Supabase separado.
