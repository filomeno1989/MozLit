'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch, ApiError } from '@/lib/api';
import { useAppStore } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, List, X, Lock, Coins, Loader2, Wallet, BadgeCheck, Minus, Plus, ShieldCheck } from 'lucide-react';
import CommentsSection from '@/components/literaria/CommentsSection';
import { toast } from 'sonner';
import { type SectionKey, SECTION_LABELS, isHtmlConteudo, formatarMoedas } from '@/lib/constants';
import { lerPrefsLeitura, guardarPrefsLeitura, TEMAS_LEITOR, familiaFonte, LEITURA_DEFAULTS, LEITURA_MIN, LEITURA_MAX, type PrefsLeitura } from '@/lib/leitura-prefs';
import { guardarProgresso, guardarScroll, lerProgresso } from '@/lib/progresso';

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
          <Coins className="h-4 w-4" /> {formatarMoedas(paywall.preco)}
        </span>
        {user && (
          <p className="mt-2.5 text-xs text-muted-foreground">
            {saldoSuficiente ? (
              <>Saldo: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatarMoedas(saldo)}</span> · após compra: {formatarMoedas(Math.max(0, saldo - paywall.preco))}</>
            ) : (
              <>Saldo: <span className="font-semibold text-destructive">{formatarMoedas(saldo)}</span> · faltam {formatarMoedas(paywall.preco - saldo)}</>
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
            {aComprar ? 'A desbloquear…' : `Desbloquear por ${formatarMoedas(paywall.preco)}`}
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

/**
 * Painel "Aa" — controlos de leitura do profissional (item 16):
 * tema (claro/sépia/escuro), tamanho da letra e tipografia. As preferências
 * vivem no dispositivo e aplicam-se só à área de leitura (imersiva), mesmo
 * que o resto do app esteja noutro tema.
 */
function ControlosLeitura({ prefs, onChange }: { prefs: PrefsLeitura; onChange: (p: PrefsLeitura) => void }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setAberto(!aberto)}
        aria-label="Ecrã e letra"
        aria-expanded={aberto}
        title="Ecrã e letra"
        className={aberto ? 'bg-accent' : ''}
      >
        <span className="text-[13px] font-bold tracking-tight">Aa</span>
      </Button>

      {aberto && (
        <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-[color:var(--leitor-borda)] bg-[var(--leitor-bg)] text-[color:var(--leitor-fg)] shadow-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Ecrã e letra</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAberto(false)} aria-label="Fechar">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Tema */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[color:var(--leitor-suave)] mb-2">Fundo</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TEMAS_LEITOR) as Array<keyof typeof TEMAS_LEITOR>).map((key) => {
                const t = TEMAS_LEITOR[key];
                const activo = prefs.tema === key;
                return (
                  <button
                    key={key}
                    onClick={() => onChange({ ...prefs, tema: key })}
                    aria-pressed={activo}
                    className={`rounded-lg border p-2 flex flex-col items-center gap-1.5 transition-all ${
                      activo
                        ? 'border-amber-500 ring-2 ring-amber-500/40'
                        : 'border-[color:var(--leitor-borda)] hover:border-amber-400'
                    }`}
                    style={{ background: t.bg, color: t.fg }}
                  >
                    <span className="text-xs font-semibold" style={{ color: t.acento }}>Aa</span>
                    <span className="text-[10px] leading-none">{t.nome}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tamanho da letra */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[color:var(--leitor-suave)] mb-2">Tamanho</p>
            <div className="flex items-center justify-between rounded-lg border border-[color:var(--leitor-borda)] px-1 py-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Diminuir letra"
                disabled={prefs.tamanhoFonte <= LEITURA_MIN}
                onClick={() => onChange({ ...prefs, tamanhoFonte: Math.max(LEITURA_MIN, prefs.tamanhoFonte - 1) })}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold tabular-nums">{prefs.tamanhoFonte}px</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Aumentar letra"
                disabled={prefs.tamanhoFonte >= LEITURA_MAX}
                onClick={() => onChange({ ...prefs, tamanhoFonte: Math.min(LEITURA_MAX, prefs.tamanhoFonte + 1) })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tipografia */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[color:var(--leitor-suave)] mb-2">Letra</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChange({ ...prefs, tipografia: 'serif' })}
                aria-pressed={prefs.tipografia === 'serif'}
                className={`rounded-lg border p-2 transition-all ${
                  prefs.tipografia === 'serif'
                    ? 'border-amber-500 ring-2 ring-amber-500/40'
                    : 'border-[color:var(--leitor-borda)] hover:border-amber-400'
                }`}
              >
                <span className="block text-base leading-tight" style={{ fontFamily: familiaFonte('serif') }}>Aa</span>
                <span className="text-[10px] text-[color:var(--leitor-suave)]">Serifada</span>
              </button>
              <button
                onClick={() => onChange({ ...prefs, tipografia: 'sans' })}
                aria-pressed={prefs.tipografia === 'sans'}
                className={`rounded-lg border p-2 transition-all ${
                  prefs.tipografia === 'sans'
                    ? 'border-amber-500 ring-2 ring-amber-500/40'
                    : 'border-[color:var(--leitor-borda)] hover:border-amber-400'
                }`}
              >
                <span className="block text-base leading-tight" style={{ fontFamily: familiaFonte('sans') }}>Aa</span>
                <span className="text-[10px] text-[color:var(--leitor-suave)]">Moderna</span>
              </button>
            </div>
          </div>
        </div>
      )}
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
 * Marca d'água forense (Fase 6 — item 30): padrão diagonal repetido com a
 * identidade do leitor (nome, contacto mascarado, data/hora) sobre TODA a
 * área de leitura, nas duas vistas. Quem capturar o ecrã expõe a própria
 * conta — é a dissuasão que substitui a partilha de trechos removida.
 */
function MarcaAgua({ titulo, detalhe }: { titulo: string; detalhe: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => (
          <div
            key={`m-${row}-${col}`}
            className="absolute font-semibold whitespace-nowrap select-none text-center leading-tight text-[color:var(--leitor-marca)]"
            style={{
              top: `${row * 4.4}%`,
              left: `${col * 27 - 8}%`,
              transform: 'rotate(-32deg)',
              fontSize: '0.95rem',
              userSelect: 'none',
            }}
          >
            {titulo}
            <span className="block text-[10px] font-normal">{detalhe}</span>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Renderiza o conteúdo do capítulo:
 * - HTML (do editor rico) → injetado directamente (já foi sanitizado no servidor antes de gravar)
 * - Texto simples (capítulos antigos) → renderizador de prosa legado
 * Imagens (item 17): clique abre o zoom em tela cheia (delegação no contentor)
 */
function renderConteudo(conteudo: string, aoClicarImagem?: (src: string) => void) {
  if (isHtmlConteudo(conteudo)) {
    return (
      <div
        className="leitor-html"
        onClick={(e) => {
          if (!aoClicarImagem) return;
          const alvo = e.target as HTMLElement;
          if (alvo.tagName === 'IMG') {
            const src = (alvo as HTMLImageElement).getAttribute('src');
            if (src) aoClicarImagem(src);
          }
        }}
        dangerouslySetInnerHTML={{ __html: conteudo }}
      />
    );
  }
  return renderProseText(conteudo);
}

export default function EReaderPage() {
  const { viewParams, navigate, user } = useAppStore();
  const chapterId = viewParams.chapterId as string | undefined;
  const bookId = viewParams.bookId as string | undefined;
  const sectionBruta = viewParams.section as string | undefined;
  // Secção validada: um valor antigo/corrompido no progresso guardado não pode
  // entrar no leitor (SECTION_LABELS[section] lançaria TypeError no render)
  const section = sectionBruta && sectionBruta in SECTION_LABELS
    ? (sectionBruta as SectionKey)
    : undefined;
  const userId = user?.id;

  // BLINDAGEM DE TECLADO (item 31): DevTools, impressão e teclas de captura.
  // O PrintScreen dispara no sistema operativo — não se pode bloquear, mas
  // esvaziamos a área de transferência de imediato para inutilizar o colar.
  useEffect(() => {
    function blockKey(e: KeyboardEvent) {
      if (e.key === 'PrintScreen') {
        try {
          void navigator.clipboard?.writeText('Conteúdo protegido por direitos de autor — MozLit.');
        } catch { /* sem permissão — sem efeito */ }
        e.preventDefault();
        return;
      }
      if (
        (e.ctrlKey && e.shiftKey && ['I','i','J','j','S','s','C','c','3'].includes(e.key)) ||
        (e.metaKey && e.shiftKey && ['I','i','J','j','S','s','3','4','5'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'p') ||
        (e.metaKey && e.key === 'p') ||
        (e.metaKey && e.key === 'u')
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

  // Preferências de leitura (tema/tamanho/tipografia — item 16)
  const [prefs, setPrefsEstado] = useState<PrefsLeitura>(LEITURA_DEFAULTS);
  useEffect(() => {
    setPrefsEstado(lerPrefsLeitura());
  }, []);
  function atualizarPrefs(p: PrefsLeitura) {
    setPrefsEstado(p);
    guardarPrefsLeitura(p);
  }

  // Variáveis CSS do tema do leitor — aplicadas na raiz de cada vista
  const temaLeitor = TEMAS_LEITOR[prefs.tema];
  const varsLeitor = {
    '--leitor-bg': temaLeitor.bg,
    '--leitor-fg': temaLeitor.fg,
    '--leitor-suave': temaLeitor.suave,
    '--leitor-borda': temaLeitor.borda,
    '--leitor-acento': temaLeitor.acento,
    '--leitor-marca': temaLeitor.marca,
    '--leitor-fonte': `${prefs.tamanhoFonte}px`,
    '--leitor-familia': familiaFonte(prefs.tipografia),
  } as React.CSSProperties;

  // Paywall "Gostaste? Continua a ler" — estado do popup de desbloqueio
  const [paywall, setPaywall] = useState<PaywallData | null>(null);
  const [aComprarPaywall, setAComprarPaywall] = useState(false);

  // Imagens do capítulo (item 17): zoom em tela cheia ao tocar numa ilustração
  const [zoomImagem, setZoomImagem] = useState<string | null>(null);
  useEffect(() => {
    if (!zoomImagem) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = antes; };
  }, [zoomImagem]);

  // ============ BLINDAGEM DA OBRA (Fase 6 — itens 29-31) ============
  // 29: A partilha de trechos foi REMOVIDA por decisão do proprietário
  //     (risco de plágio). O leitor volta ao DRM estrito: zero selecção,
  //     zero cópia, zero menu de contexto. Mantém-se apenas a partilha do
  //     LINK público na página da obra — que não expõe texto nenhum.
  // 30: Marca d'água forense (componente MarcaAgua) nas duas vistas.
  // 31: Ofuscação automática ao perder foco + teclas de captura neutralizadas
  //     + impressão já bloqueada globalmente no CSS (@media print).

  // Marca d'água — recalcula quando a sessão do leitor muda. Calculado no
  // cliente (o leitor só renderiza conteúdo depois do loading, logo não há
  // descompasso de hidratação).
  const [marcaAgua, setMarcaAgua] = useState({ titulo: 'MozLit', detalhe: 'Obra protegida' });
  useEffect(() => {
    const nome = user?.nome?.trim() || 'Leitor';
    const contacto = user?.email?.trim() || '';
    // e-mail mascarado: identifica a conta no vazamento sem a expor por inteiro
    const arroba = contacto.indexOf('@');
    const mascarado = arroba > 1
      ? `${contacto.slice(0, 2)}•••${contacto.slice(arroba)}`
      : contacto;
    const agora = new Date();
    const data = agora.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora = agora.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    setMarcaAgua({
      titulo: `${nome} · MozLit`,
      detalhe: [mascarado, `${data} ${hora}`].filter(Boolean).join(' · '),
    });
  }, [user?.id, user?.nome, user?.email]);

  // Ofuscação anti-captura (item 31): quando a janela perde o foco ou o
  // utilizador muda de app/aba, o conteúdo borra — a miniatura do
  // alternador de tarefas e capturas acidentais ficam sem texto legível.
  const [ofuscado, setOfuscado] = useState(false);
  useEffect(() => {
    const aoPerder = () => setOfuscado(true);
    const aoVoltar = () => setOfuscado(false);
    const aoVisibilidade = () => setOfuscado(document.hidden);
    window.addEventListener('blur', aoPerder);
    window.addEventListener('focus', aoVoltar);
    document.addEventListener('visibilitychange', aoVisibilidade);
    return () => {
      window.removeEventListener('blur', aoPerder);
      window.removeEventListener('focus', aoVoltar);
      document.removeEventListener('visibilitychange', aoVisibilidade);
    };
  }, []);

  /** Aviso fixo mostrado enquanto o conteúdo está ofuscado (fora da raiz, para não borrar) */
  const avisoOfuscado = ofuscado ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
      aria-hidden="true"
    >
      <span className="rounded-full bg-black/70 text-white text-xs sm:text-sm px-4 py-2 flex items-center gap-2 shadow-xl">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Conteúdo protegido — volte ao app para continuar a ler
      </span>
    </div>
  ) : null;

  /** Selo dissuasor no topo do leitor (desktop) */
  const seloProtegido = (
    <span
      className="hidden sm:flex items-center gap-1 text-[11px] text-[color:var(--leitor-suave)] select-none"
      title="Obra protegida por direitos de autor. Cópias e capturas identificam a sua conta."
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      Protegido
    </span>
  );

  // For section reading, we need book data (com capítulos para o botão Seguinte)
  const [sectionBook, setSectionBook] = useState<SecaoLivro | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);

  const isSectionView = !!section && !chapterId;

  // Token de corrida: cliques rápidos em Seguinte/Anterior não devem sobrepor
  // a resposta antiga à nova — só o pedido mais recente actualiza o leitor
  const pedidoLeitor = useRef(0);

  const loadChapter = useCallback(async () => {
    if (!chapterId) return;
    const meuPedido = ++pedidoLeitor.current;
    setLoading(true);
    setError(null);
    setPaywall(null);
    setChapterMenuOpen(false);
    try {
      const data = await apiFetch<{ chapter: ChapterData }>(`/api/chapters/${chapterId}`);
      if (meuPedido !== pedidoLeitor.current) return; // resposta obsoleta — ignorar
      setChapter(data.chapter);

      // PROGRESSO (item 15): regista onde o leitor está — dispositivo apenas
      const ch = data.chapter;
      const pos = Math.max(1, ch.allChapters.findIndex((c) => c.id === ch.id) + 1);
      guardarProgresso(userId, {
        bookId: ch.livro.id,
        capituloId: ch.id,
        label: ch.titulo,
        posicao: pos,
        totalCapitulos: ch.allChapters.length,
      });

      // "Continuar a ler" volta ao ponto exacto do scroll dentro do capítulo
      if (useAppStore.getState().viewParams.retomar === '1') {
        const p = lerProgresso(userId, ch.livro.id);
        const pct = p?.capituloId === ch.id ? p.scrollPct : undefined;
        if (pct && pct > 0.01) {
          setTimeout(() => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (max > 200) window.scrollTo({ top: max * pct });
          }, 250);
        }
      }
    } catch (err) {
      if (meuPedido !== pedidoLeitor.current) return;
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
      if (meuPedido === pedidoLeitor.current) setLoading(false);
    }
  }, [chapterId, userId]);

  const loadSectionBook = useCallback(async () => {
    if (!bookId || !section) return;
    const meuPedido = ++pedidoLeitor.current;
    setSectionLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SecaoLivro>(`/api/books/${bookId}`);
      if (meuPedido !== pedidoLeitor.current) return; // resposta obsoleta — ignorar
      setSectionBook({
        ...data,
        categorias: typeof data.categorias === 'string' ? JSON.parse(data.categorias) : data.categorias,
        chapters: data.chapters || [],
      });
      // PROGRESSO (item 15): secções de abertura/epílogo também contam
      guardarProgresso(userId, {
        bookId,
        section,
        // Secção antiga/corrompida no progresso não pode rebentar aqui
        label: SECTION_LABELS[section]?.label ?? section,
        posicao: 0,
        totalCapitulos: data.chapters?.length || 0,
      });
    } catch (err) {
      if (meuPedido !== pedidoLeitor.current) return;
      setError((err as Error).message);
    } finally {
      if (meuPedido === pedidoLeitor.current) setSectionLoading(false);
    }
  }, [bookId, section, userId]);

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

  // PROGRESSO (item 15): guarda a posição de scroll no capítulo (1x/segundo)
  useEffect(() => {
    if (!chapter || isSectionView) return;
    let ultima = 0;
    const aoScroll = () => {
      const agora = Date.now();
      if (agora - ultima < 1000) return;
      ultima = agora;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 200) guardarScroll(userId, chapter.livro.id, window.scrollY / max);
    };
    window.addEventListener('scroll', aoScroll, { passive: true });
    return () => window.removeEventListener('scroll', aoScroll);
  }, [chapter, isSectionView, userId]);



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
      <>
      <div
        className="relative min-h-[calc(100vh-7rem)] bg-[var(--leitor-bg)] text-[color:var(--leitor-fg)] transition-colors"
        style={{ ...varsLeitor, filter: ofuscado ? 'blur(20px)' : undefined }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Marca d'água forense (item 30) */}
        <MarcaAgua titulo={marcaAgua.titulo} detalhe={marcaAgua.detalhe} />

        <div
          className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 bg-[var(--leitor-bg)] border-b border-[color:var(--leitor-borda)]"
        >
          <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('book-detail', { bookId })}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <span className="text-xs text-[color:var(--leitor-suave)] truncate max-w-[40%] text-center">
              {sectionBook.titulo}
            </span>
            <div className="flex items-center gap-1">
              {seloProtegido}
              <ControlosLeitura prefs={prefs} onChange={atualizarPrefs} />
            </div>
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
            className={"max-w-none [&_p]:mb-5 [&_p]:leading-[1.85] [&_p]:text-[length:var(--leitor-fonte)]\n              [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[1.35em] [&_h2]:font-bold\n              [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[1.18em] [&_h3]:font-semibold\n              [&_blockquote]:border-l-2 [&_blockquote]:border-[color:var(--leitor-acento)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[color:var(--leitor-suave)]\n              [&_em]:text-[color:var(--leitor-acento)] [&_i]:text-[color:var(--leitor-acento)]\n              [&_strong]:text-[color:var(--leitor-fg)] [&_a]:text-[color:var(--leitor-acento)] [&_a]:underline" + (isItalic ? ' [&_p]:italic' : '')}
            style={{ userSelect: 'none', WebkitUserSelect: 'none', fontFamily: 'var(--leitor-familia)', color: 'var(--leitor-fg)' }}
          >
          {renderConteudo(sectionContent, setZoomImagem)}
          </div>
        </article>

        {/* Bottom nav: próximo passo da leitura */}
        <div className="max-w-2xl mx-auto px-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
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
      {avisoOfuscado}
      </>
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
    <>
    <div
      className="relative min-h-[calc(100vh-7rem)] bg-[var(--leitor-bg)] text-[color:var(--leitor-fg)] transition-colors"
      style={{ ...varsLeitor, filter: ofuscado ? 'blur(20px)' : undefined }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Marca d'água forense (item 30) — cobre toda a leitura */}
      <MarcaAgua titulo={marcaAgua.titulo} detalhe={marcaAgua.detalhe} />

      {/* Top bar */}
      <div
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 bg-[var(--leitor-bg)] border-b border-[color:var(--leitor-borda)]"
      >
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('book-detail', { bookId })}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <span className="text-xs text-[color:var(--leitor-suave)] truncate max-w-[40%] text-center">
            {chapter.titulo}
          </span>
          <div className="flex items-center gap-1">
            {seloProtegido}
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
            <ControlosLeitura prefs={prefs} onChange={atualizarPrefs} />
          </div>
        </div>

        {/* Chapter dropdown menu */}
        {chapterMenuOpen && chapter.allChapters.length > 0 && (
          <div className="border-b bg-[var(--leitor-bg)] border-[color:var(--leitor-borda)] absolute left-0 right-0 mx-auto max-w-2xl shadow-lg z-50">
            <div className="px-4 py-2 flex items-center justify-between border-b border-[color:var(--leitor-borda)]">
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
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-3 border-b border-[color:var(--leitor-borda)] last:border-0 ${ch.id === chapter.id ? 'bg-accent font-medium text-amber-700 dark:text-amber-400' : ''}`}
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

      {/* Conteúdo imersivo com DRM estrito (item 29) — zero selecção, zero cópia */}
      <article
        className="max-w-2xl mx-auto px-6 sm:px-8 py-10 select-none"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {/* CHAPTER CONTENT - no pre/post sections here */}
        <header className="mb-10 pb-8 border-b border-[color:var(--leitor-borda)]">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
            {chapter.titulo}
          </h1>
          <p className="text-sm text-[color:var(--leitor-suave)]">
            Capítulo {posicaoActual} - {chapter.livro.titulo}
          </p>
        </header>

        <div
          className="max-w-none [&_p]:mb-5 [&_p]:leading-[1.85] [&_p]:text-[length:var(--leitor-fonte)]
            [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[1.35em] [&_h2]:font-bold
            [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[1.18em] [&_h3]:font-semibold
            [&_blockquote]:border-l-2 [&_blockquote]:border-[color:var(--leitor-acento)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[color:var(--leitor-suave)]
            [&_em]:text-[color:var(--leitor-acento)] [&_i]:text-[color:var(--leitor-acento)]
            [&_strong]:text-[color:var(--leitor-fg)] [&_a]:text-[color:var(--leitor-acento)] [&_a]:underline"
          style={{ userSelect: 'none', WebkitUserSelect: 'none', fontFamily: 'var(--leitor-familia)', color: 'var(--leitor-fg)' }}
        >
          {renderConteudo(chapter.conteudo, setZoomImagem)}
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
      <div className="max-w-2xl mx-auto px-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
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

          {/* Zoom de imagem (item 17) — tela cheia, fecha com clique ou Esc */}
      {zoomImagem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagem ampliada"
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomImagem(null)}
        >
          <img
            src={zoomImagem}
            alt="Imagem ampliada do capítulo"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="Fechar imagem"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setZoomImagem(null)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

    </div>
    {avisoOfuscado}
    </>
  );
}
