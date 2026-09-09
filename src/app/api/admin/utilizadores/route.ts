import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

/**
 * GET /api/admin/utilizadores?q=termo — lista utilizadores (busca por nome, email ou telefone)
 * para o painel admin (crédito directo, verificação de roles).
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() || '';
    const where = q
      ? {
          OR: [
            { nome: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { telefone: { contains: q } },
          ],
        }
      : {};

    const utilizadores = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        moedas: true,
        saldo_carteira: true,
        createdAt: true,
        _count: { select: { books: true } },
      },
    });

    return NextResponse.json({ utilizadores });
  } catch (error) {
    console.error('Erro ao listar utilizadores (admin):', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
