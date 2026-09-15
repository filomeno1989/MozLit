import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
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

/**
 * Garante que o bucket existe antes do primeiro upload (o Supabase devolve
 * 404 "Bucket not found" caso contrário). Idempotente e tolerante: se a
 * criação falhar, o erro real do upload é quem chega ao utilizador.
 */
async function garantirBucket(supabaseUrl: string, serviceKey: string, folder: string): Promise<void> {
  try {
    const check = await fetch(`${supabaseUrl}/storage/v1/bucket/${folder}`, {
      headers: { Authorization: `Bearer ${serviceKey}` },
    });
    if (check.ok) return; // bucket já existe
    await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: folder, public: true }),
    });
  } catch {
    // deixa o upload falhar com o erro real, se falhar
  }
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
    const tipo = formData.get('tipo') as string | null; // 'capa' | 'avatar' | 'comprovativo'

    if (!file) {
      return NextResponse.json({ error: 'Nenhum ficheiro enviado.' }, { status: 400 });
    }

    if (tipo !== 'capa' && tipo !== 'avatar' && tipo !== 'comprovativo') {
      return NextResponse.json({ error: 'Tipo inválido. Use "capa", "avatar" ou "comprovativo".' }, { status: 400 });
    }

    const maxSize = tipo === 'capa'
      ? LIMITES.CAPA_MAX_SIZE_BYTES
      : tipo === 'comprovativo'
      ? LIMITES.COMPROVATIVO_MAX_SIZE_BYTES
      : LIMITES.AVATAR_MAX_SIZE_BYTES;
    validateImageFile(file, maxSize, tipo);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Serviço de upload não configurado.' }, { status: 500 });
    }

    const ext = 'jpg'; // conteúdo re-encodado para JPEG (comprimido)
    const folder = tipo === 'capa' ? 'covers' : tipo === 'comprovativo' ? 'comprovativos' : 'avatars';
    const fileName = `${payload.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const bytes = await file.arrayBuffer();
    const raw = Buffer.from(bytes);

    // Bucket dos comprovativos é novo — cria-o à primeira (covers/avatars já existem)
    if (folder === 'comprovativos') {
      await garantirBucket(supabaseUrl, serviceKey, folder);
    }

    // PERFORMANCE: re-encoda a imagem — redimensiona (capas a 900px de largura
    // chegam e sobram para ecrãs grandes) e comprime. Uma capa de 2MB passa a
    // ~100-200KB, poupando dezenas de MB por visita à grelha da home.
    let buffer: Buffer<ArrayBufferLike> = raw;
    try {
      // Comprovativo: 1400px preserva o texto do SMS/valor da transacção legível
      const maxWidth = tipo === 'capa' ? 900 : tipo === 'comprovativo' ? 1400 : 400;
      buffer = await sharp(raw)
        .rotate() // respeita a orientação EXIF
        .resize({ width: maxWidth, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } catch {
      // Ficheiro não é uma imagem decodificável → rejeita (valida o conteúdo,
      // não só o mimetype declarado pelo cliente)
      return NextResponse.json({ error: 'O ficheiro não é uma imagem válida.' }, { status: 400 });
    }

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${folder}/${fileName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        Authorization: `Bearer ${serviceKey}`,
        'x-upsert': 'false',
      },
      body: new Uint8Array(buffer),
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
