import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const livros = await db.book.findMany({
      where: { autorId: payload.userId },
      include: {
        chapters: {
          select: { id: true, preco_capitulo: true, is_free: true },
        },
        _count: { select: { chapters: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalLivros = livros.length;
    const totalCapitulos = livros.reduce((sum, l) => sum + l.chapters.length, 0);

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { saldo_carteira: true, nome: true, biografia: true, avatar_url: true },
    });

    // ===== GANHOS REAIS DO AUTOR =====
    // Antes: somava TODAS as compras da plataforma (número falso).
    // Agora: (1) soma as transacções VENDA registadas desde a implementação;
    //        (2) estima as vendas antigas (antes do registo VENDA) pelas
    //            aquisições existentes, ao preço actual, cortando na data da
    //            1ª VENDA para nunca contar duas vezes.
    const authorBookIds = livros.map((l) => l.id);
    const authorChapterIds = livros.flatMap((l) => l.chapters.map((c) => c.id));

    const vendas = await db.transaction.aggregate({
      where: { userId: payload.userId, tipo: 'VENDA', status: 'CONCLUIDO' },
      _sum: { valor: true },
    });
    let receitaReal = Number(vendas._sum?.valor ?? 0);

    // Preço de referência dos conteúdos do autor (capítulos pagos e livros)
    const precoCapitulo = new Map<string, number>();
    for (const l of livros) {
      for (const c of l.chapters) {
        if (!c.is_free && c.preco_capitulo > 0) precoCapitulo.set(c.id, c.preco_capitulo);
      }
    }
    const precoLivro = new Map<string, number>(
      livros.filter((l) => l.preco_total > 0).map((l) => [l.id, l.preco_total])
    );

    if (authorChapterIds.length > 0 || authorBookIds.length > 0) {
      const primeiraVenda = await db.transaction.findFirst({
        where: { userId: payload.userId, tipo: 'VENDA' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });
      const cortaEm = primeiraVenda?.createdAt ?? null;
      const compras = await db.libraryItem.findMany({
        where: {
          userId: { not: payload.userId },
          ...(cortaEm ? { createdAt: { lt: cortaEm } } : {}),
          OR: [
            ...(authorChapterIds.length > 0
              ? [{ chapterId: { in: authorChapterIds } }]
              : []),
            ...(authorBookIds.length > 0
              ? [{ bookId: { in: authorBookIds }, tipo: 'LIVRO_COMPLETO' }]
              : []),
          ],
        },
        select: { chapterId: true, bookId: true, tipo: true },
        take: 500,
      });
      for (const item of compras) {
        if (item.chapterId && precoCapitulo.has(item.chapterId)) {
          receitaReal += precoCapitulo.get(item.chapterId)!;
        } else if (item.tipo === 'LIVRO_COMPLETO' && item.bookId && precoLivro.has(item.bookId)) {
          receitaReal += precoLivro.get(item.bookId)!;
        }
      }
    }

    const transactions = await db.transaction.findMany({
      where: { userId: payload.userId, tipo: { in: ['COMPRA', 'VENDA'] }, status: 'CONCLUIDO' },
      // id e tipo são necessários no painel da carteira (chave e ícone por tipo)
      select: { id: true, tipo: true, status: true, valor: true, createdAt: true, descricao: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const livrosFormatados = livros.map((l) => ({
      id: l.id,
      titulo: l.titulo,
      categorias: JSON.parse(l.categorias || '[]'),
      capa_url: l.capa_url,
      status: l.status,
      faixa_etaria: l.faixa_etaria || 'Livre',
      volume_info: l.volume_info || null,
      preco_total: l.preco_total,
      ficha_tecnica: l.ficha_tecnica,
      dedicatoria: l.dedicatoria,
      epigrafe: l.epigrafe,
      epilogo: l.epilogo,
      totalCapitulos: l.chapters.length,
      capitulosPagos: l.chapters.filter(c => !c.is_free).length,
      receitaEstimada: l.chapters.filter(c => !c.is_free).reduce((s, c) => s + c.preco_capitulo, 0),
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      totalGanhos: receitaReal,
      totalLivros,
      totalCapitulos,
      biografia: user?.biografia ?? '',
      avatar_url: user?.avatar_url ?? '',
      livros: livrosFormatados,
      transacoes: transactions,
    });
  } catch (error) {
    console.error('Erro no dashboard do autor:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
