import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

/**
 * GET /api/autor/[id] — perfil público de um autor (item 18).
 * Devolve dados do perfil, estatísticas (obras publicadas, seguidores) e a
 * lista de obras PUBLICADAS. Se o pedido tiver sessão iniciada, indica também
 * se o utilizador já segue este autor.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Sessão opcional: leitores anónimos também podem ver o perfil
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    const payload = token ? verifyToken(token) : null;

    const autor = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        biografia: true,
        avatar_url: true,
        role: true,
        createdAt: true,
      },
    });

    if (!autor) {
      return NextResponse.json({ error: 'Autor não encontrado.' }, { status: 404 });
    }

    const [obras, totalSeguidores, jaSegue] = await Promise.all([
      db.book.findMany({
        where: { autorId: id, status: 'PUBLICADO' },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          titulo: true,
          sinopse: true,
          capa_url: true,
          categorias: true,
          status: true,
          preco_total: true,
          faixa_etaria: true,
          volume_info: true,
          createdAt: true,
          _count: { select: { chapters: { where: { arquivado: false } } } },
        },
      }),
      db.seguidor.count({ where: { autorId: id } }),
      payload
        ? db.seguidor.findFirst({
            where: { autorId: id, seguidorId: payload.userId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      autor: {
        id: autor.id,
        nome: autor.nome,
        biografia: autor.biografia,
        avatar_url: autor.avatar_url,
        papel: autor.role,
        membroDesde: autor.createdAt,
      },
      estatisticas: {
        totalObras: obras.length,
        totalSeguidores,
      },
      seguido: !!jaSegue,
      // O próprio autor não se segue — esconder o botão na UI
      eProprioAutor: payload?.userId === id,
      obras: obras.map((b) => ({
        id: b.id,
        titulo: b.titulo,
        sinopse: b.sinopse,
        capa_url: b.capa_url,
        categorias: JSON.parse(b.categorias || '[]'),
        status: b.status,
        preco_total: b.preco_total,
        faixa_etaria: b.faixa_etaria,
        volume_info: b.volume_info,
        totalCapitulos: b._count.chapters,
      })),
    });
  } catch (error) {
    console.error('Erro ao carregar perfil do autor:', error);
    return NextResponse.json({ error: 'Erro ao carregar perfil.' }, { status: 500 });
  }
}
