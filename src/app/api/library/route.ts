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

    // CORRECÇÃO: livros comprados COMPLETOS não têm chapterId, por isso nunca
    // entravam no bookMap — a secção "Livros Completos" da Biblioteca ficava
    // vazia para quem comprava o pack. Vamos buscá-los directamente.
    const fullBookItems = items.filter((i) => i.tipo === 'LIVRO_COMPLETO');
    const fullBookIds = Array.from(
      new Set(fullBookItems.map((i) => i.bookId).filter(Boolean) as string[])
    );
    const missingFullBooks = fullBookIds.filter((id) => !bookMap.has(id));
    if (missingFullBooks.length > 0) {
      const livrosCompletos = await db.book.findMany({
        where: { id: { in: missingFullBooks } },
        select: { id: true, titulo: true, capa_url: true, autorId: true },
      });
      for (const b of livrosCompletos) {
        bookMap.set(b.id, { ...b, chapters: [] });
      }
    }

    return NextResponse.json({
      items,
      fullBookIds,
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

      // status vem no select por omissão do findUnique

      if (!book) {
        return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
      }

      // Livros em rascunho não são compráveis (excepto pelo próprio autor/admin,
      // que nem sequer passa daqui — já bloqueado acima)
      if (book.status === 'RASCUNHO') {
        return NextResponse.json({ error: 'Este livro ainda não está publicado.' }, { status: 400 });
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

      const precoMoedas = Math.round(book.preco_total);
      if (!precoMoedas || precoMoedas <= 0) {
        return NextResponse.json({ error: 'Preço inválido para o livro' }, { status: 400 });
      }

      const result = await db.$transaction(async (tx) => {
        // Re-verifica a posse DENTRO da transacção: a unique (userId, chapterId)
        // não protege LIVRO_COMPLETO (chapterId é null), e duas compras
        // concorrentes cobrariam o leitor duas vezes sem esta guarda.
        const jaTem = await tx.libraryItem.findFirst({
          where: { userId: payload.userId, bookId, tipo: 'LIVRO_COMPLETO' },
        });
        if (jaTem) throw new Error('CONFLITO_POSSE');

        const [buyerRow] = await tx.$queryRaw<Array<{ moedas: number; id: string }>>`
          SELECT id, moedas FROM profiles WHERE id = ${payload.userId} FOR UPDATE
        `;
        if (!buyerRow || buyerRow.moedas < precoMoedas) {
          throw new Error('Moedas insuficientes. Compre moedas na carteira.');
        }

        await tx.libraryItem.create({
          data: { userId: payload.userId, bookId, tipo: 'LIVRO_COMPLETO' },
        });
        await tx.user.update({
          where: { id: payload.userId },
          data: { moedas: { decrement: precoMoedas } },
        });
        await tx.user.update({
          where: { id: book.autorId },
          data: { moedas: { increment: precoMoedas } },
        });
        await tx.transaction.create({
          data: {
            userId: payload.userId,
            tipo: 'COMPRA',
            valor: precoMoedas,
            status: 'CONCLUIDO',
            descricao: `Livro completo: ${book.titulo} (${precoMoedas} MC)`,
            bookId,
          },
        });
        // Auditoria de vendas: registo para o autor (base dos relatórios de ganhos)
        await tx.transaction.create({
          data: {
            userId: book.autorId,
            tipo: 'VENDA',
            valor: precoMoedas,
            status: 'CONCLUIDO',
            descricao: `Venda: ${book.titulo} — livro completo (${precoMoedas} MC)`,
            bookId,
          },
        });

        const updatedBuyer = await tx.user.findUnique({
          where: { id: payload.userId },
          select: { moedas: true },
        });
        return updatedBuyer;
      });

      return NextResponse.json({ success: true, novoSaldoMoedas: result?.moedas ?? 0 });
    }

    // --- Chapter Purchase ---
    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId ou bookId é obrigatório' }, { status: 400 });
    }

    // SELECT leve: não arrastar conteudo (até 500KB) numa operação de compra
    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        titulo: true,
        preco_capitulo: true,
        is_free: true,
        livroId: true,
        livro: { select: { autorId: true, id: true, titulo: true, status: true } },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    }

    // Capítulos de livros em rascunho não são compráveis
    if (chapter.livro.status === 'RASCUNHO') {
      return NextResponse.json({ error: 'Este livro ainda não está publicado.' }, { status: 400 });
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

    const precoMoedas = Math.round(chapter.preco_capitulo);
    // Capítulo pago tem de ter preço válido — preço ≤ 0 é configuração errada
    // (e historicamente permitiu o exploit de preços negativos que "mintava" MC)
    if (!precoMoedas || precoMoedas <= 0) {
      return NextResponse.json(
        { error: 'Este capítulo tem um preço não configurado. Contacte a administração.' },
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const [buyerRow] = await tx.$queryRaw<Array<{ moedas: number; id: string }>>`
        SELECT id, moedas FROM profiles WHERE id = ${payload.userId} FOR UPDATE
      `;
      if (!buyerRow || buyerRow.moedas < precoMoedas) {
        throw new Error('Moedas insuficientes. Compre moedas na carteira.');
      }

      await tx.libraryItem.create({
        data: { userId: payload.userId, chapterId, bookId: chapter.livroId },
      });
      await tx.user.update({
        where: { id: payload.userId },
        data: { moedas: { decrement: precoMoedas } },
      });
      await tx.user.update({
        where: { id: chapter.livro.autorId },
        data: { moedas: { increment: precoMoedas } },
      });
      await tx.transaction.create({
        data: {
          userId: payload.userId,
          tipo: 'COMPRA',
          valor: precoMoedas,
          status: 'CONCLUIDO',
          descricao: `Compra: ${chapter.titulo} (${precoMoedas} MC)`,
          chapterId,
          bookId: chapter.livroId,
        },
      });
      // Auditoria de vendas: registo para o autor (base dos relatórios de ganhos)
      await tx.transaction.create({
        data: {
          userId: chapter.livro.autorId,
          tipo: 'VENDA',
          valor: precoMoedas,
          status: 'CONCLUIDO',
          descricao: `Venda: ${chapter.titulo} (${precoMoedas} MC)`,
          chapterId,
          bookId: chapter.livroId,
        },
      });

      const updatedBuyer = await tx.user.findUnique({
        where: { id: payload.userId },
        select: { moedas: true },
      });
      return updatedBuyer;
    });

    return NextResponse.json({ success: true, novoSaldoMoedas: result?.moedas ?? 0 });
  } catch (error) {
    // Erros de regra de negócio chegam ao utilizador com o código certo;
    // erros técnicos não vazam detalhes.
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'CONFLITO_POSSE') {
      return NextResponse.json({ error: 'Já possui este livro completo' }, { status: 409 });
    }
    if (msg.includes('insuficientes')) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error('Erro na compra:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}