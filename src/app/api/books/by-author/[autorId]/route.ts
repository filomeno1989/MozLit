import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ autorId: string }> }
) {
  try {
    const { autorId } = await params;

    const books = await db.book.findMany({
      where: { autorId, status: 'PUBLICADO' },
      select: {
        id: true,
        titulo: true,
        sinopse: true,
        capa_url: true,
        categorias: true,
        status: true,
        preco_total: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse categorias JSON for each book
    const parsed = books.map((b) => ({
      ...b,
      categorias: JSON.parse(b.categorias || '[]'),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Erro ao buscar livros do autor:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}