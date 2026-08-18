'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Moon, Sun, ChevronLeft, ChevronRight, BookOpen, List, X } from 'lucide-react';
import CommentsSection from '@/components/literaria/CommentsSection';

interface ChapterListItem {
  id: string;
  titulo: string;
  ordem: number;
  is_free: boolean;
}

interface ChapterData {
  id: string;
  titulo: string;
  conteudo: string;
  ordem: number;
  is_free: boolean;
  prevChapter: ChapterListItem | null;
  nextChapter: ChapterListItem | null;
  allChapters: ChapterListItem[];
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

type SectionKey = 'ficha_tecnica' | 'dedicatoria' | 'epigrafe' | 'epilogo';

const SECTION_LABELS: Record<SectionKey, string> = {
  ficha_tecnica: 'Ficha Técnica',
  dedicatoria: 'Dedicatória',
  epigrafe: 'Epígrafe',
  epilogo: 'Epílogo',
};

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
  const chapterId = viewParams.chapterId as string | undefined;
  const bookId = viewParams.bookId as string | undefined;
  const section = viewParams.section as SectionKey | undefined;

  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);

  // For section reading, we need book data
  const [sectionBook, setSectionBook] = useState<ChapterData['livro'] | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);

  const isSectionView = !!section && !chapterId;

  const loadChapter = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    setChapterMenuOpen(false);
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

  const loadSectionBook = useCallback(async () => {
    if (!bookId || !section) return;
    setSectionLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{
        id: string; titulo: string; autorId: string; categorias: string;
        ficha_tecnica: string; dedicatoria: string; epigrafe: string; epilogo: string;
      }>(`/api/books/${bookId}`);
      setSectionBook({
        ...data,
        categorias: typeof data.categorias === 'string' ? JSON.parse(data.categorias) : data.categorias,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSectionLoading(false);
    }
  }, [bookId, section]);

  useEffect(() => {
    if (isSectionView) {
      loadSectionBook();
    } else {
      loadChapter();
    }
  }, [isSectionView, loadChapter, loadSectionBook]);

  // Close chapter menu on navigation
  useEffect(() => {
    setChapterMenuOpen(false);
  }, [chapterId]);

  // Anti-copy: block right-click
  useEffect(() => {
    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  function goToChapter(id: string) {
    setChapterMenuOpen(false);
    navigate('reader', { chapterId: id, bookId });
  }

  // Loading states
  if (isSectionView && sectionLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    );
  }

  if (!isSectionView && loading) {
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

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button variant="outline" onClick={() => navigate('book-detail', { bookId })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao livro
        </Button>
      </div>
    );
  }
  // ============ SECTION VIEW (ficha técnica, dedicatória, etc.) ============
  if (isSectionView && sectionBook) {
    const sectionContent = sectionBook[section];
    if (!sectionContent) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground mb-4">Secção não encontrada.</p>
          <Button variant="outline" onClick={() => navigate('book-detail', { bookId })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao livro
          </Button>
        </div>
      );
    }

    const isItalic = section === 'dedicatoria' || section === 'epigrafe';

    return (
      <div
        className="relative min-h-[calc(100vh-7rem)]"
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Watermark */}
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
            <Button variant="ghost" size="sm" onClick={() => navigate('book-detail', { bookId })}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <span className="text-xs text-muted-foreground truncate max-w-[40%] text-center">
              {sectionBook.titulo}
            </span>
            <Button variant="ghost" size="icon" onClick={toggleDark} title="Modo noturno">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Section content */}
        <article
          className="max-w-2xl mx-auto px-6 sm:px-8 py-10 select-none"
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          <header className="mb-10 pb-8 border-b border-border/30">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
              {SECTION_LABELS[section]}
            </h1>
            <p className="text-sm text-muted-foreground">
              {sectionBook.titulo}
            </p>
          </header>

          <div
            className={"prose prose-neutral dark:prose-invert max-w-none [&_p]:mb-5 [&_p]:leading-[1.85] [&_p]:text-[1.05rem] [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:italic" + (isItalic ? ' [&_p]:italic' : '')}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {renderProseText(sectionContent)}
          </div>
        </article>

        {/* Bottom nav */}
        <div className="max-w-2xl mx-auto px-4 pb-4 flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={() => navigate('book-detail', { bookId })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Índice
          </Button>
          <span className="text-xs text-muted-foreground">Fim da secção</span>
        </div>
      </div>
    );
  }

  // ============ CHAPTER VIEW ============
  if (!chapter) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-destructive mb-4">Capítulo não encontrado.</p>
        <Button variant="outline" onClick={() => navigate('book-detail', { bookId })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao livro
        </Button>
      </div>
    );
  }

  const { livro } = chapter;

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
          <Button variant="ghost" size="sm" onClick={() => navigate('book-detail', { bookId })}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span className="text-xs text-muted-foreground truncate max-w-[40%] text-center">
            {chapter.titulo}
          </span>
          <div className="flex items-center gap-1">
            {/* Chapter menu button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChapterMenuOpen(!chapterMenuOpen)}
              title="Todos os capítulos"
              className={chapterMenuOpen ? 'bg-accent' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleDark} title="Modo noturno">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Chapter dropdown menu */}
        {chapterMenuOpen && chapter.allChapters.length > 0 && (
          <div className="border-b bg-background absolute left-0 right-0 mx-auto max-w-2xl shadow-lg z-50">
            <div className="px-4 py-2 flex items-center justify-between border-b">
              <span className="text-sm font-medium">Capítulos</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChapterMenuOpen(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {chapter.allChapters.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(ch.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/30 last:border-0 ${ch.id === chapter.id ? 'bg-accent font-medium text-amber-700 dark:text-amber-400' : ''}`}
                >
                  <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">
                    {String(ch.ordem + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate flex-1">{ch.titulo}</span>
                  {ch.is_free && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0">Grátis</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content - immersive reading with anti-copy */}
      <article
        className="max-w-2xl mx-auto px-6 sm:px-8 py-10 select-none"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* CHAPTER CONTENT - no pre/post sections here */}
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
      </article>

      {/* Bottom nav with prev/next */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="flex justify-between items-center">
          {chapter.prevChapter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToChapter(chapter.prevChapter.id)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Cap. {chapter.prevChapter.ordem + 1}</span>
              <ChevronLeft className="h-4 w-4 sm:hidden" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('book-detail', { bookId })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Índice
            </Button>
          )}

          <span className="text-xs text-muted-foreground">
            {chapter.ordem + 1} / {chapter.allChapters.length}
          </span>

          {chapter.nextChapter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToChapter(chapter.nextChapter.id)}
            >
              <span className="hidden sm:inline">Cap. {chapter.nextChapter.ordem + 1} </span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
              <ChevronRight className="h-4 w-4 sm:hidden" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('book-detail', { bookId })}>
              Índice <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
            </Button>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <CommentsSection chapterId={chapter.id} bookAuthorId={chapter.livro.autorId} />
    </div>
  );
}
