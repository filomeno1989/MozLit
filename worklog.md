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
