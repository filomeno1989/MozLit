/**
 * MOZLIT SERVICE WORKER (item 22 — sensação de app profissional)
 *
 * Estratégias, por ordem de importância:
 *   1. Navegações (abrir/recarregar páginas): rede primeiro; sem rede ->
 *      página offline bonita (nunca um erro bruto do navegador).
 *   2. Estáticos com hash (_next/static) e imagens/fontes/ícones: cache
 *      primeiro + actualização em segundo plano (instantâneo e sempre fresco).
 *   3. /api/*: NUNCA é cacheado — dados de saldo/compras têm de ser reais.
 *
 * Versão: incrementar MOZLIT_CACHE_VERSION limpa caches antigos na activação.
 */
const MOZLIT_CACHE_VERSION = 'mozlit-v1';
const CACHE_NAVEGACAO = `${MOZLIT_CACHE_VERSION}-navegacao`;
const CACHE_ESTATICOS = `${MOZLIT_CACHE_VERSION}-estaticos`;

const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/placeholder-cover.svg',
];

const ESTATICO_RE = /\.(css|js|mjs|svg|png|jpg|jpeg|gif|webp|avif|ico|woff|woff2|ttf)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAVEGACAO);
      // addAll em grupo falha inteiro se um item falhar — entra item a item
      await Promise.allSettled(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter((n) => n.startsWith('mozlit-') && n !== CACHE_NAVEGACAO && n !== CACHE_ESTATICOS)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return; // supabase/imagens externas passam direto
  if (url.pathname.startsWith('/api/')) return; // dados reais, nunca cache

  // 1) Navegações: rede primeiro, offline.html como rede de segurança
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const resposta = await fetch(req);
          const cache = await caches.open(CACHE_NAVEGACAO);
          cache.put('/', resposta.clone()).catch(() => {});
          return resposta;
        } catch {
          const cache = await caches.open(CACHE_NAVEGACAO);
          return (
            (await cache.match('/offline.html')) ||
            (await cache.match('/')) ||
            new Response('<h1>Sem ligação</h1>', {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
              status: 503,
            })
          );
        }
      })()
    );
    return;
  }

  // 2) Estáticos com hash + imagens/fontes: cache primeiro, refresh em fundo
  if (url.pathname.startsWith('/_next/static/') || ESTATICO_RE.test(url.pathname) || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_ESTATICOS);
        const emCache = await cache.match(req);
        const rede = fetch(req)
          .then((resposta) => {
            if (resposta && resposta.ok) cache.put(req, resposta.clone()).catch(() => {});
            return resposta;
          })
          .catch(() => undefined);
        return emCache || (await rede) || Response.error();
      })()
    );
    return;
  }

  // 3) Restantes GETs próprios (rsc, rotas internas): rede primeiro, cache de socorro
  event.respondWith(
    (async () => {
      try {
        const resposta = await fetch(req);
        if (resposta && resposta.ok) {
          const cache = await caches.open(CACHE_NAVEGACAO);
          cache.put(req, resposta.clone()).catch(() => {});
        }
        return resposta;
      } catch {
        const cache = await caches.open(CACHE_NAVEGACAO);
        const emCache = await cache.match(req);
        if (emCache) return emCache;
        if (req.headers.get('accept')?.includes('text/html')) {
          return (await cache.match('/offline.html')) || Response.error();
        }
        return Response.error();
      }
    })()
  );
});
