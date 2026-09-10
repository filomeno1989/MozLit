import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { validateAcaoRecarga, validateTextoRecarga } from '@/lib/validate';
import { MOEDAS_CONFIG } from '@/lib/constants';

/**
 * GET /api/admin/recargas?estado=PENDENTE — lista solicitações (todas as estados)
 * PATCH /api/admin/recargas — processa uma solicitação: { id, acao: APROVADA|REJEITADA, notaAdmin? }
 *
 * Ao aprovar: credita as MC na conta do usuário dentro de uma transacção atómica
 * e regista a Transaction correspondente. Idempotente: recargas já processadas são rejeitadas.
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const estado = request.nextUrl.searchParams.get('estado');
    const where = estado ? { estado } : {};

    const recargas = await db.recargaSolicitacao.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, nome: true, email: true, telefone: true, moedas: true } },
      },
    });

    return NextResponse.json({ recargas });
  } catch (error) {
    console.error('Erro ao listar recargas (admin):', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, acao, notaAdmin } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID da recarga é obrigatório.' }, { status: 400 });
    }
    const acaoValidada = validateAcaoRecarga(acao);
    const notaAdminValidada = validateTextoRecarga(notaAdmin, 'Nota do admin', 300);

    if (acaoValidada === 'REJEITADA' && !notaAdminValidada) {
      return NextResponse.json(
        { error: 'Indique o motivo da rejeição.' },
        { status: 400 }
      );
    }

    const resultado = await db.$transaction(async (tx) => {
      // Re-lê dentro da transacção e bloqueia por estado (idempotência)
      const recarga = await tx.recargaSolicitacao.findUnique({
        where: { id },
        include: { user: { select: { id: true, nome: true, moedas: true } } },
      });
      if (!recarga) throw new Error('Recarga não encontrada.');
      if (recarga.estado !== 'PENDENTE') {
        throw new Error(`Esta recarga já foi processada (estado: ${recarga.estado}).`);
      }

      if (acaoValidada === 'APROVADA') {
        await tx.user.update({
          where: { id: recarga.userId },
          data: { moedas: { increment: recarga.moedas } },
        });
        await tx.transaction.create({
          data: {
            userId: recarga.userId,
            tipo: 'RECARGA',
            valor: recarga.moedas,
            status: 'CONCLUIDO',
            descricao: `Recarga de ${recarga.moedas.toLocaleString('pt-MZ')} MC via ${recarga.metodo}`,
          },
        });
      }

      const atualizada = await tx.recargaSolicitacao.update({
        where: { id },
        data: {
          estado: acaoValidada,
          notaAdmin: notaAdminValidada,
          processadaPor: payload.userId,
          processadaEm: new Date(),
        },
        include: { user: { select: { id: true, nome: true, email: true, telefone: true, moedas: true } } },
      });

      return atualizada;
    });

    return NextResponse.json({
      recarga: resultado,
      moedasCreditadas: acaoValidada === 'APROVADA' ? resultado.moedas : 0,
      taxa: MOEDAS_CONFIG.TAXA_CONVERSAO,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro interno';
    const status = msg.includes('não encontrada') ? 404 : msg.includes('processada') ? 409 : 500;
    if (status === 500) console.error('Erro ao processar recarga:', error);
    // Erros internos (ex: BD) não vazam detalhes técnicos ao utilizador
    return NextResponse.json(
      { error: status === 500 ? 'Erro ao processar a recarga. Tente novamente em instantes.' : msg },
      { status }
    );
  }
}
