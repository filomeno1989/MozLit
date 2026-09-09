import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { validateEmail, validateTelefone, validateSenha } from '@/lib/validate';

/**
 * Login unificado: aceita email OU número de telefone no campo "identificador".
 * - Se começar por "+" ou contiver apenas dígitos/espaços → trata como telefone.
 * - Caso contrário → trata como email.
 * Campos legados "email" também são aceites para compatibilidade.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identificador, email: emailLegado, senha } = body;

    const contacto: string = identificador || emailLegado;
    if (!contacto || !senha) {
      return NextResponse.json(
        { error: 'Telefone/email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    validateSenha(senha);

    // Detecta se é telefone (começa por + ou tem maioritariamente dígitos)
    const trimmed = String(contacto).trim();
    const pareceTelefone = trimmed.startsWith('+') || /^[\d\s\-().]{7,}$/.test(trimmed);

    let user: Awaited<ReturnType<typeof db.user.findUnique>> = null;
    if (pareceTelefone) {
      const telefone = validateTelefone(trimmed.startsWith('+') ? trimmed : `+${trimmed}`);
      user = await db.user.findUnique({ where: { telefone } });
    } else {
      const email = validateEmail(trimmed);
      if (email) {
        user = await db.user.findUnique({ where: { email } });
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(senha, user.senha_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      telefone: user.telefone,
      role: user.role,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        role: user.role,
        saldo_carteira: user.saldo_carteira,
        moedas: user.moedas,
      },
      token,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}
