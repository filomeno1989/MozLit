import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, verificarAdminActivo } from '@/lib/auth';

/**
 * GET /api/admin/estatisticas — números gerais da plataforma para o painel admin
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

    const [
      totalUsuarios,
      totalLivros,
      totalCapitulos,
      recargasPendentes,
      agregadoMoedas,
      agregadoRecargas,
    ] = await Promise.all([
      db.user.count(),
      db.book.count(),
      db.chapter.count(),
      db.recargaSolicitacao.count({ where: { estado: 'PENDENTE' } }),
      db.user.aggregate({ _sum: { moedas: true } }),
      db.recargaSolicitacao.aggregate({
        where: { estado: 'APROVADA' },
        _sum: { moedas: true, valorMzn: true },
      }),
    ]);

    return NextResponse.json({
      totalUsuarios,
      totalLivros,
      totalCapitulos,
      recargasPendentes,
      moedasEmCirculacao: agregadoMoedas._sum.moedas ?? 0,
      recargasAprovadas: agregadoRecargas._sum.moedas ?? 0,
      receitaMzn: agregadoRecargas._sum.valorMzn ?? 0,
    });
  } catch (error) {
    console.error('Erro nas estatísticas (admin):', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
