/**
 * Rede de segurança do autor — "Ninguém perde texto escrito".
 *
 * Rascunhos vivem APENAS no dispositivo (localStorage), com timestamp.
 * Se o navegador fechar, a luz cair ou a sessão expirar a meio da escrita,
 * o texto continua aqui e o editor oferece a recuperação.
 *
 * Falhas silenciosas (modo privado / quota cheia) são deliberadas: o autosave
 * é uma segunda linha de defesa — nunca deve bloquear a escrita.
 */

export interface Rascunho<T> {
  dados: T;
  /** Epoch ms do último guardado */
  guardadoEm: number;
}

/** Chaves por utilizador — rascunhos de um autor nunca vazam para outro */
export const chavesRascunho = {
  novaObra: (userId: string) => `mozlit:rascunho:${userId}:nova-obra`,
  capituloNovo: (userId: string, livroId: string) =>
    `mozlit:rascunho:${userId}:capitulo-novo:${livroId}`,
  capituloEdicao: (userId: string, capituloId: string) =>
    `mozlit:rascunho:${userId}:capitulo-edicao:${capituloId}`,
};

export function guardarRascunho<T>(chave: string, dados: T): void {
  try {
    localStorage.setItem(chave, JSON.stringify({ dados, guardadoEm: Date.now() }));
  } catch {
    // Modo privado do navegador ou quota esgotada — ignorar sem quebrar a escrita
  }
}

export function lerRascunho<T>(chave: string): Rascunho<T> | null {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { dados?: T; guardadoEm?: number };
    if (!parsed || typeof parsed !== 'object' || parsed.dados === undefined) return null;
    return { dados: parsed.dados, guardadoEm: parsed.guardadoEm ?? 0 };
  } catch {
    return null;
  }
}

export function limparRascunho(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    // ignorar
  }
}

/** "hoje às 14:32" ou "12 de Mar às 09:15" — para os indicadores de autosave */
export function formatarMomentoRascunho(ts: number): string {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const agora = new Date();
    const hora = d.toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === agora.toDateString()) return `hoje às ${hora}`;
    const dia = d.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' });
    return `${dia} às ${hora}`;
  } catch {
    return '';
  }
}
