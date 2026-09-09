import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, generateToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido.' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado.' },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado.' },
        { status: 404 }
      );
    }

    // Se o papel mudou na base de dados (ex: bootstrap de admin, alteração no
    // painel), o token antigo ainda trazia o papel velho — emitimos um novo
    // para que as permissões fiquem válidas sem exigir logout/login.
    const roleMudou = user.role !== payload.role;
    const tokenNovo = roleMudou
      ? generateToken({
          userId: user.id,
          email: user.email,
          telefone: user.telefone,
          role: user.role,
        })
      : undefined;

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
      ...(tokenNovo ? { token: tokenNovo } : {}),
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    );
  }
}