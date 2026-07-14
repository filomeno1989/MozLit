'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, ShoppingBag, User, BookMarked, Package } from 'lucide-react';

interface Chapter {
  id: string;
  titulo: string;
  ordem: number;
  preco_capitulo: number;
  is_free: boolean;
}

interface BookDetail {
  id: string;
  titulo: string;
  sinopse: string;
  capa_url: string;
  categoria: string;
  status: string;
  preco_total: number;
  autor: { id: string; nome: string; biografia: string; avatar_url: string };
  chapters: Chapter[];
}

export default function BookDetailPage() {
  const { viewParams, navigate, user, token } = useAppStore();
  const bookId = viewParams.bookId;
  const [book, setBook] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [ownsFullBook, setOwnsFullBook] = useState(false);

  useEffect(() => {
    if (bookId) {
      loadBook();
      if (user) loadPurchased();
    }
  }, [bookId, user]);

  async function loadBook() {
    setLoading(true);
    try {
      const data = await apiFetch<BookDetail>(`/api/books/${bookId}`);
      setBook(data);
    } catch {
      setBook(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadPurchased() {
    try {
      const res = await apiFetch<{ items: Array<{ chapterId: string | null; bookId: string | null; tipo: string }>; fullBookIds: string[] }>('/api/library');
      const chapterSet = new Set(
        res.items.map((i) => i.chapterId).filter(Boolean) as string[]
      );
      setPurchasedIds(chapterSet);
      setOwnsFullBook(res.fullBookIds.includes(bookId));
    } catch {
      // ignore
    }
  }

  async function handlePurchase(chapterId: string) {
    if (!user) {
      navigate('login');
      return;
    }
    setPurchasing(chapterId);
    try {
      const res = await apiFetch<{ success: boolean; novoSaldo: number }>('/api/library', {
        method: 'POST',
        body: JSON.stringify({ chapterId }),
      });
      useAppStore.getState().updateBalance(res.novoSaldo);
      setPurchasedIds((prev) => new Set([...prev, chapterId]));
      loadPurchased();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPurchasing(null);
    }
  }

  async function handleBuyFullBook() {
    if (!user) {
      navigate('login');
      return;
    }
    if (!book || book.preco_total <= 0) return;
    setPurchasing('full-book');
    try {
      const res = await apiFetch<{ success: boolean; novoSaldo: number }>('/api/library', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.id }),
      });
      useAppStore.getState().updateBalance(res.novoSaldo);
      setOwnsFullBook(true);
      // Mark all chapters as owned
      setPurchasedIds(new Set(book.chapters.map((c) => c.id)));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPurchasing(null);
    }
  }

  function handleRead(chapter: Chapter) {
    if (chapter.is_free || purchasedIds.has(chapter.id) || ownsFullBook) {
      navigate('reader', { chapterId: chapter.id, bookId: bookId });
    } else {
      handlePurchase(chapter.id);
    }
  }

  function hasAccess(chapter: Chapter) {
    return chapter.is_free || purchasedIds.has(chapter.id) || ownsFullBook;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="flex flex-col md:flex-row gap-8">
          <Skeleton className="w-64 aspect-[3/4] rounded-xl" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Livro não encontrado.</p>
        <Button variant="link" onClick={() => navigate('home')} className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  const isOwnBook = user && user.id === book.autor.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('home')} className="mb-6 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <div className="flex flex-col md:flex-row gap-8 mb-10">
        {/* Capa */}
        <div className="w-full md:w-64 shrink-0">
          {book.capa_url && book.capa_url !== '/placeholder-cover.svg' ? (
            <img
              src={book.capa_url}
              alt={book.titulo}
              className="w-full aspect-[3/4] rounded-xl object-cover border border-border/50 shadow-md"
            />
          ) : (
            <div className="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-amber-800/30 to-amber-900/40 dark:from-amber-700/20 dark:to-amber-800/30 flex flex-col items-center justify-center p-6 border border-amber-200/50 dark:border-amber-700/30">
              <BookOpen className="h-16 w-16 text-amber-700/50 dark:text-amber-500/50 mb-4" />
              <h2 className="font-bold text-lg text-center leading-tight">{book.titulo}</h2>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Badge className="mb-3 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            {book.categoria}
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{book.titulo}</h1>

          {/* Author info with avatar */}
          <button
            onClick={() => {}}
            className="flex items-center gap-3 mb-4 group text-left"
          >
            {book.autor.avatar_url ? (
              <img
                src={book.autor.avatar_url}
                alt={book.autor.nome}
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-200 dark:border-amber-800"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border-2 border-amber-200 dark:border-amber-800">
                <User className="h-5 w-5 text-amber-700 dark:text-amber-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-sm group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                por {book.autor.nome}
              </p>
              {book.autor.biografia && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 max-w-md">
                  {book.autor.biografia}
                </p>
              )}
            </div>
          </button>

          <p className="text-sm leading-relaxed text-muted-foreground mb-4">{book.sinopse}</p>
          <div className="flex items-center gap-4 text-sm mb-4">
            <span className="text-muted-foreground">{book.chapters.length} capítulos</span>
            <span className="text-muted-foreground">
              {book.chapters.filter((c) => c.is_free).length} gratuitos
            </span>
          </div>

          {/* Full book purchase button (only for readers, not own book) */}
          {!isOwnBook && !ownsFullBook && book.preco_total > 0 && user && (
            <Card className="mb-4 border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <Package className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Comprar Livro Completo</p>
                      <p className="text-xs text-muted-foreground">
                        Acesso a todos os capítulos — presentes e futuros
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={purchasing === 'full-book'}
                    onClick={handleBuyFullBook}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                  >
                    {purchasing === 'full-book' ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <>
                        <BookMarked className="h-4 w-4 mr-1.5" />
                        {book.preco_total.toFixed(2)} MZN
                      </>
                    )}
                  </Button>
                </div>
                {ownsFullBook && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                    ✓ Livro completo adquirido
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {ownsFullBook && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 mb-4">
              <BookMarked className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                Você possui o livro completo — todos os capítulos desbloqueados
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Capítulos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Capítulos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {book.chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum capítulo disponível ainda.</p>
          ) : (
            book.chapters.map((chapter) => {
              const owned = hasAccess(chapter);
              return (
                <div
                  key={chapter.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">
                      {String(chapter.ordem + 1).padStart(2, '0')}
                    </span>
                    <span className="font-medium text-sm truncate">{chapter.titulo}</span>
                    {chapter.is_free && (
                      <Badge variant="secondary" className="text-xs shrink-0">Grátis</Badge>
                    )}
                    {ownsFullBook && !chapter.is_free && (
                      <Badge className="text-xs shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                        Incluído
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {owned ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-700 dark:text-amber-400"
                        onClick={() => navigate('reader', { chapterId: chapter.id, bookId: bookId })}
                      >
                        Ler <BookOpen className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          {chapter.preco_capitulo.toFixed(2)} MZN
                        </span>
                        <Button
                          size="sm"
                          disabled={purchasing === chapter.id}
                          onClick={() => handlePurchase(chapter.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {purchasing === chapter.id ? (
                            <span className="animate-pulse">...</span>
                          ) : (
                            <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                          )}
                          Comprar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}