import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateEmail, validateTelefone } from '@/lib/validate';

/**
 * POST /api/auth/recuperar — pedido público de recuperação de acesso.
 *
 * Sem email/SMS automático nesta fase, o fluxo é assistido:
 *   1. Utilizador indica o contacto da conta no ecrã de login.
 *   2. O pedido aparece no Painel Admin (Recuperações).
 *   3. O admin valida a identidade pelo contacto e define uma senha temporária
 *      (funcionalidade "Redefinir senha" que já existia nos Utilizadores).
 *
 * Resposta sempre genérica: nunca revela se a conta existe (evita enumeração).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const contacto = String(body?.contacto || '').trim();
    if (!contacto) {
      return NextResponse.json(
        { error: 'Indique o número de telefone ou o email da conta.' },
        { status: 400 }
      );
    }
    if (contacto.length > 200) {
      return NextResponse.json({ error: 'Contacto demasiado longo.' }, { status: 400 });
    }

    // Localiza a conta: telefone (com a MESMA normalização do login — zeros
    // à esquerda incluídos) ou email
    let userId: string | null = null;
    const pareceTelefone = contacto.startsWith('+') || /^[\d\s\-().]{7,}$/.test(contacto);
    if (pareceTelefone) {
      try {
        const telefone = validateTelefone(contacto.startsWith('+') ? contacto : `+${contacto}`);
        const u = await db.user.findUnique({ where: { telefone }, select: { id: true } });
        userId = u?.id ?? null;
      } catch {
        userId = null;
      }
    } else {
      try {
        const email = validateEmail(contacto);
        if (email) {
          const u = await db.user.findUnique({ where: { email }, select: { id: true } });
          userId = u?.id ?? null;
        }
      } catch {
        userId = null;
      }
    }

    const mensagem =
      'Pedido recebido. Se a conta existir, a administração vai entrar em contacto para devolver o acesso.';

    if (!userId) {
      return NextResponse.json({ ok: true, mensagem });
    }

    // Evita spam: no máximo 1 pedido PENDENTE por conta
    const pendente = await db.pedidoRecuperacao.findFirst({
      where: { userId, estado: 'PENDENTE' },
      select: { id: true },
    });
    if (!pendente) {
      await db.pedidoRecuperacao.create({
        data: { userId, contacto },
      });
    }

    return NextResponse.json({ ok: true, mensagem });
  } catch (error) {
    console.error('Erro no pedido de recuperação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
