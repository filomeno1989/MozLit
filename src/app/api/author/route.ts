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
    const totalGanhos = livros.reduce((sum, l) => {
      return sum + l.chapters.filter(c => !c.is_free).reduce((s, c) => s + c.preco_capitulo, 0);
    }, 0);

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { saldo_carteira: true, nome: true },
    });

    const transactions = await db.transaction.findMany({
      where: { userId: payload.userId, tipo: 'COMPRA', status: 'CONCLUIDO' },
      select: { valor: true, createdAt: true, descricao: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const livrosFormatados = livros.map((l) => ({
      id: l.id,
      titulo: l.titulo,
      categoria: l.categoria,
      status: l.status,
      totalCapitulos: l.chapters.length,
      capitulosPagos: l.chapters.filter(c => !c.is_free).length,
      receitaEstimada: l.chapters.filter(c => !c.is_free).reduce((s, c) => s + c.preco_capitulo, 0),
      createdAt: l.createdAt,
    }));

    return NextResponse.json({
      totalGanhos: user?.saldo_carteira ?? 0,
      totalLivros,
      totalCapitulos,
      livros: livrosFormatados,
      transacoes: transactions,
    });
  } catch (error) {
    console.error('Erro no dashboard do autor:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}