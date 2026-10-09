import { describe, it, expect } from 'vitest';
import {
  ehUuid,
  validateEmail,
  validateSenha,
  validateNome,
  validateTelefone,
  validateDataNascimento,
  validarUrlImagemSegura,
  validateCategorias,
  validateCreditoAdmin,
  validateDeposito,
  validateMoedasRecarga,
  validateConteudoCapitulo,
  sanitizeConteudoHtml,
  ValidationError,
} from '../validate';

/**
 * Testes unitários de validação e sanitização (auditoria 2026-10, fase 2).
 * Inclui os validadores NOVOS nascidos da auditoria: validateDataNascimento
 * (idade mínima no servidor) e validarUrlImagemSegura (https-only).
 */

describe('ehUuid', () => {
  it('aceita UUID v4 válido', () => {
    expect(ehUuid('6f2c8e0a-1b2c-4d3e-8f9a-0b1c2d3e4f5a')).toBe(true);
    expect(ehUuid('6F2C8E0A-1B2C-4D3E-8F9A-0B1C2D3E4F5A')).toBe(true);
  });
  it('rejeita strings malformadas (evitavam 500 do Prisma)', () => {
    expect(ehUuid('')).toBe(false);
    expect(ehUuid('nao-e-uuid')).toBe(false);
    expect(ehUuid('1')).toBe(false);
    expect(ehUuid(null)).toBe(false);
    expect(ehUuid(undefined)).toBe(false);
    expect(ehUuid("x' OR 1=1 --")).toBe(false);
  });
});

describe('validateEmail', () => {
  it('normaliza e aceita emails válidos', () => {
    expect(validateEmail('  Leitor@Exemplo.COM ')).toBe('leitor@exemplo.com');
  });
  it('rejeita emails malformados', () => {
    expect(() => validateEmail('sem-arroba')).toThrow(ValidationError);
    expect(() => validateEmail('a b@c.com')).toThrow(ValidationError);
  });
  it('vazio devolve null (campo opcional)', () => {
    expect(validateEmail('')).toBeNull();
    expect(validateEmail(null)).toBeNull();
  });
});

describe('validateSenha', () => {
  it('rejeita senha curta', () => {
    expect(() => validateSenha('a1')).toThrow(ValidationError);
  });
  it('aceita senha com o mínimo de caracteres', () => {
    expect(validateSenha('abc123')).toBe('abc123');
  });
});

describe('validateNome', () => {
  it('rejeita nome vazio ou só espaços', () => {
    expect(() => validateNome('   ')).toThrow(ValidationError);
  });
  it('corta espaços e aceita nomes compostos', () => {
    expect(validateNome('  José Craveirinha ')).toBe('José Craveirinha');
  });
});

describe('validateTelefone', () => {
  it('aceita número internacional moçambicano e normaliza zeros', () => {
    expect(validateTelefone('+258841234567')).toBe('+258841234567');
    expect(validateTelefone('+258 84 123 4567')).toBe('+258841234567');
  });
  it('aceita número local com dial e normaliza 0 inicial', () => {
    expect(validateTelefone('0841234567', '+258')).toBe('+258841234567');
  });
  it('rejeita números curtos ou sem dial', () => {
    expect(() => validateTelefone('+25812')).toThrow(ValidationError);
    expect(() => validateTelefone('841234567')).toThrow(ValidationError);
  });
});

describe('validateDataNascimento (NOVO — auditoria M1)', () => {
  it('rejeita campo ausente/vazio — antes o controlo de idade era saltado', () => {
    expect(() => validateDataNascimento(undefined)).toThrow(ValidationError);
    expect(() => validateDataNascimento('')).toThrow(/obrigat/);
    expect(() => validateDataNascimento(null)).toThrow(ValidationError);
  });
  it('rejeita data inválida e futura', () => {
    expect(() => validateDataNascimento('não-é-data')).toThrow(ValidationError);
    expect(() => validateDataNascimento('2100-01-01')).toThrow(/futuro/);
  });
  it('rejeita menor de 13 anos', () => {
    const agora = new Date();
    const menor = new Date(agora.getFullYear() - 10, agora.getMonth(), agora.getDate());
    expect(() => validateDataNascimento(menor.toISOString())).toThrow(/13/);
  });
  it('aceita adulto e devolve Date equivalente', () => {
    const agora = new Date();
    const adulto = new Date(agora.getFullYear() - 25, agora.getMonth(), agora.getDate());
    const resultado = validateDataNascimento(adulto.toISOString());
    expect(resultado.getFullYear()).toBe(adulto.getFullYear());
  });
  it('rejeita data absurdamente antiga (>120 anos)', () => {
    expect(() => validateDataNascimento('1800-01-01')).toThrow(ValidationError);
  });
});

describe('validarUrlImagemSegura (NOVO — auditoria capa/avatar)', () => {
  it('aceita https válido', () => {
    expect(validarUrlImagemSegura('https://x.supabase.co/capa.jpg', 'URL')).toBe(
      'https://x.supabase.co/capa.jpg'
    );
  });
  it('rejeita http, protocol-relative, javascript e data', () => {
    expect(() => validarUrlImagemSegura('http://x.co/c.jpg', 'URL')).toThrow(/https/);
    expect(() => validarUrlImagemSegura('//evil.com/c.jpg', 'URL')).toThrow(/https/);
    expect(() => validarUrlImagemSegura('javascript:alert(1)', 'URL')).toThrow(/https/);
    expect(() => validarUrlImagemSegura('data:image/png;base64,AAAA', 'URL')).toThrow(/https/);
    expect(() => validarUrlImagemSegura('não é url', 'URL')).toThrow(ValidationError);
  });
  it('vazio devolve null (placeholder local entra a seguir)', () => {
    expect(validarUrlImagemSegura('', 'URL')).toBeNull();
    expect(validarUrlImagemSegura(null, 'URL')).toBeNull();
  });
});

describe('validateCategorias', () => {
  it('rejeita categorias desconhecidas (fallback Ficção)', () => {
    expect(validateCategorias(['XPTO'])).toEqual(['Ficção']);
  });
  it('mantém categorias válidas da whitelist', () => {
    const r = validateCategorias(['Ficção', 'Poesia']);
    expect(r).toEqual(['Ficção', 'Poesia']);
  });
  it('rejeita lista acima do máximo', () => {
    expect(() =>
      validateCategorias(['Ficção', 'Poesia', 'Romance', 'Ensaio', 'Teatro', 'Crónica'])
    ).toThrow(ValidationError);
  });
});

describe('validateCreditoAdmin / validateDeposito / validateMoedasRecarga', () => {
  it('credito admin rejeita zero, não-inteiros e valores absurdos', () => {
    expect(() => validateCreditoAdmin(0)).toThrow(ValidationError);
    expect(() => validateCreditoAdmin(1.5)).toThrow(ValidationError);
    expect(() => validateCreditoAdmin(2_000_000)).toThrow(ValidationError);
    expect(validateCreditoAdmin(-50)).toBe(-50);
  });
  it('depósito rejeita negativo/zero e acima do tecto', () => {
    expect(() => validateDeposito(-10)).toThrow(ValidationError);
    expect(() => validateDeposito(999_999)).toThrow(ValidationError);
    expect(validateDeposito(10.555)).toBe(10.56);
  });
  it('recarga rejeita abaixo do mínimo e acima do máximo', () => {
    expect(() => validateMoedasRecarga(1)).toThrow(ValidationError);
    expect(() => validateMoedasRecarga(999_999)).toThrow(ValidationError);
    expect(validateMoedasRecarga(100)).toBe(100);
  });
});

describe('sanitizeConteudoHtml / validateConteudoCapitulo', () => {
  it('remove <script> mantendo texto', () => {
    const saida = sanitizeConteudoHtml('<p>Olá</p><script>alert(1)</script>');
    expect(saida).not.toContain('script');
    expect(saida).not.toContain('alert(1)');
    expect(saida).toContain('Olá');
  });
  it('remove onclick e event handlers', () => {
    const saida = sanitizeConteudoHtml('<p onclick="alert(1)">Texto</p>');
    expect(saida).not.toContain('onclick');
  });
  it('mantém estilos literários da allowlist (font-family, text-align)', () => {
    const saida = sanitizeConteudoHtml(
      '<p style="font-family: Georgia, serif; text-align: center;">Capítulo</p>'
    );
    expect(saida).toContain('font-family');
    expect(saida).toContain('text-align');
  });
  it('remove imagens externas e mantém as da plataforma', () => {
    const comExterna = sanitizeConteudoHtml(
      '<img src="https://evil.com/rastreio.jpg" alt="x">'
    );
    expect(comExterna).not.toContain('evil.com');
    const daPlataforma = sanitizeConteudoHtml(
      '<img src="https://mozlit.vercel.app/ok.jpg" alt="x">'
    );
    expect(daPlataforma).toContain('mozlit.vercel.app');
  });
  it('capítulo: remove script e rejeita vazio', () => {
    expect(() => validateConteudoCapitulo('   ')).toThrow(ValidationError);
    const saida = validateConteudoCapitulo('<p>Conto</p><script>x()</script>');
    expect(saida).not.toContain('script');
  });
});
