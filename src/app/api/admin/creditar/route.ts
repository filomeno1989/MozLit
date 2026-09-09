import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { validateCreditoAdmin, validateTextoRecarga } from '@/lib/validate';

/**
 * POST /api/admin/creditar — crédito directo de MC a um usuário (útil para beta testers e testes)
 * Body: { userEmail? | userTelefone? | userId?, moedas, nota? }
 * moedas positivo = crédito; negativo = débito (nunca deixa saldo negativo)
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, userEmail, userTelefone, moedas, nota } = body;

    const moedasValidadas = validateCreditoAdmin(moedas);
    const notaValidada = validateTextoRecarga(nota, 'Nota', 200);

    // Localiza o usuário
    let user: Awaited<ReturnType<typeof db.user.findUnique>> = null;
    if (userId) {
      user = await db.user.findUnique({ where: { id: String(userId) } });
    } else if (userEmail) {
      user = await db.user.findUnique({ where: { email: String(userEmail).trim().toLowerCase() } });
    } else if (userTelefone) {
      const tel = String(userTelefone).replace(/[\s\-().]/g, '');
      const telNormalizado = tel.startsWith('+') ? tel : `+${tel}`;
      user = await db.user.findUnique({ where: { telefone: telNormalizado } });
    } else {
      return NextResponse.json(
        { error: 'Indique o usuário por email, telefone ou ID.' },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Débito nunca deixa saldo negativo
    if (moedasValidadas < 0 && user.moedas + moedasValidadas < 0) {
      return NextResponse.json(
        { error: `O usuário só tem ${user.moedas} MC. Débito máximo: ${user.moedas} MC.` },
        { status: 400 }
      );
    }

    const resultado = await db.$transaction(async (tx) => {
      const atualizado = await tx.user.update({
        where: { id: user.id },
        data: { moedas: { increment: moedasValidadas } },
        select: { id: true, nome: true, email: true, telefone: true, moedas: true },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          tipo: moedasValidadas > 0 ? 'CREDITO_ADMIN' : 'DEBITO_ADMIN',
          valor: Math.abs(moedasValidadas),
          status: 'CONCLUIDO',
          descricao: notaValidada
            ? `${moedasValidadas > 0 ? 'Crédito' : 'Débito'} manual do admin — ${notaValidada}`
            : `${moedasValidadas > 0 ? 'Crédito' : 'Débito'} manual do admin`,
        },
      });

      return atualizado;
    });

    return NextResponse.json({ user: resultado });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao creditar moedas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
