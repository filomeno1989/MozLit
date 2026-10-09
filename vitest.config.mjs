import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Suite unitária do MozLit (auditoria 2026-10, fase 2).
 * Testes puros: autenticação (senha/JWT/hierarquia de papéis), validação de
 * entradas e sanitização de HTML. Sem base de dados — as rotas API continuam
 * a ser exercitadas pelo script manual scripts/teste-e2e-conta.mjs.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    // Segredo determinístico para os testes de token (nunca usado em produção)
    env: {
      JWT_SECRET: 'chave-de-teste-unitario-com-pelo-menos-32-caracteres!!',
      NODE_ENV: 'test',
    },
  },
});
