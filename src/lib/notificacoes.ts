/**
 * NOTIFICAÇÃO DE RECARGAS (item 19 — o leitor fica a saber que as MC chegaram)
 *
 * O admin aprova/rejeita recargas manualmente. Antes, o utilizador só sabia
 * se abrisse a Carteira. Agora: no arranque do app (e a cada 30s com sessão
 * activa) comparamos as recargas processadas com a marca temporal "visto"
 * guardada no dispositivo — tudo o que mudou de estado ganha um toast, com
 * atalho para a Carteira.
 */

export interface RecargaParaNotificar {
  id: string;
  moedas: number;
  estado: string;
  notaAdmin?: string | null;
  processadaEm?: string | null;
}

const PREFIXO = 'mozlit_recargas_vistas_';

function chave(userId: string): string {
  return `${PREFIXO}${userId}`;
}

export function ultimoVistoRecargas(userId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const v = Number(localStorage.getItem(chave(userId)) || '0');
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

/**
 * Recargas cujo estado deixou de ser PENDENTE depois da última verificação
 * (ou que ainda não têm registo de visto — 1.ª vez usa "agora" para não
 * bombardear utilizadores antigos com histórico acumulado).
 */
export function recargasNaoVistas(userId: string, recargas: RecargaParaNotificar[]): RecargaParaNotificar[] {
  if (typeof window === 'undefined' || !userId) return [];
  const visto = ultimoVistoRecargas(userId);
  const agora = Date.now();
  if (!visto) {
    // 1.ª vez neste dispositivo: marca tudo como visto sem notificar
    marcarRecargasVistas(userId, agora);
    return [];
  }
  return recargas.filter((r) => {
    if (!r || r.estado === 'PENDENTE' || r.estado === 'CANCELADA') return false;
    const quando = r.processadaEm ? new Date(r.processadaEm).getTime() : 0;
    if (!quando) return false;
    return quando > visto && quando <= agora;
  });
}

export function marcarRecargasVistas(userId: string, momento?: number): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(chave(userId), String(momento ?? Date.now()));
  } catch {
    // silencioso
  }
}
