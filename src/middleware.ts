import { NextRequest, NextResponse } from 'next/server';

/** Simple in-memory rate limiter (per IP, per endpoint group) */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(ip: string, group: string): string {
  return `${ip}:${group}`;
}

function checkRateLimit(
  ip: string,
  group: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const key = getRateLimitKey(ip, group);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  return entry.count <= maxRequests;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 5 * 60 * 1000);

export const config = {
  matcher: ['/api/:path*'],
};

export default function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CORS (restrict to our domains)
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://mozlit.vercel.app',
    'http://localhost:3000',
  ];
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  // Skip rate limiting for OPTIONS (preflight)
  if (request.method === 'OPTIONS') return response;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const pathname = request.nextUrl.pathname;

  // Rate limit groups
  let maxRequests = 60; // default: 60 req/min
  let windowMs = 60_000;
  let group = 'default';

  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    maxRequests = 10; // 10 attempts per minute
    windowMs = 60_000;
    group = 'auth';
  } else if (pathname.startsWith('/api/wallet')) {
    maxRequests = 15;
    windowMs = 60_000;
    group = 'wallet';
  } else if (pathname.startsWith('/api/library')) {
    maxRequests = 20;
    windowMs = 60_000;
    group = 'purchase';
  } else if (pathname.startsWith('/api/comments')) {
    maxRequests = 20;
    windowMs = 60_000;
    group = 'comments';
  } else if (pathname.startsWith('/api/upload')) {
    maxRequests = 10;
    windowMs = 60_000;
    group = 'upload';
  }

  const allowed = checkRateLimit(ip, group, maxRequests, windowMs);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em alguns segundos.' },
      { status: 429 }
    );
  }

  // Set rate limit info headers
  const key = getRateLimitKey(ip, group);
  const entry = rateLimitStore.get(key);
  if (entry) {
    response.headers.set('X-RateLimit-Limit', String(maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
    const resetSeconds = Math.ceil((entry.resetAt - Date.now()) / 1000);
    response.headers.set('X-RateLimit-Reset', String(resetSeconds));
  }

  return response;
}
