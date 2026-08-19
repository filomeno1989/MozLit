import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { validateDeposito } from '@/lib/validate';

export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { saldo_carteira: true },
    });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    return NextResponse.json({ saldo: user.saldo_carteira });
  } catch (error) {
    console.error('Erro ao buscar saldo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    if (!isDemo && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Depósitos apenas disponíveis através de integração de pagamento.' }, { status: 403 });
    }

    const body = await request.json();
    const { tipo, valor } = body;

    if (tipo !== 'MPESA' && tipo !== 'NIB') {
      return NextResponse.json({ error: 'Tipo inválido. Use MPESA ou NIB.' }, { status: 400 });
    }

    const valorValidado = validateDeposito(valor);

    const user = await db.user.update({
      where: { id: payload.userId },
      data: { saldo_carteira: { increment: valorValidado } },
      select: { saldo_carteira: true },
    });

    await db.transaction.create({
      data: {
        userId: payload.userId,
        tipo,
        valor: valorValidado,
        status: 'CONCLUIDO',
        descricao: `Carregamento via ${tipo}`,
      },
    });

    return NextResponse.json({ saldo: user.saldo_carteira });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro no carregamento:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
