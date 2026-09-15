import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

/**
 * Reordenar capítulos (mover para cima/baixo) — Fase 2, item 14.
 *
 * Sem reordenação, o autor que quisesse corrigir a sequência tinha de
 * eliminar e reescrever capítulos — perda de trabalho pura. Aqui trocamos
 * a posição de dois vizinhos numa transacção, com passo intermédio para
 * nunca haver dois capítulos com a mesma ordem a meio da operação.
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const livroId = body?.livroId;
    const capituloId = body?.capituloId;
    const direcao = body?.direcao;
    if (typeof livroId !== 'string' || typeof capituloId !== 'string' || (direcao !== 'cima' && direcao !== 'baixo')) {
      return NextResponse.json({ error: 'Dados inválidos para reordenar.' }, { status: 400 });
    }

    // Só o autor da obra (ou admin) pode reordenar
    const livro = await db.book.findUnique({
      where: { id: livroId },
      select: { autorId: true },
    });
    if (!livro) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 });
    if (livro.autorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const capitulos = await db.chapter.findMany({
      where: { livroId },
      orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, ordem: true },
    });
    const idx = capitulos.findIndex((c) => c.id === capituloId);
    if (idx === -1) return NextResponse.json({ error: 'Capítulo não encontrado' }, { status: 404 });

    const idxVizinho = direcao === 'cima' ? idx - 1 : idx + 1;
    if (idxVizinho < 0 || idxVizinho >= capitulos.length) {
      return NextResponse.json({ error: 'O capítulo já está nessa posição.' }, { status: 400 });
    }

    const alvo = capitulos[idx];
    const vizinho = capitulos[idxVizinho];

    await db.$transaction(async (tx) => {
      // Passo intermédio (-1): garante swap limpo mesmo se a BD tiver ordens repetidas
      await tx.chapter.update({ where: { id: alvo.id }, data: { ordem: -1 } });
      await tx.chapter.update({ where: { id: vizinho.id }, data: { ordem: alvo.ordem } });
      await tx.chapter.update({ where: { id: alvo.id }, data: { ordem: vizinho.ordem } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao reordenar capítulo:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
