'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ArrowRight } from 'lucide-react';

const CATEGORIAS = ['Ficção', 'Poesia', 'Drama', 'Contos', 'Romance', 'História', 'Ensaio'];

interface Book {
  id: string;
  titulo: string;
  sinopse: string;
  capa_url: string;
  categoria: string;
  status: string;
  autor: { id: string; nome: string };
}

function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-border/50"
      onClick={onClick}
    >
      <div className="aspect-[3/4] bg-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-800/20 via-amber-700/10 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <BookOpen className="h-10 w-10 text-amber-700/60 dark:text-amber-500/60 mb-3" />
          <h3 className="font-semibold text-sm leading-tight line-clamp-3">{book.titulo}</h3>
        </div>
        <Badge className="absolute top-2 right-2 bg-amber-600 text-white text-xs">
          {book.categoria}
        </Badge>
      </div>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">por {book.autor.nome}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{book.sinopse}</p>
      </CardContent>
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
  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const { navigate } = useAppStore();

  useEffect(() => {
    loadBooks();
  }, [categoriaAtiva]);

  async function loadBooks() {
    setLoading(true);
    try {
      const query = categoriaAtiva ? `?categoria=${encodeURIComponent(categoriaAtiva)}` : '';
      const data = await apiFetch<Book[]>(`/api/books${query}`);
      setBooks(data);
    } catch {
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="mb-10 text-center py-12 px-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30">
        <h1 className="text-3xl sm:text-4xl font-bold text-amber-900 dark:text-amber-100 mb-3">
          Descubra Literatura Moçambicana
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
          Uma plataforma dedicada a escritores e leitores de Moçambique. Publique, leia e monetize suas obras.
        </p>
      </section>

      {/* Categorias */}
      <section className="mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => setCategoriaAtiva(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !categoriaAtiva
                ? 'bg-amber-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            Todas
          </button>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat === categoriaAtiva ? null : cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">
            {categoriaAtiva || 'Todos os Livros'}
          </h2>
          <span className="text-sm text-muted-foreground">{books.length} obras</span>
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
            <p className="text-muted-foreground">Nenhum livro encontrado nesta categoria.</p>
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