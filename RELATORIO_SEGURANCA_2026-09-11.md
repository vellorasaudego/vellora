# Relatório de segurança — Vellora Saúde

Data: 11/09/2026. Escopo: código local e observação não intrusiva de `https://www.vellorasaude.com.br/` na aba de produção já aberta.

## 1. Conclusão executiva

O projeto possui controles importantes: autenticação verificada no servidor, restrição por papel, regras de acesso por paciente, proteção contra abuso, validação de uploads e contratos com acesso controlado. Nos testes sem autenticação, as áreas privadas redirecionaram para o login e o endpoint de contratos negou acesso.

Há, entretanto, pontos que merecem correção prioritária: dependências com avisos de segurança, ausência de cabeçalhos defensivos na implantação Vercel, isolamento incompleto do Google Ads em relação ao login e possíveis falhas de confidencialidade/integridade nas permissões e na auditoria do banco descritas pelas migrations.

Não foi demonstrada invasão, vazamento de prontuários ou execução remota de código. Esta revisão não equivale a um pentest completo nem certifica que todas as superfícies estejam seguras.

## 2. Escopo, método e limitações

- Revisão de autenticação, autorização, APIs, providers, migrations, armazenamento, uploads, configuração de deploy, dependências e CI.
- Navegação real na aba de produção; inspeção de scripts presentes no documento, páginas públicas e redirecionamento para login.
- Requisições HTTP de leitura, sem credenciais, para páginas e um endpoint de contrato com identificador fictício.
- Execução de `npm audit --omit=dev --json` e `npm audit --json`; busca limitada de padrões de segredos nos arquivos versionados e em oito bundles referenciados pela página inicial.
- Base local: commit `80e9b2d`, acrescido de diversas alterações administrativas ainda não commitadas. Os achados do código local não comprovam que o mesmo código esteja implantado. A versão exata das dependências do deploy atual não foi obtida.
- Não houve login com conta de produção, submissão de formulários, criação de usuários, uploads, alteração/exclusão de registros, SQL, migrations, exploração de vulnerabilidades ou teste de carga.
- O conector Supabase disponível não apresentou o projeto utilizado pela Vellora. Portanto, RLS, grants, buckets, MFA, backups e configurações efetivamente aplicadas em produção não foram confirmados pelo painel ou banco. As conclusões sobre essas regras se apoiam no repositório.
- Não foram auditados todo o histórico Git, configurações privadas da organização Vercel/GitHub, recuperação de backups ou acesso entre contas reais de famílias e cuidadores.

Classificação usada: **produção confirmada**, **código/migrations** ou **risco condicionado à configuração**. Prioridades abaixo orientam correção; não são uma pontuação CVSS própria.

## 3. Medidas de segurança existentes

| Controle | Evidência e alcance |
| --- | --- |
| HTTPS e HSTS | HTTP redireciona para HTTPS; produção respondeu com `Strict-Transport-Security: max-age=63072000`. |
| Autenticação no servidor | `src/lib/supabase/auth.ts` verifica o usuário no Supabase Auth e consulta perfil ativo; não usa apenas informações fornecidas pelo navegador. |
| Autorização por papel | `src/lib/guard.ts` implementa `requireRole`; APIs administrativas examinadas exigem administrador. O papel vem do perfil no banco, não de metadados editáveis de cadastro. |
| Rotas privadas | `/admin`, `/familia` e `/cuidador` redirecionaram visitantes sem sessão para o login. Isso não substitui testes entre usuários autenticados. |
| RLS por vínculo | Migrations restringem linhas por administrador, família vinculada e cuidador ativo. As consultas comuns usam o cliente da sessão; operações privilegiadas usam cliente de serviço em pontos específicos. Aplicação real das policies não foi confirmada. |
| Proteção contra abuso | `src/lib/abuse-prevention.ts` contém limites distribuídos, identificadores derivados por hash, resposta 429 e bloqueio quando o limitador falha. Há Turnstile, honeypot e consentimento nos fluxos públicos. A interface de produção mostrou a verificação de segurança; ela não foi resolvida nem submetida. |
| Recuperação de senha | Callback verifica `token_hash`/recovery, restringe redirecionamentos e usa `no-store` e `no-referrer`. Nova senha tem validação de comprimento. O provider legado também implementa token aleatório com hash, expiração e uso único. |
| Uploads limitados | Fotos: limite de 3 MB, JPEG/PNG/WEBP e conferência de assinatura. Contratos: PDF até 4 MB com conferência de assinatura. Isso reduz abuso, mas não equivale a antivírus ou análise completa de conteúdo. |
| Contratos restritos | Endpoint verifica sessão e autorização por titular/papel; resposta privada, sem cache e com `nosniff`. A consulta anônima retornou 401. Migrations preveem armazenamento privado. |
| Segredos | Arquivos reais `.env` não aparecem entre os versionados consultados; exemplos são separados. A busca limitada não encontrou os padrões de chaves privadas examinados. Não comprova ausência de segredo em todo o histórico ou em todos os bundles. |
| Validação e testes | Há validação de dados, consultas SQL parametrizadas no provider legado e CI com typecheck, lint e testes. Há ressalvas sobre os caminhos de escrita direta e o build usado no CI. |

O provider legado usa bcrypt e cookie de sessão HttpOnly/SameSite. Esses controles não devem ser atribuídos automaticamente ao fluxo Supabase, que possui uma arquitetura de sessão diferente.

## 4. Achados prioritários

### SEG-01 — Dependências com avisos de segurança

**Prioridade: alta, com advisory crítico. Evidência: dependências locais; exploração em produção não demonstrada.**

O lockfile resolve Next.js `16.3.1` e sharp `0.35.3`. A auditoria sem dependências de desenvolvimento apontou duas entradas afetadas: Next.js classificado como crítico e sharp como alto. A auditoria completa apontou 37 entradas de dependências afetadas: 3 críticas, 24 altas e 10 moderadas. Esse total inclui cadeias de desenvolvimento e não significa 37 falhas independentes exploráveis no site.

Há aviso sobre processamento AVIF no caminho de otimização de imagens e outro específico para Next.js hospedado em Windows. O segundo não deve ser tratado como uma exploração comprovada na Vercel. O primeiro depende de alcançar o processamento vulnerável com uma imagem controlada pelo atacante; os uploads de registros examinados não permitem AVIF. Referências: [advisory Next.js/AVIF](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [advisory Next.js/Windows](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [advisory sharp](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c).

**Ação:** verificar a versão implantada e atualizar para versões corrigidas compatíveis — os avisos consultados indicam Next.js 16.3.3 e sharp 0.35.4 como referências de correção nessas linhas. Atualizar o lockfile, testar o build Vercel e revisar também dependências de desenvolvimento. Não aplicar `npm audit fix --force` indiscriminadamente.

Evidências locais: `package.json:26`, `package-lock.json`.

### SEG-02 — Cabeçalhos de proteção não chegam à Vercel

**Prioridade: alta de correção defensiva. Evidência: produção confirmada na home e no login.**

As respostas examinadas não incluem `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` ou `Permissions-Policy`. HSTS está presente.

O código adiciona parte desses cabeçalhos em `worker/index.ts:28`, mas esse wrapper pertence ao caminho Cloudflare, não ao `next build` usado na Vercel. A configuração Next/Vercel examinada não replica a proteção.

**Impacto:** falta defesa explícita contra enquadramento malicioso da página, além de camadas adicionais contra execução de scripts e vazamento de referências. Ausência de CSP não demonstra, por si só, uma falha de XSS. A diretiva `frame-ancestors` é o controle CSP específico de incorporação em frames. [Documentação MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

**Ação:** configurar os cabeçalhos no runtime efetivamente publicado e implantar CSP compatível com os scripts necessários, inicialmente em modo de relatório se necessário. Separar necessidades públicas, como Ads/Turnstile, das páginas privadas.

### SEG-03 — Google Ads permanece no documento ao navegar para o login

**Prioridade: alta para isolamento de privacidade. Evidência: produção confirmada; coleta de dados sensíveis não demonstrada.**

Na navegação pela própria interface da home para `/login`, permaneceram no documento scripts dos hosts `www.googletagmanager.com` e `googleads.g.doubleclick.net`.

`src/components/GoogleAdsTag.tsx:19` exclui rotas privadas, mas retornar `null` na linha 53 não desfaz um script já executado na navegação anterior. Não houve preenchimento de credenciais nem observação de envio de senha ou dados clínicos. Permanência do script significa que a separação pretendida não é garantida, não que o Google tenha recebido tais dados.

**Ação:** isolar de fato o contexto público do contexto autenticado, inclusive na navegação cliente. Uma nova fronteira de documento/layout deve impedir que o código de marketing atravesse para o login e painéis. Remover uma tag já executada não é suficiente. Revisar também a política de consentimento: o componente inicializa Ads sem consultar um estado de consentimento próprio.

### SEG-04 — “Observações internas” podem ser acessíveis a usuários vinculados

**Prioridade: alta. Evidência: código/migrations; configuração atual do banco não confirmada.**

O formulário identifica `patients.notes` como “Observações internas”, mas as migrations concedem leitura da tabela completa a `authenticated`, com RLS permitindo a linha para família e cuidador vinculados. Não há, nessas regras examinadas, restrição equivalente para esconder a coluna `notes` desses leitores.

**Impacto:** se essas permissões estiverem aplicadas, ocultar a informação na interface não impede uma consulta autenticada direta à API de dados para ler essa coluna da linha autorizada. Não se trata de acesso anônimo nem de acesso comprovado a pacientes sem vínculo. RLS controla linhas; campos confidenciais exigem controle adicional. [Documentação Supabase sobre RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

**Ação:** confirmar a intenção de confidencialidade e separar dados exclusivos do administrador, ou adotar privilégios/projeções seguros que não deixem a tabela-base exposta. Isso pode exigir mudança no banco e depende de consulta e autorização prévias.

Evidências: `src/components/admin/EditPatientForm.tsx:86`; migrations `20260827142537_db_01_supabase_foundation.sql:33,152` e `20260827164147_perf_01_rls.sql:152`.

### SEG-05 — Auditoria de registros pode ser contornada e apagada em cascata

**Prioridade: alta para integridade. Evidência: código/migrations; não testado por escrita em produção.**

As policies permitem ao cuidador ativo inserir/atualizar seus registros diretamente pela API de dados. A trilha de auditoria, porém, é inserida separadamente pelo código da aplicação, depois da atualização. Uma escrita direta permitida pelo RLS não passa por esse trecho nem pelos controles exclusivos da API da aplicação, como notificações e parte da validação.

Há um trigger que impede alterações indevidas do vínculo paciente/cuidador; ele não substitui um trigger de auditoria. Não foi identificado, nas migrations examinadas, mecanismo de banco que registre todas as alterações automaticamente.

Além disso, a função local `deleteRecord` faz exclusão física, e o vínculo dos eventos de auditoria com o registro usa `ON DELETE CASCADE`. A exclusão pode, portanto, eliminar também o histórico associado. Essa função faz parte das alterações locais ainda não commitadas; não foi confirmada sua publicação.

**Ação:** garantir escrita e auditoria transacionais no banco, com autoria confiável; considerar exclusão lógica e evento de exclusão preservado. Remover a seção “Histórico de alterações” da interface não exige remover a trilha técnica. A alteração visual anterior não apagou por si só os eventos existentes.

Evidências: `src/lib/supabase/data.ts:1579,1587,1616`; migration `20260827163652_db_02_domain.sql:179,253,324`. Mudanças de schema/policies exigem aprovação antes de execução.

## 5. Riscos adicionais e reforços recomendados

| Item | Evidência, condição e recomendação |
| --- | --- |
| Identificação de IP no limitador | `src/lib/abuse-prevention.ts:32` prioriza `cf-connecting-ip` sem verificar a origem Cloudflare. Se a Vercel encaminhar esse header controlado pelo cliente, o identificador de limite poderá variar. Não foi testado contorno, pois isso acionaria operações no limitador. Usar a origem de IP confiável da plataforma e combinar limites por conta e IP. |
| Proteção CSRF administrativa inconsistente | Rotas administrativas examinadas, incluindo `src/app/api/admin/contracts/route.ts:15`, verificam papel, mas não aplicam o mesmo controle de origem presente em outros fluxos. SameSite=Lax reduz ataques entre sites; não demonstra exploração geral. Padronizar validação de origem/Fetch Metadata ou token onde apropriado, inclusive nos uploads multipart. |
| Sessões Supabase e MFA | O código não configura explicitamente cookies mais restritivos e a biblioteca SSR usa padrões que permitem acesso por JavaScript, necessário em certas arquiteturas com cliente navegador. Isso não é automaticamente uma vulnerabilidade. Confirmar `Secure` em produção, duração de sessão e necessidade do cliente; não confundir persistência do cookie com validade do access token. Não há exigência explícita de MFA/AAL2 nos guards examinados: recomendar MFA para administradores e reautenticação em ações críticas. Configuração real do provedor não foi verificada. [Guia SSR Supabase](https://supabase.com/docs/guides/auth/server-side/advanced-guide). |
| Revogação após troca de senha | O fluxo tenta logout global com timeout, mas pode retornar sucesso após falha nessa etapa. A interface não deve garantir encerramento instantâneo de todos os acessos quando a revogação não foi confirmada. Revisar tempo de validade dos tokens e tratamento dessa falha. |
| CI diferente do deploy | `.github/workflows/ci.yml` executa `npm run build`, que usa vinext; a Vercel usa `npm run build:vercel`, que usa Next. Acrescentar o build efetivamente publicado e uma política de avaliação de dependências. O workflow examinado não possui etapa de auditoria de dependências. |
| Uso de cliente privilegiado | Alguns helpers de identidade usam cliente de serviço, que não deve depender apenas do bloqueio da interface. Reforçar autorização também na camada de acesso aos dados; não foi demonstrado bypass atual por esse caminho. |
| Backup, retenção e alertas | O runbook não comprova que backup/PITR e alertas estejam configurados. Validar com evidência e teste de restauração em ambiente separado; revisar retenção, destinatários de notificações e acesso aos logs. Ausência de confirmação não significa que não existam. |

## 6. Resultados observados em produção (baseline antes da correção)

| Verificação sem autenticação | Resultado |
| --- | --- |
| HTTP no domínio www | 308 para HTTPS |
| HTTPS no domínio sem www | 308 para o domínio www |
| Página inicial | 200; HSTS; sem os cabeçalhos defensivos listados em SEG-02 |
| Login | 200; cache privado/no-store; sem os cabeçalhos listados em SEG-02 |
| `/admin`, `/familia`, `/cuidador` | 307 para login com destino de retorno |
| Endpoint de contrato com UUID fictício | 401, mensagem de não autenticado |
| Home → login pela interface | Scripts de marketing permaneceram no documento |
| Formulário público de cuidado | Consentimento e verificação de segurança visíveis; envio não realizado |

O header CORS `*` na home pública não é evidência de exposição de dados privados. Nenhum teste deste relatório comprovou um acesso indevido entre contas autenticadas.

## 7. Ordem sugerida de tratamento

1. **Primeira prioridade:** confirmar/corrigir dependências do deploy, publicar cabeçalhos na Vercel e isolar marketing das páginas de acesso.
2. **Antes de ampliar o uso administrativo:** revisar no projeto Supabase correto a leitura de observações internas, os grants de escrita e a preservação da auditoria. Preparar proposta; não aplicar SQL sem autorização.
3. **Em seguida:** padronizar proteção de origem, IP confiável e MFA administrativo; alinhar CI com produção e incluir revisão de dependências.
4. **Validação em staging com dados fictícios:** testar matriz administrador/família/cuidador/anônimo, acesso entre pacientes, download de contratos, escrita direta, exclusão e auditoria, sessões revogadas e ausência de marketing no painel após navegação.
5. **Operação contínua:** confirmar backups e restauração, monitorar falhas de autenticação/autorização e revisar periodicamente dependências, acessos e retenção.

## 8. Remediações implementadas após o baseline

Nesta execução foram aplicadas correções somente no código/configuração local:

- Next.js e `eslint-config-next` atualizados para `16.3.3`; sharp para `0.35.4`.
- Cabeçalhos defensivos e CSP adicionados ao runtime Next/Vercel.
- CI alinhado ao `npm run build:vercel` e com auditoria de dependências de produção.
- Google Ads isolado das rotas privadas; os acessos públicos ao login usam navegação de documento completo e o componente limpa estado residual.
- Proteção centralizada contra sinais cross-site em mutações de `/api/admin`.
- Uso de `cf-connecting-ip` condicionado a configuração explícita e cookies Supabase com `Secure` em HTTPS/produção.
- Consultas de listas e detalhes do portal de família/cuidador passaram a usar projeção sem `patients.notes`.

Validação local final: `npm audit --omit=dev --audit-level=high` sem vulnerabilidades; typecheck, lint, **239 testes em 37 arquivos** e `npm run build:vercel` aprovados. O runtime Next local emitiu CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` na home, login e API protegida.

Essas correções ainda não estão comprovadas no domínio de produção porque não houve commit, push ou deploy nesta execução. Nenhum migration, SQL, dado de produção ou configuração remota foi alterado. Permanecem bloqueados até autorização: a policy/grant que impeça definitivamente a leitura de `patients.notes`, a auditoria transacional de `daily_records`, MFA administrativo e a validação das garantias de IP/backups no provedor.
