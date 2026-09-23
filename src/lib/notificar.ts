/**
 * NOTIFICAÇÕES IN-APP — lado do servidor (item 24, Fase 5: Social & Descoberta)
 *
 * Regras de ouro:
 *  1. Uma falha de notificação NUNCA rebenta a operação principal (compra,
 *     publicação, seguir) — tudo é engolido com log.
 *  2. O actor não é notificado pelas suas próprias acções.
 *  3. Textos curtos: titulo ≤ 200, corpo ≤ 500 (a BD também limita).
 */

import { db } from '@/lib/db';

export type TipoNotificacao =
  | 'SEGUIDOR_NOVO'   // alguém começou a seguir o autor
  | 'OBRA_NOVA'       // autor seguido publicou uma nova obra
  | 'CAPITULO_NOVO'   // autor seguido adicionou capítulo a obra publicada
  | 'COMENTARIO'      // comentaram num capítulo da obra do utilizador
  | 'RESPOSTA'        // responderam a um comentário do utilizador
  | 'RECARGA';        // recarga aprovada/rejeitada

export interface DadosNotificacao {
  tipo: TipoNotificacao;
  titulo: string;
  corpo?: string;
  livroId?: string | null;
  capituloId?: string | null;
  /** Quem originou (perfil clicável). Em notificarSeguidores é o próprio autor. */
  autorId?: string | null;
}

function dadosLimpos(dados: DadosNotificacao, autorId: string | null) {
  return {
    tipo: dados.tipo,
    titulo: (dados.titulo || '').trim().slice(0, 200),
    corpo: (dados.corpo || '').trim().slice(0, 500),
    livroId: dados.livroId || null,
    capituloId: dados.capituloId || null,
    autorId: autorId ?? dados.autorId ?? null,
  };
}

/** Cria uma notificação para um utilizador. Nunca lança. */
export async function notificar(userId: string, dados: DadosNotificacao): Promise<void> {
  try {
    if (!userId || !(dados.titulo || '').trim()) return;
    await db.notificacao.create({
      data: { userId, ...dadosLimpos(dados, null) },
    });
  } catch (err) {
    console.error('[MozLit] Notificação falhou (não bloqueia):', err instanceof Error ? err.message : err);
  }
}

/**
 * Notifica todos os seguidores de um autor (excepto o próprio e quem originou).
 * Usado na publicação de obras/capítulos — createMany em lote única.
 */
export async function notificarSeguidores(
  autorId: string,
  dados: DadosNotificacao,
  exceptoUserId?: string
): Promise<void> {
  try {
    if (!autorId || !(dados.titulo || '').trim()) return;
    const seguidores = await db.seguidor.findMany({
      where: { autorId },
      select: { seguidorId: true },
    });
    const alvos = seguidores
      .map((s) => s.seguidorId)
      .filter((id) => id !== autorId && id !== exceptoUserId);
    if (alvos.length === 0) return;

    const base = dadosLimpos(dados, autorId);
    await db.notificacao.createMany({
      data: alvos.map((userId) => ({ userId, ...base })),
    });
  } catch (err) {
    console.error('[MozLit] Notificação a seguidores falhou (não bloqueia):', err instanceof Error ? err.message : err);
  }
}

/**
 * Notifica TODOS os utilizadores registados (excepto o autor e quem originou).
 * Usado na publicação de uma obra NOVA: numa plataforma em crescimento, os
 * seguidores de cada autor são ainda poucos — a comunidade inteira merece
 * saber que há literatura fresca. Capítulos novos continuam só para
 * seguidores (senão o sino vira spam).
 */
export async function notificarTodosLeitores(
  autorId: string,
  dados: DadosNotificacao,
  exceptoUserId?: string
): Promise<void> {
  try {
    if (!autorId || !(dados.titulo || '').trim()) return;
    const utilizadores = await db.user.findMany({
      where: { id: { not: autorId } },
      select: { id: true },
    });
    const alvos = utilizadores
      .map((u) => u.id)
      .filter((id) => id !== exceptoUserId);
    if (alvos.length === 0) return;

    const base = dadosLimpos(dados, autorId);
    await db.notificacao.createMany({
      data: alvos.map((userId) => ({ userId, ...base })),
    });
  } catch (err) {
    console.error('[MozLit] Notificação a todos os leitores falhou (não bloqueia):', err instanceof Error ? err.message : err);
  }
}
