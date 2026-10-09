import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, hashPassword, verificarAdminActivo } from '@/lib/auth';
import { validateSenha, ehUuid } from '@/lib/validate';

const PAPEIS_VALIDOS = ['LEITOR', 'ESCRITOR', 'ADMIN'];

/**
 * GET /api/admin/utilizadores?q=termo&pagina=N — lista utilizadores paginada
 * (busca por nome, email ou telefone) para o painel admin (crédito directo,
 * verificação de roles). 30 por página — o painel oferece “Carregar mais”.
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    // Dupla verificação: papel no token E papel actual na base de dados
    if (!payload || !(await verificarAdminActivo(payload))) {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() || '';
    const paginaParam = parseInt(request.nextUrl.searchParams.get('pagina') || '1', 10);
    const pagina = Number.isFinite(paginaParam) && paginaParam > 0 ? paginaParam : 1;
    const POR_PAGINA = 30;

    // `mode: 'insensitive'` só existe no PostgreSQL (produção). No SQLite de
    // desenvolvimento a busca é case-sensitive — evita erro 500 em dev.
    const pg = (process.env.DATABASE_URL || '').startsWith('postgres');
    const insensitive = { mode: 'insensitive' as const };
    const where = q
      ? {
          OR: [
            { nome: pg ? { contains: q, ...insensitive } : { contains: q } },
            { email: pg ? { contains: q, ...insensitive } : { contains: q } },
            { telefone: { contains: q } },
          ],
        }
      : {};

    const [utilizadores, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          role: true,
          moedas: true,
          saldo_carteira: true,
          createdAt: true,
          _count: { select: { books: true } },
        },
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      utilizadores,
      pagina,
      total,
      temMais: pagina * POR_PAGINA < total,
    });
  } catch (error) {
    console.error('Erro ao listar utilizadores (admin):', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/utilizadores — gestão de contas pelo admin.
 * Body: { id, acao: 'PAPEL', papel: 'LEITOR'|'ESCRITOR'|'ADMIN' }
 *    ou { id, acao: 'SENHA', novaSenha: string }
 * Regras:
 *   - O admin não pode alterar o próprio papel (evita perder o último admin).
 *   - A nova senha definida pelo admin não exige a senha antiga do utilizador
 *     (útil para suporte; o utilizador pode trocá-la depois em Meu Perfil).
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    // Dupla verificação: papel no token E papel actual na base de dados
    if (!payload || !(await verificarAdminActivo(payload))) {
      return NextResponse.json({ error: 'Acesso restrito ao administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, acao, papel, novaSenha } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Utilizador inválido.' }, { status: 400 });
    }
    if (!ehUuid(id)) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    const alvo = await db.user.findUnique({ where: { id } });
    if (!alvo) {
      return NextResponse.json({ error: 'Utilizador não encontrado.' }, { status: 404 });
    }

    // ===== Mudar papel =====
    if (acao === 'PAPEL') {
      if (!papel || !PAPEIS_VALIDOS.includes(papel)) {
        return NextResponse.json(
          { error: 'Papel inválido. Use LEITOR, ESCRITOR ou ADMIN.' },
          { status: 400 }
        );
      }
      if (alvo.id === payload.userId) {
        return NextResponse.json(
          { error: 'Não pode alterar o seu próprio papel.' },
          { status: 400 }
        );
      }
      if (papel === alvo.role) {
        return NextResponse.json({ ok: true, user: { id: alvo.id, role: alvo.role } });
      }
      const actualizado = await db.user.update({
        where: { id: alvo.id },
        data: { role: papel },
      });
      // AUDITORIA (auditoria 2026-10): mudança de papel fica nos logs do
      // servidor — quem alterou, quem foi alterado, de→para.
      console.log('[AUDIT] admin/utilizadores PAPEL', JSON.stringify({
        actor: payload.userId, alvo: alvo.id, de: alvo.role, para: actualizado.role,
        quando: new Date().toISOString(),
      }));
      return NextResponse.json({ ok: true, user: { id: actualizado.id, role: actualizado.role } });
    }

    // ===== Redefinir senha =====
    if (acao === 'SENHA') {
      // SEGURANÇA (auditoria 2026-10 A4): a senha de uma conta ADMIN só muda
      // pela própria conta (/api/conta, que exige a senha actual) — impede um
      // admin comprometido de sequestrar silenciosamente outros administradores.
      if (alvo.role === 'ADMIN') {
        return NextResponse.json(
          { error: 'A senha de um administrador só pode ser alterada pela própria conta, em Conta.' },
          { status: 403 }
        );
      }
      const senhaValidada = validateSenha(novaSenha);
      const senha_hash = await hashPassword(senhaValidada);
      await db.user.update({
        where: { id: alvo.id },
        data: { senha_hash },
      });
      // AUDITORIA: quem redefiniu a senha de quem (sem dados sensíveis no log)
      console.log('[AUDIT] admin/utilizadores SENHA', JSON.stringify({
        actor: payload.userId, alvo: alvo.id, quando: new Date().toISOString(),
      }));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Acção inválida. Use PAPEL ou SENHA.' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro ao gerir utilizador (admin):', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
