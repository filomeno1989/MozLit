import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

// Increase body size limit for file uploads
export const maxDuration = 30;

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'covers');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists on startup
if (!existsSync(UPLOAD_DIR)) {
  mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum ficheiro enviado' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo não permitido (${file.type}). Use JPG, PNG, WEBP ou GIF.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: `Ficheiro demasiado grande (${mb}MB). Máximo 5MB.` },
        { status: 400 }
      );
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const publicUrl = `/uploads/covers/${safeName}`;
    return NextResponse.json({ url: publicUrl, name: file.name });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload do ficheiro. Tente novamente.' },
      { status: 500 }
    );
  }
}
