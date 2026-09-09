import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, type Role } from '@/lib/auth';
import {
  validateNome,
  validateEmail,
  validateTelefone,
  validateSenha,
  validateRegistroRole,
} from '@/lib/validate';
import { IDADE_MINIMA_REGISTO } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, telefone, dial, senha, role: requestedRole, dataNascimento } = body;

    // Validação de campos
    const nomeValidado = validateNome(nome);
    const senhaValidada = validateSenha(senha);
    const roleValido = validateRegistroRole(requestedRole);

    // Contacto: telefone (prioritário) OU email — pelo menos um é obrigatório
    const telefoneValidado = telefone ? validateTelefone(telefone, dial) : null;
    const emailValidado = email ? validateEmail(email) : null;
    if (!telefoneValidado && !emailValidado) {
      return NextResponse.json(
        { error: 'Forneça um número de telefone ou um email para criar a conta.' },
        { status: 400 }
      );
    }

    // Verificação de idade
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

    // Unicidade de telefone e email
    if (telefoneValidado) {
      const existingByPhone = await db.user.findUnique({ where: { telefone: telefoneValidado } });
      if (existingByPhone) {
        return NextResponse.json(
          { error: 'Este número de telefone já está registado.' },
          { status: 409 }
        );
      }
    }
    if (emailValidado) {
      const existingByEmail = await db.user.findUnique({ where: { email: emailValidado } });
      if (existingByEmail) {
        return NextResponse.json(
          { error: 'Este email já está cadastrado.' },
          { status: 409 }
        );
      }
    }

    const senha_hash = await hashPassword(senhaValidada);

    const user = await db.user.create({
      data: {
        nome: nomeValidado,
        ...(emailValidado ? { email: emailValidado } : {}),
        ...(telefoneValidado ? { telefone: telefoneValidado } : {}),
        senha_hash,
        role: userRole,
        ...(dataNascimento ? { data_nascimento: new Date(dataNascimento) } : {}),
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      telefone: user.telefone,
      role: user.role,
    });

    return NextResponse.json(
      {
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
