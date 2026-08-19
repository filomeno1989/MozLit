'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Library as LibraryIcon, BookMarked, ChevronRight, AlertCircle } from 'lucide-react';

interface ChapterLibItem {
  id: string;
  chapterId: string | null;
  bookId: string | null;
  tipo: string;
  createdAt: string;
  chapter: {
    id: string;
    titulo: string;
    ordem: number;
    livro: { id: string; titulo: string; capa_url: string; autorId: string };
  } | null;
}

interface BookFromAPI {
  id: string;
  titulo: string;
  capa_url: string;
  autorId: string;
  chapters: Array<{ id: string; titulo: string; livroId: string }>;
}

export default function LibraryPage() {
  const { navigate, token } = useAppStore();
  const [allItems, setAllItems] = useState<ChapterLibItem[]>([]);
  const [fullBookIds, setFullBookIds] = useState<string[]>([]);
  const [books, setBooks] = useState<BookFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await apiFetch<{ items: ChapterLibItem[]; fullBookIds: string[]; books: BookFromAPI[] }>('/api/library');
      setAllItems(res.items);
      setFullBookIds(res.fullBookIds);
      setBooks(res.books || []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) loadLibrary();
  }, [token, loadLibrary]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive/50 mb-4" />
        <p className="text-destructive font-medium mb-2">Erro ao carregar biblioteca</p>
        <p className="text-sm text-muted-foreground mb-4">Verifique sua conexão e tente novamente.</p>
        <Button variant="outline" onClick={loadLibrary}>Tentar novamente</Button>
      </div>
    );
  }

  const hasFullBooks = books.length > 0;
  const individualChapters = allItems.filter(
    (item) => item.chapter && !fullBookIds.includes(item.chapter.livro.id)
  );
  const isEmpty = !hasFullBooks && individualChapters.length === 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Minha Biblioteca</h1>

      {isEmpty ? (
        <div className="text-center py-16">
          <LibraryIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground mb-2">Sua biblioteca está vazia.</p>
          <p className="text-sm text-muted-foreground mb-4">Compre livros ou capítulos para vê-los aqui.</p>
          <Button variant="outline" onClick={() => navigate('home')}>
            Explorar Obras
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {hasFullBooks && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookMarked className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-lg font-semibold">Livros Completos</h2>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs">
                  {books.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {books.map((fb) => {
                  const hasCover = fb.capa_url && fb.capa_url !== '/placeholder-cover.svg';
                  return (
                    <Card
                      key={fb.id}
                      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50"
                      onClick={() => navigate('book-detail', { bookId: fb.id })}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('book-detail', { bookId: fb.id }); } }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Abrir livro: ${fb.titulo}`}
                    >
                      <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                        {hasCover ? (
                          <img src={fb.capa_url} alt={fb.titulo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-800/20 to-amber-900/40">
                            <BookOpen className="h-10 w-10 text-amber-700/50 dark:text-amber-500/50" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-emerald-600 text-white text-xs">Completo</Badge>
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <BookOpen className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="font-semibold text-sm truncate">{fb.titulo}</p>
                        <p className="text-xs text-muted-foreground">{fb.chapters.length} capítulos</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {individualChapters.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h2 className="text-lg font-semibold">Capítulos Avulsos</h2>
                <Badge variant="secondary" className="text-xs">{individualChapters.length}</Badge>
              </div>
              <Card>
                <CardContent className="p-2 divide-y divide-border/40">
                  {individualChapters
                    .filter((item) => item.chapter)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate('reader', { chapterId: item.chapter!.id, bookId: item.chapter!.livro.id })}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('reader', { chapterId: item.chapter!.id, bookId: item.chapter!.livro.id }); } }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Ler capítulo: ${item.chapter.titulo}`}
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                            <BookOpen className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{item.chapter.titulo}</p>
                            <p className="text-xs text-muted-foreground">{item.chapter.livro.titulo}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                </CardContent>
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
