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

---
Task ID: 7
Agent: main (chat novo, ambiente reiniciado)
Task: Corrigir crash do perfil público de autor + varredura de melhorias e correcções + proposta da Fase 5

Work Log:
- BUG REPORTADO (perfil do escritor dá "Algo correu mal"): BookCard lê book.autor.nome (aria-label e parágrafo do autor) mas GET /api/autor/[id] devolvia as obras SEM o objecto autor → TypeError em render → ErrorBoundary. FIX: API passa a devolver autor: {id, nome} em cada obra (mesmo formato de /api/books) + BookCard defensivo (book.autor?.nome || 'Autor desconhecido'). Verificado E2E: perfil renderiza, Seguir/Deixar de seguir idempotente
- VARREDURA (2 auditorias paralelas: rotas API + componentes, 26+ ficheiros cruzados com schema):
  - ALTO — DELETE /api/chapters/[id] apagava capítulo COMPRADO (LibraryItem ia em cascade, leitores perdiam conteúdo pago): agora devolve 409 e empurra para arquivar (igual ao DELETE de livros)
  - ALTO — /api/author: $queryRaw com IN (${ids.join(',')}) virava UM parâmetro → capitulosVazios sempre 0 em PostgreSQL, checklist de publicação mentia: substituído por Prisma.join(idsLivros)
  - Classe de 500s "invalid input syntax for uuid" eliminada: helper ehUuid() em validate.ts aplicado em books/[id] (GET/PATCH/DELETE), books (cursor), books/by-author, chapters/[id] (GET/PATCH/DELETE), chapters (livroId), comments (chapterId/parentId), library (bookId/chapterId), admin/utilizadores, admin/creditar (userId), admin/recuperacoes
  - PATCH books/[id]: whitelist de status (RASCUNHO/PUBLICADO), preço 0..PRECO_TOTAL_MAX (negativo "imprimia" MC), capa_url https, checklist de publicação valida a sinopse NOVA quando o PATCH a traz
  - library POST: débito condicional portável (updateMany com moedas gte) substitui SELECT ... ::uuid FOR UPDATE (sintaxe PostgreSQL-only que rebentava em dev/SQLite); P2002 em corrida devolve 409 "Já possui" em vez de 500
  - wallet: depósito MZN agora em $transaction (saldo e auditoria sobem juntos); comprar-moedas exige inteiro e tecto MOEDAS_MAX
  - Race conditions de fetch com token de pedido (pedidoActual/pedidoHome/pedidoLeitor/pedidoPerfil) em BookDetailPage (loadBook+loadPurchased), HomePage, EReaderPage (loadChapter+loadSectionBook) e AuthorProfilePage — respostas obsoletas são ignoradas
  - store/app.ts: pushState só quando a entrada entra no _history (Voltar "não fazia nada" à 1.ª vez); popstate mantido para back Android
  - HomePage: allBooks acumula no "Carregar mais" (categorias de páginas seguintes ficavam sem chip)
  - WalletPage: falha de carregamento mostra erro + "Tentar novamente" (não mais "Nenhuma transacção" enganador); copiarNumero com .catch; botão Solicitar usa estado certo (disabled={!recargaCustom})
  - AppShell: poll de notificações com semRedirecionar (apiFetch FetchOptions) — sessão expirada a meio da leitura já não expulsa o leitor para o login
  - LibraryPage: secção "Livros Completos" só mostra obras com pack completo comprado (badge "Completo" falso removido); contagem de capítulos diz "capítulos comprados" / "Livro completo adquirido"
  - EReaderPage: secção do viewParams validada contra SECTION_LABELS (progresso corrompido não rebenta o render); BookDetailPage sem bookId deixa de mostrar skeleton infinito; purchaseError morto agora é usado no catch de executePurchase
  - AuthorDashboard: pré-checagem de eliminar (chamava /api/library — biblioteca do PRÓPRIO autor) removida; CommentsSection ternário duplicado simplificado; AdminPanel separa carga inicial do efeito do filtro (sem pedidos duplicados)
- schema.dev.prisma regenerado: dev SQLite ficou sem as relations/indexes da Fase 4 (seguidores, @@index) — agora em sincronia com o schema principal
- Validação: tsc 0 erros, eslint 0 erros; E2E browser (dev SQLite + seed): perfil de autor OK, seguir/deixar OK, compra "insuficiente" com 400 amigável, conversão 50 MZN→500 MC OK, compra de capítulo OK (Maria −30 MC, Mia +15 MC, LibraryItem + transacções corretas), leitor renderiza, biblioteca classifica certo, painel admin com estatísticas corretas (485 MC em circulação), sem erros no console nem no dev.log

Stage Summary:
- Commit pushed → deploy Vercel automático
- Crash do perfil do autor corrigido (causa raiz + defesa em BookCard)
- 20+ correcções da varredura implementadas; pendentes documentadas: revalidação de papel ESCRITOR na BD nas rotas de escrita (janela de 7 dias do JWT), custo duplo LIVRO_COMPLETO com capítulos já comprados, rate limit em memória (multi-instância Vercel), região da função Vercel = região Supabase (acção do utilizador)
- Fase 5 proposta ao utilizador: Social & Descoberta (seguir feed de autores, notificações in-app, partilha de trechos, obras relacionadas, busca avançada)

---
Task ID: 8
Agent: main (chat novo, ambiente reiniciado)
Task: Fase 5 — Social & Descoberta (itens 24-28) + correção crítica do débito duplo

Work Log:
- CORRECÇÃO CRÍTICA DESCOBERTA DURANTE A FASE 5: library POST debitava o comprador EM DOBRO desde a varredura aae8e38 — o updateMany condicional novo e o update() antigo ficaram os dois na transação. O E2E antigo ("Maria −30, Mia +15") registou o bug por engano como "comissão". Fix: débito único (updateMany só). Verificado: capítulo de 30 MC debita exactamente 30.
- JUSTIÇA DE PREÇO (pendente documentada da varredura): LIVRO_COMPLETO desconta o preço dos capítulos pagos já adquiridos (precoCobrado + desconto na resposta; dialog mostra o desconto; pack gratuito se o desconto cobrir tudo). Verificado: pack de 100 com cap de 30 pago cobra 70.
- ITEM 24 Notificações in-app: model Notificacao + DDL auto-reparação (esquemaActualizado 22→24 índices) + migration 20260922000000_notificacoes; src/lib/notificar.ts (notificar/notificarSeguidores, nunca lançam); hooks em seguir (SEGUIDOR_NOVO), books PATCH (OBRA_NOVA só na transição RASCUNHO→PUBLICADO), chapters POST em obra publicada (CAPITULO_NOVO), comments POST (COMENTARIO ao autor da obra + RESPOSTA ao dono do comentário pai — capturado como donoDoPai porque "parent" no escopo global é window.parent), admin/recargas PATCH (RECARGA). /api/notificacoes GET+?contagem=1+PATCH. AppShell: sino com badge 9+, painel Sheet com ícones por tipo e navegação ao clique, poll de contagem 30s (semRedirecionar).
- ITEM 25 Feed "A Seguir": /api/feed (obras+capítulos dos seguidos intercalados por data, sugestões = mais seguidos + escritores activos, excluindo já seguidos); FeedPage (timeline, sugestões com Seguir em linha, estados vazios, visitantes veem sugestões); nav "A Seguir" para todos.
- ITEM 26 Partilha: leitor com botão "Partilhar trecho" nas duas vistas (excepção controlada ao DRM: select-text condicional, captura mouseup/touchend, 10..600 chars, barra fixa Copiar/Partilhar, Web Share API + fallback clipboard, atribuição sempre); BookDetail "Partilhar" (link /?obra=ID) + deep-link no arranque (page.tsx).
- ITEM 27 Obras relacionadas: /api/books/[id]/relacionadas (mesmo autor → género → recentes, max 6, só PUBLICADO); secção na BookDetailPage com BookCard + skeletons.
- ITEM 28 Busca avançada: /api/books search também em categorias (JSON string contains), ordenar=recentes|antigos|preco_asc|preco_desc|titulo, total na resposta; HomePage com select de ordenação, contagem de resultados, título "Resultados para «termo»", estado vazio com Limpar filtros.
- schema.dev.prisma regenerado + prisma generate + db push no SQLite dev (file:/home/z/my-project/db/custom.db — DATABASE_URL absoluto contorna a resolução relativa).
- Validação: tsc 0, eslint 0 (setState síncrono no efeito do FeedPage corrigido para padrão do repo); E2E API: seguir→SEGUIDOR_NOVO, publicar→OBRA_NOVA a Maria e Mia, comentário→COMENTARIO, resposta→RESPOSTA, compra 30 MC exactos (débito único), pack 70/30 desconto, saldo insuficiente 400, auto-seguir 400, busca "Poesia"→1, ordenações (40→50→60→75; título A–Z), relacionadas→4, deep-link; E2E browser: feed anon (sugestões)/logado (timeline), sino com badge, clique em notificação navega (capítulo rascunho → erro limpo), modo trecho com selecção (mín. 10 chars respeitado) e Copiar, Partilhar obra, ordenação UI, deep-link /?obra=, mobile 390px sem overflow horizontal; console sem erros.
- Nota: autor não consegue comentar o próprio capítulo pago (acesso só via LibraryItem) — comportamento pré-existente, documentado como candidata à Fase 6.

Stage Summary:
- Commit d8c2146 pushed → deploy Vercel automático; produção verificada (/api/feed com sugestões reais, total na resposta de books)
- Débito duplo eliminado: o dinheiro dos leitores volta a valer exactamente o preço
- Auto-reparação criará "notificacoes" na Supabase na 1.ª consulta após o deploy
- Pendentes mantidas: revalidação de papel ESCRITOR nas rotas de escrita, rate limit multi-instância, região Vercel = Supabase (acção do utilizador)

---
Task ID: 9
Agent: main (chat novo, ambiente reiniciado)
Task: Fase 6 — Blindagem da Obra (itens 29-31) + varredura de fecho profissional

Work Log:
- DECISÃO DO PROPRIETÁRIO: a partilha de trechos (item 26) foi REJEITADA por risco de plágio — a política passa a ser protecção máxima, com marca d'água como dissuasor.
- ITEM 29 — Partilha de trechos REMOVIDA: modoTrecho/barraTrecho/capturarSelecao/copiarTrecho/partilharTrecho eliminados por completo do leitor; DRM estrito nas duas vistas (select-none permanente, sem onCopy/onCut/onDragStart com excepções). MANTIDA apenas a partilha de obra na BookDetail (Web Share do LINK público /?obra=ID + título/autor — não expõe texto nenhum).
- ITEM 30 — Marca d'água forense reforçada: componente MarcaAgua nas duas vistas do leitor (capítulo E secções de abertura/epílogo, que antes só tinham riscas); padrão diagonal 24x4 com NOME do leitor + e-mail MASCARADO (le•••@dominio) + DATA/HORA; opacidade das marcas subida de 0.045-0.05 para 0.07-0.08 (visível na captura, confortável na leitura); recalculada por sessão do leitor.
- ITEM 31 — Anti-captura best-effort: ofuscação automática blur(20px) + aviso "Conteúdo protegido" quando a janela perde foco/muda de aba (visibilitychange+blur/focus) — pré-visualizações do alternador de apps ficam cegas; PrintScreen esvazia a área de transferência ("Conteúdo protegido..."); Cmd+Shift+4/5 (macOS) e Cmd+U bloqueados; impressão já bloqueada globalmente (@media print) mantida; selo "Protegido" no topo do leitor com tooltip dissuasor (desktop).
- VARREDURA DE FECHO: bug "MC MC" no paywall corrigido (formatarMoedas já inclui "MC" — 4 ocorrências no leitor); aviso de acessibilidade Radix DialogContent (aria-describedby) silenciado globalmente na base ui/dialog.tsx (chamadas com descrição real sobrepõem).
- Validação: tsc 0, eslint 0; E2E API 15/15 (registo autor+leitor, obra com cap. grátis + pago 30 MC publicada, cap. grátis 200 com conteúdo, cap. pago 403 paywall SEM vazamento de texto + preço certo, feed, notificações, busca, relacionadas); E2E browser: leitor sem botão de partilha, marca d'água visível no screenshot (Leitor Browser · MozLit / le•••@test.mz · 23/09/2026), selo Protegido, user-select none, blur(20px)+aviso ao perder foco, paywall "30 MC" singular, consola sem erros.
- Ambiente dev reconstruído (repo recolonizado do GitHub; schema.dev.prisma SQLite + db/custom.db mantidos).

Stage Summary:
- Commit pushed → deploy Vercel automático
- Leitor blindado: sem cópia, sem selecção, sem partilha de texto; quem capturar o ecrã expõe a própria conta (nome + contacto mascarado + data/hora) em toda a leitura
- Nota honesta ao proprietário: nenhuma app web consegue impedir 100% uma captura ao nível do sistema operativo — a estratégia escolhida (marca d'água + ofuscação + bloqueio de teclas/impressão) é o máximo exequível no browser e identifica quem vazar
- Follow-ups pós-lançamento: renomear middleware.ts→proxy.ts (Next 16, aviso de deprecação nos logs), revalidação de papel ESCRITOR nas rotas de escrita, rate limit multi-instância, região Vercel = Supabase (acções do utilizador)

---
Task: Fase 7 — App Real & Lançamento (itens 32-35)
Data: 23/09/2026

Work Log:
- ITEM 32 — Termos de Utilização (/termos) e Política de Privacidade (/privacidade): rotas reais fora da SPA (cabeçalho próprio "Voltar ao MozLit", indexáveis, prontas para Google Play). Conteúdo adaptado ao contexto moçambicano: MC/MZN, comprovativos validados pela administração, direitos de autor do autor PRESERVADOS (licença não-exclusiva só para exibir na plataforma), plágio = violação mais grave, marca d'água forense transparente na privacidade (secção 3), idade mínima 13, terceiros (Vercel/Supabase), lei da República de Moçambique.
- Consentimento: checkbox OBRIGATÓRIA no registo ("Li e aceito os Termos... e a Política de Privacidade") com validação no submit; nota de aceitação no login; links Termos|Privacidade no footer do AppShell.
- ITEM 33 — App Android nativa via Capacitor 8.5.2: mz.mozlit.app / "MozLit", carrega a produção (server.url https://mozlit.vercel.app, httpsScheme), minSdk 24 (Android 7+), target 36, permissão INTERNET apenas. Ícone 1024 recriado fielmente (livro creme M|L sobre âmbar degradê) + splash 2732 com logótipo e tagline; capacitor-assets gerou 38 assets (adaptativos dia/noite, todas as densidades).
- ITEM 34 — FLAG_SECURE no MainActivity: capturas de ecrã e gravação bloqueadas AO NÍVEL DO SISTEMA OPERATIVO (ecrã preto em qualquer tentativa; miniatura do multitarefa cega). A promessa de protecção levada ao limite — impossível no browser, nativo consegue.
- ITEM 35 — Workflow .github/workflows/apk.yml criado LOCALMENTE mas NÃO EMPURRADO: PAT do utilizador só tem scope "repo", o GitHub recusa criar ficheiros de workflow sem scope "workflow" (push rejeitado com "refusing to allow a Personal Access Token to create or update workflow"). Ficheiro pronto em .github/workflows/apk.yml (untracked); assim que o token tiver workflow scope, commit+push e o APK compila a cada push do projecto nativo.
- Commits: e638609 (fase 7 sem o workflow) pushed → deploy Vercel automático; /termos e /privacidade verificados em produção (200 + conteúdo).

Stage Summary:
- Termos e Privacidade NO AR; consentimento legal no registo; app Android nativa pronta com FLAG_SECURE
- PENDENTE DO UTILIZADOR: adicionar scope "workflow" ao PAT (ou colar o workflow via UI do GitHub) → desbloqueia o build automático do APK (MozLit-apk nos artefactos do Actions)
- Para Google Play no futuro: conta de developer ($25) + release assinada (agora distribui-se o debug APK por download directo)
