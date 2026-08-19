// ===================== VALIDATION CONSTANTS =====================

/** Categorias literárias aceites */
export const CATEGORIAS_VALIDAS = [
  'Ficção',
  'Poesia',
  'Drama',
  'Ensaio',
  'Conto',
  'Romance',
  'Crónica',
  'Memórias',
  'Infanto-Juvenil',
  'Ficção Científica',
  'Terror',
  'Suspense',
  'História',
  'Religião',
  'Autoajuda',
  'Académico',
  'Biografia',
  'Banda Desenhada',
  'Mitologia',
  'Fábula',
] as const;

export type CategoriaValida = (typeof CATEGORIAS_VALIDAS)[number];

/** Limites de tamanho para inputs */
export const LIMITES = {
  NOME_MAX: 100,
  EMAIL_MAX: 254,
  SENHA_MIN: 6,
  SENHA_MAX: 128,
  TITULO_LIVRO_MAX: 200,
  TITULO_CAPITULO_MAX: 200,
  SINOPSE_MAX: 5000,
  CONTEUDO_CAPITULO_MAX: 500_000, // ~500KB de texto
  BIOGRAFIA_MAX: 2000,
  COMENTARIO_MIN: 2,
  COMENTARIO_MAX: 1000,
  DEPOSITO_MAX: 100_000, // 100.000 MZN
  CAPAS_MIMETYPES: ['image/jpeg', 'image/png', 'image/webp'],
  CAPA_MAX_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  AVATAR_MAX_SIZE_BYTES: 1 * 1024 * 1024, // 1MB
  CATEGORIAS_MAX: 5,
} as const;

/** Regex de validação de email */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Faixas etárias aceites para classificação de livros */
export const FAIXAS_ETARIAS = [
  'Livre',
  '10+',
  '12+',
  '14+',
  '16+',
  '18+',
] as const;

export type FaixaEtaria = (typeof FAIXAS_ETARIAS)[number];

/** Idade mínima para registo na plataforma */
export const IDADE_MINIMA_REGISTO = 13;

/** Sistema de moedas */
export const MOEDAS_CONFIG = {
  NOME: 'Moedas',
  SIMBOLO: 'MC',
  TAXA_CONVERSAO: 10, // 1 MZN = 10 Moedas
  PACOTES: [
    { mzn: 50, moedas: 500, bonus: 0 },
    { mzn: 100, moedas: 1000, bonus: 50 },
    { mzn: 250, moedas: 2500, bonus: 200 },
    { mzn: 500, moedas: 5000, bonus: 500 },
  ],
} as const;

/** Converter MZN para Moedas */
export function mznParaMoedas(mzn: number): number {
  return Math.round(mzn * MOEDAS_CONFIG.TAXA_CONVERSAO);
}

/** Converter Moedas para MZN (para exibição) */
export function moedasParaMzn(moedas: number): number {
  return moedas / MOEDAS_CONFIG.TAXA_CONVERSAO;
}

/** Formatar preço em moedas para exibição */
export function formatarMoedas(moedas: number): string {
  return `${moedas.toLocaleString('pt-MZ')} ${MOEDAS_CONFIG.SIMBOLO}`;
}

/** Alias para uso no frontend */
export const CATEGORIAS_SUGESTOES = CATEGORIAS_VALIDAS;

/** Section keys para secções opcionais do livro */
export type SectionKey = 'ficha_tecnica' | 'dedicatoria' | 'epigrafe' | 'epilogo';

/** Labels e hints para secções opcionais */
export const SECTION_LABELS: Record<SectionKey, { label: string; hint: string; icon: string }> = {
  ficha_tecnica: { label: 'Ficha Técnica', hint: 'Dados sobre a obra (ISBN, editora, ano, etc.)', icon: '📋' },
  dedicatoria: { label: 'Dedicatória', hint: 'Dedique a obra a alguém especial', icon: '💝' },
  epigrafe: { label: 'Epígrafe', hint: 'Uma citação ou frase de abertura', icon: '💬' },
  epilogo: { label: 'Epílogo', hint: 'Considerações finais do autor', icon: '📔' },
};
