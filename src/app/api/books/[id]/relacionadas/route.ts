import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ehUuid } from '@/lib/validate';

const SELECT_CARTAZ = {
  id: true,
  titulo: true,
  capa_url: true,
  categorias: true,
  preco_total: true,
  status: true,
  createdAt: true,
  autor: { select: { id: true, nome: true } },
} as const;

/**
 * GET /api/books/[id]/relacionadas — Obras relacionadas (item 27, Fase 5)
 *
 * Receita de descoberta:
 *   1. Primeiro outras obras do MESMO AUTOR (o leitor gosta do escritor);
 *   2. Completa com obras da MESMA CATEGORIA (o leitor gosta do género);
 *   3. Se ainda faltar, obras publicadas recentemente (catálogo pequeno).
 * Só devolve obras PUBLICADO; nunca inclui a própria obra.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
    }

    const livro = await db.book.findUnique({
      where: { id },
      select: { autorId: true, categorias: true, status: true },
    });
    if (!livro || livro.status !== 'PUBLICADO') {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
    }

    const MAXIMO = 6;
    const excluidos = new Set<string>([id]);

    // 1. Mesmo autor
    const doAutor = await db.book.findMany({
      where: { autorId: livro.autorId, status: 'PUBLICADO', id: { not: id } },
      orderBy: { createdAt: 'desc' },
      take: MAXIMO,
      select: SELECT_CARTAZ,
    });
    doAutor.forEach((b) => excluidos.add(b.id));

    let relacionadas = doAutor;

    // 2. Mesma(s) categoria(s) — categorias vive em JSON string; "contains" por
    //    categoria é a forma portável (SQLite dev e PostgreSQL produção)
    if (relacionadas.length < MAXIMO) {
      let categorias: string[] = [];
      try { categorias = JSON.parse(livro.categorias || '[]'); } catch { categorias = []; }

      if (categorias.length > 0) {
        const doGenero = await db.book.findMany({
          where: {
            status: 'PUBLICADO',
            id: { notIn: Array.from(excluidos) },
            OR: categorias.map((c) => ({ categorias: { contains: `"${c}"` } })),
          },
          orderBy: { createdAt: 'desc' },
          take: MAXIMO - relacionadas.length,
          select: SELECT_CARTAZ,
        });
        doGenero.forEach((b) => excluidos.add(b.id));
        relacionadas = [...relacionadas, ...doGenero];
      }
    }

    // 3. Catálogo pequeno? Preenche com publicações recentes
    if (relacionadas.length < MAXIMO) {
      const recentes = await db.book.findMany({
        where: { status: 'PUBLICADO', id: { notIn: Array.from(excluidos) } },
        orderBy: { createdAt: 'desc' },
        take: MAXIMO - relacionadas.length,
        select: SELECT_CARTAZ,
      });
      relacionadas = [...relacionadas, ...recentes];
    }

    return NextResponse.json({
      books: relacionadas.map((b) => ({
        ...b,
        categorias: JSON.parse(b.categorias || '[]'),
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar obras relacionadas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
