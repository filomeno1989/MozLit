'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { BookCard, type LivroCartaz } from '@/components/literaria/HomePage';
import { ArrowLeft, BookOpen, UserCheck, UserPlus, Loader2, BookX, BadgeCheck, Users } from 'lucide-react';
import { toast } from 'sonner';

interface PerfilAutor {
  autor: {
    id: string;
    nome: string;
    biografia: string;
    avatar_url: string;
    papel: string;
    membroDesde: string;
  };
  estatisticas: {
    totalObras: number;
    totalSeguidores: number;
  };
  seguido: boolean;
  eProprioAutor: boolean;
  obras: Array<LivroCartaz & { totalCapitulos: number }>;
}

/**
 * Perfil público de autor (item 18) — bio, obras publicadas e botão Seguir.
 * Ponto de chegada do clique no nome do autor na página da obra.
 */
export default function AuthorProfilePage() {
  const { viewParams, navigate, user, token } = useAppStore();
  const autorId = viewParams.autorId;

  const [perfil, setPerfil] = useState<PerfilAutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [seguindo, setSeguindo] = useState(false);
  const [seguidores, setSeguidores] = useState(0);
  const [aSeguir, setASeguir] = useState(false);

  useEffect(() => {
    if (autorId) carregarPerfil();
  }, [autorId, token]);

  async function carregarPerfil() {
    setLoading(true);
    setErro(false);
    try {
      const d = await apiFetch<PerfilAutor>(`/api/autor/${autorId}`);
      setPerfil(d);
      setSeguindo(d.seguido);
      setSeguidores(d.estatisticas.totalSeguidores);
    } catch {
      setErro(true);
    } finally {
      setLoading(false);
    }
  }

  async function alternarSeguir() {
    if (!user) {
      toast.info('Entre na sua conta para seguir autores.');
      navigate('login');
      return;
    }
    if (!autorId) return;
    setASeguir(true);
    try {
      const d = await apiFetch<{ seguindo: boolean; totalSeguidores: number }>(
        `/api/autor/${autorId}/seguir`,
        { method: 'POST' }
      );
      setSeguindo(d.seguindo);
      setSeguidores(d.totalSeguidores);
      toast.success(d.seguindo ? `Agora segue ${perfil?.autor.nome}.` : `Deixou de seguir ${perfil?.autor.nome}.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setASeguir(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-28 mb-6" />
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="space-y-3 flex-1">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-16 w-full max-w-lg" />
          </div>
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (erro || !perfil) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <BookX className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground mb-2">Perfil não encontrado.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('home')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao início
        </Button>
      </div>
    );
  }

  const membroDesde = new Date(perfil.autor.membroDesde).toLocaleDateString('pt-MZ', {
    month: 'long',
    year: 'numeric',
  });
  const ehAutorReal = perfil.autor.papel === 'ESCRITOR' || perfil.autor.papel === 'ADMIN';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={() => navigate('home')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Início
      </button>

      {/* Cabeçalho do perfil */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        {perfil.autor.avatar_url ? (
          <img
            src={perfil.autor.avatar_url}
            alt={perfil.autor.nome}
            className="w-24 h-24 rounded-full object-cover border-4 border-amber-200 dark:border-amber-800 shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 dark:from-amber-700 dark:to-amber-900 flex items-center justify-center text-white text-3xl font-bold shrink-0 border-4 border-amber-200 dark:border-amber-800">
            {perfil.autor.nome.trim().charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">{perfil.autor.nome}</h1>
            {ehAutorReal && (
              <Badge className="mx-auto sm:mx-0 w-fit bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/60 gap-1">
                <BadgeCheck className="h-3.5 w-3.5" /> Autor
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">No MozLit desde {membroDesde}</p>

          {perfil.autor.biografia && (
            <p className="text-sm leading-relaxed text-foreground/80 mt-3 max-w-2xl whitespace-pre-line">
              {perfil.autor.biografia}
            </p>
          )}

          {/* Estatísticas */}
          <div className="flex items-center justify-center sm:justify-start gap-6 mt-4 text-sm">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <strong>{perfil.estatisticas.totalObras}</strong>{' '}
              {perfil.estatisticas.totalObras === 1 ? 'obra' : 'obras'}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <strong>{seguidores.toLocaleString('pt-MZ')}</strong>{' '}
              {seguidores === 1 ? 'seguidor' : 'seguidores'}
            </span>
          </div>
        </div>

        {/* Botão Seguir */}
        {!perfil.eProprioAutor && (
          <div className="shrink-0">
            <Button
              onClick={alternarSeguir}
              disabled={aSeguir}
              variant={seguindo ? 'outline' : 'default'}
              className={
                seguindo
                  ? 'min-w-36'
                  : 'min-w-36 bg-amber-600 hover:bg-amber-700 text-white'
              }
            >
              {aSeguir ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : seguindo ? (
                <UserCheck className="h-4 w-4 mr-1.5" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1.5" />
              )}
              {seguindo ? 'A seguir' : 'Seguir'}
            </Button>
          </div>
        )}
      </div>

      {/* Obras publicadas */}
      <h2 className="text-lg font-bold mb-4">Obras Publicadas</h2>
      {perfil.obras.length === 0 ? (
        <div className="text-center py-14 border border-dashed border-border/60 rounded-xl">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">
            {perfil.eProprioAutor
              ? 'Ainda não publicou nenhuma obra. Publique a primeira!'
              : 'Este autor ainda não publicou nenhuma obra.'}
          </p>
          {perfil.eProprioAutor && (
            <Button
              size="sm"
              className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => navigate('author-dashboard')}
            >
              Ir para o painel do autor
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {perfil.obras.map((obra) => (
            <BookCard
              key={obra.id}
              book={obra}
              onClick={() => navigate('book-detail', { bookId: obra.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
