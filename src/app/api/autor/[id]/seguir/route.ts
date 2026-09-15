import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

/**
 * POST /api/autor/[id]/seguir — segue/deixa de seguir um autor (item 18).
 * Toggle idempotente: cria ou remove a ligação e devolve o estado novo
 * com a contagem actualizada de seguidores.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Entre na sua conta para seguir autores.' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sessão inválida. Entre novamente.' }, { status: 401 });
    }

    const { id } = await params;

    const autor = await db.user.findUnique({ where: { id }, select: { id: true, nome: true } });
    if (!autor) {
      return NextResponse.json({ error: 'Autor não encontrado.' }, { status: 404 });
    }

    if (autor.id === payload.userId) {
      return NextResponse.json({ error: 'Não pode seguir a sua própria conta.' }, { status: 400 });
    }

    const existente = await db.seguidor.findUnique({
      where: { autorId_seguidorId: { autorId: id, seguidorId: payload.userId } },
      select: { id: true },
    });

    let seguindo: boolean;
    if (existente) {
      await db.seguidor.delete({ where: { id: existente.id } });
      seguindo = false;
    } else {
      await db.seguidor.create({
        data: { autorId: id, seguidorId: payload.userId },
      });
      seguindo = true;
    }

    const totalSeguidores = await db.seguidor.count({ where: { autorId: id } });

    return NextResponse.json({ seguindo, totalSeguidores });
  } catch (error) {
    console.error('Erro ao seguir autor:', error);
    return NextResponse.json({ error: 'Erro ao processar. Tente novamente.' }, { status: 500 });
  }
}
