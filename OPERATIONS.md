# Operações, observabilidade e recuperação

Este runbook descreve a operação do único ambiente Supabase de produção da
Vellora Saúde. Não há staging persistente. Os três providers de runtime estão
em `supabase`:

```text
VELLORA_AUTH_PROVIDER=supabase
VELLORA_DATA_PROVIDER=supabase
VELLORA_STORAGE_PROVIDER=supabase
```

O runbook é um procedimento de decisão, não uma afirmação de que backups,
alertas, PITR ou um canal de plantão já estejam habilitados. O owner deve
confirmar cada capacidade no plano e no host efetivamente utilizado.

## Princípios de segurança e LGPD

- Não use dados reais de pacientes, contratos, leads ou candidaturas para
  testes de escrita, carga, upload ou rate limit.
- Faça verificações de leads e candidaturas pelos painéis
  `/admin/leads` e `/admin/profissionais` após uma janela operacional
  controlada; não espere e-mail para esses fluxos.
- Resend é reservado a alertas de intercorrências, se configurado.
- Nunca registre PHI, nome, CPF, telefone, e-mail, conteúdo de prontuário,
  contrato, foto, senha, token, chave, URL assinada ou payload completo.
  Prefira request ID, rota, status, código de erro e identificadores
  anonimizados/hasheados.
- Colete somente evidências necessárias para diagnosticar o incidente,
  limite o acesso, registre quem acessou e aplique as políticas internas de
  retenção, eliminação e atendimento aos titulares.
- Exposição de dados pessoais ou de saúde exige contenção imediata e o fluxo
  interno de LGPD do controlador/encarregado, com avaliação jurídica e de
  comunicação às autoridades/titulares quando aplicável. Este documento não
  substitui a decisão legal da organização.

## Fontes de observabilidade

Consulte as fontes abaixo sem copiar dados sensíveis para tickets ou chats:

| Fonte | Sinais a acompanhar | Ação inicial |
| --- | --- | --- |
| Logs da aplicação | 5xx, latência, falhas de provider, callback/Auth, Storage, RPC e notificações | Filtrar por janela, rota, status e request ID; sanitizar antes de compartilhar |
| Supabase Auth | picos de login negado, callback inválido, sessão/token e recuperação de senha | Correlacionar horário e código; nunca registrar senha ou token |
| Supabase Postgres | erros de conexão, RLS/policy, RPC, lock, timeout e queries lentas | Preservar código/horário; não executar SQL corretivo ad hoc em produção |
| Supabase Storage | 403/404/5xx, upload/download, objeto inesperado ou bucket público | Confirmar bucket, policy e path sem expor URL assinada ou conteúdo |
| Security/Performance Advisor | novo WARN/ERROR ou regressão após alteração | Comparar com baseline e abrir incidente se não for o risco aceito |
| Rate limit/Turnstile | aumento de bloqueios, falhas da RPC, tokens inválidos e abuso por rota | Conter a origem, preservar métricas agregadas e validar configuração server-side |

O alerta `auth_leaked_password_protection` continua `WARN` por limitação do
plano Supabase e é risco aceito pelo owner. Qualquer novo alerta relevante,
especialmente de exposição, RLS, Storage ou credencial, não deve ser agrupado
automaticamente com esse risco.

## Checklist de saúde

Execute na abertura de uma janela operacional e após uma mudança aprovada:

1. Confirme no host os três providers como `supabase` e a URL do projeto, sem
   imprimir valores secretos.
2. Execute `npm run supabase:smoke` em sessão protegida. O comando é
   read-only: verifica Auth Admin API, 10 tabelas essenciais, profiles e os 2
   buckets privados; não cria conta, profile, linha, arquivo, sessão
   persistente ou migration.
3. Confirme no dashboard que Auth/profiles continuam consistentes, que RLS
   está habilitado e que `record-photos`/`contracts` permanecem privados.
4. Revise logs de aplicação, Auth, Postgres e Storage na janela da checagem;
   procure erros novos e não compartilhe PHI.
5. Revise o Security/Performance Advisor e compare com a baseline. O WARN de
   leaked password protection é conhecido; novos WARN/ERROR precisam de
   investigação.
6. Confirme que rate limit e Turnstile estão falhando fechados quando a
   configuração necessária não está disponível, sem fazer uma carga real.
7. Para leads e candidaturas que chegaram em operação normal, confira os
   registros nos painéis depois da janela controlada. Não espere notificação
   por e-mail.

Se qualquer item falhar, pare a promoção e registre o horário, o sintoma
sanitizado, a última mudança e o próximo responsável.

## Alertas sem PHI

Os alertas devem conter somente serviço, ambiente, janela, métrica agregada,
rota/código e link interno para logs com acesso controlado. Não inclua corpo de
requisição, e-mail, nome, CPF, telefone, identificador de paciente, conteúdo
de foto/contrato, token ou segredo.

Confirme no plano operacional quais alertas realmente estão configurados. Como
baseline a verificar, considere: 5xx ou timeout sustentado da aplicação;
falhas de Auth/callback acima do padrão; erros Postgres/RLS/RPC; 403/5xx de
Storage; aumento de bloqueios de rate limit/Turnstile; bucket público ou
policy alterada; e novo alerta crítico do Advisor. Os limiares e canais não
devem ser inventados neste documento: o owner deve defini-los e testá-los sem
PHI.

## Backup, export e recuperação

Antes de depender de recuperação, o owner deve verificar no plano do Supabase
e registrar a data da verificação:

| Capacidade | Estado a verificar | Evidência necessária |
| --- | --- | --- |
| Backup automatizado | não presumir habilitado | configuração/plano e última execução |
| Retention | não presumir duração | período efetivo do plano |
| PITR | não presumir disponível | disponibilidade, janela e permissões |
| Export/snapshot manual | não presumir sucesso | arquivo/identificador, data e local protegido |
| Restauração isolada | testar quando possível | resultado do teste, limitações e RPO/RTO observado |

Antes de DDL destrutivo, mudança de policy arriscada ou exclusão em lote:

1. obtenha aprovação do owner e registre a migration/objetivo;
2. faça export/snapshot do banco e dos metadados/policies relevantes;
3. verifique que o artefato pode ser localizado e que seu acesso é restrito;
4. documente o ponto de recuperação, impacto esperado e plano de retorno; e
5. prefira uma migration forward-only e uma alteração reversível.

Não prometa retenção, PITR ou restauração até que o plano e um teste os
confirmem. Não restaure diretamente em produção para experimentar. Quando
possível, restaure em ambiente isolado, valide schema, RLS, Storage, contagens
agregadas e login com conta de teste sem PHI. Se um ambiente isolado não
estiver disponível, registre a limitação e obtenha decisão explícita do owner
antes de qualquer restauração produtiva.

### Recuperação acionável

1. Declare o incidente e congele DDL, deploys e mudanças de configuração.
2. Preserve logs sanitizados, horários, IDs de operação e o último ponto
   conhecido de saúde; não copie dados pessoais.
3. Contenha novas escritas somente pelo mecanismo aprovado pelo owner, sem
   alterar um provider isoladamente.
4. Localize o snapshot/export ou ponto PITR verificado e restaure primeiro no
   ambiente isolado quando possível.
5. Valide Auth/profiles, RLS, tabelas, buckets privados, policies e contagens
   agregadas. Não use dados reais em testes funcionais.
6. Com aprovação, execute a restauração produtiva, faça o smoke read-only e
   valide os fluxos críticos com uma conta/arquivo de teste sem PHI.
7. Reabra a operação gradualmente, monitore a janela seguinte e registre
   dados perdidos, limites do RPO/RTO e ações preventivas.

## Rollback de código e configuração

As migrations são forward-only: não edite nem tente “desaplicar” uma migration
já aplicada. Corrija schema/policy com uma nova migration revisada, após
export/snapshot quando houver risco destrutivo.

O rollback de aplicação e configuração deve coordenar os três providers:

1. congele o deploy e identifique a versão de código e configuração compatível;
2. confirme se a versão anterior conhece o schema e os paths Supabase atuais;
3. reverta código e `VELLORA_AUTH_PROVIDER`, `VELLORA_DATA_PROVIDER` e
   `VELLORA_STORAGE_PROVIDER` como uma unidade, no host publicado;
4. não exponha a chave administrativa e não a troque por uma chave pública;
5. execute o smoke Supabase quando os providers continuarem em Supabase;
6. se considerar `legacy`, confirme antes a compatibilidade real com D1/R2 e
   a disponibilidade dos dados. O fallback não é uma réplica automática dos
   dados Supabase; e
7. valide login, perfis, leitura autorizada, Storage e auditoria antes de
   encerrar o incidente.

Se não houver uma versão compatível com o schema atual, mantenha a aplicação
contida e faça uma correção forward-only. Não force rollback parcial que
misture Auth Supabase com dados legados.

## Contenção de incidentes

### Suspeita de credencial ou sessão comprometida

- interrompa provisionamento e deploys;
- revogue/rotacione a credencial comprometida no mecanismo oficial, sem colar
  o valor em logs;
- avalie sessões, usuários afetados e escopo de acesso nos logs do Auth;
- valide que a chave administrativa nunca foi publicada ao cliente; e
- registre somente identificadores anonimizados e acione o responsável por
  segurança/LGPD.

### Suspeita de exposição de banco ou Storage

- trate como incidente crítico e contenha o fluxo afetado;
- confirme bucket privado, policies, grants e URLs assinadas;
- preserve evidências sem baixar ou duplicar PHI;
- evite alterações ad hoc que destruam evidência; e
- escale ao owner, segurança e responsável LGPD para decisão de comunicação.

### Abuso de formulários ou rate limit

- preserve métricas agregadas por rota/janela;
- confirme Turnstile e a RPC de rate limit sem executar carga com dados reais;
- aplique a contenção aprovada no edge/host e monitore falsos positivos; e
- não desabilite RLS, rate limit ou policies como atalho.

### Indisponibilidade ou corrupção

- declare incidente, congele mudanças e avalie contenção de escrita;
- verifique Auth, Postgres, Storage, aplicação e Advisor na mesma janela;
- siga o procedimento de recuperação, sem prometer PITR/restauração; e
- só reabra após smoke, validação funcional segura e monitoramento reforçado.

## Critérios de escalonamento e encerramento

Escalone imediatamente quando houver suspeita de PHI exposta, acesso não
autorizado, credencial comprometida, perda/corrupção de dados, bucket público,
falha de RLS, indisponibilidade sustentada, novo erro crítico do Advisor,
rollback incompatível ou incapacidade de confirmar um ponto de recuperação.

Encerre somente depois de registrar causa provável, janela, impacto sem PHI,
contenção, validações, decisão de comunicação, limitações de RPO/RTO e ações
preventivas. O owner deve revisar o runbook após qualquer incidente material.
