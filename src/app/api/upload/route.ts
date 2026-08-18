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
  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!key) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error('Variaveis de ambiente em falta: ' + missing.join(', '));
  }
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) return NextResponse.json({ error: 'Autenticacao necessaria' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload || !canCreateContent(payload.role)) {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 });
    }

    // Get file from form
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Nenhum ficheiro enviado' }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo nao permitido (' + file.type + '). Use JPG, PNG, WEBP ou GIF.' },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { error: 'Ficheiro demasiado grande (' + mb + 'MB). Maximo 5MB.' },
        { status: 400 }
      );
    }

    // Validate extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Extensao nao permitida. Use JPG, PNG, WEBP ou GIF.' },
        { status: 400 }
      );
    }

    // Init Supabase
    const supabase = getSupabaseAdmin();

    // Generate unique filename
    const safeName = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(safeName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase upload error:', JSON.stringify(uploadError));

      // If bucket doesn't exist, try to create it
      if (uploadError.message.includes('not found') || uploadError.message.includes('does not exist')) {
        const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 5242880,
        });
        if (createError) {
          console.error('Bucket create error:', JSON.stringify(createError));
          return NextResponse.json(
            { error: 'Erro de configuracao do armazenamento. Contacte o administrador.' },
            { status: 500 }
          );
        }
        // Retry upload
        const { error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(safeName, buffer, {
            contentType: file.type,
            upsert: false,
          });
        if (retryError) {
          return NextResponse.json(
            { error: 'Erro ao enviar apos recriar bucket.' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Erro no Supabase Storage: ' + uploadError.message },
          { status: 500 }
        );
      }
    }

    // Get public URL
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(safeName);

    return NextResponse.json({ url: data.publicUrl, name: file.name });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Upload error:', msg);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
