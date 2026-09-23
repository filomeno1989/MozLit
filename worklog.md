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

---
Task: Fase 7 seguimento — travessões zero, assinatura fixa do APK e primeiro build (23/09/2026)

Work Log:
- CORRECÇÃO: zero travessões "—" nas páginas legais (termos, privacidade) e nos ficheiros novos da Fase 7 (MainActivity, comentário do registo); frases reescritas em vez de só substituir o símbolo. NOTA: ainda existem "—" em COMENTÁRIOS de código antigo (invisíveis ao utilizador) de fases anteriores; varredura total disponível se o proprietário quiser.
- Token actualizado pelo proprietário (repo + workflow): workflow apk.yml EMPURRADO (commit 901ddca).
- Assinatura fixa configurada: keystore release gerado (2048 RSA, validade 10000 dias, alias mozlit), guardado nos segredos do GitHub (KEYSTORE_BASE64/KEYSTORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD via API, cifrado com a chave pública do repo); build.gradle assina o release quando a chave existe (nunca no repo); backup da chave + senha entregues ao proprietário (download/mozlit-chave-assinatura) — MANTER PARA SEMPRE, é a identidade da app.
- Workflow actualizado: restaura a chave dos segredos, compila assembleRelease ASSINADO, publica artefacto MozLit-apk.
- PRIMEIRO APK GERADO: run 35837582464, success, artefacto MozLit-apk 3.4 MB (app-release.apk); cópia local: download/mozlit-chave-assinatura/MozLit.apk. Verificado: certificado da nossa chave presente nos bytes do APK + bloco de assinatura v2/v3 presente. versionCode 1 / versionName 1.0.

Stage Summary:
- Fase 7 100% concluída: app Android assinada com chave permanente (actualizações futuras instalam por cima, sem desinstalar), construtor automático no Actions, termos/privacidade limpos no ar
- Actualizações de conteúdo do SITE chegam à app instalada SEM novo APK (a app é janela para a produção); novo APK só quando houver mudanças nativas (bump versionCode)

---
Task: Fase 7 fechamento — Release público v1.0.0 do APK (23/09/2026)

Work Log:
- O proprietário não encontrava o APK para download: os artefactos do GitHub Actions ficam escondidos (Actions > run > Artifacts, exige login no GitHub) e expiram em 30 dias. Solução definitiva: RELEASE do GitHub.
- APK descarregado do artefacto do run 35837582464 (app-release.apk, 3.76 MB) e verificado antes de publicar: bloco de assinatura v2/v3 PRESENTE; certificado CN=MozLit, O=MozLit, L=Maputo, C=MZ, válido até 2054; SHA-256 do certificado bate certo com a nossa chave.
- Release v1.0.0 criado via API (id 394466566, tag v1.0.0, aponta main): "MozLit 1.0.0 | App Android (APK)" com instruções de instalação em português no corpo.
- Asset MozLit.apk (3.9 MB) anexado ao release. Download DIRECTO sem login: https://github.com/filomeno1989/MozLit/releases/latest/download/MozLit.apk (verificado: 302 -> ficheiro, MIME application/vnd.android.package-archive).
- Backup da chave reforçado: LEIA-ME.txt criado em download/mozlit-chave-assinatura/ (o que é cada ficheiro, porque guardar, alias mozlit, validade 2054, segredos do repo). Senha no ficheiro testada com keytool: abre o keystore e o certificado corresponde ao APK publicado.

Stage Summary:
- Distribuição oficial: github.com/filomeno1989/MozLit/releases (link directo /releases/latest/download/MozLit.apk, pronto para WhatsApp)
- Futuras versões: bump versionCode em android + push -> Actions compila -> anexar novo APK a um release novo (v1.0.1, v1.1.0...)
- Chave de assinatura: copia nos segredos do GitHub + backup físico com o proprietário (download/mozlit-chave-assinatura)

---
Task: App Android v1.0.1 — 8 pontos do proprietário (23/09/2026)

Work Log:
- PONTO 1 (back saía da app): plugins @capacitor/app 8.1.1 + @capacitor/splash-screen 8.0.2 instalados. Módulo src/lib/app-nativo.ts: listener 'backButton' decide com o histórico interno da SPA (_history no store): navega para trás e SÓ sai (App.exitApp) quando está na raiz. Chamado no mount de page.tsx. Antes o Capacitor decidia sozinho e fechava quando o histórico do WebView esgotava.
- PONTO 2 (sem logo ML): CAUSA RAIZ encontrada: mipmap-anydpi-v26/ic_launcher.xml apontava o foreground ao PNG PADRÃO do Capacitor (boneco azul) e o background a branco; todos os Android 8+ mostravam isso. Correcção: scripts/corrigir_icone_adaptativo.py gerou ic_launcher_foreground.png (livro M|L creme, fundo transparente, zona segura 66dp) e ic_launcher_background.png (degradê âmbar) para mdpi..xxxhdpi; XMLs adaptativos actualizados para @mipmap/ic_launcher_background; cor de fallback #EE941E. Preview verificado visualmente.
- Splash: AppTheme.NoActionBarLaunch já apontava a @drawable/splash mas sem plugin nada mostrava. Com @capacitor/splash-screen (launchAutoHide 4s, CENTER_CROP, fundo âmbar) o splash com logo ML fica até a interface estar pronta (hide() chamado no mount, com fade).
- PONTO 4 + 7 (Beira + F. M. J. A.): NOVO keystore gerado: CN=MozLit, OU=MozLit, O=MozLit, L=Beira, ST=Sofala, C=MZ, RSA 2048, válido até 2054, alias mozlit. Segredos do GitHub actualizados via API (KEYSTORE_BASE64/KEYSTORE_PASSWORD/KEY_ALIAS/KEY_PASSWORD, PUT 204). Backup: download/mozlit-chave-assinatura (keystore + senha + cert + LEIA-ME actualizado; chave antiga Maputo arquivada em antiga-maputo/). Nova SHA-256: 3E:48:B3:3E:AD:EC:83:C6:0F:EB:CF:F1:9B:B7:BE:45:AD:F7:8C:B4:A5:E9:B4:3C:4A:10:86:DB:B0:50:8B:DD.
- PONTO 7 (assinatura visível): rodapé do AppShell ganhou linha "F. M. J. A." em itálico 11px discreto (visível no site e na app).
- PONTO 6 (versão visível): AppShell mostra "Aplicação v{versão}" no rodapé só dentro da app nativa (App.getInfo do plugin); no site fica oculto. build.gradle: versionCode 2, versionName "1.0.1".
- PONTO 3 (malicioso): explicado ao proprietário (aviso típico do Play Protect para APK fora da Play Store; mitigações: APK release assinado, zero permissões extra, distribuição crescente; solução definitiva = Play Store no futuro).
- PONTO 5 (updates por dentro): desenho entregue ao proprietário (endpoint /api/app/versao + secção nas definições + download via browser do sistema; implementação numa próxima fase).
- PONTO 8 (iOS): expectativa explicada (Apple Developer 99 USD/ano, Mac/Xcode ou CI, App Store/TestFlight, sem sideload; mesma base Capacitor).
- Validação: tsc 0 erros, eslint 0, next build OK. Commit 938cb6d empurrado; build do APK disparado (run #2, id 35844882826).

Stage Summary:
- ATENÇÃO: a v1.0.1 usa CHAVE NOVA (Beira): quem instalou a v1.0.0 (Maputo) precisa DESINSTALAR antes de instalar a v1.0.1; daqui para a frente as actualizações voltam a ser por cima, sem desinstalar.
- App v1.0.1: logo ML certo, splash com marca, back dentro da app, versão visível, assinatura do autor no rodapé.

---
Task: Release v1.0.1 publicado (23/09/2026)

Work Log:
- Build run #2 (id 35844882826) sucesso; APK descarregado do artefacto (3.75 MB).
- Verificações: ícones foreground ML presentes por comparação de pixels em todas as densidades; backgrounds âmbar presentes por hash; bytes do certificado Beira dentro do bloco de assinatura v2; certificado antigo Maputo ausente (correcto).
- Release v1.0.1 criado (id 394514746) com instruções de reinstalação obrigatória (chave mudou). Link /releases/latest/download/MozLit.apk passa a servir a v1.0.1 (content-length 3935589 confirmado, HTTP 200 sem login).
- Backup actualizado: download/mozlit-chave-assinatura/MozLit-1.0.1.apk.

Stage Summary:
- Distribuição: github.com/filomeno1989/MozLit/releases (latest = v1.0.1)
- Utilizadores da v1.0.0: desinstalar antes de instalar a v1.0.1 (única vez)

---
Task: App v1.0.2 — actualização por dentro + notificações alargadas (23/09/2026)

Work Log:
- ACTUALIZAÇÃO POR DENTRO: ficheiro estático public/app-versao.json como fonte da versão mais recente (versionCode 3, versionName 1.0.2, notas, urlApk fixa do release "latest" do GitHub). Módulo src/lib/actualizacao-app.ts: verificarActualizacao() compara App.getInfo().build (versionCode) com o ficheiro; abrirDownloadApk() usa @capacitor/browser (Chrome Custom Tabs) porque WebView não instala APKs por segurança.
- UI no menu (☰) do AppShell, bloco "Aplicação" (só na app nativa): mostra "Aplicação v{versão}", botão "Verificar actualizações", e quando há nova versão um cartão âmbar com notas e o botão "Descarregar actualização" + toast com instruções. Verificação silenciosa 5 s após abrir a app; toast só uma vez por sessão.
- NOTIFICAÇÕES: obra nova (transição RASCUNHO→PUBLICADO) passa a notificar TODOS os utilizadores (notificarTodosLeitores em src/lib/notificar.ts); capítulos novos continuam só para seguidores (evitar spam). Os restantes 8 tipos (comentário, resposta, recarga, venda, compra, etc.) já existiam da Fase 5.
- Push real do telefone (FCM): requer projecto Firebase criado pelo proprietário (gratuito) — instruções entregues; só depois do google-services.json é seguro instalar @capacitor/push-notifications (sem esse ficheiro a app crasha no arranque).
- build.gradle: versionCode 3, versionName "1.0.2" (mesma chave Beira: instala por cima da 1.0.1 sem desinstalar).
- Validação: tsc 0, eslint 0, next build OK. Commit 46f258f; build do APK run #3 (id 35848191297).

Stage Summary:
- Do utilizador que recebe por WhatsApp em diante, todas as versões futuras chegam POR DENTRO da app: menu ☰ > Aplicação > Descarregar actualização
- Obra nova = sino para toda a comunidade; capítulo = sino para seguidores

---
Task: Push FCM por tópicos — código completo, aguarda google-services.json (23/09/2026)

Work Log:
- Os dois ficheiros Firebase enviados pelo proprietário NÃO chegaram ao servidor (upload falhou; só imagens antigas no /upload). Decidido: o admin SDK key nem devia passar por aqui — vai directamente para as env vars da Vercel (FIREBASE_SERVICE_ACCOUNT_JSON), guiado ao proprietário. Só o google-services.json precisa de ser reenviado para integrar no APK.
- PLUGIN: o @capacitor/push-notifications oficial NÃO expõe subscribeToTopic (só nativo). Trocado por @capacitor-firebase/messaging 8.5.2 (capawesome) que tem subscribeToTopic/unsubscribeFromTopic. Web.js do plugin importa firebase/messaging (SDK JS): stub local src/stubs/firebase-messaging-stub.ts + turbopack.resolveAlias no next.config.ts (implementação web é lazy e nunca corre: no APK usa ponte nativa, no site push-app.ts sai antes do import).
- CLIENTE (src/lib/push-app.ts): estados inactivo/a_activar/activo/negado/indisponivel; activarPush() pede permissão (Android 13+), subscreve tópico «novas-obras» + sincroniza «autor-<id>» via GET /api/autor/seguidos (novo endpoint, take 100); seguirAutorTopicos() chamado em FeedPage e AuthorProfilePage (seguir/desseguir); tap na notificação navega (reader/book-detail/autor) espelhando o sino; notificationReceived vira toast com acção "Abrir"; arrancarPush() no iniciarAppNativo com atraso 4 s; preferência em localStorage (mozlit_push_pref), erro Firebase => estado 'indisponivel' com aviso para actualizar.
- UI: menu (☰) ganhou bloco "Notificações do telemóvel" (só nativo): interruptor + descrição por estado; desligar não afeta o sino interno.
- SERVIDOR (src/lib/push-firebase.ts): FCM HTTP v1 sem dependências novas (jsonwebtoken já existia): JWT RS256 da conta de serviço trocado por access token (cache até exp-2min), enviarPushTopico() nunca lança, título ≤120/corpo ≤240, TTL 24 h, lê FIREBASE_SERVICE_ACCOUNT_JSON (JSON puro ou base64, repara \n achatado). Ligado: books/[id] na transição RASCUNHO→PUBLICADO envia a «novas-obras»; chapters/route.ts em obra PUBLICADA envia a «autor-<autorId>».
- SEM versionCode bump: fica 3/"1.0.2" até o google-services.json chegar; aí bump para 4/"1.1.0" + public/app-versao.json + release. CI desta commit valida a compilação do plugin novo.
- Validação: tsc 0, eslint 0, next build OK (rota /api/autor/seguidos presente); travessões longos substituídos nos ficheiros tocados (regra tipográfica).

Stage Summary:
- Falta APENAS: google-services.json em android/app/ (reenvio) + FIREBASE_SERVICE_ACCOUNT_JSON na Vercel => bump v1.1.0 + build + release
- Arquitetura por tópicos: zero alterações na base de dados, zero tokens guardados, funciona sem login (obra nova chega a toda a comunidade)

---
Task: Release v1.1.0 publicado - push FCM activo (23/09/2026)

Work Log:
- google-services.json chegou do proprietário colado como texto (upload do gateway falhou); recriado em android/app/ (project_id mozlit, package mz.mozlit.app, api key AIzaSy...LWY). Committable: é config pública por desenho (vai dentro do APK de qualquer forma).
- AndroidManifest: meta-data default_notification_icon (@mipmap/ic_launcher) + default_notification_channel_id (mozlit_novidades). push-app.ts cria o canal com Importance.High, luz âmbar #EE941E e vibração.
- Bump: versionCode 4 / versionName "1.1.0" + public/app-versao.json anuncia a 4/"1.1.0" (Vercel confirma a servir).
- Verificações do APK (run #5, id 35860577135): google_app_id 1:92185545066:android:023d20c76e8d886f29bd13 presente no resources.arsc (google-services plugin fundiu a config), versionName 1.1.0 + canal + meta-data no manifest (UTF-16), APK Signing Block v2 com certificado Beira SHA-256 3E:48:...:8B:DD (match), 5304781 bytes.
- Release v1.1.0 criado (id 394641245) com instruções; /releases/latest/download/MozLit.apk serve a v1.1.0 (HTTP 200, 5304781 bytes sem login). Backup: download/mozlit-chave-assinatura/MozLit-1.1.0.apk.
- Novo diagnóstico admin: GET /api/push/estado (só ADMIN, aceita Authorization ou ?token=) devolve {configurado, projectId} e ?testar=TOPICO envia notificação de teste ao tópico.

Stage Summary:
- v1.1.0 = primeira versão com push FCM; updater da v1.0.2 passa a oferecer a 1.1.0 (primeiro teste real da actualização por dentro)
- Falta do lado do proprietário: FIREBASE_SERVICE_ACCOUNT_JSON na Vercel + Redeploy; verificar em /api/push/estado
