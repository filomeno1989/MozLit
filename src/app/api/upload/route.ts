import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';
import { validateImageFile } from '@/lib/validate';
import { LIMITES } from '@/lib/constants';

function sanitizeFileName(name: string): string {
  // Remove path traversal, keep extension
  const ext = name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeChars = ext.replace(/[^a-z0-9]/g, '');
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
  if (!allowedExts.includes(safeChars)) return 'jpg';
  return safeChars;
}

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tipo = formData.get('tipo') as string | null; // 'capa' or 'avatar'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum ficheiro enviado.' }, { status: 400 });
    }

    if (tipo !== 'capa' && tipo !== 'avatar') {
      return NextResponse.json({ error: 'Tipo inválido. Use "capa" ou "avatar".' }, { status: 400 });
    }

    const maxSize = tipo === 'capa' ? LIMITES.CAPA_MAX_SIZE_BYTES : LIMITES.AVATAR_MAX_SIZE_BYTES;
    validateImageFile(file, maxSize, tipo);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Serviço de upload não configurado.' }, { status: 500 });
    }

    const ext = sanitizeFileName(file.name);
    const folder = tipo === 'capa' ? 'covers' : 'avatars';
    const fileName = `${payload.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${folder}/${fileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': file.type,
        Authorization: `Bearer ${serviceKey}`,
        'x-upsert': 'false',
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Supabase upload error:', errText);
      return NextResponse.json({ error: 'Erro ao enviar ficheiro.' }, { status: 500 });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${folder}/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Erro no upload:', error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
