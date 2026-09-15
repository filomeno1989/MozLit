/**
 * PREFERÊNCIAS DE LEITURA (item 16 — controlos de fonte/sépia do leitor)
 *
 * Guardadas no dispositivo (chave única — gosto de leitura é do ecrã, não da
 * conta). O tema do leitor é independente do tema do app: um leitor pode ter
 * o app em claro e ler em sépia, como nos apps profissionais (Kindle, Google
 * Play Livros).
 */

export type TemaLeitor = 'claro' | 'sepia' | 'escuro';
export type TipografiaLeitor = 'serif' | 'sans';

export interface PrefsLeitura {
  /** Tamanho da letra dos parágrafos, em px */
  tamanhoFonte: number;
  tema: TemaLeitor;
  tipografia: TipografiaLeitor;
}

export const LEITURA_DEFAULTS: PrefsLeitura = {
  tamanhoFonte: 18,
  tema: 'claro',
  tipografia: 'serif',
};

export const LEITURA_MIN = 15;
export const LEITURA_MAX = 26;

const CHAVE = 'mozlit_leitura_prefs';

export function lerPrefsLeitura(): PrefsLeitura {
  if (typeof window === 'undefined') return { ...LEITURA_DEFAULTS };
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { ...LEITURA_DEFAULTS };
    const p = JSON.parse(bruto);
    return {
      tamanhoFonte:
        typeof p?.tamanhoFonte === 'number'
          ? Math.min(LEITURA_MAX, Math.max(LEITURA_MIN, Math.round(p.tamanhoFonte)))
          : LEITURA_DEFAULTS.tamanhoFonte,
      tema: (['claro', 'sepia', 'escuro'] as const).includes(p?.tema) ? p.tema : LEITURA_DEFAULTS.tema,
      tipografia: p?.tipografia === 'sans' ? 'sans' : 'serif',
    };
  } catch {
    return { ...LEITURA_DEFAULTS };
  }
}

export function guardarPrefsLeitura(prefs: PrefsLeitura): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(prefs));
  } catch {
    // silencioso — preferências nunca devem quebrar a leitura
  }
}

/** Variáveis CSS por tema — aplicadas na raiz do leitor (barra, artigo e nav) */
export const TEMAS_LEITOR: Record<TemaLeitor, {
  bg: string; fg: string; suave: string; borda: string; acento: string; marca: string; nome: string;
}> = {
  claro: {
    bg: '#ffffff',
    fg: '#27272a',
    suave: '#71717a',
    borda: 'rgba(39,39,42,0.12)',
    acento: '#b45309', // amber-700 — legível sobre papel branco
    marca: 'rgba(39,39,42,0.045)',
    nome: 'Claro',
  },
  sepia: {
    bg: '#f4ecd8',
    fg: '#4a3b28',
    suave: '#8a7355',
    borda: 'rgba(74,59,40,0.18)',
    acento: '#92400e', // amber-800 — contraste suficiente sobre sépia
    marca: 'rgba(74,59,40,0.05)',
    nome: 'Sépia',
  },
  escuro: {
    bg: '#1b1917', // stone-900 quente — menos cansativo que preto puro
    fg: '#e7e5e4',
    suave: '#a8a29e',
    borda: 'rgba(231,229,228,0.14)',
    acento: '#fbbf24', // amber-400 — brilha no escuro
    marca: 'rgba(231,229,228,0.05)',
    nome: 'Escuro',
  },
};

export function familiaFonte(tipografia: TipografiaLeitor): string {
  return tipografia === 'sans'
    ? "var(--font-inter), system-ui, -apple-system, sans-serif"
    : "var(--font-lora), Georgia, 'Times New Roman', serif";
}
