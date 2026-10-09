import { createRequire } from 'node:module';

/**
 * validate.ts usa require('sanitize-html') dentro de sanitizeConteudoHtml
 * (padrão CJS que o Next bundla sem problema). O vitest corre ESM, onde
 * «require» não existe: forneço-o via createRequire para os testes correrem
 * contra o MESMO código de produção.
 */
const g = globalThis as { require?: NodeRequire };
if (typeof g.require === 'undefined') {
  g.require = createRequire(import.meta.url);
}
