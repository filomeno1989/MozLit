import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

/**
 * GET /api/autor/seguidos - ids dos autores que o utilizador segue.
 *
 * Usado pela app Android (v1.1.0) para subscrever o telemóvel nos tópicos
 * FCM «autor-<id>» ao arrancar / entrar na conta - assim os capítulos novos
 * de cada autor seguido chegam por push sem guardar tokens na base de dados.
 * Devolve no máximo 100 ids (FCM aceita até 2000 tópicos por dispositivo;
 * 100 cobre folgado o uso real e mantém a resposta leve).
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Sessão inválida. Entre novamente.' }, { status: 401 });
    }

    const seguidos = await db.seguidor.findMany({
      where: { seguidorId: payload.userId },
      select: { autorId: true },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      autores: seguidos.map((s) => s.autorId),
    });
  } catch (error) {
    console.error('Erro ao listar autores seguidos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
