import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import {
  validateMoedasRecarga,
  validateMetodoRecarga,
  validateTextoRecarga,
} from '@/lib/validate';
import { RECARGA_CONFIG, MOEDAS_CONFIG } from '@/lib/constants';

/**
 * GET /api/recargas — histórico de recargas do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const recargas = await db.recargaSolicitacao.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        moedas: true,
        valorMzn: true,
        metodo: true,
        estado: true,
        notaAdmin: true,
        createdAt: true,
        processadaEm: true,
      },
    });

    const pendentes = await db.recargaSolicitacao.count({
      where: { userId: payload.userId, estado: 'PENDENTE' },
    });

    return NextResponse.json({ recargas, pendentes });
  } catch (error) {
    console.error('Erro ao listar recargas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * POST /api/recargas — usuário cria uma solicitação de recarga de MC
 * Body: { moedas, metodo, numeroEnvio, referencia?, nota? }
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const body = await request.json();
    const { moedas, metodo, numeroEnvio, referencia, nota } = body;

    // Limite de solicitações pendentes para evitar spam
    const pendentes = await db.recargaSolicitacao.count({
      where: { userId: payload.userId, estado: 'PENDENTE' },
    });
    if (pendentes >= RECARGA_CONFIG.PENDENTES_MAX) {
      return NextResponse.json(
        { error: `Tem ${pendentes} solicitações pendentes. Aguarde a aprovação antes de enviar novas.` },
        { status: 429 }
      );
    }

    const moedasValidadas = validateMoedasRecarga(moedas);
    const metodoValidado = validateMetodoRecarga(metodo);
    const numeroEnvioValidado = validateTextoRecarga(numeroEnvio, 'Número de envio', 20);
    const referenciaValidada = validateTextoRecarga(referencia, 'Referência', RECARGA_CONFIG.REFERENCIA_MAX);
    const notaValidada = validateTextoRecarga(nota, 'Nota', RECARGA_CONFIG.NOTA_MAX);

    // Número de onde foi feito o envio é essencial para o admin confirmar
    if (!numeroEnvioValidado) {
      return NextResponse.json(
        { error: 'Indique o número de onde fez o envio (ex: 84 123 4567).' },
        { status: 400 }
      );
    }

    const valorMzn = moedasValidadas / MOEDAS_CONFIG.TAXA_CONVERSAO;

    const recarga = await db.recargaSolicitacao.create({
      data: {
        userId: payload.userId,
        moedas: moedasValidadas,
        valorMzn,
        metodo: metodoValidado,
        numeroEnvio: numeroEnvioValidado,
        referencia: referenciaValidada,
        nota: notaValidada,
        estado: 'PENDENTE',
      },
      select: {
        id: true, moedas: true, valorMzn: true, metodo: true,
        estado: true, createdAt: true,
      },
    });

    return NextResponse.json({ recarga }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao criar recarga:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
