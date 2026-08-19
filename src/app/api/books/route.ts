import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';
import {
  validateTitulo,
  validateSinopse,
  validateCategorias,
  validateFaixaEtaria,
} from '@/lib/validate';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const search = searchParams.get('search');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 50);

    const where: Record<string, unknown> = { status: 'PUBLICADO' };

    // Safely validate category filter
    if (categoria) {
      const trimmed = categoria.trim();
      const safeCategories = [
        'Ficção', 'Poesia', 'Drama', 'Ensaio', 'Conto', 'Romance',
        'Crónica', 'Memórias', 'Infanto-Juvenil', 'Ficção Científica',
        'Terror', 'Suspense', 'História', 'Religião', 'Autoajuda',
        'Académico', 'Biografia', 'Banda Desenhada', 'Mitologia', 'Fábula',
      ];
      if (safeCategories.includes(trimmed)) {
        (where as Record<string, unknown>).categorias = { contains: `"${trimmed}"` };
      }
    }

    // Search by title or author name
    if (search && search.trim().length > 0) {
      const term = search.trim();
      (where as Record<string, unknown>).OR = [
        { titulo: { contains: term, mode: 'insensitive' } },
        { autor: { nome: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const books = await db.book.findMany({
      where,
      include: {
        autor: {
          select: { id: true, nome: true, biografia: true, avatar_url: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // +1 to check if there are more
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = books.length > limit;
    const items = hasMore ? books.slice(0, limit) : books;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Parse categorias JSON for each book
    const parsed = items.map((b) => ({
      ...b,
      categorias: JSON.parse(b.categorias || '[]'),
    }));

    return NextResponse.json({ books: parsed, nextCursor });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar livros' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação necessário' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    if (!canCreateContent(payload.role)) {
      return NextResponse.json(
        { error: 'Apenas escritores e administradores podem criar livros' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, sinopse, categorias, capa_url, preco_total, ficha_tecnica, dedicatoria, epigrafe, epilogo, faixa_etaria } = body;

    // Validate inputs
    const tituloValidado = validateTitulo(titulo);
    const sinopseValidada = validateSinopse(sinopse);
    const catsValidadas = validateCategorias(categorias);
    const faixaValidada = validateFaixaEtaria(faixa_etaria);

    const book = await db.book.create({
      data: {
        titulo: tituloValidado,
        sinopse: sinopseValidada,
        categorias: JSON.stringify(catsValidadas),
        capa_url: (typeof capa_url === 'string' && capa_url.startsWith('http')) ? capa_url : '/placeholder-cover.svg',
        preco_total: typeof preco_total === 'number' && preco_total >= 0 ? preco_total : 0,
        ficha_tecnica: typeof ficha_tecnica === 'string' ? ficha_tecnica : '',
        dedicatoria: typeof dedicatoria === 'string' ? dedicatoria : '',
        epigrafe: typeof epigrafe === 'string' ? epigrafe : '',
        epilogo: typeof epilogo === 'string' ? epilogo : '',
        faixa_etaria: faixaValidada,
        status: 'RASCUNHO',
        autorId: payload.userId,
      },
      include: {
        autor: {
          select: { id: true, nome: true },
        },
      },
    });

    const result = {
      ...book,
      categorias: JSON.parse(book.categorias || '[]'),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Erro ao criar livro' },
      { status: 500 }
    );
  }
}