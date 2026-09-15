'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Moon, Sun, ChevronLeft, ChevronRight, BookOpen, List, X, Lock, Coins, Loader2, Wallet, BadgeCheck } from 'lucide-react';
import CommentsSection from '@/components/literaria/CommentsSection';
import { toast } from 'sonner';
import { type SectionKey, SECTION_LABELS, isHtmlConteudo, formatarMoedas } from '@/lib/constants';

interface ChapterListItem {
  id: string;
  titulo: string;
  ordem: number;
  is_free: boolean;
  arquivado?: boolean;
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

const getSectionLabel = (key: SectionKey) => SECTION_LABELS[key].label;

/** Ordem de leitura das secções de abertura: Ficha Técnica -> Dedicatória -> Epígrafe */
const ORDEM_SECOES: SectionKey[] = ['ficha_tecnica', 'dedicatoria', 'epigrafe'];

interface CapituloResumo {
  id: string;
  titulo: string;
  ordem: number;
  is_free: boolean;
}

interface SecaoLivro {
  id: string;
  titulo: string;
  autorId: string;
  categorias: string;
  ficha_tecnica: string;
  dedicatoria: string;
  epigrafe: string;
  epilogo: string;
  chapters: CapituloResumo[];
}

/** Próximo passo da leitura (secção seguinte, capítulo ou epílogo) */
type ProximoAlvo =
  | { tipo: 'secao'; key: SectionKey; label: string }
  | { tipo: 'capitulo'; id: string; label: string };

/** O que vem depois de uma secção: secção de abertura seguinte -> 1.º capítulo -> epílogo */
function proximoAposSecao(secao: SectionKey, livro: SecaoLivro | null): ProximoAlvo | null {
  if (!livro) return null;
  if (secao === 'epilogo') return null;
  const idx = ORDEM_SECOES.indexOf(secao);
  if (idx >= 0) {
    for (let i = idx + 1; i < ORDEM_SECOES.length; i++) {
      if (livro[ORDEM_SECOES[i]]) {
        return { tipo: 'secao', key: ORDEM_SECOES[i], label: SECTION_LABELS[ORDEM_SECOES[i]].label };
      }
    }
  }
  const primeiro = livro.chapters && livro.chapters[0];
  if (primeiro) {
    return { tipo: 'capitulo', id: primeiro.id, label: `Cap. 1 - ${primeiro.titulo}` };
  }
  if (livro.epilogo) {
    return { tipo: 'secao', key: 'epilogo', label: SECTION_LABELS.epilogo.label };
  }
  return null;
}

/** Última secção de abertura existente (botão anterior no 1.º capítulo) */
function secaoAnteriorAoCapitulo(livro: ChapterData['livro']): { key: SectionKey; label: string } | null {
  for (let i = ORDEM_SECOES.length - 1; i >= 0; i--) {
    if (livro[ORDEM_SECOES[i]]) {
      return { key: ORDEM_SECOES[i], label: SECTION_LABELS[ORDEM_SECOES[i]].label };
    }
  }
  return null;
}

/** Dados do paywall enviados pela API num 403 (preço, saldo, capa) */
interface PaywallData {
  capituloId: string;
  capituloTitulo: string;
  capituloOrdem: number;
  preco: number;
  livroId: string;
  livroTitulo: string;
  livroCapa: string;
  saldoMoedas: number | null;
}

/**
 * Conteúdo do popup de paywall "Gostaste? Continua a ler".
 * Compra em contexto: o leitor desbloqueia sem sair do capítulo que estava a ler.
 */
function PaywallConteudo({
  paywall,
  aComprar,
  onDesbloquear,
  onCarregar,
  onVoltar,
}: {
  paywall: PaywallData;
  aComprar: boolean;
  onDesbloquear: () => void;
  onCarregar: () => void;
  onVoltar: () => void;
}) {
  const { user } = useAppStore();
  const saldo = user?.moedas ?? paywall.saldoMoedas ?? 0;
  const saldoSuficiente = saldo >= paywall.preco;

  return (
    <div className="text-center">
      {/* Capa do livro meio fora do cartão — assinatura visual do popup */}
      {paywall.livroCapa && paywall.livroCapa !== '/placeholder-cover.svg' ? (
        <img
          src={paywall.livroCapa}
          alt={paywall.livroTitulo}
          className="w-16 aspect-[3/4] object-cover rounded-lg shadow-xl mx-auto -mt-16 border-2 border-background"
        />
      ) : (
        <div className="w-16 aspect-[3/4] rounded-lg shadow-xl mx-auto -mt-16 bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center border-2 border-background">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
      )}

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3" /> Capítulo {paywall.capituloOrdem + 1} bloqueado
      </p>
      <h2 className="mt-1.5 text-xl font-bold leading-snug">Gostaste? Continua a ler</h2>
      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
        <span className="italic">“{paywall.capituloTitulo}”</span>
        <span className="mx-1">·</span>{paywall.livroTitulo}
      </p>

      <div className="mt-5 rounded-xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/25 p-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-white font-bold text-sm shadow-sm">
          <Coins className="h-4 w-4" /> {formatarMoedas(paywall.preco)} MC
        </span>
        {user && (
          <p className="mt-2.5 text-xs text-muted-foreground">
            {saldoSuficiente ? (
              <>Saldo: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatarMoedas(saldo)} MC</span> · após compra: {formatarMoedas(Math.max(0, saldo - paywall.preco))} MC</>
            ) : (
              <>Saldo: <span className="font-semibold text-destructive">{formatarMoedas(saldo)} MC</span> · faltam {formatarMoedas(paywall.preco - saldo)} MC</>
            )}
          </p>
        )}
      </div>

      {user ? (
        saldoSuficiente ? (
          <Button
            className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-md"
            onClick={onDesbloquear}
            disabled={aComprar}
          >
            {aComprar ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Lock className="h-4 w-4 mr-1.5" />}
            {aComprar ? 'A desbloquear…' : `Desbloquear por ${formatarMoedas(paywall.preco)} MC`}
          </Button>
        ) : (
          <Button
            className="mt-4 w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-md"
            onClick={onCarregar}
          >
            <Wallet className="h-4 w-4 mr-1.5" /> Saldo insuficiente — Carregar MC
          </Button>
        )
      ) : (
        <Button
          className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-md"
          onClick={onDesbloquear}
        >
          <Lock className="h-4 w-4 mr-1.5" /> Entrar para desbloquear
        </Button>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground flex items-center justify-center gap-1">
        <BadgeCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        Compra única · acesso para sempre
      </p>

      <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={onVoltar}>
        Voltar ao livro
      </Button>
    </div>
  );
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

/**
 * Renderiza o conteúdo do capítulo:
 * - HTML (do editor rico) → injetado directamente (já foi sanitizado no servidor antes de gravar)
 * - Texto simples (capítulos antigos) → renderizador de prosa legado
 */
function renderConteudo(conteudo: string) {
  if (isHtmlConteudo(conteudo)) {
    return (
      <div
        className="leitor-html"
        dangerouslySetInnerHTML={{ __html: conteudo }}
      />
    );
  }
  return renderProseText(conteudo);
}

export default function EReaderPage() {
  const { viewParams, navigate, user, isDark, toggleDark } = useAppStore();
  const chapterId = viewParams.chapterId as string | undefined;
  const bookId = viewParams.bookId as string | undefined;
  const section = viewParams.section as SectionKey | undefined;

  // Block PrintScreen, Ctrl+Shift+I/J/S/C, Ctrl+P, and DevTools shortcuts
  useEffect(() => {
    function blockKey(e: KeyboardEvent) {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && ['I','i','J','j','S','s','C','c','3'].includes(e.key)) ||
        (e.metaKey && e.shiftKey && ['I','i','J','j','S','s','3'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'p') ||
        (e.metaKey && e.key === 'p')
      ) {
        e.preventDefault();
        return false;
      }
    }
    document.addEventListener('keydown', blockKey);
    return () => document.removeEventListener('keydown', blockKey);
  }, []);

  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);

  // Paywall "Gostaste? Continua a ler" — estado do popup de desbloqueio
  const [paywall, setPaywall] = useState<PaywallData | null>(null);
  const [aComprarPaywall, setAComprarPaywall] = useState(false);

  // For section reading, we need book data (com capítulos para o botão Seguinte)
  const [sectionBook, setSectionBook] = useState<SecaoLivro | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);

  const isSectionView = !!section && !chapterId;

  const loadChapter = useCallback(async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);
    setPaywall(null);
    setChapterMenuOpen(false);
    try {
      const data = await apiFetch<{ chapter: ChapterData }>(`/api/chapters/${chapterId}`);
      setChapter(data.chapter);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.data?.paywall) {
        // 403 paywall: mantém o capítulo actual por trás do popup (se houver)
        // para o leitor decidir sem perder o contexto da leitura
        setPaywall(err.data.paywall as PaywallData);
        setError(null);
      } else {
        setError((err as Error).message);
        setChapter(null);
      }
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  const loadSectionBook = useCallback(async () => {
    if (!bookId || !section) return;
    setSectionLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SecaoLivro>(`/api/books/${bookId}`);
      setSectionBook({
        ...data,
        categorias: typeof data.categorias === 'string' ? JSON.parse(data.categorias) : data.categorias,
        chapters: data.chapters || [],
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



  function goToChapter(id: string) {
    setChapterMenuOpen(false);
    navigate('reader', { chapterId: id, bookId });
  }

  /** Desbloqueia o capítulo do popup sem sair do leitor */
  async function desbloquearDoPaywall() {
    if (!paywall) return;
    if (!user) { navigate('login'); return; }
    setAComprarPaywall(true);
    try {
      const res = await apiFetch<{ success: boolean; novoSaldoMoedas: number }>('/api/library', {
        method: 'POST',
        body: JSON.stringify({ chapterId: paywall.capituloId }),
      });
      useAppStore.getState().updateMoedas(res.novoSaldoMoedas);
      toast.success('Capítulo desbloqueado! Boa leitura.');
      setPaywall(null);
      await loadChapter();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAComprarPaywall(false);
    }
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

  // ============ PAYWALL autónomo (entrada directa num capítulo bloqueado) ============
  if (paywall && !chapter && !isSectionView) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div
          className="max-w-sm mx-auto rounded-2xl border border-border/60 bg-card p-6 pt-6 shadow-lg"
          style={{ animation: 'mozlitPaywallIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <PaywallConteudo
            paywall={paywall}
            aComprar={aComprarPaywall}
            onDesbloquear={desbloquearDoPaywall}
            onCarregar={() => navigate('wallet')}
            onVoltar={() => navigate('book-detail', { bookId: paywall.livroId })}
          />
        </div>
        <style>{`@keyframes mozlitPaywallIn { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>
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
    const proximo = proximoAposSecao(section, sectionBook);

    function irProximo() {
      if (!proximo) return;
      if (proximo.tipo === 'secao') {
        navigate('reader', { bookId, section: proximo.key });
      } else {
        navigate('reader', { chapterId: proximo.id, bookId });
      }
    }

    return (
      <div
        className="relative min-h-[calc(100vh-7rem)]"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
          aria-hidden="true"
          style={{
            backgroundImage: `repeating-linear-gradient(-35deg, transparent, transparent 120px, currentColor 120px, currentColor 121px)`,
            backgroundSize: '400px 280px',
            backgroundPosition: '0 0, 200px 140px',
            opacity: 0.02,
          }}
        ></div>

        <div className="sticky top-14 z-30 bg-background/95 backdrop-blur border-b">
          <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('book-detail', { bookId })}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <span className="text-xs text-muted-foreground truncate max-w-[40%] text-center">
              {sectionBook.titulo}
            </span>
            <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Alternar modo claro/escuro" title="Modo noturno">
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
              {getSectionLabel(section)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {sectionBook.titulo}
            </p>
          </header>

          <div
            className={"prose prose-neutral dark:prose-invert max-w-none [&_p]:mb-5 [&_p]:leading-[1.85] [&_p]:text-[1.05rem] [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:italic [&_em]:text-amber-700 [&_i]:text-amber-700 dark:[&_em]:text-amber-400 dark:[&_i]:text-amber-400" + (isItalic ? ' [&_p]:italic' : '')}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
          {renderConteudo(sectionContent)}
          </div>
        </article>

        {/* Bottom nav: próximo passo da leitura */}
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="flex justify-between items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('book-detail', { bookId })}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Índice</span>
            </Button>
            {proximo ? (
              <Button variant="outline" size="sm" onClick={irProximo} className="min-w-0">
                <span className="truncate max-w-[10rem] sm:max-w-xs">Seguinte: {proximo.label}</span>
                <ChevronRight className="h-4 w-4 ml-1 shrink-0" />
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground shrink-0">Fim do livro</span>
            )}
          </div>
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
  const secaoAnterior = chapter.prevChapter ? null : secaoAnteriorAoCapitulo(livro);

  // Numeração por POSIÇÃO na lista visível (arquivados já excluídos pelo API
  // para leitores): "Cap. 3" é o 3.º que o leitor vê, mesmo que a ordem crua
  // da BD tenha buracos de capítulos eliminados no passado.
  const posicaoActual = Math.max(1, chapter.allChapters.findIndex((c) => c.id === chapter.id) + 1);
  const posPrev = chapter.prevChapter
    ? chapter.allChapters.findIndex((c) => c.id === chapter.prevChapter!.id) + 1
    : 0;
  const posNext = chapter.nextChapter
    ? chapter.allChapters.findIndex((c) => c.id === chapter.nextChapter!.id) + 1
    : 0;

  return (
    <div
      className="relative min-h-[calc(100vh-7rem)]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Watermark overlay - denser for screenshot protection */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
        {Array.from({ length: 16 }).map((_, row) =>
          Array.from({ length: 5 }).map((_, col) => (
            <div
              key={`c-${row}-${col}`}
              className="absolute text-foreground/[0.04] dark:text-foreground/[0.05] font-semibold whitespace-nowrap select-none"
              style={{
                top: `${row * 7}%`,
                left: `${col * 25 - 5}%`,
                transform: 'rotate(-35deg)',
                fontSize: '1rem',
                userSelect: 'none',
              }}
            >
              {user?.nome || 'Leitor'} - MozLit
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
              aria-label="Todos os capítulos"
              aria-expanded={chapterMenuOpen}
              title="Todos os capítulos"
              className={chapterMenuOpen ? 'bg-accent' : ''}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Alternar modo claro/escuro" title="Modo noturno">
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
              {chapter.allChapters.map((ch, idxCh) => (
                <button
                  key={ch.id}
                  onClick={() => goToChapter(ch.id)}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/30 last:border-0 ${ch.id === chapter.id ? 'bg-accent font-medium text-amber-700 dark:text-amber-400' : ''}`}
                >
                  {/* Numeração por posição na lista visível: 1,2,3… sem buracos
                      após eliminar/arquivar (ordem crua da BD pode ter falhas) */}
                  <span className="text-xs font-mono text-muted-foreground w-6 shrink-0">
                    {String(idxCh + 1).padStart(2, '0')}
                  </span>
                  <span className="truncate flex-1">{ch.titulo}</span>
                  {ch.arquivado && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground border rounded px-1 py-0.5 shrink-0">Arquivado</span>
                  )}
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
            Capítulo {posicaoActual} - {chapter.livro.titulo}
          </p>
        </header>

        <div
          className="prose prose-neutral dark:prose-invert max-w-none
            [&_p]:mb-5 [&_p]:leading-[1.85] [&_p]:text-[1.05rem]
            [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-bold
            [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold
            [&_blockquote]:border-l-2 [&_blockquote]:border-amber-500 [&_blockquote]:pl-4 [&_blockquote]:italic
            [&_em]:text-amber-700 [&_i]:text-amber-700 dark:[&_em]:text-amber-400 dark:[&_i]:text-amber-400"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {renderConteudo(chapter.conteudo)}
        </div>
      </article>

      {/* POPUP PAYWALL — "Gostaste? Continua a ler" sobre o capítulo actual */}
      <Dialog open={!!paywall} onOpenChange={(open) => { if (!open) setPaywall(null); }}>
        <DialogContent className="max-w-[340px] rounded-2xl overflow-visible">
          <DialogTitle className="sr-only">Desbloquear capítulo</DialogTitle>
          {paywall && (
            <PaywallConteudo
              paywall={paywall}
              aComprar={aComprarPaywall}
              onDesbloquear={desbloquearDoPaywall}
              onCarregar={() => { setPaywall(null); navigate('wallet'); }}
              onVoltar={() => { setPaywall(null); navigate('book-detail', { bookId: paywall.livroId }); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom nav with prev/next */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="flex justify-between items-center">
          {chapter.prevChapter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToChapter(chapter.prevChapter!.id)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Cap. {posPrev}</span>
            </Button>
          ) : secaoAnterior ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('reader', { bookId, section: secaoAnterior.key })}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{secaoAnterior.label}</span>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('book-detail', { bookId })}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Índice
            </Button>
          )}

          <span className="text-xs text-muted-foreground">
            {posicaoActual} / {chapter.allChapters.length}
          </span>

          {chapter.nextChapter ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToChapter(chapter.nextChapter!.id)}
            >
              <span className="hidden sm:inline">Cap. {posNext}</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : livro.epilogo ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('reader', { bookId, section: 'epilogo' })}
            >
              <span className="hidden sm:inline">Epílogo</span>
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('book-detail', { bookId })}>
              Índice <List className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <CommentsSection chapterId={chapter.id} bookAuthorId={chapter.livro.autorId} />
    </div>
  );
}
