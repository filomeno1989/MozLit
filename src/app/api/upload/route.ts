import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';

export const maxDuration = 30;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const BUCKET_NAME = 'covers';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key);
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

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Extensão não permitida. Use JPG, PNG, WEBP ou GIF.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Generate unique filename
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `${safeName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      // If bucket doesn't exist, try to create it
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('does not exist')) {
        const { error: createBucketError } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ALLOWED_TYPES,
        });
        if (createBucketError) {
          console.error('Bucket creation error:', createBucketError);
          return NextResponse.json(
            { error: 'Erro ao criar bucket de armazenamento. Verifique as permissões no Supabase.' },
            { status: 500 }
          );
        }
        // Retry upload after creating bucket
        const retry = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
          });
        if (retry.error) {
          return NextResponse.json(
            { error: 'Erro ao enviar ficheiro. Tente novamente.' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Erro ao enviar ficheiro. Tente novamente.' },
          { status: 500 }
        );
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    return NextResponse.json({ url: publicUrl, name: file.name });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload do ficheiro. Tente novamente.' },
      { status: 500 }
    );
  }
}
