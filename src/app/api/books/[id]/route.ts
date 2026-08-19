import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';
import { validateTitulo, validateSinopse, validateCategorias, validateFaixaEtaria } from '@/lib/validate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    const payload = token ? verifyToken(token) : null;

    const book = await db.book.findUnique({
      where: { id },
      include: {
        autor: {
          select: { id: true, nome: true, biografia: true, avatar_url: true },
        },
        chapters: {
          select: {
            id: true,
            titulo: true,
            ordem: true,
            preco_capitulo: true,
            is_free: true,
          },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Livro não encontrado' },
        { status: 404 }
      );
    }

    // Hide drafts from non-authors
    if (book.status === 'RASCUNHO') {
      if (!payload || (payload.userId !== book.autorId && payload.role !== 'ADMIN')) {
        return NextResponse.json(
          { error: 'Livro não encontrado' },
          { status: 404 }
        );
      }
    }

    const result = {
      ...book,
      categorias: JSON.parse(book.categorias || '[]'),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar livro' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'Apenas escritores e administradores podem editar livros' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingBook = await db.book.findUnique({
      where: { id },
      select: { autorId: true },
    });

    if (!existingBook) {
      return NextResponse.json(
        { error: 'Livro não encontrado' },
        { status: 404 }
      );
    }

    if (existingBook.autorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Você só pode editar seus próprios livros' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, sinopse, categorias, capa_url, status, preco_total, ficha_tecnica, dedicatoria, epigrafe, epilogo, faixa_etaria } = body;

    // Validate inputs if provided
    const data: Record<string, unknown> = {};
    if (titulo !== undefined) data.titulo = validateTitulo(titulo);
    if (sinopse !== undefined) data.sinopse = validateSinopse(sinopse);
    if (categorias !== undefined) data.categorias = JSON.stringify(validateCategorias(categorias));
    if (capa_url !== undefined) data.capa_url = capa_url;
    if (status !== undefined) data.status = status;
    if (preco_total !== undefined) data.preco_total = typeof preco_total === 'number' ? preco_total : 0;
    if (ficha_tecnica !== undefined) data.ficha_tecnica = String(ficha_tecnica);
    if (dedicatoria !== undefined) data.dedicatoria = String(dedicatoria);
    if (epigrafe !== undefined) data.epigrafe = String(epigrafe);
    if (epilogo !== undefined) data.epilogo = String(epilogo);
    if (faixa_etaria !== undefined) data.faixa_etaria = validateFaixaEtaria(faixa_etaria);

    // If publishing, verify book has chapters
    if (status === 'PUBLICADO') {
      const chapterCount = await db.chapter.count({ where: { livroId: id } });
      if (chapterCount === 0) {
        return NextResponse.json(
          { error: 'Não pode publicar um livro sem capítulos.' },
          { status: 400 }
        );
      }
    }

    const updatedBook = await db.book.update({
      where: { id },
      data,
      include: {
        autor: {
          select: { id: true, nome: true, biografia: true, avatar_url: true },
        },
      },
    });

    const result = {
      ...updatedBook,
      categorias: JSON.parse(updatedBook.categorias || '[]'),
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar livro' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'Apenas escritores e administradores podem excluir livros' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingBook = await db.book.findUnique({
      where: { id },
      select: { autorId: true, status: true },
    });

    if (!existingBook) {
      return NextResponse.json(
        { error: 'Livro não encontrado' },
        { status: 404 }
      );
    }

    if (existingBook.autorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Você só pode excluir seus próprios livros' },
        { status: 403 }
      );
    }

    // Block deletion if book is published and has buyers
    if (existingBook.status === 'PUBLICADO') {
      const buyersCount = await db.libraryItem.count({
        where: { bookId: id },
      });
      if (buyersCount > 0) {
        return NextResponse.json(
          { error: `Não pode excluir: ${buyersCount} leitor(es) compraram este livro. Despublique primeiro.`, buyersCount },
          { status: 409 }
        );
      }
    }

    await db.book.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir livro' },
      { status: 500 }
    );
  }
}