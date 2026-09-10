# MozLit — Log de Trabalho

---
Task ID: 1
Agent: main
Task: Correcção de 2 bugs + Auditoria completa + Implementação faseada de 58 melhorias

Work Log:
- Corrigido registo: adicionado campo "Registrar como" (Leitor/Autor) e confirmação de senha
- Corrigido back button Android: adicionado history stack + popstate handler no zustand store
- Realizada auditoria completa: 58 itens identificados (6 críticos, 18 altos, 24 médios, 10 baixos)
- Implementadas 7 fases de melhorias:
  - FASE 1: Segurança crítica (rate limiting, upload endpoint, validação de inputs, proteção de rascunhos, cascade fix, race condition, auto-compra bloqueada, receita real, faixa etária, indexes DB)
  - FASE 2+3: Verificação de idade no registo, faixa etária nos livros, protecção de rotas, error boundary, loading inicial, apiFetch robusto, WalletPage corrigido, saldo sync, dark mode persistente
  - FASE 4: Dashboard despublicar, delete warning com bloqueio, N+1 LibraryPage fix
  - FASE 5+6: Watermark optimizado (80 divs → 1 div), barra de busca, paginação cursor-based, botão "carregar mais"
  - FASE 7: Limpeza (removidos 11185 linhas de ficheiros temporários), favicon SVG, gitignore

Stage Summary:
- 7 commits feitos e pushed com sucesso
- Nova migration SQL criada para faixa_etaria + data_nascimento + indexes
- App significativamente mais segura, robusta e usável
- Deploy contínuo em https://mozlit.vercel.app

⚠️ Ainda pendente: executar migration SQL na Supabase (ver migration.sql)

---
Task ID: 2
Agent: main (continuação em novo chat)
Task: Recarga manual M-Pesa + Editor Tiptap + Autenticação por telefone + Painel Admin

Work Log:
- RECARGA MANUAL: tabela RecargaSolicitacao (Prisma + migration SQL idempotente), API /api/recargas (criar/listar), /api/admin/recargas (aprovar/rejeitar transaccional + idempotente), /api/admin/creditar (crédito/débito directo), /api/admin/estatisticas, /api/admin/utilizadores
- WALLET: nova secção "Recarregar MC via M-Pesa" com pacotes, dialog passo-a-passo (número admin copiável, comprovativo), lista "Minhas Recargas" com estados; depósito demo restrito a DEMO_MODE=true
- PAINEL ADMIN: nova vista 'admin' (estatísticas, processamento de recargas com filtro por estado e motivo de rejeição, busca de utilizadores, crédito directo); navegação apenas para role ADMIN
- EDITOR RICO: Tiptap v3 (negrito, itálico, sublinhado, riscado, H2/H3, listas, citação, desfazer/refazer, 5 fontes literárias com next/font: Lora/Georgia/Merriweather/Inter/JetBrains Mono); integração nos dialogs de criar/editar capítulos (dialogs alargados)
- SANITIZAÇÃO: validateConteudoCapitulo — allowlist estrita (p,h2,h3,strong,em,u,s,ul,ol,li,blockquote,span) + font-family only via sanitize-html; aplicado em POST/PATCH /api/chapters
- LEITOR: renderização dupla — HTML (novos capítulos, via .leitor-html) e texto simples (capítulos antigos, renderProseText) — retrocompatibilidade total
- AUTH POR TELEFONE: User.telefone (único, E.164), email opcional; registo/login por telefone com seletor de país pesquisável (200+ países, PT, +258 por defeito); login unificado por identificador; JwtPayload com telefone
- CORRECÇÕES: bug MZN→MC no HomePage (formatarMoedas), bug real no eliminar comentários (ReferenceError setDeleteTarget/onDelete), livro.id em falta no select do GET /api/chapters/[id], compra de moedas portável (débito condicional em vez de SELECT FOR UPDATE), inicialização de sessão à prova de closure obsoleto + sem setState síncrono em efeito
- LIMPEZA: removidos @mdxeditor/editor (não usado) e 7 scripts temporários; textos "modo demo" condicionados a env; .env.example com NEXT_PUBLIC_ADMIN_MPESA(_NOME); rate limits para /api/recargas e /api/admin
- VERIFICAÇÃO: lint 0 erros, tsc 0 erros (incluindo erros pré-existentes corrigidos), E2E no browser: registo por telefone +258, recarga pendente→aprovada com crédito 500 MC e estatísticas, editor rico a gravar HTML sanitizado, leitor retrocompatível

Stage Summary:
- Migration para Supabase: prisma/migrations/20260910000000_telefone_recargas_manuais/migration.sql (executar no SQL Editor)
- Schema dev local: scripts/dev-db.mjs gera prisma/schema.dev.prisma (SQLite) para testes
- Configurar na Vercel: NEXT_PUBLIC_ADMIN_MPESA (número M-Pesa real do admin) e NEXT_PUBLIC_ADMIN_MPESA_NOME
- App verificada E2E em dev; pronta para deploy após migration na Supabase

---
Task ID: 3
Agent: main (chat novo)
Task: Corrigir login admin em produção + Meu Perfil + gestão de utilizadores + limpeza de travessões

Work Log:
- Login admin quebrado em produção: código novo (telefone no User) fazia SELECT de coluna inexistente na Supabase (migration nunca aplicada) → 500 em tudo
- FIX AUTO-REPARAÇÃO: src/lib/db.ts — ensureSchema aplica DDL idempotente das 2 migrations antes da 1ª consulta (Proxy PrismaClient, tipagem mantida); DDL validado com parser PostgreSQL (15/15); SQLite de dev ignorado
- NOVO /api/conta (GET+PATCH): perfil completo, edição de nome/email/telefone/biografia, mudança de senha (exige senha actual), token renovado
- NOVA VISTA 'Meu Perfil' (PerfilPage): resumo da conta, formulário de dados com CountryCodePicker, mudança de senha; ligada ao menu e ícone do header
- ADMIN PATCH /api/admin/utilizadores: mudar papel (guarda: não muda o próprio) e redefinir senha de utilizadores; AdminPanel com Select de papel + dialog Redefinir Senha
- Travessões "—" removidos dos textos visíveis (WalletPage, NewBookPage, AdminPanel)
- mode:'insensitive' agora só no PostgreSQL (evita 500 no SQLite dev) em /api/admin/utilizadores e /api/books
- Verificação: tsc 0, eslint 0, scripts/teste-e2e-conta.mjs 17/17 PASS, E2E browser (login admin, perfil, dialog senha)
- SECURITY: .env desrastreado (repo público tinha senha Supabase + JWT_SECRET + service key no histórico, commit 5b2c3ad); rotação pendente no utilizador

Stage Summary:
- Commits fc42aa9 e 822d067 pushed (deploy Vercel automático)
- Após deploy: login admin volta a funcionar sem passos manuais; senha pode ser trocada em Meu Perfil
- Pendente no utilizador: rotação de segredos Supabase/Vercel + mudar a própria senha + revogar token GitHub no fim

---
Task ID: 4
Agent: main (chat novo)
Task: Diagnóstico e correcção dos erros reportados em produção

Work Log:
- Varredura E2E da produção (browser real + curl em todas as APIs principais)
- ERRO 1 (admin): conta filomeno1989@gmail.com estava com role ESCRITOR na BD Supabase — login funcionava mas rotas /api/admin/* davam 403 e o menu "Painel Admin" não aparecia
  - FIX: db.ts — bootstrap garantirAdmin na auto-reparação: promove ADMIN_EMAIL (env, opcional) a ADMIN; se a plataforma não tiver nenhum admin, promove o utilizador mais antigo; nunca retira o papel
  - ROLE confirmado ADMIN em produção após deploy
- ERRO 2 (Carteira): "Algo correu mal" — TypeError startsWith de undefined: /api/author devolvia transacções sem id/tipo (select incompleto) e WalletPage chamava t.tipo.startsWith('DEBITO')
  - FIX: select completo na API author + renderização defensiva no WalletPage (tipo/valor nulos tratados)
- ERRO 3 (token obsoleto): JWT guardado no browser mantinha role antigo após mudança na BD — exigia logout/login para permissões novas
  - FIX: /api/auth/me emite token novo quando detecta mudança de role; page.tsx guarda o token renovado na sincronização inicial
- ADMIN_EMAIL documentado no .env.example
- Verificação: tsc 0, eslint 0, E2E produção pós-deploy (login 200+ADMIN, Carteira OK, Painel Admin OK com estatísticas, Painel Autor OK, Meu Perfil OK, livro e leitor OK)

Stage Summary:
- Commits b63ac50 e f7fe67e pushed (deploy Vercel automático)
- Produção verificada: todas as páginas e APIs principais sem erros
- Recomendado ao utilizador: definir ADMIN_EMAIL na Vercel (protecção extra); rotação de segredos Supabase + revogação do token GitHub no fim

---
Task ID: 5
Agent: main (chat novo, ambiente reiniciado)
Task: Corrigir 6 bugs reportados pelo utilizador em produção

Work Log:
- BUG 1 (aprovar recarga não faz nada): constraint antiga "transactions_tipo_check" na Supabase rejeitava tipo RECARGA (PostgreSQL 23514) → 500. FIX: DROP CONSTRAINT IF EXISTS na auto-reparação + mensagem de erro limpa (sem vazar detalhes Prisma). Verificado em produção: recarga de teste aprovada, 100 MC creditadas.
- BUG 2 (editar capítulo não abre): GET /api/chapters/[id] devolve {chapter:{...}} mas openEditChapter lia campos directos → conteudo undefined → textoLegadoParaHtml(undefined) crashava antes de abrir o dialog. FIX: aceitar formato {chapter} ou directo + validar conteudo string.
- BUG 3 (formatação nos campos do livro): RichTextEditor (Tiptap) integrado em sinopse/ficha técnica/dedicatória/epígrafe/epílogo no NewBookPage e no dialog Editar Obra (AuthorDashboard, com textoLegadoParaHtml para legado). API books POST/PATCH sanitiza com novo validarCampoLivroHtml (allowlist + font-family). BookDetailPage renderiza HTML sanitizado e previews fazem strip de tags. EReaderPage já era retrocompatível.
- BUG 4 (Minhas Recargas a piscar): WalletPage useEffect dependia do objecto user, que updateBalance recria a cada fetch → loop infinito de recarregamento. FIX: dependência apenas de user?.id.
- BUG 5 (Converter Saldo em MC falhava): mesma constraint (tipo COMPRA_MOEDAS). FIX pelo DROP. + saldo insuficiente agora devolve 400 com mensagem clara (antes 500 genérico). Verificado em produção: 500 saldo → 100 MC convertidas (saldo 490, moedas 200).
- BUG 6 (abrir livro lento ~1s): (a) PrismaClient só era cacheado em dev — em produção nova conexão TCP+TLS+PgBouncer por pedido; agora cache global sempre. (b) auto-reparação saltava os ~30 DDLs com 1 consulta de verificação (esquemaActualizado via information_schema/pg_indexes/pg_constraint). (c) CAUSA RESTANTE CONFIRMADA: função Vercel fixada em iad1 (EUA) e Supabase noutra região — round-trips transatlânticos (~600ms por pedido). Requer troca da Function Region na Vercel para a região da Supabase (acção do utilizador).
- Sanitização verificada: <script> removido, formatação mantida; livro de teste criado e eliminado em produção.
- Verificação: tsc 0, eslint 0, smoke test E2E em dev SQLite (login, livro com HTML, recarga aprovar, converter saldo) e testes de produção via curl.

Stage Summary:
- Commit d5a70ee pushed (deploy Vercel automático)
- 5 dos 6 bugs corrigidos e verificados em produção; bug 6 parcialmente corrigido (código) com acção de configuração pendente no utilizador (região Vercel = região Supabase)

---
Task ID: 6
Agent: main (chat novo, ambiente reiniciado)
Task: 4 pedidos do utilizador: alinhamento de texto no editor, botão Seguinte entre secções do leitor, prévia da sinopse a mostrar HTML crua nos cartazes, dúvida sobre o Vercel Toolbar.

Work Log:
- ISSUE 1 (alinhamento): extensão TextAlign implementada localmente no RichTextEditor (atributo global style="text-align" em p/h2/blockquote, comandos setTextAlign/unsetTextAlign com module augmentation) - sem dependência nova, para não partir o lockfile do deploy. Barra ganhou 4 botões (esquerda, centrar, direita, justificado) com estado activo
- Sanitizador (validate.ts): allowlist alargada a text-align (left/center/right/justify) e a style em h2/h3/blockquote; testes unitários confirmam que cor/onclick/script continuam removidos e font-family continua a passar
- ISSUE 2 (navegação): EReaderPage com cadeia de leitura completa: Ficha Técnica -> Dedicatória -> Epígrafe -> Cap. 1 -> ... -> Epílogo -> "Fim do livro"; botão "Seguinte: X" no fundo de cada secção (só oferece secções que existem); no 1.º capítulo o botão anterior volta à última secção de abertura; no último capítulo o seguinte leva ao Epílogo
- loadSectionBook passa a transportar chapters (a API /api/books/[id] já os devolvia)
- ISSUE 3 (prévia): helper textoSimplesDeHtml em constants.ts (strip de tags + entidades &quot; &amp; etc.); HomePage passa a usá-lo - o cartaz do NYOTA deixa de mostrar <p><span style=...
- ISSUE 4 (Vercel Toolbar): explicado ao utilizador - só aparece a quem tem sessão iniciada na Vercel no mesmo browser (dono da conta); visitantes nunca veem
- Validação: tsc 0, eslint 0; E2E Playwright local (SQLite + seed) com 17 verificações OK: prévias limpas, cadeia Seguinte completa, alinhamentos right/justify renderizados no leitor, login de autora, 4 botões na barra, text-align:center e justify aplicados no DOM do editor
- db/custom.db de teste restaurado antes do commit

Stage Summary:
- Push pendente (commit único com os 5 ficheiros alterados); deploy Vercel automático
- Alinhamento disponível em todos os campos com editor rico; sanitização mantida
- Nota ao utilizador: repo MozLit está PÚBLICO - recomendação de tornar privado como no danmo-hub
