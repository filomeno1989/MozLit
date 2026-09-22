import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

interface ItemFeed {
  tipo: 'OBRA_NOVA' | 'CAPITULO_NOVO';
  quando: string;
  livro: {
    id: string;
    titulo: string;
    capa_url: string;
    categorias: string[];
    autor: { id: string; nome: string };
  };
  capitulo: { id: string; titulo: string } | null;
}

interface SugestaoAutor {
  id: string;
  nome: string;
  biografia: string;
  avatar_url: string;
  totalObras: number;
  totalSeguidores: number;
}

/**
 * GET /api/feed — Social & Descoberta (item 25)
 *
 *  • Com sessão: as últimas obras e capítulos dos autores que o utilizador
 *    segue, intercalados por data (o que aconteceu mais recente primeiro) +
 *    sugestões de autores a seguir.
 *  • Visitante: apenas sugestões de autores — descoberta desde o 1.º segundo.
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      const sugestoes = await sugerirAutores(null, []);
      return NextResponse.json({ itens: [], sugestoes, totalSeguidos: 0 });
    }

    // Autores que o utilizador segue
    const seguidos = await db.seguidor.findMany({
      where: { seguidorId: payload.userId },
      select: { autorId: true },
    });
    const idsSeguidos = seguidos.map((s) => s.autorId);
    const totalSeguidos = idsSeguidos.length;

    let itens: ItemFeed[] = [];

    if (totalSeguidos > 0) {
      const selectLivro = {
        select: {
          id: true,
          titulo: true,
          capa_url: true,
          categorias: true,
          createdAt: true,
          autor: { select: { id: true, nome: true } },
        },
      } as const;

      // Obras publicadas pelos autores seguidos (mais recentes primeiro)
      const obras = await db.book.findMany({
        where: { autorId: { in: idsSeguidos }, status: 'PUBLICADO' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        ...selectLivro,
      });

      // Capítulos criados dentro de obras publicadas dos seguidos
      const capitulos = await db.chapter.findMany({
        where: {
          arquivado: false,
          livro: { autorId: { in: idsSeguidos }, status: 'PUBLICADO' },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          titulo: true,
          createdAt: true,
          livro: selectLivro,
        },
      });

      const deObras: ItemFeed[] = obras.map((b) => ({
        tipo: 'OBRA_NOVA',
        quando: b.createdAt.toISOString(),
        livro: { ...b, categorias: JSON.parse(b.categorias || '[]') },
        capitulo: null,
      }));

      const deCapitulos: ItemFeed[] = capitulos.map((c) => ({
        tipo: 'CAPITULO_NOVO',
        quando: c.createdAt.toISOString(),
        livro: { ...c.livro, categorias: JSON.parse(c.livro.categorias || '[]') },
        capitulo: { id: c.id, titulo: c.titulo },
      }));

      itens = [...deObras, ...deCapitulos]
        .sort((a, b) => (a.quando < b.quando ? 1 : -1))
        .slice(0, 20);
    }

    const sugestoes = await sugerirAutores(payload.userId, idsSeguidos);

    return NextResponse.json({ itens, sugestoes, totalSeguidos });
  } catch (error) {
    console.error('Erro ao construir o feed:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * Autores sugeridos: primeiro os mais seguidos (descoberta social), completado
 * com escritores com obras publicadas recentes (plataforma nova, poucos
 * seguidores ainda). Exclui quem o utilizador já segue e a própria conta.
 */
async function sugerirAutores(userId: string | null, idsSeguidos: string[]): Promise<SugestaoAutor[]> {
  const jaSeguidos = new Set(idsSeguidos);
  if (userId) jaSeguidos.add(userId);
  const escolhidos = new Map<string, SugestaoAutor>();

  // 1. Autores mais seguidos da plataforma
  const maisSeguidos = await db.seguidor.groupBy({
    by: ['autorId'],
    _count: { autorId: true },
    orderBy: { _count: { autorId: 'desc' } },
    take: 10,
  });

  const idsPopulares = maisSeguidos
    .map((m) => m.autorId)
    .filter((id) => !jaSeguidos.has(id))
    .slice(0, 5);

  if (idsPopulares.length > 0) {
    const populares = await db.user.findMany({
      where: { id: { in: idsPopulares }, role: { in: ['ESCRITOR', 'ADMIN'] } },
      select: { id: true, nome: true, biografia: true, avatar_url: true },
    });
    for (const u of populares) {
      escolhidos.set(u.id, { ...u, totalObras: 0, totalSeguidores: 0 });
      if (escolhidos.size >= 5) break;
    }
  }

  // 2. Menos de 5? Completar com escritores com obras publicadas recentes
  if (escolhidos.size < 5) {
    const ativos = await db.user.findMany({
      where: {
        role: { in: ['ESCRITOR', 'ADMIN'] },
        id: { notIn: Array.from(jaSeguidos) },
        books: { some: { status: 'PUBLICADO' } },
      },
      select: { id: true, nome: true, biografia: true, avatar_url: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });
    for (const u of ativos) {
      if (escolhidos.has(u.id)) continue;
      escolhidos.set(u.id, { ...u, totalObras: 0, totalSeguidores: 0 });
      if (escolhidos.size >= 5) break;
    }
  }

  const ids = Array.from(escolhidos.keys());
  if (ids.length === 0) return [];

  // Contagens em 2 consultas (obras publicadas e seguidores por autor)
  const [obras, seguidores] = await Promise.all([
    db.book.groupBy({
      by: ['autorId'],
      _count: { autorId: true },
      where: { autorId: { in: ids }, status: 'PUBLICADO' },
    }),
    db.seguidor.groupBy({
      by: ['autorId'],
      _count: { autorId: true },
      where: { autorId: { in: ids } },
    }),
  ]);
  const obrasMap = new Map(obras.map((o) => [o.autorId, o._count.autorId]));
  const segMap = new Map(seguidores.map((s) => [s.autorId, s._count.autorId]));

  return ids.map((id) => ({
    ...escolhidos.get(id)!,
    totalObras: obrasMap.get(id) ?? 0,
    totalSeguidores: segMap.get(id) ?? 0,
  }));
}
