import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, verificarAdminActivo } from '@/lib/auth';
import { validateAcaoRecarga, validateTextoRecarga } from '@/lib/validate';
import { MOEDAS_CONFIG } from '@/lib/constants';

const ESTADOS_VALIDOS = ['PENDENTE', 'APROVADA', 'REJEITADA', 'CANCELADA'];

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
    // Dupla verificação: papel no token E papel actual na base de dados
    // (um token antigo de um utilizador despromovido deixa de funcionar)
    if (!payload || !(await verificarAdminActivo(payload))) {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const estado = request.nextUrl.searchParams.get('estado');
    const where = estado && ESTADOS_VALIDOS.includes(estado) ? { estado } : {};

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
    // Dupla verificação: papel no token E papel actual na base de dados
    if (!payload || !(await verificarAdminActivo(payload))) {
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
      // RECLAMAÇÃO ATÓMICA: só a PRIMEIRA transacção consegue alterar o estado
      // de PENDENTE (updateMany condicional). Elimina o duplo crédito por dois
      // cliques rápidos ou dois admins a aprovar em simultâneo.
      const claim = await tx.recargaSolicitacao.updateMany({
        where: { id, estado: 'PENDENTE' },
        data: {
          estado: acaoValidada,
          notaAdmin: notaAdminValidada,
          processadaPor: payload.userId,
          processadaEm: new Date(),
        },
      });
      if (claim.count === 0) {
        const existente = await tx.recargaSolicitacao.findUnique({
          where: { id },
          select: { estado: true },
        });
        throw new Error(
          existente
            ? `Esta recarga já foi processada (estado: ${existente.estado}).`
            : 'Recarga não encontrada.'
        );
      }

      const recarga = await tx.recargaSolicitacao.findUnique({
        where: { id },
        include: { user: { select: { id: true, nome: true, moedas: true } } },
      });
      if (!recarga) throw new Error('Recarga não encontrada.');

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

      const recargaFinal = await tx.recargaSolicitacao.findUnique({
        where: { id },
        include: { user: { select: { id: true, nome: true, email: true, telefone: true, moedas: true } } },
      });
      if (!recargaFinal) throw new Error('Recarga não encontrada.');
      return recargaFinal;
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
