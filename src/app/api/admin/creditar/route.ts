import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, verificarAdminActivo } from '@/lib/auth';
import { validateCreditoAdmin, validateTextoRecarga, ehUuid, ValidationError } from '@/lib/validate';

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
    // Dupla verificação: papel no token E papel actual na base de dados
    if (!payload || !(await verificarAdminActivo(payload))) {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, userEmail, userTelefone, moedas, nota } = body;

    const moedasValidadas = validateCreditoAdmin(moedas);
    const notaValidada = validateTextoRecarga(nota, 'Nota', 200);

    // Localiza o usuário
    let user: Awaited<ReturnType<typeof db.user.findUnique>> = null;
    if (userId) {
      // Id não-UUID daria erro de cast (500) — 404 limpo é a resposta correcta
      if (!ehUuid(userId)) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }
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

    // Débito nunca deixa saldo negativo — a verificação passa a ser ATÓMICA
    // dentro da transacção (auditoria 2026-10 M3): a leitura fora era
    // check-then-act; uma compra concorrente podia deixar o saldo negativo.
    const resultado = await db.$transaction(async (tx) => {
      let actualizado;
      if (moedasValidadas > 0) {
        actualizado = await tx.user.update({
          where: { id: user.id },
          data: { moedas: { increment: moedasValidadas } },
          select: { id: true, nome: true, email: true, telefone: true, moedas: true },
        });
      } else {
        // Débito condicional (mesmo padrão das compras em /api/library):
        // só decrementa se o saldo actual ainda cobrir o débito.
        const debito = await tx.user.updateMany({
          where: { id: user.id, moedas: { gte: Math.abs(moedasValidadas) } },
          data: { moedas: { decrement: Math.abs(moedasValidadas) } },
        });
        if (debito.count === 0) {
          throw new ValidationError(
            `O saldo do usuário mudou entretanto e já não cobre o débito de ${Math.abs(moedasValidadas)} MC.`
          );
        }
        actualizado = await tx.user.findUnique({
          where: { id: user.id },
          select: { id: true, nome: true, email: true, telefone: true, moedas: true },
        });
      }

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

      return actualizado;
    });

    // AUDITORIA (auditoria 2026-10 M2): o actor admin fica nos logs do
    // servidor (a descrição da transacção, visível ao utilizador, mantém-se
    // limpa). Migração futura (P1): coluna processadoPor na Transaction.
    console.log('[AUDIT] admin/creditar', JSON.stringify({
      actor: payload.userId, alvo: user.id, moedas: moedasValidadas,
      quando: new Date().toISOString(),
    }));

    return NextResponse.json({ user: resultado });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao creditar moedas:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
