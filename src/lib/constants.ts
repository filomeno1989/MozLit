export const CATEGORIAS_SUGESTOES = [
  'Ficção', 'Poesia', 'Drama', 'Contos', 'Romance', 'História', 'Ensaio',
  'Autobiografia', 'Infanto-Juvenil', 'Ficção Científica', 'Terror',
  'Suspense', 'Religioso', 'Filosofia', 'Crónica', 'Teatro',
];

export type SectionKey = 'ficha_tecnica' | 'dedicatoria' | 'epigrafe' | 'epilogo';

export const SECTION_LABELS: Record<SectionKey, { label: string; hint: string; icon: string }> = {
  ficha_tecnica: {
    label: 'Ficha Técnica',
    hint: 'ISBN, editora, ano de publicação, edição, etc.',
    icon: '\u{1F4CB}',
  },
  dedicatoria: {
    label: 'Dedicatória',
    hint: 'A quem o autor dedica a obra (ex: \"A minha mãe...\")',
    icon: '\u{1F48C}',
  },
  epigrafe: {
    label: 'Epígrafe',
    hint: 'Citação ou frase inspiradora no início da obra.',
    icon: '\u{1F4AC}',
  },
  epilogo: {
    label: 'Epílogo',
    hint: 'Texto final do autor, notas, agradecimentos.',
    icon: '\u{1F4DD}',
  },
};
