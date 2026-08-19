import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, type Role } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, email, senha, role: requestedRole } = body;

    if (!nome || !email || !senha) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    // Only allow LEITOR or ESCRITOR from client; ADMIN is server-only
    const safeRoles: Role[] = ['LEITOR', 'ESCRITOR'];
    const userRole: Role = safeRoles.includes(requestedRole) ? requestedRole : 'LEITOR';

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado.' },
        { status: 409 }
      );
    }

    const senha_hash = await hashPassword(senha);

    const user = await db.user.create({
      data: { nome, email, senha_hash, role: userRole },
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
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}