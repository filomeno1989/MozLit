import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * SEGURANÇA: segredo de assinatura dos tokens JWT.
 *
 * Hierarquia:
 *  1. JWT_SECRET (env) com ≥32 caracteres — forma correcta e preferida.
 *  2. Se ausente/curto EM PRODUÇÃO: deriva uma chave forte (SHA-256) de outros
 *     segredos que só o servidor conhece (DATABASE_URL). Isto mantém a
 *     plataforma a funcionar de forma SEGURA mesmo antes de o segredo próprio
 *     ser configurado — tokens não podem ser forjados por terceiros.
 *  3. Em desenvolvimento local: chave fraca apenas por conveniência.
 *
 * Nunca se usa uma chave conhecida/publica — antes desta versão, o fallback era
 * uma constante pública no código (qualquer um podia forjar tokens de ADMIN).
 */
function segredoJwt(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;

  if (process.env.NODE_ENV === 'production') {
    const fonte = process.env.DATABASE_URL || '';
    if (fonte.length > 20) {
      console.warn(
        '[SECURITY] JWT_SECRET ausente/curto — a usar chave derivada dos segredos do servidor. ' +
        'Defina JWT_SECRET (≥32 caracteres aleatórios) na Vercel para maior controlo.'
      );
      return crypto.createHash('sha256').update(`mozlit::${fonte}::v1`).digest('hex');
    }
    throw new Error(
      '[MozLit] Sem JWT_SECRET nem DATABASE_URL para derivar chave de assinatura. Configure as variáveis de ambiente.'
    );
  }

  console.error('[SECURITY] JWT_SECRET ausente/fraca — a usar chave de desenvolvimento.');
  return 'mozlit-dev-insecure-secret-mudar-em-producao';
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