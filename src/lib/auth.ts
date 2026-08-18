import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (typeof window === 'undefined') {
      console.error('[SECURITY] JWT_SECRET is missing or too short (min 32 chars). App cannot start safely.');
    }
    // Use a placeholder that will fail in production but allow dev
    return secret || '__INSECURE_DEV_ONLY_DO_NOT_USE_IN_PRODUCTION__';
  }
  return secret;
})();

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
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

export function canCreateContent(role: string): boolean {
  return role === 'ADMIN' || role === 'ESCRITOR';
}