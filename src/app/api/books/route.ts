import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    const where: Record<string, unknown> = { status: 'PUBLICADO' };
    if (categoria) {
      // Search within JSON array string: '"Categoria"'
      (where as Record<string, string>).categorias = { contains: `"${categoria}"` } as any;
    }

    const books = await db.book.findMany({
      where,
      include: {
        autor: {
          select: { id: true, nome: true, biografia: true, avatar_url: true },
        },
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
    const { titulo, sinopse, categorias, capa_url, preco_total, ficha_tecnica, dedicatoria, epigrafe, epilogo } = body;

    if (!titulo || !sinopse) {
      return NextResponse.json(
        { error: 'Título e sinopse são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate categorias is an array with at least one item
    const cats = Array.isArray(categorias) && categorias.length > 0
      ? categorias
      : ['Ficção'];

    const book = await db.book.create({
      data: {
        titulo,
        sinopse,
        categorias: JSON.stringify(cats),
        capa_url: capa_url || '/placeholder-cover.svg',
        preco_total: preco_total ?? 0,
        ficha_tecnica: ficha_tecnica || '',
        dedicatoria: dedicatoria || '',
        epigrafe: epigrafe || '',
        epilogo: epilogo || '',
        status: 'RASCUNHO',
        autorId: payload.userId,
      },
      include: {
        autor: {
          select: { id: true, nome: true },
        },
      },
    });

    // Return parsed categorias
    const result = {
      ...book,
      categorias: JSON.parse(book.categorias || '[]'),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Erro ao criar livro' },
      { status: 500 }
    );
  }
}