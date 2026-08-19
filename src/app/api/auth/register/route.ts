import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, type Role } from '@/lib/auth';
import {
  validateNome,
  validateEmail,
  validateSenha,
  validateRegistroRole,
} from '@/lib/validate';
import { IDADE_MINIMA_REGISTO } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, senha, role: requestedRole, dataNascimento } = body;

    // Validate all fields server-side
    const nomeValidado = validateNome(nome);
    const emailValidado = validateEmail(email);
    const senhaValidada = validateSenha(senha);
    const roleValido = validateRegistroRole(requestedRole);

    // Age verification
    if (dataNascimento) {
      const birthDate = new Date(dataNascimento);
      if (isNaN(birthDate.getTime())) {
        return NextResponse.json(
          { error: 'Data de nascimento inválida.' },
          { status: 400 }
        );
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < IDADE_MINIMA_REGISTO) {
        return NextResponse.json(
          { error: `Deve ter pelo menos ${IDADE_MINIMA_REGISTO} anos para se registar.` },
          { status: 400 }
        );
      }
    }

    const userRole: Role = roleValido;

    const existingUser = await db.user.findUnique({ where: { email: emailValidado } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado.' },
        { status: 409 }
      );
    }

    const senha_hash = await hashPassword(senhaValidada);

    const user = await db.user.create({
      data: { nome: nomeValidado, email: emailValidado, senha_hash, role: userRole },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          saldo_carteira: user.saldo_carteira,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}