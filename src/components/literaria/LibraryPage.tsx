'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Library as LibraryIcon } from 'lucide-react';

interface LibraryItem {
  id: string;
  chapterId: string | null;
  bookId: string | null;
  createdAt: string;
  chapter: {
    id: string;
    titulo: string;
    livro: { id: string; titulo: string; capa_url: string };
  } | null;
}

export default function LibraryPage() {
  const { navigate, user, token } = useAppStore();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) loadLibrary();
  }, [token]);

  async function loadLibrary() {
    setLoading(true);
    try {
      const data = await apiFetch<LibraryItem[]>('/api/library');
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Minha Biblioteca</h1>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <LibraryIcon className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground mb-2">Sua biblioteca está vazia.</p>
          <p className="text-sm text-muted-foreground mb-4">Compre capítulos para vê-los aqui.</p>
          <Button variant="outline" onClick={() => navigate('home')}>
            Explorar Obras
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            item.chapter && (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{item.chapter.titulo}</p>
                  <p className="text-xs text-muted-foreground">{item.chapter.livro.titulo}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-amber-700 dark:text-amber-400 shrink-0"
                  onClick={() => navigate('reader', { chapterId: item.chapter!.id, bookId: item.chapter!.livro.id })}
                >
                  <BookOpen className="h-4 w-4 mr-1" /> Ler
                </Button>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}