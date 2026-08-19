'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen, ShoppingBag, User, BookMarked, Package, FileText, Loader2, BookX, Wallet, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { mznParaMoedas } from '@/lib/constants';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  categorias: string[];
  status: string;
  preco_total: number;
  ficha_tecnica: string;
  dedicatoria: string;
  epigrafe: string;
  epilogo: string;
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
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseConfirm, setPurchaseConfirm] = useState<{ type: 'chapter' | 'full'; id?: string; price: number; name: string } | null>(null);

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

  async function executePurchase(type: 'chapter' | 'full', id?: string) {
    if (!user) { navigate('login'); return; }
    const purchasingKey = type === 'full' ? 'full-book' : (id || '');
    setPurchasing(purchasingKey);
    try {
      const body = type === 'full' ? { bookId: book!.id } : { chapterId: id };
      const res = await apiFetch<{ success: boolean; novoSaldoMoedas: number }>('/api/library', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      useAppStore.getState().updateMoedas(res.novoSaldoMoedas);
      toast.success(type === 'full' ? 'Livro completo adquirido!' : 'Capítulo adquirido!');
      if (type === 'full') {
        setOwnsFullBook(true);
        setPurchasedIds(new Set(book!.chapters.map((c) => c.id)));
      } else {
        setPurchasedIds((prev) => new Set([...prev, id!]));
        loadPurchased();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPurchasing(null);
      setPurchaseConfirm(null);
    }
  }

  function handlePurchase(chapterId: string) {
    if (!user) { navigate('login'); return; }
    const chapter = book?.chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    setPurchaseConfirm({ type: 'chapter', id: chapterId, price: chapter.preco_capitulo, name: chapter.titulo });
  }

  function handleBuyFullBook() {
    if (!user) { navigate('login'); return; }
    if (!book || book.preco_total <= 0) return;
    setPurchaseConfirm({ type: 'full', price: book.preco_total, name: book.titulo });
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

  // Check which book sections exist
  const hasPreSections = book && (book.ficha_tecnica || book.dedicatoria || book.epigrafe);
  const hasPostSections = book && book.epilogo;
  const hasAnySection = hasPreSections || hasPostSections;

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
        <BookX className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground mb-2">Livro não encontrado.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('home')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao início
        </Button>
      </div>
    );
  }

  // Clean synopsis: remove author name from the end if present, then split into paragraphs
  function renderSinopse(text: string, authorName: string) {
    // Strip trailing author name lines (e.g. "Por Autor" or just the name)
    let cleaned = text.trim();
    const nameParts = authorName.toLowerCase().split(' ');
    const lines = cleaned.split('\n');
    // Remove last 1-2 lines if they look like an author signature
    while (lines.length > 1) {
      const last = lines[lines.length - 1].trim();
      if (!last) { lines.pop(); continue; }
      const lastLower = last.toLowerCase();
      if (
        lastLower.startsWith('por ') ||
        nameParts.some((part) => part.length > 3 && lastLower.includes(part))
      ) {
        lines.pop();
      } else {
        break;
      }
    }
    cleaned = lines.join('\n').trim();

    // Split by double newlines (paragraphs) or single newlines
    const paragraphs = cleaned.split(/\n\n+/).filter(Boolean);
    return paragraphs.map((p, i) => {
      const lines = p.split('\n').filter(Boolean);
      if (lines.length === 1 && lines[0].length < 80) {
        // Short single line – render as a styled quote or stand-alone line
        return (
          <p key={i} className="text-sm leading-relaxed text-foreground/80 italic">{lines[0]}</p>
        );
      }
      return (
        <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
      );
    });
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
          {/* Multi-categorias */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {book.categorias.map((cat) => (
              <Badge key={cat} className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {cat}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{book.titulo}</h1>

          {/* Author info */}
          <div className="flex items-center gap-3 mb-4 group">
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
          </div>

          {/* Purchase error (fallback) */}
          {purchaseError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {purchaseError}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border/60 my-5" />

          {/* Sinopse */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Sinopse</h2>
            <div
              className="max-w-prose space-y-3 select-none"
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              {renderSinopse(book.sinopse, book.autor.nome)}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/40 my-5" />

          {/* Stats as badges */}
          <div className="flex items-center gap-3 text-sm mb-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{book.chapters.length} capítulos</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/80 text-muted-foreground">
              <BookMarked className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{book.chapters.filter((c) => c.is_free).length} gratuitos</span>
            </div>
          </div>

          {/* Full book purchase button */}
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
                        Acesso a todos os capítulos - presentes e futuros
                      </p>
                    </div>
                  </div>
                  <Button
                    disabled={purchasing === 'full-book'}
                    onClick={handleBuyFullBook}
                    className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                  >
                    {purchasing === 'full-book' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Coins className="h-4 w-4 mr-1.5" />
                        {mznParaMoedas(book.preco_total).toLocaleString('pt-MZ')} MC
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {ownsFullBook && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 mb-4">
              <BookMarked className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                Você possui o livro completo - todos os capítulos desbloqueados
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Capítulos + Secções */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[50vh] overflow-y-auto space-y-2">
          {/* Pre-chapter sections (clickable) */}
          {book.ficha_tecnica && (
            <button
              onClick={() => navigate('reader', { bookId, section: 'ficha_tecnica' })}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
            >
              <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Ficha Técnica</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{book.ficha_tecnica}</p>
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground/50 ml-auto shrink-0" />
            </button>
          )}
          {book.dedicatoria && (
            <button
              onClick={() => navigate('reader', { bookId, section: 'dedicatoria' })}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
            >
              <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Dedicatória</p>
                <p className="text-xs text-muted-foreground line-clamp-2 italic">{book.dedicatoria}</p>
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground/50 ml-auto shrink-0" />
            </button>
          )}
          {book.epigrafe && (
            <button
              onClick={() => navigate('reader', { bookId, section: 'epigrafe' })}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
            >
              <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Epígrafe</p>
                <p className="text-xs text-muted-foreground line-clamp-2 italic">{book.epigrafe}</p>
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground/50 ml-auto shrink-0" />
            </button>
          )}

          {/* Chapters */}
          {book.chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {hasAnySection ? 'Nenhum capítulo disponível ainda.' : 'Nenhum conteúdo disponível ainda.'}
            </p>
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
                          {mznParaMoedas(chapter.preco_capitulo).toLocaleString('pt-MZ')} MC
                        </span>
                        <Button
                          size="sm"
                          disabled={purchasing === chapter.id}
                          onClick={() => handlePurchase(chapter.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {purchasing === chapter.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
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

          {/* Post-chapter section: Epílogo (clickable) */}
          {book.epilogo && (
            <button
              onClick={() => navigate('reader', { bookId, section: 'epilogo' })}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer mt-2"
            >
              <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Epílogo</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{book.epilogo}</p>
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground/50 ml-auto shrink-0" />
            </button>
          )}
        </CardContent>
      </Card>

      {/* Purchase Confirmation Dialog */}
      <AlertDialog open={!!purchaseConfirm} onOpenChange={(open) => !open && setPurchaseConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Compra</AlertDialogTitle>
            <AlertDialogDescription>
              {purchaseConfirm?.type === 'full' ? (
                <>
                  <p>Deseja comprar o livro completo <strong>{purchaseConfirm.name}</strong>?</p>
                  <p className="mt-2">Valor: <strong>{mznParaMoedas(purchaseConfirm.price).toLocaleString('pt-MZ')} MC</strong></p>
                  {user && <p className="mt-1 text-xs text-muted-foreground">Moedas após compra: <Coins className="inline h-3 w-3 mr-0.5" />{Math.max(0, (user.moedas ?? 0) - mznParaMoedas(purchaseConfirm.price)).toLocaleString('pt-MZ')} MC</p>}
                </>
              ) : (
                <>
                  <p>Deseja comprar o capítulo <strong>{purchaseConfirm?.name}</strong>?</p>
                  <p className="mt-2">Valor: <strong>{mznParaMoedas(purchaseConfirm?.price || 0).toLocaleString('pt-MZ')} MC</strong></p>
                  {user && <p className="mt-1 text-xs text-muted-foreground">Moedas após compra: <Coins className="inline h-3 w-3 mr-0.5" />{Math.max(0, (user.moedas ?? 0) - mznParaMoedas(purchaseConfirm?.price || 0)).toLocaleString('pt-MZ')} MC</p>}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!purchasing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => purchaseConfirm && executePurchase(purchaseConfirm.type, purchaseConfirm.id)}
              disabled={!!purchasing}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {purchasing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ShoppingBag className="h-4 w-4 mr-1.5" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}