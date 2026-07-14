import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

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
      include: { livro: { select: { autorId: true, titulo: true } } },
    });

    if (!chapter) {
      return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    }

    // Free chapters are always accessible
    if (chapter.is_free) {
      return NextResponse.json({
        chapter: {
          id: chapter.id,
          titulo: chapter.titulo,
          conteudo: chapter.conteudo,
          ordem: chapter.ordem,
          is_free: chapter.is_free,
          preco_capitulo: chapter.preco_capitulo,
          livro: chapter.livro,
        },
      });
    }

    // Check access for authenticated users
    if (payload) {
      // Check: chapter-level purchase OR book-level purchase (LIVRO_COMPLETO)
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
        return NextResponse.json({
          chapter: {
            id: chapter.id,
            titulo: chapter.titulo,
            conteudo: chapter.conteudo,
            ordem: chapter.ordem,
            is_free: chapter.is_free,
            preco_capitulo: chapter.preco_capitulo,
            livro: chapter.livro,
          },
        });
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
    const updated = await db.chapter.update({
      where: { id },
      data: {
        ...(body.titulo !== undefined && { titulo: body.titulo }),
        ...(body.conteudo !== undefined && { conteudo: body.conteudo }),
        ...(body.preco_capitulo !== undefined && { preco_capitulo: body.preco_capitulo }),
        ...(body.is_free !== undefined && { is_free: body.is_free }),
        ...(body.ordem !== undefined && { ordem: body.ordem }),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
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