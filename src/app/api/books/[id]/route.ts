import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const book = await db.book.findUnique({
      where: { id },
      include: {
        autor: {
          select: { id: true, nome: true },
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

    return NextResponse.json(book);
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
    const { titulo, sinopse, categoria, capa_url, status, preco_total } = body;

    const updatedBook = await db.book.update({
      where: { id },
      data: {
        ...(titulo !== undefined && { titulo }),
        ...(sinopse !== undefined && { sinopse }),
        ...(categoria !== undefined && { categoria }),
        ...(capa_url !== undefined && { capa_url }),
        ...(status !== undefined && { status }),
        ...(preco_total !== undefined && { preco_total }),
      },
      include: {
        autor: {
          select: { id: true, nome: true },
        },
      },
    });

    return NextResponse.json(updatedBook);
  } catch (error) {
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
        { error: 'Você só pode excluir seus próprios livros' },
        { status: 403 }
      );
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