import {
  CATEGORIAS_VALIDAS,
  type CategoriaValida,
  LIMITES,
  EMAIL_REGEX,
  FAIXAS_ETARIAS,
  type FaixaEtaria,
} from './constants';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Validate and sanitize an email */
export function validateEmail(email: unknown): string {
  if (typeof email !== 'string') throw new ValidationError('Email inválido.');
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > LIMITES.EMAIL_MAX || !EMAIL_REGEX.test(trimmed)) {
    throw new ValidationError('Formato de email inválido.');
  }
  return trimmed;
}

/** Validate a password */
export function validateSenha(senha: unknown): string {
  if (typeof senha !== 'string') throw new ValidationError('Senha inválida.');
  if (senha.length < LIMITES.SENHA_MIN) {
    throw new ValidationError(`A senha deve ter pelo menos ${LIMITES.SENHA_MIN} caracteres.`);
  }
  if (senha.length > LIMITES.SENHA_MAX) {
    throw new ValidationError('Senha demasiado longa.');
  }
  return senha;
}

/** Validate a name */
export function validateNome(nome: unknown): string {
  if (typeof nome !== 'string') throw new ValidationError('Nome inválido.');
  const trimmed = nome.trim();
  if (trimmed.length === 0 || trimmed.length > LIMITES.NOME_MAX) {
    throw new ValidationError('Nome deve ter entre 1 e 100 caracteres.');
  }
  return trimmed;
}

/** Validate a book title */
export function validateTitulo(titulo: unknown): string {
  if (typeof titulo !== 'string') throw new ValidationError('Título inválido.');
  const trimmed = titulo.trim();
  if (trimmed.length === 0 || trimmed.length > LIMITES.TITULO_LIVRO_MAX) {
    throw new ValidationError('Título deve ter entre 1 e 200 caracteres.');
  }
  return trimmed;
}

/** Validate sinopse */
export function validateSinopse(sinopse: unknown): string {
  if (typeof sinopse !== 'string') throw new ValidationError('Sinopse inválida.');
  if (sinopse.length > LIMITES.SINOPSE_MAX) {
    throw new ValidationError(`Sinopse não pode exceder ${LIMITES.SINOPSE_MAX} caracteres.`);
  }
  return sinopse;
}

/** Validate chapter content */
export function validateConteudo(conteudo: unknown): string {
  if (typeof conteudo !== 'string') throw new ValidationError('Conteúdo inválido.');
  if (conteudo.length > LIMITES.CONTEUDO_CAPITULO_MAX) {
    throw new ValidationError('Conteúdo do capítulo excede o limite permitido.');
  }
  return conteudo;
}

/** Validate and sanitize categories array */
export function validateCategorias(categorias: unknown): CategoriaValida[] {
  if (!Array.isArray(categorias) || categorias.length === 0) {
    return ['Ficção'];
  }
  if (categorias.length > LIMITES.CATEGORIAS_MAX) {
    throw new ValidationError(`Máximo de ${LIMITES.CATEGORIAS_MAX} categorias permitidas.`);
  }
  const valid: CategoriaValida[] = [];
  for (const cat of categorias) {
    if (typeof cat === 'string' && (CATEGORIAS_VALIDAS as readonly string[]).includes(cat)) {
      valid.push(cat as CategoriaValida);
    }
  }
  if (valid.length === 0) return ['Ficção'];
  return valid;
}

/** Validate a single category for filtering */
export function validateCategoriaFilter(categoria: unknown): string | null {
  if (typeof categoria !== 'string' || categoria.trim().length === 0) return null;
  const trimmed = categoria.trim();
  if (!(CATEGORIAS_VALIDAS as readonly string[]).includes(trimmed)) return null;
  return trimmed;
}

/** Validate faixa etária */
export function validateFaixaEtaria(faixa: unknown): FaixaEtaria {
  if (typeof faixa !== 'string' || !(FAIXAS_ETARIAS as readonly string[]).includes(faixa)) {
    return 'Livre';
  }
  return faixa as FaixaEtaria;
}

/** Validate volume_info: { numero: number, total: number } or null */
export function validateVolumeInfo(vol: unknown): { numero: number; total: number } | null {
  if (vol === null || vol === undefined) return null;
  if (typeof vol !== 'object' || Array.isArray(vol)) return null;
  const v = vol as Record<string, unknown>;
  const numero = typeof v.numero === 'number' ? Math.floor(v.numero) : 0;
  const total = typeof v.total === 'number' ? Math.floor(v.total) : 0;
  if (numero < 1 || total < 2 || numero > total) return null;
  return { numero, total };
}

/** Validate a numeric deposit value */
export function validateDeposito(valor: unknown): number {
  const num = Number(valor);
  if (!Number.isFinite(num) || num <= 0) {
    throw new ValidationError('Valor de depósito inválido.');
  }
  if (num > LIMITES.DEPOSITO_MAX) {
    throw new ValidationError(`Depósito máximo é de ${LIMITES.DEPOSITO_MAX.toLocaleString('pt-MZ')} MZN.`);
  }
  // Round to 2 decimals
  return Math.round(num * 100) / 100;
}

/** Validate a role from registration */
export function validateRegistroRole(role: unknown): 'LEITOR' | 'ESCRITOR' {
  if (role === 'ESCRITOR') return 'ESCRITOR';
  return 'LEITOR';
}

/** Validate biografia */
export function validateBiografia(bio: unknown): string {
  if (typeof bio !== 'string') return '';
  if (bio.length > LIMITES.BIOGRAFIA_MAX) {
    throw new ValidationError(`Biografia não pode exceder ${LIMITES.BIOGRAFIA_MAX} caracteres.`);
  }
  return bio;
}

/** Validate an uploaded file's mimetype and size */
export function validateImageFile(
  file: File,
  maxSize: number,
  field: string
): void {
  if (!LIMITES.CAPAS_MIMETYPES.includes(file.type)) {
    throw new ValidationError(
      `${field}: formato não suportado. Use JPEG, PNG ou WebP.`
    );
  }
  if (file.size > maxSize) {
    const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
    throw new ValidationError(
      `${field}: ficheiro demasiado grande. Máximo ${maxMB}MB.`
    );
  }
}
