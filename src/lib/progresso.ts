/**
 * PROGRESSO DE LEITURA (item 15 — "Continuar a ler")
 *
 * Guarda no DISPOSITIVO (localStorage, por utilizador) onde cada leitor parou:
 * livro, capítulo/secção, posição na obra e percentagem de scroll do capítulo.
 * Nunca sai do dispositivo — sem custos de base de dados e instantâneo.
 *
 * O cartão "Continuar a ler" da home e o botão na página do livro usam estes
 * dados; a capa/título frescos vêm da API no momento da exibição (para refletir
 * capas actualizadas e obras despublicadas — se a API falhar, o cartão some).
 */

export interface ItemProgresso {
  bookId: string;
  /** Último capítulo lido (se era um capítulo) */
  capituloId?: string;
  /** Ou secção de abertura/epílogo (ficha_tecnica, dedicatoria, epigrafe, epilogo) */
  section?: string;
  /** Título do capítulo ou label da secção — para exibir "Cap. 3 · O Regresso" */
  label?: string;
  /** Posição do capítulo na lista visível (1-based) */
  posicao?: number;
  /** Total de capítulos visíveis — permite calcular % sem pedir à API */
  totalCapitulos?: number;
  /** Posição de scroll dentro do capítulo, 0..1 — para retomar exactamente */
  scrollPct?: number;
  actualizadoEm: number;
}

const PREFIXO = 'mozlit_progresso_';

function chave(userId: string | undefined | null): string {
  return `${PREFIXO}${userId || 'anon'}`;
}

export function lerProgressos(userId: string | undefined | null): Record<string, ItemProgresso> {
  if (typeof window === 'undefined') return {};
  try {
    const bruto = localStorage.getItem(chave(userId));
    if (!bruto) return {};
    const dados = JSON.parse(bruto);
    return dados && typeof dados === 'object' ? (dados as Record<string, ItemProgresso>) : {};
  } catch {
    return {};
  }
}

export function lerProgresso(userId: string | undefined | null, bookId: string): ItemProgresso | null {
  return lerProgressos(userId)[bookId] || null;
}

/** Entrada mais recente de todas — para o cartão "Continuar a ler" da home */
export function progressoMaisRecente(userId: string | undefined | null): ItemProgresso | null {
  const todos = Object.values(lerProgressos(userId));
  if (todos.length === 0) return null;
  return todos.reduce((a, b) => (b.actualizadoEm > a.actualizadoEm ? b : a));
}

/** Guarda (ou actualiza) o progresso de um livro. Falhas são silenciosas. */
export function guardarProgresso(
  userId: string | undefined | null,
  item: Omit<ItemProgresso, 'actualizadoEm'>
): void {
  if (typeof window === 'undefined' || !item?.bookId) return;
  try {
    const todos = lerProgressos(userId);
    todos[item.bookId] = { ...todos[item.bookId], ...item, actualizadoEm: Date.now() };
    localStorage.setItem(chave(userId), JSON.stringify(todos));
  } catch {
    // quota cheia / modo privado — nunca deve quebrar a leitura
  }
}

/** Guarda apenas a posição de scroll (throttle feito por quem chama) */
export function guardarScroll(userId: string | undefined | null, bookId: string, scrollPct: number): void {
  if (typeof window === 'undefined' || !bookId) return;
  try {
    const todos = lerProgressos(userId);
    const item = todos[bookId];
    if (!item) return;
    item.scrollPct = Math.min(1, Math.max(0, scrollPct));
    item.actualizadoEm = Date.now();
    localStorage.setItem(chave(userId), JSON.stringify(todos));
  } catch {
    // silencioso
  }
}

/** O leitor decidiu esquecer este livro (botão X no cartão) */
export function limparProgresso(userId: string | undefined | null, bookId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const todos = lerProgressos(userId);
    delete todos[bookId];
    localStorage.setItem(chave(userId), JSON.stringify(todos));
  } catch {
    // silencioso
  }
}

/** % da obra concluída (0..100) — combina posição do capítulo com o scroll */
export function percentagemObra(p: ItemProgresso): number {
  if (!p.totalCapitulos || p.totalCapitulos <= 0) return 0;
  if (!p.posicao || p.posicao <= 0) {
    // Secções de abertura (ficha/dedicatória) contam como quase início
    return p.section ? 2 : 0;
  }
  const dentro = (p.scrollPct || 0);
  const bruto = ((p.posicao - 1 + dentro) / p.totalCapitulos) * 100;
  return Math.min(100, Math.max(0, Math.round(bruto)));
}

/** "há 5 min", "há 2 h", "há 3 dias" — pt-MZ, sem dependências */
export function haQuanto(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  const m = Math.floor(d / 30);
  if (m < 12) return `há ${m} ${m === 1 ? 'mês' : 'meses'}`;
  const a = Math.floor(m / 12);
  return `há ${a} ${a === 1 ? 'ano' : 'anos'}`;
}
