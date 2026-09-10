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
      select: { saldo_carteira: true, moedas: true },
    });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    // Transacções devolvidas aqui (antes vinham de /api/author, que é pesado e
    // só diz respeito a autores) — a Carteira faz 1 pedido em vez de 2-3.
    const transacoes = await db.transaction.findMany({
      where: { userId: payload.userId, status: 'CONCLUIDO' },
      select: { id: true, tipo: true, status: true, valor: true, createdAt: true, descricao: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return NextResponse.json({ saldo: user.saldo_carteira, moedas: user.moedas, transacoes });
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

    const body = await request.json();
    const { acao, tipo, valor, moedas: qtdMoedas } = body;

    // === COMPRAR MOEDAS ===
    if (acao === 'comprar-moedas') {
      if (!qtdMoedas || typeof qtdMoedas !== 'number' || qtdMoedas <= 0) {
        return NextResponse.json({ error: 'Quantidade de moedas inválida.' }, { status: 400 });
      }
      // Calcular custo em MZN (10 moedas = 1 MZN)
      const custoMzn = qtdMoedas / 10;

      const result = await db.$transaction(async (tx) => {
        // Débito condicional: race-safe e portável (não depende de SELECT FOR UPDATE)
        const debit = await tx.user.updateMany({
          where: { id: payload.userId, saldo_carteira: { gte: custoMzn } },
          data: { saldo_carteira: { decrement: custoMzn } },
        });
        if (debit.count === 0) {
          throw new Error('Saldo MZN insuficiente para comprar moedas.');
        }

        await tx.user.update({
          where: { id: payload.userId },
          data: { moedas: { increment: qtdMoedas } },
        });
        await tx.transaction.create({
          data: {
            userId: payload.userId,
            tipo: 'COMPRA_MOEDAS',
            valor: custoMzn,
            status: 'CONCLUIDO',
            descricao: `Compra de ${qtdMoedas.toLocaleString('pt-MZ')} MC`,
          },
        });

        const updated = await tx.user.findUnique({
          where: { id: payload.userId },
          select: { saldo_carteira: true, moedas: true },
        });
        return updated;
      });

      return NextResponse.json({ saldo: result?.saldo_carteira ?? 0, moedas: result?.moedas ?? 0 });
    }

    // === DEPÓSITO MZN ===
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    if (!isDemo && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Depósitos apenas disponíveis através de integração de pagamento.' }, { status: 403 });
    }

    if (tipo !== 'MPESA' && tipo !== 'NIB') {
      return NextResponse.json({ error: 'Tipo inválido. Use MPESA ou NIB.' }, { status: 400 });
    }

    const valorValidado = validateDeposito(valor);

    const user = await db.user.update({
      where: { id: payload.userId },
      data: { saldo_carteira: { increment: valorValidado } },
      select: { saldo_carteira: true, moedas: true },
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

    return NextResponse.json({ saldo: user.saldo_carteira, moedas: user.moedas });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    // Erros de regra de negócio (ex: saldo insuficiente) chegam ao utilizador;
    // erros técnicos (BD) não vazam detalhes.
    const msgErro = error instanceof Error ? error.message : '';
    if (msgErro.includes('insuficiente')) {
      return NextResponse.json({ error: msgErro }, { status: 400 });
    }
    console.error('Erro no carregamento/compra de moedas:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a operação. Tente novamente em instantes.' },
      { status: 500 }
    );
  }
}
