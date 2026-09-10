import type { MetadataRoute } from 'next';

/**
 * Manifest PWA — torna o MozLit instalável no ecrã principal (público mobile).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MozLit — Plataforma Literária Moçambicana',
    short_name: 'MozLit',
    description:
      'Descubra, leia e publique literatura moçambicana.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fffbeb',
    theme_color: '#d97706',
    lang: 'pt',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
