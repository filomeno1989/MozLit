import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  extractTokenFromHeader,
  verifyToken,
  hashPassword,
  verifyPassword,
  generateToken,
} from '@/lib/auth';
import {
  validateNome,
  validateEmail,
  validateTelefone,
  validateSenha,
  validateBiografia,
} from '@/lib/validate';

function formaPublica(u: {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  role: string;
  saldo_carteira: number;
  moedas: number;
  biografia: string;
  createdAt: Date;
}) {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    telefone: u.telefone,
    role: u.role,
    saldo_carteira: u.saldo_carteira,
    moedas: u.moedas,
    biografia: u.biografia,
    createdAt: u.createdAt,
  };
}

/**
 * GET /api/conta — perfil completo do utilizador autenticado (dados de conta).
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ user: formaPublica(user) });
  } catch (error) {
    console.error('Erro ao carregar conta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}

/**
 * PATCH /api/conta — o utilizador edita a própria conta.
 * Aceita: { nome?, email?, telefone?, dial?, biografia?, senhaAtual?, novaSenha? }
 * - email === '' remove o email; telefone === '' remove o telefone.
 * - Mudar a senha exige a senha actual (senhaAtual).
 * - Devolve um token novo quando os dados do payload (email/telefone) mudam.
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    const body = await request.json();
    const { nome, email, telefone, dial, biografia, senhaAtual, novaSenha } = body;

    const dados: {
      nome?: string;
      email?: string | null;
      telefone?: string | null;
      biografia?: string;
      senha_hash?: string;
    } = {};

    // ===== Nome =====
    if (nome !== undefined && nome !== null) {
      dados.nome = validateNome(nome);
    }

    // ===== Biografia =====
    if (biografia !== undefined && biografia !== null) {
      dados.biografia = validateBiografia(biografia);
    }

    // ===== Email =====
    let emailValidado: string | null | undefined;
    if (email !== undefined) {
      emailValidado = email === '' ? null : validateEmail(email);
      if (emailValidado && emailValidado !== user.email) {
        const existente = await db.user.findUnique({ where: { email: emailValidado } });
        if (existente && existente.id !== user.id) {
          return NextResponse.json({ error: 'Este email já está em uso por outra conta.' }, { status: 409 });
        }
      }
      dados.email = emailValidado;
    }

    // ===== Telefone =====
    let telefoneValidado: string | null | undefined;
    if (telefone !== undefined) {
      telefoneValidado = telefone === '' ? null : validateTelefone(telefone, dial);
      if (telefoneValidado && telefoneValidado !== user.telefone) {
        const existente = await db.user.findUnique({ where: { telefone: telefoneValidado } });
        if (existente && existente.id !== user.id) {
          return NextResponse.json({ error: 'Este número de telefone já está em uso por outra conta.' }, { status: 409 });
        }
      }
      dados.telefone = telefoneValidado;
    }

    // ===== Senha =====
    if (novaSenha !== undefined && novaSenha !== '') {
      if (!senhaAtual) {
        return NextResponse.json(
          { error: 'Indique a senha actual para definir uma nova senha.' },
          { status: 400 }
        );
      }
      const senhaActualOk = await verifyPassword(senhaAtual, user.senha_hash);
      if (!senhaActualOk) {
        return NextResponse.json({ error: 'A senha actual está incorrecta.' }, { status: 400 });
      }
      const novaValidada = validateSenha(novaSenha);
      dados.senha_hash = await hashPassword(novaValidada);
    }

    if (Object.keys(dados).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar.' }, { status: 400 });
    }

    const actualizado = await db.user.update({
      where: { id: user.id },
      data: dados,
    });

    // Novo token quando o payload muda (email/telefone) para manter tudo sincronizado
    const novoToken = generateToken({
      userId: actualizado.id,
      email: actualizado.email,
      telefone: actualizado.telefone,
      role: actualizado.role,
    });

    return NextResponse.json({
      user: formaPublica(actualizado),
      token: novoToken,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao actualizar conta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
