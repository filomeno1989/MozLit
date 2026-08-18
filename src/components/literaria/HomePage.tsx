'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';

interface Book {
  id: string;
  titulo: string;
  sinopse: string;
  capa_url: string;
  categorias: string[];
  status: string;
  preco_total: number;
  autor: { id: string; nome: string };
}

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  const hasRealCover = book.capa_url && book.capa_url !== '/placeholder-cover.svg';

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 border-border/50"
      onClick={onClick}
    >
      {/* Cover area */}
      <div className="aspect-[3/4] bg-muted relative overflow-hidden">
        {hasRealCover ? (
          <img
            src={book.capa_url}
            alt={book.titulo}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/80 via-amber-800/60 to-amber-950/90 dark:from-amber-900/70 dark:via-amber-800/50 dark:to-amber-950/80" />
        )}
        {!hasRealCover && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <BookOpen className="h-10 w-10 text-amber-200/70 dark:text-amber-300/60 mb-3" />
            <h3 className="font-bold text-sm leading-tight line-clamp-3 text-amber-100">{book.titulo}</h3>
          </div>
        )}
        {/* Category badge on cover */}
        {book.categorias.length > 0 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-600/90 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 hover:bg-amber-600">
              {book.categorias[0]}
            </Badge>
          </div>
        )}
        {book.preco_total > 0 && (
          <div className="absolute bottom-0 inset-x-0 px-2.5 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-white text-xs font-semibold">
              {book.preco_total.toFixed(2)} MZN
            </span>
          </div>
        )}
      </div>

      {/* Info area - well structured */}
      <div className="p-3 pb-3.5 space-y-2">
        {/* Title */}
        {hasRealCover ? (
          <h3 className="font-bold text-sm leading-snug line-clamp-2 text-foreground">
            {book.titulo}
          </h3>
        ) : (
          <span className="sr-only">{book.titulo}</span>
        )}

        {/* Author - clearly separated */}
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 truncate">
          {book.autor.nome}
        </p>

        {/* Synopsis - visually distinct */}
        {book.sinopse && (
          <p className="text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-2 border-t border-border/40 pt-2">
            {book.sinopse}
          </p>
        )}
      </div>
    </Card>
  );
}

function BookSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-[3/4] bg-muted" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const { navigate } = useAppStore();

  // Extract unique categories from all published books
  const categorias = Array.from(
    new Set(allBooks.flatMap((b) => b.categorias))
  ).sort();

  useEffect(() => {
    loadBooks();
  }, [categoriaAtiva]);

  // Load all books once (no filter) to extract categories
  useEffect(() => {
    apiFetch<Book[]>('/api/books')
      .then(setAllBooks)
      .catch(() => {});
  }, []);

  async function loadBooks() {
    setLoading(true);
    try {
      const query = categoriaAtiva ? `?categoria=${encodeURIComponent(categoriaAtiva)}` : '';
      const data = await apiFetch<Book[]>(`/api/books${query}`);
      setBooks(data);
      if (!categoriaAtiva) setAllBooks(data);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="mb-10 text-center py-14 px-6 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/50 to-amber-50 dark:from-amber-950/30 dark:via-orange-950/15 dark:to-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200/30 via-transparent to-transparent dark:from-amber-800/10" />
        <div className="relative">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-amber-900 dark:text-amber-100 mb-3 tracking-tight">
            Descubra Literatura Moçambicana
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Uma plataforma dedicada a escritores e leitores de Moçambique.<br className="hidden sm:block"/> Publique, leia e monetize suas obras.
          </p>
        </div>
      </section>

      {/* Categorias */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setCategoriaAtiva(null)}
            aria-pressed={!categoriaAtiva}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 ${
              !categoriaAtiva
                ? 'bg-amber-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Todas
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat === categoriaAtiva ? null : cat)}
              aria-pressed={cat === categoriaAtiva}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 ${
                cat === categoriaAtiva
                  ? 'bg-amber-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Livros */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-xl font-bold tracking-tight">
            {categoriaAtiva || 'Todos os Livros'}
          </h2>
          <span className="text-sm text-muted-foreground font-medium">
            {books.length} {books.length === 1 ? 'obra' : 'obras'}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <BookSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-3">Nenhum livro encontrado nesta categoria.</p>
            {categoriaAtiva && (
              <button
                onClick={() => setCategoriaAtiva(null)}
                className="text-sm text-amber-700 dark:text-amber-400 hover:underline font-medium"
              >
                Limpar filtro
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => navigate('book-detail', { bookId: book.id })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}