'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Users, UserPlus, UserCheck, Loader2, Rss, ArrowRight, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { haQuantoDe } from '@/lib/constants';

interface ItemFeed {
  tipo: 'OBRA_NOVA' | 'CAPITULO_NOVO';
  quando: string;
  livro: {
    id: string;
    titulo: string;
    capa_url: string;
    categorias: string[];
    autor: { id: string; nome: string };
  };
  capitulo: { id: string; titulo: string } | null;
}

interface SugestaoAutor {
  id: string;
  nome: string;
  biografia: string;
  avatar_url: string;
  totalObras: number;
  totalSeguidores: number;
}

/** Cartão de sugestão de autor com Seguir em linha (item 25) */
function CartaoSugestao({ autor, aoSeguir }: { autor: SugestaoAutor; aoSeguir: (id: string) => Promise<void> }) {
  const { navigate } = useAppStore();
  const [aSeguir, setASeguir] = useState(false);
  const [seguido, setSeguido] = useState(false);

  async function seguir(e: React.MouseEvent) {
    e.stopPropagation();
    setASeguir(true);
    try {
      await aoSeguir(autor.id);
      setSeguido(true);
    } finally {
      setASeguir(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate('autor', { autorId: autor.id })}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate('autor', { autorId: autor.id }); }}
      className="w-64 shrink-0 rounded-xl border border-border/60 bg-card p-4 cursor-pointer hover:border-amber-300 dark:hover:border-amber-700/60 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        {autor.avatar_url ? (
          <img src={autor.avatar_url} alt={autor.nome} className="w-11 h-11 rounded-full object-cover border-2 border-amber-200 dark:border-amber-800" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 dark:from-amber-700 dark:to-amber-900 flex items-center justify-center text-white font-bold border-2 border-amber-200 dark:border-amber-800">
            {autor.nome.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{autor.nome}</p>
          <p className="text-[11px] text-muted-foreground">
            {autor.totalObras} {autor.totalObras === 1 ? 'obra' : 'obras'} · {autor.totalSeguidores}{' '}
            {autor.totalSeguidores === 1 ? 'seguidor' : 'seguidores'}
          </p>
        </div>
      </div>
      {autor.biografia && (
        <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{autor.biografia}</p>
      )}
      <Button
        size="sm"
        variant={seguido ? 'outline' : 'default'}
        onClick={seguir}
        disabled={aSeguir || seguido}
        className={seguido ? 'mt-3 w-full' : 'mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white'}
      >
        {aSeguir ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : seguido ? (
          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
        ) : (
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
        )}
        {seguido ? 'A seguir' : 'Seguir'}
      </Button>
    </div>
  );
}

/**
 * FEED "A SEGUIR" (item 25 — Fase 5: Social & Descoberta)
 *
 * O coração social do MozLit: o que os autores que segues publicaram
 * recentemente (obras novas e capítulos novos), com sugestões de autores
 * para crescer a rede. Visitantes veem só as sugestões — descoberta
 * desde o primeiro segundo.
 */
export default function FeedPage() {
  const { navigate, user } = useAppStore();
  const [itens, setItens] = useState<ItemFeed[] | null>(null);
  const [sugestoes, setSugestoes] = useState<SugestaoAutor[] | null>(null);
  const [totalSeguidos, setTotalSeguidos] = useState(0);
  const [loading, setLoading] = useState(true);
  const pedidoFeed = useRef(0);

  useEffect(() => {
    const meuPedido = ++pedidoFeed.current;
    carregarFeed(meuPedido);
  }, [user?.id]);

  async function carregarFeed(meuPedido: number) {
    setLoading(true);
    try {
      const d = await apiFetch<{ itens: ItemFeed[]; sugestoes: SugestaoAutor[]; totalSeguidos: number }>('/api/feed', { semRedirecionar: true });
      if (meuPedido !== pedidoFeed.current) return;
      setItens(d.itens || []);
      setSugestoes(d.sugestoes || []);
      setTotalSeguidos(d.totalSeguidos || 0);
    } catch {
      if (meuPedido !== pedidoFeed.current) return;
      setItens([]);
      setSugestoes([]);
    } finally {
      if (meuPedido === pedidoFeed.current) setLoading(false);
    }
  }

  async function seguirAutor(id: string) {
    if (!user) {
      toast.info('Entre na sua conta para seguir autores.');
      navigate('login');
      return;
    }
    try {
      await apiFetch(`/api/autor/${id}/seguir`, { method: 'POST' });
      setSugestoes((prev) => (prev || []).filter((s) => s.id !== id));
      setTotalSeguidos((t) => t + 1);
      // Novo autor seguido → o feed pode ter novidades; recarrega em silêncio
      const meuPedido = ++pedidoFeed.current;
      apiFetch<{ itens: ItemFeed[] }>('/api/feed', { semRedirecionar: true })
        .then((d) => {
          if (meuPedido !== pedidoFeed.current) return;
          setItens(d.itens || []);
        })
        .catch(() => {});
      toast.success('Agora segue este autor. As novidades aparecem aqui.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function abrirItem(item: ItemFeed) {
    if (item.capitulo) {
      navigate('reader', { chapterId: item.capitulo.id, bookId: item.livro.id });
    } else {
      navigate('book-detail', { bookId: item.livro.id });
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Rss className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        <h1 className="text-2xl sm:text-3xl font-bold">A Seguir</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        {totalSeguidos > 0
          ? `Novidades de ${totalSeguidos} ${totalSeguidos === 1 ? 'autor que segues' : 'autores que segues'}.`
          : 'As últimas obras dos autores que segues aparecem aqui.'}
      </p>

      {/* Sugestões de autores — descoberta */}
      {loading && !sugestoes ? (
        <div className="flex gap-3 overflow-x-auto pb-2 mb-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-64 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : sugestoes && sugestoes.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Autores para descobrir
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {sugestoes.map((autor) => (
              <CartaoSugestao key={autor.id} autor={autor} aoSeguir={seguirAutor} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Timeline de novidades */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-4">
          <Users className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Novidades dos autores
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : !user ? (
          <div className="text-center py-14 border border-dashed border-border/60 rounded-xl">
            <Rss className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm mb-4">Entre na sua conta para seguir autores e receber as novidades aqui.</p>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => navigate('login')}>
              Entrar
            </Button>
          </div>
        ) : itens && itens.length > 0 ? (
          <div className="space-y-3">
            {itens.map((item, idx) => {
              const temCapa = item.livro.capa_url && item.livro.capa_url !== '/placeholder-cover.svg';
              return (
                <div
                  key={`${item.capitulo?.id || item.livro.id}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => abrirItem(item)}
                  onKeyDown={(e) => { if (e.key === 'Enter') abrirItem(item); }}
                  className="flex items-center gap-4 p-3.5 rounded-xl border border-border/60 bg-card hover:border-amber-300 dark:hover:border-amber-700/60 hover:shadow-md transition-all cursor-pointer"
                >
                  {temCapa ? (
                    <img
                      src={item.livro.capa_url}
                      alt={item.livro.titulo}
                      loading="lazy"
                      className="w-12 aspect-[3/4] object-cover rounded-md shadow-sm border border-border/40 shrink-0"
                      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                    />
                  ) : (
                    <div className="w-12 aspect-[3/4] rounded-md bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-white/90" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      {item.tipo === 'OBRA_NOVA' ? (
                        <><BookOpen className="h-3 w-3" /> Nova obra</>
                      ) : (
                        <><FileText className="h-3 w-3" /> Novo capítulo</>
                      )}
                      <span className="text-muted-foreground font-normal normal-case tracking-normal">· {haQuantoDe(item.quando)}</span>
                    </p>
                    <p className="mt-0.5 text-sm font-semibold truncate">{item.livro.titulo}</p>
                    {item.capitulo && (
                      <p className="text-xs text-muted-foreground truncate italic">“{item.capitulo.titulo}”</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      por {item.livro.autor?.nome || 'Autor desconhecido'}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-14 border border-dashed border-border/60 rounded-xl">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm mb-2">
              Ainda não segues nenhum autor (ou eles não publicaram nada recentemente).
            </p>
            <p className="text-muted-foreground/70 text-xs mb-4">Segue autores nas sugestões acima ou na página de qualquer obra.</p>
            <Button size="sm" variant="outline" onClick={() => navigate('home')}>
              Explorar obras
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
