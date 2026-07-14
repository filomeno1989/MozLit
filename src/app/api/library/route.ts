import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const items = await db.libraryItem.findMany({
      where: { userId: payload.userId },
      include: {
        chapter: {
          include: {
            livro: { select: { id: true, titulo: true, capa_url: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Erro ao buscar biblioteca:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const body = await request.json();
    const { chapterId } = body;

    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId é obrigatório' }, { status: 400 });
    }

    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      include: { livro: { select: { autorId: true } } },
    });

    if (!chapter) {
      return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    }

    const alreadyPurchased = await db.libraryItem.findFirst({
      where: { userId: payload.userId, chapterId },
    });
    if (alreadyPurchased) {
      return NextResponse.json({ error: 'Já possui este capítulo' }, { status: 409 });
    }

    if (chapter.is_free) {
      await db.libraryItem.create({
        data: { userId: payload.userId, chapterId, bookId: chapter.livroId },
      });
      const user = await db.user.findUnique({
        where: { id: payload.userId },
        select: { saldo_carteira: true },
      });
      return NextResponse.json({ success: true, novoSaldo: user?.saldo_carteira ?? 0 });
    }

    const price = chapter.preco_capitulo;
    const buyer = await db.user.findUnique({
      where: { id: payload.userId },
      select: { saldo_carteira: true },
    });

    if (!buyer || buyer.saldo_carteira < price) {
      return NextResponse.json({ error: 'Saldo insuficiente. Carregue sua carteira.' }, { status: 402 });
    }

    await db.$transaction([
      db.libraryItem.create({
        data: { userId: payload.userId, chapterId, bookId: chapter.livroId },
      }),
      db.user.update({
        where: { id: payload.userId },
        data: { saldo_carteira: { decrement: price } },
      }),
      db.user.update({
        where: { id: chapter.livro.autorId },
        data: { saldo_carteira: { increment: price } },
      }),
      db.transaction.create({
        data: {
          userId: payload.userId,
          tipo: 'COMPRA',
          valor: price,
          status: 'CONCLUIDO',
          descricao: `Compra: ${chapter.titulo}`,
        },
      }),
    ]);

    const updatedBuyer = await db.user.findUnique({
      where: { id: payload.userId },
      select: { saldo_carteira: true },
    });

    return NextResponse.json({ success: true, novoSaldo: updatedBuyer?.saldo_carteira ?? 0 });
  } catch (error) {
    console.error('Erro na compra:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}