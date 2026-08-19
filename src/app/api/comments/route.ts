import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    if (!chapterId) {
      return NextResponse.json({ error: 'chapterId é obrigatório' }, { status: 400 });
    }

    // Check chapter access for paid chapters
    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      select: { is_free: true, livroId: true },
    });
    if (!chapter) {
      return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    }

    // For paid chapters, require auth and access
    if (!chapter.is_free) {
      const token = extractTokenFromHeader(request.headers.get('Authorization'));
      const payload = token ? verifyToken(token) : null;
      if (!payload) {
        return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
      }
      const hasAccess = await db.libraryItem.findFirst({
        where: {
          userId: payload.userId,
          OR: [
            { chapterId },
            { bookId: chapter.livroId, tipo: 'LIVRO_COMPLETO' },
          ],
        },
      });
      if (!hasAccess) {
        return NextResponse.json({ error: 'Necessita adquirir o capítulo.' }, { status: 403 });
      }
    }

    const comments = await db.comment.findMany({
      where: { chapterId, parentId: null },
      include: {
        user: { select: { id: true, nome: true, role: true } },
        replies: {
          include: {
            user: { select: { id: true, nome: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = comments.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      replies: c.replies.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json();
    const { conteudo, chapterId, parentId } = body;

    if (!conteudo || !chapterId) {
      return NextResponse.json({ error: 'Conteúdo e chapterId são obrigatórios' }, { status: 400 });
    }

    const trimmed = String(conteudo).trim();
    if (trimmed.length < 2) {
      return NextResponse.json({ error: 'O comentário deve ter pelo menos 2 caracteres.' }, { status: 400 });
    }
    if (trimmed.length > 1000) {
      return NextResponse.json({ error: 'O comentário não pode exceder 1000 caracteres.' }, { status: 400 });
    }

    if (parentId) {
      const parent = await db.comment.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: 'Comentário pai não encontrado' }, { status: 404 });
      }
      if (parent.chapterId !== chapterId) {
        return NextResponse.json({ error: 'Resposta inválida' }, { status: 400 });
      }
    }

    const chapter = await db.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) {
      return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });
    }

    if (!chapter.is_free) {
      const hasAccess = await db.libraryItem.findFirst({
        where: { userId: payload.userId, chapterId },
      });
      if (!hasAccess) {
        return NextResponse.json({ error: 'Necessita adquirir o capítulo para comentar.' }, { status: 403 });
      }
    }

    const comment = await db.comment.create({
      data: {
        conteudo: trimmed,
        chapterId,
        userId: payload.userId,
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, nome: true, role: true } },
      },
    });

    return NextResponse.json({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('id');

    if (!commentId) {
      return NextResponse.json({ error: 'id do comentário é obrigatório' }, { status: 400 });
    }

    const comment = await db.comment.findUnique({ where: { id: commentId } });

    if (!comment) {
      return NextResponse.json({ error: 'Comentário não encontrado' }, { status: 404 });
    }

    const chapter = await db.chapter.findUnique({
      where: { id: comment.chapterId },
      include: { livro: { select: { autorId: true } } },
    });

    const canDelete =
      comment.userId === payload.userId ||
      (chapter && (chapter.livro.autorId === payload.userId || payload.role === 'ADMIN'));

    if (!canDelete) {
      return NextResponse.json({ error: 'Sem permissão para eliminar este comentário' }, { status: 403 });
    }

    await db.comment.delete({ where: { id: commentId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao eliminar comentário:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
