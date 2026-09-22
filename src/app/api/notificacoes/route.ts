import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

/**
 * GET /api/notificacoes           — últimas 30 notificações + contagem de não lidas
 * GET /api/notificacoes?contagem=1 — só a contagem (poll leve a cada 30s)
 * PATCH /api/notificacoes          — marca todas como lidas
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const soContagem = request.nextUrl.searchParams.get('contagem') === '1';

    const naoLidas = await db.notificacao.count({
      where: { userId: payload.userId, lida: false },
    });

    if (soContagem) {
      return NextResponse.json({ naoLidas });
    }

    const notificacoes = await db.notificacao.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({
      naoLidas,
      notificacoes: notificacoes.map((n) => ({
        ...n,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const res = await db.notificacao.updateMany({
      where: { userId: payload.userId, lida: false },
      data: { lida: true },
    });

    return NextResponse.json({ success: true, marcadas: res.count });
  } catch (error) {
    console.error('Erro ao marcar notificações:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
