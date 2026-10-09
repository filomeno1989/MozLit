# Auditoria técnica MozLit — 2026-10-09

Branch de trabalho: `auditoria/seguranca-estabilidade` (main não foi alterada).
Âmbito: segurança (fase 1), estabilidade (fase 2), qualidade/descoberta (fase 3) e
preparação para dossiês gratuitos (fase 4). Todos os achados foram verificados
com leitura de código e, sempre que possível, reproduzidos em ambiente de teste.
Nenhum segredo é reproduzido neste relatório.

---

## 1. Resumo executivo

A plataforma está bem estruturada na camada de API (JWT com algoritmo fixo,
dupla verificação de papel nas rotas admin, rate-limit por grupos, sanitização
HTML com allowlist, compras de capítulo race-safe, aprovação de recargas
idempotente). Os maiores riscos actuais estão **fora do código**: a credencial
da base de dados esteve exposta no histórico git público e continua activa —
a sua rotação é a acção mais urgente de toda a auditoria. Em código, as
prioridades corrigidas nesta branch foram: verificação de idade no servidor,
endurecimento do diagnóstico de push, restrição de uploads editoriais,
protecção de senhas de administradores, débito admin atómico, auditoria de
acções administrativas e remoção da rede de segurança obsoleta
`ignoreBuildErrors`.

---

## 2. Achados — segurança

### 2.1 CRÍTICO (acção fora do repositório)

**C1. Credencial da base de dados exposta no histórico git público e AINDA ACTIVA.**
O commit `5b2c3ad` gravou o ficheiro `.env` com a `DATABASE_URL` real de produção
(Supabase, pooler eu-west-1). O repositório é público. Teste de reprodução
executado nesta auditoria: ligação directa com a credencial histórica ao
PostgreSQL 17.6 de produção — **aceite, como utilizador postgres**. Consequência:
qualquer visitante do GitHub pode ler e escrever todos os dados (utilizadores,
senhas com hash, saldos, recargas, comprovativos).

Passos de resolução (por ordem, só executáveis pelo dono da plataforma):
1. Supabase → Project Settings → Database → **Reset database password**.
2. Actualizar `DATABASE_URL` e `DIRECT_URL` nas Environment Variables da Vercel
   (Settings → Environment Variables) e fazer redeploy.
3. Definir `JWT_SECRET` explícito na Vercel (≥32 caracteres aleatórios;
   `openssl rand -hex 32`) — actualiza todos os tokens emitidos.
4. Opcional mas recomendado: limpar o `.env` do histórico (BFG Repo-Cleaner ou
   `git filter-repo`) e rodar o PAT do GitHub. Nota: mesmo sem limpeza do
   histórico, a rotação da senha invalida o vazamento.
5. Confirmar no Supabase que a tabela `users` e os buckets não têm políticas
   RLS permissivas para chaves anónimas fora do esperado (a API usa
   `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor).

### 2.2 Alto (corrigido nesta branch ou plano P1)

| ID | Achado | Estado |
|----|--------|--------|
| A1 | Compra de «livro completo» pode ser cobrada em dobro em corrida: a guarda é `findFirst` sem lock dentro da transacção e a unique `(userId, chapterId)` não cobre `chapterId: null` (PostgreSQL trata NULLs como distintos) — `library/route.ts` | **P1** — requer índice único parcial na BD (migração): `CREATE UNIQUE INDEX ... ON library_items(user_id) WHERE chapter_id IS NULL` |
| A2 | Comprovativos M-Pesa (telefone, titular, valor) num bucket público permanente, sem expiração nem apagamento (nem após rejeição da recarga) — `upload/route.ts` | **P1** — bucket `comprovativos` privado + URLs assinadas com validade; migração de objectos existentes |
| A3 | Papel confiado ao JWT de 7 dias nas rotas de escritor (`books`, `chapters`, `comments`, `author`): despromovido mantém poderes até 7 dias. As rotas `/api/admin/*` já revalidam na BD | **P1** — aplicar o padrão `papelActualNaBD` nas operações de escrita |
| A4 | Admin podia redefinir a senha de qualquer conta, incluindo outros ADMINs, sem auditoria (sequestro silencioso) | **CORRIGIDO** — senha de contas ADMIN só muda pela própria conta (`/api/conta` exige a senha actual); acções admin agora registadas em log |
| A5 | Bootstrap promove a conta mais antiga a ADMIN se a BD tiver ≤3 contas — janela de takeover em deploy fresco — `db.ts` | **P1** — exigir `ADMIN_USER_ID`/`ADMIN_EMAIL` e remover a promoção automática |

### 2.3 Médio

| ID | Achado | Estado |
|----|--------|--------|
| M1 | Idade mínima (13) verificada só na UI: pedido sem `dataNascimento` saltava o controlo — `auth/register` | **CORRIGIDO** — `validateDataNascimento` obrigatório no servidor |
| M2 | `/api/push/estado` aceitava token por query string (vazamento em logs/Referer) e não revalidava papel na BD | **CORRIGIDO** — só header `Authorization` + `verificarAdminActivo` |
| M3 | `/api/upload` aceitava LEITORES carregar `capa`/`capitulo` (abuso de storage público) | **CORRIGIDO** — capa/capítulo só ESCRITOR/ADMIN; comprovativo e avatar continuam abertos (leitores precisam do comprovativo para recargas) |
| M4 | Admin podia aprovar a própria recarga (sem separação de funções) | **P1** — bloquear `recarga.userId === payload.userId` na aprovação |
| M5 | Depósito MZN demo dependia de `NEXT_PUBLIC_DEMO_MODE` (visível ao cliente, fail-open) | **CORRIGIDO** — passa a `DEMO_MODE` (só servidor, fail-closed); UI mantém a variável pública apenas como cosmética |
| M6 | Esquema real mantido por DDL em runtime (`db.ts`, ~40 instruções `IF NOT EXISTS`) fora das migrações; sem `migration_lock.toml`; colunas/tabelas recentes sem migração | **P1** — consolidar em migrações versionadas; auto-reparação passa a rede de segurança, não fonte de verdade |
| M7 | Admin `creditar` não registava o actor; débito admin com check-then-act fora da transacção (saldo negativo possível em corrida) | **CORRIGIDO** — débito condicional atómico + log `[AUDIT]` com actor (coluna `processadoPor` na Transaction fica para P1) |
| M8 | Rate-limit em memória por instância e IP de `x-forwarded-for` (sem lockout por conta; ineficaz em múltiplas instâncias) | **P2** — considerar Upstash/Redis ou limite por conta em login |
| M9 | Sem limpeza de ficheiros órfãos no storage (capas substituídas, imagens, avatares, comprovativos ficam para sempre) | **P2** — job de limpeza ou remoção na eliminação de obras |

### 2.4 Baixo (corrigido nesta branch)

- Ids não-UUID produziam 500 do Prisma em `admin/recargas` (PATCH), `comments` (DELETE) e `chapters/reordenar` — agora 404 limpo com `ehUuid`.
- `capa_url` no POST de livros aceitava qualquer string `http*` — agora só https válido (mesma regra do PATCH); `avatar_url` do perfil aceitava qualquer string — agora só https válido.
- Rota raiz `/api` devolvia «Hello, world!» — removida (404 natural do Next).

### 2.5 Observações sem correcção imediata (aceites/documentadas)

- Enumeração de contas no registo (409 distingue telefone/email existentes): melhoria possível com mensagem genérica, ao custo de UX.
- `seed.ts` contém senhas de demonstração fixas — apenas para ambiente local; nunca correr contra produção.
- `android/app/google-services.json` commitado — configuração pública de cliente Firebase, prática normal para apps Android.
- JWT sem `jti`/revogação: logout não invalida tokens; mitigado pela validade de 7 dias e pela revalidação de papel nas rotas admin.

---

## 3. Achados — estabilidade (fase 2)

- **`tsc --noEmit`: 0 erros** (verificado antes e depois das correcções). O `typescript.ignoreBuildErrors: true` em `next.config.ts` era uma rede de segurança obsoleta → **removido**, e o `npm run build` completo foi executado com sucesso.
- **Testes automatizados**: não existia nenhum (0 ficheiros de teste; sem CI web). Criada suite vitest com 42 testes (ver §6). CI web sugerido no §8.
- **Migrações**: 3 migrações, sendo 2 manuais idempotentes; a verdade do esquema vive no DDL de runtime (`db.ts`). Plano P1 em §7.
- **Dinheiro em Float** (`saldo_carteira`, `preco_total`, `preco_capitulo`, `valorMzn`): MC é inteiro (bom), mas MZN em double precision acumula artefactos. Correcção estrutural (Decimal/centavos) fica para P1 com migração.
- Dependências mortas identificadas (P2): `next-auth`, `next-intl`, `recharts` (via `ui/chart.tsx` não importado), `framer-motion`, `react-syntax-highlighter`, `@tanstack/react-query`, `@tanstack/react-table`, `@reactuses/core`, `z-ai-web-dev-sdk`.
- `.zscripts/`, `examples/`, `download/`, `mini-services/` são resíduos de template da plataforma — P2.

---

## 4. Achados — qualidade e descoberta (fase 3)

- **SPA de rota única**: toda a app corre em `/` com troca de vista no cliente; obras e capítulos não têm páginas públicas próprias. Google só indexa o shell; partilhas no WhatsApp/Facebook mostram sempre o cartaz genérico.
- **Metadados**: `metadataBase`, title, description, OG e Twitter estáticos; `canonical` ausente; sem `generateMetadata` em todo o `src/`.
- **Sitemap/robots**: não existem `sitemap.ts`/`robots.ts`; `public/robots.txt` permite tudo sem `Sitemap:` e sem `Disallow: /api/` e `/apk/`.
- **Partilha**: Web Share API com fallback clipboard; URL partilhado é `/?obra=<id>` (query, não rota indexável).
- **Acessibilidade**: bom padrão geral de `aria-label`/`alt`/`lang`; faltam rótulos em botões-ícone (AuthorDashboard ~941/961/1080, EReaderPage ~937).
- **Desempenho**: Tiptap/Recharts não chegam à home (bom); ~20 `<img>` sem `next/image`; fontes com `display: swap`.

Plano P2 (§7): páginas públicas `/obra/[id]` com `generateMetadata` + JSON-LD, sitemap/robots, OG dinâmico por obra, `next/image` nas capas.

---

## 5. Preparação para dossiês gratuitos (fase 4)

Pré-requisito exigido — leitura pública sem autenticação e sem pagamentos — já
funciona para capítulos gratuitos (`GET /api/books` e `GET /api/chapters/[id]`
devolvem conteúdo sem token quando `preco_capitulo = 0` e status PUBLICADO, e a
sanitização HTML bloqueia scripts e imagens externas).

Arquitectura proposta (P3, sem implementar nesta fase):
- Modelos `Dossie` e `DossieCapitulo` (numerados, com `bibliografia`,
  `referencias_externas` e `data_revisao`), totalmente públicos, sem paywall nem
  transacções associadas.
- Rotas API de leitura pública (`/api/dossies`, `/api/dossies/[id]`) sem auth;
  edição restrita a ADMIN/ESCRITOR autorizado.
- Páginas estáticas/ISR `/dossie/[id]` com `generateMetadata` e `generateStaticParams`,
  alimentando também o sitemap (fase 3).
- A sanitização existente (`sanitizeConteudoHtml`) serve os dossiês sem alterações.

---

## 6. Testes executados — resultados reais

| Teste | Comando | Resultado |
|-------|---------|-----------|
| Tipos do projecto | `npx tsc --noEmit` | **exit 0 — 0 erros** (antes e depois das correcções) |
| Suite unitária | `npx vitest run` | **42/42 passaram** (2 ficheiros: `auth.test.ts` 11, `validate.test.ts` 31) |
| Build de produção | `npm run build` | **sucesso sem `ignoreBuildErrors`** (todas as rotas geradas) |
| Credencial histórica DB | ligação com a `DATABASE_URL` do histórico | **ACEITA** (PostgreSQL 17.6) — confirma C1 |
| Segredos na árvore actual | `rg` de padrões (ghp_, AKIA, sk-, chaves privadas) | **0 ocorrências** |
| Bundle de produção | inspecção dos chunks de mozlit.vercel.app | sem `NEXT_PUBLIC_DEMO_MODE` activo; headers HSTS/nosniff/DENY presentes |
| Histórico git | varrimento de patches por padrões de segredo | apenas o `.env` (C1); `tool-results/` limpo |

Os 42 testes cobrem: bcrypt (hash/verify/salt), JWT (round-trip, rejeição de
token adulterado e de assinatura estranha, extração do header Bearer), hierarquia
de papéis, validadores de email/senha/nome/telefone, os dois validadores novos
(`validateDataNascimento`, `validarUrlImagemSegura`), categorias, crédito admin,
depósito, recargas e sanitização de HTML (script, onclick, allowlist de estilos,
imagens externas vs. da plataforma). A suite corre sem base de dados; as rotas
API completas continuam exercitáveis pelo script manual `scripts/teste-e2e-conta.mjs`.

---

## 7. Plano priorizado

**P0 — feito nesta branch** (ver §8 para implantação): idade no servidor;
push/estado; upload editorial; senhas de admin; débito admin atómico; auditoria
de acções admin; ehUuid; https-only em capa/avatar; DEMO_MODE fail-closed;
rota Hello removida; `ignoreBuildErrors` removido; suite de testes; relatório.

**P1 — segurança e integridade (próxima iteração)**
1. **Rotação de credenciais (C1)** — responsabilidade do dono, passos em §2.1.
2. Índice único parcial para `LIVRO_COMPLETO` (A1) via migração versionada.
3. Bucket `comprovativos` privado + URLs assinadas + apagamento após decisão (A2, M9).
4. Revalidação de papel na BD nas escritas de escritor (A3).
5. Migrações versionadas consolidando o DDL de `db.ts`; remover promoção automática de admin (A5, M6).
6. Bloquear auto-aprovação de recargas (M4); coluna `processadoPor` na Transaction (M7).
7. MZN para centavos/Decimal (com migração).

**P2 — qualidade e descoberta**: páginas públicas de obra/capítulo com
`generateMetadata` e JSON-LD; sitemap/robots; OG dinâmico; `next/image`; rótulos
de acessibilidade; CI (lint + tsc + testes + build); limpeza de dependências e
pastas de template.

**P3 — conhecimento aberto**: modelos `Dossie`/`DossieCapitulo` conforme §5, com
leituras públicas, bibliografia e data de revisão.

---

## 8. Implantação desta branch

1. Rever o diff: `git diff main...auditoria/seguranca-estabilidade` (commits pequenos e independentes).
2. Verificar que a Vercel não tem `NEXT_PUBLIC_DEMO_MODE=true` (produção normal: nenhuma variável demo definida). Se o modo demo for necessário no futuro: definir `DEMO_MODE=true` (servidor) **e** `NEXT_PUBLIC_DEMO_MODE=true` (UI).
3. Fazer merge para `main` apenas após aprovação — a Vercel publica automaticamente a main (não foi feito automaticamente).
4. Depois do merge: executar a rotação de credenciais do §2.1 (independente do merge, mais urgente que ele).
5. Regressão manual sugerida: registo de nova conta (agora exige data de nascimento), upload de capa como escritor, compra de capítulo, aprovação de recarga como admin.

## 9. Ficheiros alterados nesta branch

| Ficheiro | Mudança |
|----------|---------|
| `src/lib/validate.ts` | + `validateDataNascimento`, + `validarUrlImagemSegura` |
| `src/lib/constants.ts` | + `URL_IMAGEM_MAX` |
| `src/app/api/auth/register/route.ts` | idade obrigatória no servidor |
| `src/app/api/push/estado/route.ts` | header-only + `verificarAdminActivo` |
| `src/app/api/upload/route.ts` | capa/capítulo restritos a ESCRITOR/ADMIN |
| `src/app/api/admin/utilizadores/route.ts` | SENHA bloqueada para contas ADMIN; logs de auditoria |
| `src/app/api/admin/creditar/route.ts` | débito atómico; log do actor |
| `src/app/api/admin/recargas/route.ts` | `ehUuid` no id |
| `src/app/api/comments/route.ts` | `ehUuid` no id |
| `src/app/api/chapters/reordenar/route.ts` | `ehUuid` nos ids |
| `src/app/api/books/route.ts` | capa_url só https |
| `src/app/api/author/profile/route.ts` | avatar_url só https |
| `src/app/api/wallet/route.ts` | `DEMO_MODE` só servidor (fail-closed) |
| `src/app/api/route.ts` | removida (Hello world) |
| `next.config.ts` | `ignoreBuildErrors` removido |
| `.env.example` | JWT_SECRET/DEMO_MODE/FCM/APP_URL documentados |
| `vitest.config.mjs`, `src/lib/__tests__/*` | nova suite (42 testes) |
| `package.json` | script `test` |
| `docs/AUDITORIA-2026-10-09.md` | este relatório |
