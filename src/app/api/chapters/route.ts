import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';
import { validateTitulo, validateConteudoCapitulo } from '@/lib/validate';
import { LIMITES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { titulo, conteudo, livroId, preco_capitulo, is_free, ordem } = body;

    if (!titulo || !conteudo || !livroId) {
      return NextResponse.json({ error: 'Título, conteúdo e livroId são obrigatórios' }, { status: 400 });
    }

    // Validate inputs (conteúdo HTML é sanitizado antes de gravar)
    const tituloValidado = validateTitulo(titulo);
    const conteudoValidado = validateConteudoCapitulo(conteudo);

    const book = await db.book.findUnique({ where: { id: livroId }, select: { autorId: true } });
    if (!book) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
    }
    if (book.autorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão para este livro' }, { status: 403 });
    }

    const chapterCount = await db.chapter.count({ where: { livroId } });
    const chapter = await db.chapter.create({
      data: {
        titulo: tituloValidado,
        conteudo: conteudoValidado,
        livroId,
        preco_capitulo: typeof preco_capitulo === 'number' && Number.isFinite(preco_capitulo)
          ? Math.min(LIMITES.PRECO_CAPITULO_MAX, Math.max(0, Math.round(preco_capitulo)))
          : 0,
        is_free: Boolean(is_free),
        ordem: typeof ordem === 'number' && Number.isFinite(ordem) && ordem >= 0 ? Math.floor(ordem) : chapterCount,
      },
    });

    return NextResponse.json(chapter, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao criar capítulo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}