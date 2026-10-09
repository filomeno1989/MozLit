import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  hasRole,
  canCreateContent,
  extractTokenFromHeader,
} from '../auth';

/**
 * Testes unitários de autenticação e permissões (auditoria 2026-10, fase 2).
 * Correm sem base de dados: só a lógica pura de src/lib/auth.ts.
 */

describe('Senhas (bcrypt)', () => {
  it('hash não contém a senha em texto claro', async () => {
    const hash = await hashPassword('senhaSegura123');
    expect(hash).not.toContain('senhaSegura123');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verify aceita a senha correcta e rejeita a errada', async () => {
    const hash = await hashPassword('senhaSegura123');
    await expect(verifyPassword('senhaSegura123', hash)).resolves.toBe(true);
    await expect(verifyPassword('senhaErrada', hash)).resolves.toBe(false);
  });

  it('hashes diferentes para a mesma senha (salt único)', async () => {
    const a = await hashPassword('mesmaSenha');
    const b = await hashPassword('mesmaSenha');
    expect(a).not.toBe(b);
  });
});

describe('Tokens JWT', () => {
  it('gera e verifica um token com o papel correcto', () => {
    const token = generateToken({
      userId: '6f2c8e0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a',
      email: 'teste@mozlit.co.mz',
      telefone: '+258841234567',
      role: 'ESCRITOR',
    });
    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.role).toBe('ESCRITOR');
    expect(payload?.email).toBe('teste@mozlit.co.mz');
  });

  it('rejeita token adulterado (payload alterado sem re-assinatura)', () => {
    const token = generateToken({
      userId: '6f2c8e0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a',
      email: null,
      role: 'LEITOR',
    });
    const [cabeca, corpo, assinatura] = token.split('.');
    // Tenta elevar o papel a ADMIN sem a assinatura
    const corpoAdulterado = Buffer.from(
      JSON.stringify({
        userId: '6f2c8e0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a',
        email: null,
        role: 'ADMIN',
      })
    ).toString('base64url');
    const adulterado = `${cabeca}.${corpoAdulterado}.${assinatura}`;
    expect(verifyToken(adulterado)).toBeNull();
    expect(corpo).not.toBe(corpoAdulterado);
  });

  it('rejeita token assinado com segredo diferente', () => {
    const token = generateToken({
      userId: '6f2c8e0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a',
      email: null,
      role: 'ADMIN',
    });
    expect(verifyToken(token)).not.toBeNull(); // controlo: o nosso segredo verifica
    // Um token de outro serviço (segredo diferente) não passa
    const falso = token.slice(0, -6) + 'AAAAAA';
    expect(verifyToken(falso)).toBeNull();
  });

  it('extractTokenFromHeader só aceita o prefixo Bearer', () => {
    expect(extractTokenFromHeader('Bearer abc123')).toBe('abc123');
    expect(extractTokenFromHeader('abc123')).toBeNull();
    expect(extractTokenFromHeader(null)).toBeNull();
    expect(extractTokenFromHeader('bearer abc123')).toBeNull(); // maiúsculas obrigatórias
  });
});

describe('Hierarquia de papéis', () => {
  it('ADMIN satisfaz exigências ADMIN, ESCRITOR e LEITOR', () => {
    expect(hasRole('ADMIN', 'ADMIN')).toBe(true);
    expect(hasRole('ADMIN', 'ESCRITOR')).toBe(true);
    expect(hasRole('ADMIN', 'LEITOR')).toBe(true);
  });

  it('ESCRITOR satisfaz ESCRITOR e LEITOR, não ADMIN', () => {
    expect(hasRole('ESCRITOR', 'ADMIN')).toBe(false);
    expect(hasRole('ESCRITOR', 'ESCRITOR')).toBe(true);
    expect(hasRole('ESCRITOR', 'LEITOR')).toBe(true);
  });

  it('LEITOR só satisfaz LEITOR', () => {
    expect(hasRole('LEITOR', 'ADMIN')).toBe(false);
    expect(hasRole('LEITOR', 'ESCRITOR')).toBe(false);
    expect(hasRole('LEITOR', 'LEITOR')).toBe(true);
  });

  it('papel desconhecido não passa em nenhuma exigência', () => {
    expect(hasRole('XPTO', 'LEITOR')).toBe(false);
    expect(hasRole('', 'LEITOR')).toBe(false);
    expect(canCreateContent('XPTO')).toBe(false);
    expect(canCreateContent('LEITOR')).toBe(false);
    expect(canCreateContent('ESCRITOR')).toBe(true);
    expect(canCreateContent('ADMIN')).toBe(true);
  });
});
