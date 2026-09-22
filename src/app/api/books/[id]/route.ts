import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { extractTokenFromHeader, verifyToken, canCreateContent } from '@/lib/auth';
import { validateTitulo, validateCategorias, validateFaixaEtaria, validateVolumeInfo, validarCampoLivroHtml, ehUuid } from '@/lib/validate';
import { LIMITES, textoSimplesDeHtml } from '@/lib/constants';
import { notificarSeguidores } from '@/lib/notificar';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ehUuid(id)) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
    }
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    const payload = token ? verifyToken(token) : null;

    const book = await db.book.findUnique({
      where: { id },
      include: {
        autor: {
          select: { id: true, nome: true, biografia: true, avatar_url: true },
        },
        chapters: {
          select: {
            id: true,
            titulo: true,
            ordem: true,
            preco_capitulo: true,
            is_free: true,
            arquivado: true,
          },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: 'Livro não encontrado' },
        { status: 404 }
      );
    }

    // Hide drafts from non-authors
    if (book.status === 'RASCUNHO') {
      if (!payload || (payload.userId !== book.autorId && payload.role !== 'ADMIN')) {
        return NextResponse.json(
          { error: 'Livro não encontrado' },
          { status: 404 }
        );
      }
    }

    // Capítulos arquivados: escondidos do público, visíveis ao autor/admin
    // (permitem corrigir um capítulo sem despublicar o livro inteiro)
    const isAutorOuAdmin = !!payload && (payload.userId === book.autorId || payload.role === 'ADMIN');

    const result = {
      ...book,
      categorias: JSON.parse(book.categorias || '[]'),
      chapters: isAutorOuAdmin ? book.chapters : book.chapters.filter((c) => !c.arquivado),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching book:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar livro' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação necessário' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    if (!canCreateContent(payload.role)) {
      return NextResponse.json(
        { error: 'Apenas escritores e administradores podem editar livros' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!ehUuid(id)) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
    }

    const existingBook = await db.book.findUnique({
      where: { id },
      select: { autorId: true, status: true },
    });

    if (!existingBook) {
      return NextResponse.json(
        { error: 'Livro não encontrado' },
        { status: 404 }
      );
    }

    if (existingBook.autorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Você só pode editar seus próprios livros' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, sinopse, categorias, capa_url, status, preco_total, ficha_tecnica, dedicatoria, epigrafe, epilogo, faixa_etaria, volume_info } = body;

    // Validate inputs if provided
    // Campos de texto: aceitam HTML do editor rico (sanitizado) ou texto simples (legado)
    const data: Record<string, unknown> = {};
    if (titulo !== undefined) data.titulo = validateTitulo(titulo);
    if (sinopse !== undefined) data.sinopse = validarCampoLivroHtml(sinopse, 'Sinopse', LIMITES.SINOPSE_MAX);
    if (categorias !== undefined) data.categorias = JSON.stringify(validateCategorias(categorias));
    if (capa_url !== undefined) {
      // Mesma validação do POST: capa tem de ser URL https do armazém (ou placeholder local)
      if (capa_url !== null && capa_url !== '' && (typeof capa_url !== 'string' || !capa_url.startsWith('https://'))) {
        return NextResponse.json({ error: 'URL da capa inválido.' }, { status: 400 });
      }
      data.capa_url = capa_url || '/placeholder-cover.svg';
    }
    // SEGURANÇA: whitelist de estados — o body podia injetar "publicado", "xpto"
    // ou null (500 por violação NOT NULL) e corromper o fluxo de publicação
    if (status !== undefined) {
      if (status !== 'RASCUNHO' && status !== 'PUBLICADO') {
        return NextResponse.json({ error: 'Estado inválido. Use RASCUNHO ou PUBLICADO.' }, { status: 400 });
      }
      data.status = status;
    }
    // SEGURANÇA: preço entre 0 e PRECO_TOTAL_MAX — negativo "pagava" leitores
    // para comprar (impressão de MC fora da economia), sem tecto permitia absurdos
    if (preco_total !== undefined) {
      if (typeof preco_total !== 'number' || !Number.isFinite(preco_total)) {
        return NextResponse.json({ error: 'Preço do livro inválido.' }, { status: 400 });
      }
      const preco = Math.round(preco_total);
      if (preco < 0 || preco > LIMITES.PRECO_TOTAL_MAX) {
        return NextResponse.json(
          { error: `O preço do livro deve estar entre 0 e ${LIMITES.PRECO_TOTAL_MAX} MC.` },
          { status: 400 }
        );
      }
      data.preco_total = preco;
    }
    if (ficha_tecnica !== undefined) data.ficha_tecnica = validarCampoLivroHtml(ficha_tecnica, 'Ficha técnica', LIMITES.SINOPSE_MAX);
    if (dedicatoria !== undefined) data.dedicatoria = validarCampoLivroHtml(dedicatoria, 'Dedicatória', LIMITES.SINOPSE_MAX);
    if (epigrafe !== undefined) data.epigrafe = validarCampoLivroHtml(epigrafe, 'Epígrafe', LIMITES.SINOPSE_MAX);
    if (epilogo !== undefined) data.epilogo = validarCampoLivroHtml(epilogo, 'Epílogo', LIMITES.SINOPSE_MAX);
    if (faixa_etaria !== undefined) data.faixa_etaria = validateFaixaEtaria(faixa_etaria);
    if (volume_info !== undefined) data.volume_info = validateVolumeInfo(volume_info);

    // If publishing, checklist mínimo no servidor (item 21): o autor pode
    // contornar a UI, mas nunca o servidor. Exige sinopse útil e pelo menos
    // 1 capítulo visível com conteúdo real (só tags HTML não conta).
    if (status === 'PUBLICADO') {
      const livroParaPublicar = await db.book.findUnique({
        where: { id },
        select: { sinopse: true, capa_url: true },
      });

      // Se o PATCH traz sinopse nova, valida a NOVA (antes validava a antiga e
      // rejeitava/aceitava com base num valor que ia mudar no mesmo pedido)
      const sinopseFinal = data.sinopse !== undefined ? String(data.sinopse) : (livroParaPublicar?.sinopse ?? '');
      const sinopseTexto = textoSimplesDeHtml(sinopseFinal).trim();
      if (sinopseTexto.length < 50) {
        return NextResponse.json(
          { error: 'Antes de publicar, escreva uma sinopse com pelo menos 50 caracteres.' },
          { status: 400 }
        );
      }

      const ehPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');
      if (ehPostgres) {
        const linhas = await db.$queryRaw<{ capitulo: bigint | number }[]>`
          SELECT COUNT(*)::int AS capitulo
          FROM "chapters"
          WHERE "livro_id"::text = ${id}
            AND "arquivado" = false
            AND BTRIM(REGEXP_REPLACE(COALESCE("conteudo", ''), '<[^>]*>', '', 'g')) <> ''`;
        if (Number(linhas[0]?.capitulo ?? 0) === 0) {
          return NextResponse.json(
            { error: 'Não pode publicar: nenhum capítulo visível tem conteúdo.' },
            { status: 400 }
          );
        }
      } else {
        // Dev (SQLite): corte simples — capítulo visível com string não vazia
        const chapterCount = await db.chapter.count({
          where: { livroId: id, arquivado: false, conteudo: { not: '' } },
        });
        if (chapterCount === 0) {
          return NextResponse.json(
            { error: 'Não pode publicar um livro sem capítulos.' },
            { status: 400 }
          );
        }
      }
    }

    const updatedBook = await db.book.update({
      where: { id },
      data,
      include: {
        autor: {
          select: { id: true, nome: true, biografia: true, avatar_url: true },
        },
      },
    });

    const result = {
      ...updatedBook,
      categorias: JSON.parse(updatedBook.categorias || '[]'),
    };

    // FASE 5 (item 24): obra sai do rascunho → seguidores recebem o aviso.
    // Só na transição RASCUNHO→PUBLICADO: re-publicar (editar) não volta a
    // bombardear os seguidores com a mesma notícia.
    if (data.status === 'PUBLICADO' && existingBook.status !== 'PUBLICADO') {
      await notificarSeguidores(existingBook.autorId, {
        tipo: 'OBRA_NOVA',
        titulo: `${updatedBook.autor.nome} publicou uma nova obra`,
        corpo: updatedBook.titulo,
        livroId: updatedBook.id,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating book:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar livro' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = extractTokenFromHeader(request.headers.get('Authorization'));
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação necessário' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    if (!canCreateContent(payload.role)) {
      return NextResponse.json(
        { error: 'Apenas escritores e administradores podem excluir livros' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!ehUuid(id)) {
      return NextResponse.json({ error: 'Livro não encontrado' }, { status: 404 });
    }

    const existingBook = await db.book.findUnique({
      where: { id },
      select: { autorId: true, status: true },
    });

    if (!existingBook) {
      return NextResponse.json(
        { error: 'Livro não encontrado' },
        { status: 404 }
      );
    }

    if (existingBook.autorId !== payload.userId && payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Você só pode excluir seus próprios livros' },
        { status: 403 }
      );
    }

    // Block deletion if book is published and has buyers
    if (existingBook.status === 'PUBLICADO') {
      const buyersCount = await db.libraryItem.count({
        where: { bookId: id },
      });
      if (buyersCount > 0) {
        return NextResponse.json(
          { error: `Não pode excluir: ${buyersCount} leitor(es) compraram este livro. Despublique primeiro.`, buyersCount },
          { status: 409 }
        );
      }
    }

    await db.book.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir livro' },
      { status: 500 }
    );
  }
}