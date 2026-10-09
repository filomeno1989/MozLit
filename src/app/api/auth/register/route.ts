import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, type Role } from '@/lib/auth';
import {
  validateNome,
  validateEmail,
  validateTelefone,
  validateSenha,
  validateRegistroRole,
  validateDataNascimento,
} from '@/lib/validate';

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

    // SEGURANÇA (auditoria 2026-10 M1): data de nascimento OBRIGATÓRIA e idade
    // mínima verificadas SEMPRE no servidor — antes, um pedido sem o campo
    // saltava o controlo dos 13 anos (a verificação vivia só na UI).
    const nascimentoValidado = validateDataNascimento(dataNascimento);

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
        data_nascimento: nascimentoValidado,
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
