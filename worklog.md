---
Task ID: 1
Agent: main
Task: Multi-categorias + Secções opcionais no livro

Work Log:
- Alterado schema Prisma: campo categoria → categorias (JSON array) + novos campos (ficha_tecnica, dedicatoria, epigrafe, epilogo)
- Actualizado /api/books (GET com filtro contains, POST com array + secções)
- Actualizado /api/books/[id] (GET/PATCH com categorias + secções)
- Actualizado /api/author (retorna categorias como array)
- Actualizado /api/books/by-author/[autorId] (categorias array)
- Actualizado /api/chapters/[id] (retorna secções do livro + isFirstChapter/isLastChapter)
- Reescrito NewBookPage: multi-categoria com tags + secções toggleáveis
- Reescrito AuthorDashboard: edição com multi-categoria + secções
- Actualizado HomePage: categorias extraídas de arrays, filtro funciona
- Reescrito BookDetailPage: badges multi-categoria + secções na lista de conteúdos
- Reescrito EReaderPage: secções pré-capítulo (ficha técnica, dedicatória, epígrafe) no primeiro capítulo, epílogo no último

Stage Summary:
- Build passa sem erros
- 9 testes de API passaram (criação, GET, PATCH, dashboard, filtro por categoria)
- Filtro por categoria funciona com JSON contains no SQLite
