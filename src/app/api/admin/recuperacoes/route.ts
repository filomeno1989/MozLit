import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, verificarAdminActivo } from '@/lib/auth';
import { validateTextoRecarga } from '@/lib/validate';

/**
 * GET /api/admin/recuperacoes — pedidos de recuperação de acesso ("esqueci-me da senha").
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !(await verificarAdminActivo(payload))) {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado');

    const pedidos = await db.pedidoRecuperacao.findMany({
      where: estado && estado !== 'TODAS' ? { estado } : undefined,
      include: {
        user: { select: { id: true, nome: true, email: true, telefone: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ pedidos });
  } catch (error) {
    console.error('Erro ao listar recuperações (admin):', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/recuperacoes — { id, estado: 'RESOLVIDO' | 'PENDENTE', notaAdmin? }
 * Usado após redefinir a senha do utilizador ou resolver por contacto directo.
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !(await verificarAdminActivo(payload))) {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, estado, notaAdmin } = body;

    if (!id || (estado !== 'RESOLVIDO' && estado !== 'PENDENTE')) {
      return NextResponse.json(
        { error: 'Indique o id do pedido e o estado (RESOLVIDO ou PENDENTE).' },
        { status: 400 }
      );
    }

    const nota = notaAdmin !== undefined
      ? validateTextoRecarga(notaAdmin, 'Nota', 500)
      : undefined;

    const pedido = await db.pedidoRecuperacao.update({
      where: { id },
      data: {
        estado,
        resolvidoEm: estado === 'RESOLVIDO' ? new Date() : null,
        ...(nota !== undefined ? { notaAdmin: nota } : {}),
      },
      include: {
        user: { select: { id: true, nome: true, email: true, telefone: true, role: true } },
      },
    });

    return NextResponse.json({ pedido });
  } catch (error) {
    console.error('Erro ao actualizar recuperação (admin):', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
