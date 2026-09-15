'use client';

import { useEffect } from 'react';

/**
 * Registo do service worker (item 22 — PWA offline).
 * Silencioso: só corre em produção e https/localhost; qualquer falha é
 * ignorada — o app nunca depende do SW para funcionar.
 */
export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    const registrar = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // falha do SW não pode afectar a experiência normal
      });
    };

    if (document.readyState === 'complete') {
      registrar();
      return;
    }
    window.addEventListener('load', registrar, { once: true });
    return () => window.removeEventListener('load', registrar);
  }, []);

  return null;
}
