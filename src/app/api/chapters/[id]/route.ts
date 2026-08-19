import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';
import { validateTitulo, validateConteudo } from '@/lib/validate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    const payload = token ? verifyToken(token) : null;

    const chapter = await db.chapter.findUnique({
      where: { id },
      include: {
        livro: {
          select: {
            autorId: true,
            titulo: true,
            categorias: true,
            faixa_etaria: true,
            ficha_tecnica: true,
            dedicatoria: true,
            epigrafe: true,
            epilogo: true,
            status: true,
          },
        },
      },
    });

    if (!chapter) {
      return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    }

    // Hide chapters from draft books (unless user is the author or admin)
    if (chapter.livro.status === 'RASCUNHO') {
      if (!payload || (payload.userId !== chapter.livro.autorId && payload.role !== 'ADMIN')) {
        return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
      }
      // Author can always read their own draft chapters
      return await buildChapterResponse(chapter);
    }

    const livreData = {
      id: chapter.livro.id,
      titulo: chapter.livro.titulo,
      autorId: chapter.livro.autorId,
      categorias: JSON.parse(chapter.livro.categorias || '[]'),
      faixa_etaria: chapter.livro.faixa_etaria || 'Livre',
      ficha_tecnica: chapter.livro.ficha_tecnica || '',
      dedicatoria: chapter.livro.dedicatoria || '',
      epigrafe: chapter.livro.epigrafe || '',
      epilogo: chapter.livro.epilogo || '',
    };

    // Get prev/next chapter and chapter list
    const allChapters = await db.chapter.findMany({
      where: { livroId: chapter.livroId },
      orderBy: { ordem: 'asc' },
      select: { id: true, titulo: true, ordem: true, is_free: true },
    });

    const currentIndex = allChapters.findIndex((c) => c.id === chapter.id);
    const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
    const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

    const result = {
      id: chapter.id,
      titulo: chapter.titulo,
      conteudo: chapter.conteudo,
      ordem: chapter.ordem,
      is_free: chapter.is_free,
      preco_capitulo: chapter.preco_capitulo,
      livro: livreData,
      prevChapter,
      nextChapter,
      allChapters,
    };

    // Free chapters are always accessible
    if (chapter.is_free) {
      return NextResponse.json({ chapter: result });
    }

    // Author can always read their own chapters
    if (payload && (payload.userId === chapter.livro.autorId || payload.role === 'ADMIN')) {
      return NextResponse.json({ chapter: result });
    }

    // Check access for authenticated users
    if (payload) {
      const hasAccess = await db.libraryItem.findFirst({
        where: {
          userId: payload.userId,
          OR: [
            { chapterId: id },
            { bookId: chapter.livroId, tipo: 'LIVRO_COMPLETO' },
          ],
        },
      });
      if (hasAccess) {
        return NextResponse.json({ chapter: result });
      }
    }

    return NextResponse.json(
      { error: 'Necessita adquirir este capítulo para ler o conteúdo.' },
      { status: 403 }
    );
  } catch (error) {
    console.error('Erro ao buscar capítulo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function buildChapterResponse(chapter: any) {
  const allChapters = await db.chapter.findMany({
    where: { livroId: chapter.livroId },
    orderBy: { ordem: 'asc' },
    select: { id: true, titulo: true, ordem: true, is_free: true },
  });
  const currentIndex = allChapters.findIndex((c) => c.id === chapter.id);

  return NextResponse.json({
    chapter: {
      id: chapter.id,
      titulo: chapter.titulo,
      conteudo: chapter.conteudo,
      ordem: chapter.ordem,
      is_free: chapter.is_free,
      preco_capitulo: chapter.preco_capitulo,
      livro: {
        id: chapter.livro.id,
        titulo: chapter.livro.titulo,
        autorId: chapter.livro.autorId,
        categorias: JSON.parse(chapter.livro.categorias || '[]'),
        faixa_etaria: chapter.livro.faixa_etaria || 'Livre',
        ficha_tecnica: chapter.livro.ficha_tecnica || '',
        dedicatoria: chapter.livro.dedicatoria || '',
        epigrafe: chapter.livro.epigrafe || '',
        epilogo: chapter.livro.epilogo || '',
      },
      prevChapter: currentIndex > 0 ? allChapters[currentIndex - 1] : null,
      nextChapter: currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null,
      allChapters,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const chapter = await db.chapter.findUnique({
      where: { id },
      include: { livro: { select: { autorId: true } } },
    });
    if (!chapter) return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    if (chapter.livro.autorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.titulo !== undefined) data.titulo = validateTitulo(body.titulo);
    if (body.conteudo !== undefined) data.conteudo = validateConteudo(body.conteudo);
    if (body.preco_capitulo !== undefined) data.preco_capitulo = typeof body.preco_capitulo === 'number' ? body.preco_capitulo : 0;
    if (body.is_free !== undefined) data.is_free = Boolean(body.is_free);
    if (body.ordem !== undefined) data.ordem = Number(body.ordem);

    const updated = await db.chapter.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao atualizar capítulo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { id } = await params;
    const chapter = await db.chapter.findUnique({
      where: { id },
      include: { livro: { select: { autorId: true } } },
    });
    if (!chapter) return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    if (chapter.livro.autorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    await db.chapter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir capítulo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
