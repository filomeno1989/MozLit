'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Moon, Sun, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import CommentsSection from '@/components/literaria/CommentsSection';

interface ChapterData {
  id: string;
  titulo: string;
  conteudo: string;
  ordem: number;
  is_free: boolean;
  isFirstChapter: boolean;
  isLastChapter: boolean;
  livro: {
    id: string;
    titulo: string;
    autorId: string;
    categorias: string[];
    ficha_tecnica: string;
    dedicatoria: string;
    epigrafe: string;
    epilogo: string;
  };
}

function renderProseText(text: string) {
  return text.split('\n').map((paragraph, i) => {
    if (!paragraph.trim()) return <br key={i} />;
    if (paragraph.startsWith('## ')) {
      return <h2 key={i}>{paragraph.slice(3)}</h2>;
    }
    if (paragraph.startsWith('### ')) {
      return <h3 key={i}>{paragraph.slice(4)}</h3>;
    }
    if (paragraph.startsWith('> ')) {
      return <blockquote key={i}><p>{paragraph.slice(2)}</p></blockquote>;
    }
    return <p key={i}>{paragraph}</p>;
  });
}

export default function EReaderPage() {
  const { viewParams, navigate, user, isDark, toggleDark } = useAppStore();
  const chapterId = viewParams.chapterId;
  const bookId = viewParams.bookId;
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChapter = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ chapter: ChapterData }>(`/api/chapters/${chapterId}`);
      setChapter(data.chapter);
    } catch (err) {
      setError((err as Error).message);
      setChapter(null);
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  // Anti-copy: block right-click
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-destructive mb-4">{error || 'Capítulo não encontrado.'}</p>
        <Button variant="outline" onClick={() => navigate('book-detail', { bookId: bookId })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao livro
        </Button>
      </div>
    );
  }

  const { livro } = chapter;
  const hasPreSections = chapter.isFirstChapter && (livro.ficha_tecnica || livro.dedicatoria || livro.epigrafe);
  const hasPostSection = chapter.isLastChapter && livro.epilogo;

  return (
    <div
      className="relative min-h-[calc(100vh-7rem)]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Watermark overlay */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, row) =>
          Array.from({ length: 4 }).map((_, col) => (
            <div
              key={`${row}-${col}`}
              className="absolute text-foreground/[0.03] dark:text-foreground/[0.04] font-semibold whitespace-nowrap select-none"
              style={{
                top: `${row * 10}%`,
                left: `${col * 30 - 5}%`,
                transform: 'rotate(-35deg)',
                fontSize: '1rem',
                userSelect: 'none',
              }}
            >
              {user?.nome || 'Leitor'} — MozLit
            </div>
          ))
        )}
      </div>

      {/* Top bar */}
      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('book-detail', { bookId: bookId })}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span className="text-xs text-muted-foreground truncate max-w-[40%] text-center">
            {chapter.livro.titulo}
          </span>
          <Button variant="ghost" size="icon" onClick={toggleDark} title="Modo noturno">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content - immersive reading with anti-copy */}
      <article
        className="max-w-2xl mx-auto px-6 sm:px-8 py-10 select-none"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* ===== PRE-CHAPTER SECTIONS (only on first chapter) ===== */}
        {hasPreSections && (
          <div className="mb-12 space-y-10">
            {/* Ficha Técnica */}
            {livro.ficha_tecnica && (
              <div className="border-l-2 border-amber-300 dark:border-amber-700 pl-5">
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">
                  Ficha Técnica
                </h2>
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none
                    [&_p]:mb-3 [&_p]:leading-[1.8] [&_p]:text-[0.95rem] [&_p]:text-muted-foreground"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  {renderProseText(livro.ficha_tecnica)}
                </div>
              </div>
            )}

            {/* Dedicatória */}
            {livro.dedicatoria && (
              <div className="py-6 border-t border-b border-border/30">
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-4">
                  Dedicatória
                </h2>
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none
                    [&_p]:mb-3 [&_p]:leading-[1.85] [&_p]:text-[1.05rem] [&_p]:italic"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  {renderProseText(livro.dedicatoria)}
                </div>
              </div>
            )}

            {/* Epígrafe */}
            {livro.epigrafe && (
              <div className="pl-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">
                  Epígrafe
                </h2>
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none
                    [&_p]:mb-3 [&_p]:leading-[1.85] [&_p]:text-[1rem] [&_p]:italic [&_p]:text-muted-foreground"
                  style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                >
                  {renderProseText(livro.epigrafe)}
                </div>
              </div>
            )}

            {/* Separator between pre-sections and chapter */}
            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1 h-px bg-border/50" />
              <BookOpen className="h-4 w-4 text-muted-foreground/40" />
              <div className="flex-1 h-px bg-border/50" />
            </div>
          </div>
        )}

        {/* ===== CHAPTER CONTENT ===== */}
        <header className="mb-10 pb-8 border-b border-border/30">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
            {chapter.titulo}
          </h1>
          <p className="text-sm text-muted-foreground">
            Capítulo {chapter.ordem + 1} — {chapter.livro.titulo}
          </p>
        </header>

        <div
          className="prose prose-neutral dark:prose-invert max-w-none
            [&_p]:mb-5 [&_p]:leading-[1.85] [&_p]:text-[1.05rem]
            [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold
            [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold
            [&_blockquote]:border-l-2 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:italic
            [&_em]:not-italic:text-amber-700 dark:[&_em]:text-amber-400"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {renderProseText(chapter.conteudo)}
        </div>

        {/* ===== POST-CHAPTER SECTION: Epílogo (only on last chapter) ===== */}
        {hasPostSection && (
          <div className="mt-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-border/50" />
              <BookOpen className="h-4 w-4 text-muted-foreground/40" />
              <div className="flex-1 h-px bg-border/50" />
            </div>
            <div className="py-6 border-t border-b border-border/30">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-4">
                Epílogo
              </h2>
              <div
                className="prose prose-neutral dark:prose-invert max-w-none
                  [&_p]:mb-3 [&_p]:leading-[1.85] [&_p]:text-[1.05rem]"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                {renderProseText(livro.epilogo)}
              </div>
            </div>
          </div>
        )}
      </article>

      {/* Bottom nav */}
      <div className="max-w-2xl mx-auto px-4 pb-4 flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('book-detail', { bookId: bookId })}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Índice
        </Button>
        <span className="text-xs text-muted-foreground">Fim do capítulo</span>
      </div>

      {/* Comments Section */}
      <CommentsSection chapterId={chapterId!} bookAuthorId={chapter.livro.autorId} />
    </div>
  );
}
