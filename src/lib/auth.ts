import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * SEGURANÇA: o JWT_SECRET é obrigatório em produção. Se faltar (ou for curto),
 * as operações de assinatura/verificação FALHAM (fail-closed) — nunca assinar
 * tokens com uma chave conhecida. A verificação é feita no pedido (e não no
 * arranque) para o build não exigir segredos no ambiente de compilação.
 * Em desenvolvimento local permite-se uma chave fraca apenas para conveniência.
 */
function segredoJwt(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[MozLit] JWT_SECRET ausente ou demasiado curto (mín. 32 caracteres). ' +
        'Defina-a nas variáveis de ambiente da Vercel.'
      );
    }
    console.error('[SECURITY] JWT_SECRET ausente/fraca — a usar chave de desenvolvimento.');
    return 'mozlit-dev-insecure-secret-mudar-em-producao';
  }
  return secret;
}

export interface JwtPayload {
  userId: string;
  email: string | null;
  telefone?: string | null;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, segredoJwt(), { expiresIn: '7d', algorithm: 'HS256' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    // Algoritmo fixo: impede ataques de confusão de algoritmo (ex: "none", RS256)
    return jwt.verify(token, segredoJwt(), { algorithms: ['HS256'] }) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Lê o papel ACTUAL do utilizador na base de dados (não no token JWT).
 * Usado nas rotas administrativas: um token antigo (até 7 dias) de um
 * utilizador despromovido deixa de ter poder de administrador de imediato.
 */
export async function papelActualNaBD(userId: string): Promise<string | null> {
  try {
    const { db } = await import('@/lib/db');
    const u = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
    return u?.role ?? null;
  } catch {
    return null;
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export type Role = 'ADMIN' | 'ESCRITOR' | 'LEITOR';

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  ESCRITOR: 2,
  LEITOR: 1,
};

export function hasRole(userRole: string, requiredRole: Role): boolean {
  return (ROLE_HIERARCHY[userRole as Role] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
}

/** Verifica se o payload é de um admin cujo papel ainda está válido na BD. */
export async function verificarAdminActivo(
  payload: JwtPayload
): Promise<boolean> {
  if (payload.role !== 'ADMIN') return false;
  const papelBD = await papelActualNaBD(payload.userId);
  return papelBD === 'ADMIN';
}

export function canCreateContent(role: string): boolean {
  return role === 'ADMIN' || role === 'ESCRITOR';
}