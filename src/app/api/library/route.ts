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
            livro: {
              select: {
                id: true,
                titulo: true,
                capa_url: true,
                autorId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Build unique books from purchases
    const bookMap = new Map<string, {
      id: string;
      titulo: string;
      capa_url: string;
      autorId: string;
      chapters: Array<{ id: string; titulo: string; livroId: string }>;
    }>();

    for (const item of items) {
      if (item.chapter?.livro) {
        const book = item.chapter.livro;
        if (!bookMap.has(book.id)) {
          bookMap.set(book.id, {
            id: book.id,
            titulo: book.titulo,
            capa_url: book.capa_url,
            autorId: book.autorId,
            chapters: [],
          });
        }
        if (item.chapterId) {
          bookMap.get(book.id)!.chapters.push({
            id: item.chapter.id,
            titulo: item.chapter.titulo,
            livroId: item.chapter.livroId,
          });
        }
      }
    }

    const fullBookItems = items.filter((i) => i.tipo === 'LIVRO_COMPLETO');
    const fullBookIds = new Set(fullBookItems.map((i) => i.bookId).filter(Boolean));

    return NextResponse.json({
      items,
      fullBookIds: Array.from(fullBookIds),
      books: Array.from(bookMap.values()),
    });
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
    const { chapterId, bookId } = body;

    // --- Full Book Purchase ---
    if (bookId && !chapterId) {
      const book = await db.book.findUnique({
        where: { id: bookId },
        include: {
          chapters: { select: { id: true, preco_capitulo: true, is_free: true } },
          autor: { select: { id: true } },
        },
      });

      if (!book) {
        return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
      }

      if (book.autorId === payload.userId) {
        return NextResponse.json({ error: 'Não pode comprar o seu próprio livro.' }, { status: 400 });
      }

      const alreadyOwns = await db.libraryItem.findFirst({
        where: { userId: payload.userId, bookId, tipo: 'LIVRO_COMPLETO' },
      });
      if (alreadyOwns) {
        return NextResponse.json({ error: 'Já possui este livro completo' }, { status: 409 });
      }

      const precoMzn = book.preco_total;
      if (!precoMzn || precoMzn <= 0) {
        return NextResponse.json({ error: 'Preço inválido para o livro' }, { status: 400 });
      }

      // Converter preço MZN para moedas
      const precoMoedas = Math.round(precoMzn * 10);

      const buyer = await db.$queryRaw<Array<{ moedas: number; id: string }>>`
        SELECT id, moedas FROM profiles WHERE id = ${payload.userId} FOR UPDATE
      `;

      if (!buyer[0] || buyer[0].moedas < precoMoedas) {
        return NextResponse.json({ error: 'Moedas insuficientes. Compre moedas na carteira.' }, { status: 402 });
      }

      await db.$transaction([
        db.libraryItem.create({
          data: { userId: payload.userId, bookId, tipo: 'LIVRO_COMPLETO' },
        }),
        db.user.update({
          where: { id: payload.userId },
          data: { moedas: { decrement: precoMoedas } },
        }),
        db.user.update({
          where: { id: book.autorId },
          data: { moedas: { increment: precoMoedas } },
        }),
        db.transaction.create({
          data: {
            userId: payload.userId,
            tipo: 'COMPRA',
            valor: precoMzn,
            status: 'CONCLUIDO',
            descricao: `Livro completo: ${book.titulo} (${precoMoedas} MC)`,
          },
        }),
      ]);

      const updatedBuyer = await db.user.findUnique({
        where: { id: payload.userId },
        select: { moedas: true },
      });

      return NextResponse.json({ success: true, novoSaldoMoedas: updatedBuyer?.moedas ?? 0 });
    }

    // --- Chapter Purchase ---
    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId ou bookId é obrigatório' }, { status: 400 });
    }

    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      include: { livro: { select: { autorId: true, id: true, titulo: true } } },
    });

    if (!chapter) {
      return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    }

    if (chapter.livro.autorId === payload.userId) {
      return NextResponse.json({ error: 'Não pode comprar o seu próprio capítulo.' }, { status: 400 });
    }

    const alreadyPurchased = await db.libraryItem.findFirst({
      where: {
        userId: payload.userId,
        OR: [
          { chapterId },
          { bookId: chapter.livroId, tipo: 'LIVRO_COMPLETO' },
        ],
      },
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
        select: { moedas: true },
      });
      return NextResponse.json({ success: true, novoSaldoMoedas: user?.moedas ?? 0 });
    }

    const precoMzn = chapter.preco_capitulo;
    const precoMoedas = Math.round(precoMzn * 10);

    const buyer = await db.$queryRaw<Array<{ moedas: number; id: string }>>`
      SELECT id, moedas FROM profiles WHERE id = ${payload.userId} FOR UPDATE
    `;

    if (!buyer[0] || buyer[0].moedas < precoMoedas) {
      return NextResponse.json({ error: 'Moedas insuficientes. Compre moedas na carteira.' }, { status: 402 });
    }

    await db.$transaction([
      db.libraryItem.create({
        data: { userId: payload.userId, chapterId, bookId: chapter.livroId },
      }),
      db.user.update({
        where: { id: payload.userId },
        data: { moedas: { decrement: precoMoedas } },
      }),
      db.user.update({
        where: { id: chapter.livro.autorId },
        data: { moedas: { increment: precoMoedas } },
      }),
      db.transaction.create({
        data: {
          userId: payload.userId,
          tipo: 'COMPRA',
          valor: precoMzn,
          status: 'CONCLUIDO',
          descricao: `Compra: ${chapter.titulo} (${precoMoedas} MC)`,
        },
      }),
    ]);

    const updatedBuyer = await db.user.findUnique({
      where: { id: payload.userId },
      select: { moedas: true },
    });

    return NextResponse.json({ success: true, novoSaldoMoedas: updatedBuyer?.moedas ?? 0 });
  } catch (error) {
    console.error('Erro na compra:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}