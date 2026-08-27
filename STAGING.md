# Staging da Vellora Saúde

O staging deve ser isolado da produção e nunca deve receber prontuários ou documentos reais.

## Prévia segura

Use `.env.staging.example` como referência para uma prévia visual. Com `VELLORA_SAFE_PREVIEW=true`:

- os painéis e o login ficam bloqueados;
- os formulários públicos validam os campos, mas não gravam dados;
- nenhum contrato, paciente ou registro é exibido.

## Staging funcional

Para testar login e fluxos com dados fictícios, use um D1 e um R2 separados, aplique todas as migrações e configure:

- `VELLORA_SESSION_SECRET` exclusivo do staging;
- `VELLORA_SAFE_PREVIEW=false`;
- credenciais temporárias de bootstrap para criar o primeiro administrador;
- `VELLORA_APP_URL` com a URL do staging;
- `RESEND_API_KEY`, `VELLORA_EMAIL_FROM` e `VELLORA_NOTIFICATION_EMAIL` apontando para uma caixa de testes, se os alertas forem validados;
- as duas chaves do Turnstile quando a proteção antifraude for testada.

Depois do primeiro acesso, remova as variáveis de bootstrap. Não copie dados da produção para o staging sem anonimização documentada.

## Checklist antes de promover

```bash
npm run check
npm run build
```

Verifique manualmente: formulário de solicitação, cadastro profissional, login, registro diário, edição de um registro, remoção de foto, alerta de intercorrência, logout e páginas de privacidade/termos.
