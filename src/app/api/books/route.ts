import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    const books = await db.book.findMany({
      where: {
        status: 'PUBLICADO',
        ...(categoria ? { categoria } : {}),
      },
      include: {
        autor: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(books);
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
    const { titulo, sinopse, categoria, capa_url } = body;

    if (!titulo || !sinopse) {
      return NextResponse.json(
        { error: 'Título e sinopse são obrigatórios' },
        { status: 400 }
      );
    }

    const book = await db.book.create({
      data: {
        titulo,
        sinopse,
        categoria: categoria || 'Ficção',
        capa_url: capa_url || '/placeholder-cover.svg',
        status: 'RASCUNHO',
        autorId: payload.userId,
      },
      include: {
        autor: {
          select: { id: true, nome: true },
        },
      },
    });

    return NextResponse.json(book, { status: 201 });
  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json(
      { error: 'Erro ao criar livro' },
      { status: 500 }
    );
  }
}