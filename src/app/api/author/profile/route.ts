import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, nome: true, biografia: true, avatar_url: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { biografia, avatar_url, nome } = body;

    const updated = await db.user.update({
      where: { id: payload.userId },
      data: {
        ...(biografia !== undefined && { biografia }),
        ...(avatar_url !== undefined && { avatar_url }),
        ...(nome !== undefined && { nome }),
      },
      select: { id: true, nome: true, biografia: true, avatar_url: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}