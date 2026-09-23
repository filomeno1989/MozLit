'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, type ViewName } from '@/store/app';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { recargasNaoVistas, marcarRecargasVistas, type RecargaParaNotificar } from '@/lib/notificacoes';
import { haQuantoDe } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Bell,
  BookOpen,
  Coins,
  FileText,
  Home,
  LogIn,
  LogOut,
  MessageCircle,
  Moon,
  Reply,
  Rss,
  Sun,
  Menu,
  Wallet,
  Library,
  PenTool,
  Plus,
  ShieldCheck,
  UserPlus,
  UserRound,
  Download,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { versaoApp } from '@/lib/app-nativo';
import { verificarActualizacao, abrirDownloadApk, type InfoActualizacao } from '@/lib/actualizacao-app';

const navItems = [
  { view: 'home' as ViewName, label: 'Início', icon: Home, auth: false, roles: undefined as string[] | undefined },
  { view: 'feed' as ViewName, label: 'A Seguir', icon: Rss, auth: false, roles: undefined },
  { view: 'library' as ViewName, label: 'Minha Biblioteca', icon: Library, auth: true, roles: undefined },
  { view: 'wallet' as ViewName, label: 'Carteira', icon: Wallet, auth: true, roles: undefined },
  { view: 'author-dashboard' as ViewName, label: 'Painel do Autor', icon: PenTool, auth: true, roles: ['ESCRITOR', 'ADMIN'] },
  { view: 'admin' as ViewName, label: 'Painel Admin', icon: ShieldCheck, auth: true, roles: ['ADMIN'] },
  { view: 'perfil' as ViewName, label: 'Meu Perfil', icon: UserRound, auth: true, roles: undefined },
];

function NavLinks({
  user,
  currentView,
  navigate,
  onClick,
}: {
  user: ReturnType<typeof useAppStore.getState>['user'];
  currentView: ViewName;
  navigate: (v: ViewName) => void;
  onClick?: () => void;
}) {
  return (
    <nav className='flex flex-col gap-1'>
      {navItems
        .filter((item) => {
          if (item.auth && !user) return false;
          if (item.roles && user && !item.roles.includes(user.role)) return false;
          return true;
        })
        .map((item) => (
          <button
            key={item.view}
            onClick={() => {
              navigate(item.view);
              onClick?.();
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left w-full',
              currentView === item.view
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <item.icon className='h-4 w-4' />
            {item.label}
          </button>
        ))}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, currentView, navigate, isDark, toggleDark, sidebarOpen, setSidebarOpen, clearAuth } = useAppStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  // Versão do APK (só preenchida dentro da app nativa; no site fica oculta)
  const [versao, setVersao] = useState<string | null>(null);
  // Actualização da app por dentro: estado da verificação e resultado
  const [apkActual, setApkActual] = useState<InfoActualizacao | null>(null);
  const [aVerificar, setAVerificar] = useState(false);
  const jaAvisouRef = useRef(false);

  const verificarAgora = useCallback(async () => {
    setAVerificar(true);
    const r = await verificarActualizacao();
    if (r) setApkActual(r);
    setAVerificar(false);
    if (r?.nova && !jaAvisouRef.current) {
      jaAvisouRef.current = true;
      toast(`Nova versão ${r.versaoRemota} disponível`, {
        description: 'Descarrega no menu ☰ > Aplicação > Descarregar actualização.',
      });
    }
  }, []);

  useEffect(() => {
    versaoApp().then(setVersao);
  }, []);

  // Verificação silenciosa ao abrir a app (um pouco depois do arranque,
  // para não competir com os pedidos iniciais)
  useEffect(() => {
    if (!versao) return;
    const t = setTimeout(() => {
      verificarAgora();
    }, 5000);
    return () => clearTimeout(t);
  }, [versao, verificarAgora]);

  // ============ CENTRAL DE NOTIFICAÇÕES (item 24 — Fase 5) ============
  interface Notificacao {
    id: string;
    tipo: string;
    titulo: string;
    corpo: string;
    livroId: string | null;
    capituloId: string | null;
    autorId: string | null;
    lida: boolean;
    createdAt: string;
  }
  const [naoLidas, setNaoLidas] = useState(0);
  const [painelNotif, setPainelNotif] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[] | null>(null);
  const [aCarregarNotif, setACarregarNotif] = useState(false);

  function abrirNotificacao(n: Notificacao) {
    setPainelNotif(false);
    switch (n.tipo) {
      case 'OBRA_NOVA':
        if (n.livroId) navigate('book-detail', { bookId: n.livroId });
        break;
      case 'CAPITULO_NOVO':
      case 'COMENTARIO':
      case 'RESPOSTA':
        if (n.capituloId) navigate('reader', { chapterId: n.capituloId, bookId: n.livroId || undefined });
        else if (n.livroId) navigate('book-detail', { bookId: n.livroId });
        break;
      case 'SEGUIDOR_NOVO':
        if (n.autorId) navigate('autor', { autorId: n.autorId });
        else navigate('perfil');
        break;
      case 'RECARGA':
        navigate('wallet');
        break;
    }
  }

  const iconeNotif: Record<string, typeof Bell> = {
    SEGUIDOR_NOVO: UserPlus,
    OBRA_NOVA: BookOpen,
    CAPITULO_NOVO: FileText,
    COMENTARIO: MessageCircle,
    RESPOSTA: Reply,
    RECARGA: Coins,
  };

  // Abre o painel: carrega a lista completa e marca tudo como lido
  async function abrirPainelNotif() {
    setPainelNotif(true);
    if (!user) return;
    setACarregarNotif(true);
    try {
      const d = await apiFetch<{ notificacoes: Notificacao[]; naoLidas: number }>('/api/notificacoes', { semRedirecionar: true });
      setNotificacoes(d.notificacoes || []);
      setNaoLidas(0);
      if ((d.naoLidas || 0) > 0) {
        await apiFetch('/api/notificacoes', { method: 'PATCH', semRedirecionar: true }).catch(() => {});
      }
    } catch {
      // silencioso — o painel mostra o estado vazio
    } finally {
      setACarregarNotif(false);
    }
  }

  function handleLogout() {
    clearAuth();
    navigate('home');
    setSidebarOpen(false);
    setShowLogoutDialog(false);
    setNaoLidas(0);
    setNotificacoes(null);
  }

  // NOTIFICAÇÃO DE RECARGA (item 19): quando o admin aprova/rejeita uma
  // recarga, o leitor fica a saber — no arranque e a cada 30s com sessão
  // activa. Moeda de troca: confiança ("as minhas MC chegaram!").
  const userIdNotif = user?.id;
  useEffect(() => {
    if (!userIdNotif) return;
    let vivo = true;
    async function verificarRecargas() {
      if (!vivo || !userIdNotif) return;
      try {
        const d = await apiFetch<{ recargas: RecargaParaNotificar[] }>('/api/recargas', { semRedirecionar: true });
        const novas = recargasNaoVistas(userIdNotif, d.recargas || []);
        if (novas.length === 0) return;
        marcarRecargasVistas(userIdNotif);
        for (const r of novas) {
          if (r.estado === 'APROVADA') {
            toast.success(`Recarga aprovada: +${r.moedas.toLocaleString('pt-MZ')} MC`, {
              description: 'As suas moedas já estão disponíveis. Boa leitura!',
              action: { label: 'Ver carteira', onClick: () => useAppStore.getState().navigate('wallet') },
            });
          } else if (r.estado === 'REJEITADA') {
            toast.error(`Recarga de ${r.moedas.toLocaleString('pt-MZ')} MC rejeitada`, {
              description: r.notaAdmin ? `Motivo: ${r.notaAdmin}` : 'Contacte o suporte para mais detalhes.',
              duration: 8000,
            });
          }
        }
      } catch {
        // offline/falha/401: tenta de novo no próximo ciclo — nunca intrusivo.
        // Se a sessão expirou, o clearAuth já aconteceu e este efeito nem
        // volta a correr (userIdNotif fica null) — o leitor termina o capítulo
        // em paz e só pede login na próxima interacção.
      }
    }
    const t = setTimeout(verificarRecargas, 2500); // após o arranque da página
    const iv = setInterval(verificarRecargas, 30_000);
    return () => { vivo = false; clearTimeout(t); clearInterval(iv); };
  }, [userIdNotif]);

  // POLL DE NOTIFICAÇÕES (item 24): contagem leve a cada 30s — o badge do
  // sino cresce quando chegam novidades (novo seguidor, obra/capítulo de
  // autores seguidos, comentários, recargas). silencioso: 401/falha não
  // expulsa o leitor (semRedirecionar).
  useEffect(() => {
    if (!userIdNotif) return;
    let vivo = true;
    async function verificarContagem() {
      if (!vivo || !userIdNotif) return;
      try {
        const d = await apiFetch<{ naoLidas: number }>('/api/notificacoes?contagem=1', { semRedirecionar: true });
        if (vivo) setNaoLidas(d.naoLidas || 0);
      } catch {
        // tenta de novo no próximo ciclo
      }
    }
    const t = setTimeout(verificarContagem, 4000);
    const iv = setInterval(verificarContagem, 30_000);
    return () => { vivo = false; clearTimeout(t); clearInterval(iv); };
  }, [userIdNotif]);

  return (
    <div className='min-h-screen flex flex-col bg-background text-foreground'>
      {/* Logout confirmation dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle>Sair da conta</DialogTitle>
            <DialogDescription>Tem certeza que deseja sair da sua conta?</DialogDescription>
          </DialogHeader>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => setShowLogoutDialog(false)}>Cancelar</Button>
            <Button variant='destructive' onClick={handleLogout}>Sair</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header (safe-area iOS: não fica por baixo do notch — item 23) */}
      <header className='sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-safe'>
        <div className='max-w-7xl mx-auto flex h-14 items-center px-4 gap-3'>
          {/* Mobile menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild className='md:hidden'>
              <Button variant='ghost' size='icon' aria-label='Abrir menu'>
                <Menu className='h-5 w-5' />
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='w-64 p-4'>
              <SheetTitle className='flex items-center gap-2 text-lg font-bold mb-6'>
                <BookOpen className='h-5 w-5 text-amber-600' />
                MozLit
              </SheetTitle>
              <NavLinks user={user} currentView={currentView} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <div className='pt-6 border-t mt-8'>
                {user ? (
                  <div className='space-y-3'>
                    <button
                      onClick={() => {
                        navigate('perfil');
                        setSidebarOpen(false);
                      }}
                      className='flex items-center gap-2 text-sm font-medium hover:text-amber-700 dark:hover:text-amber-400 transition-colors'
                    >
                      <UserRound className='h-4 w-4' /> {user.nome}
                    </button>
                    <button
                      onClick={() => setShowLogoutDialog(true)}
                      className='flex items-center gap-2 text-sm text-destructive hover:underline'
                    >
                      <LogOut className='h-4 w-4' /> Sair
                    </button>
                  </div>
                ) : (
                  <Button
                    variant='outline'
                    className='w-full'
                    onClick={() => {
                      navigate('login');
                      setSidebarOpen(false);
                    }}
                  >
                    <LogIn className='h-4 w-4 mr-2' /> Entrar
                  </Button>
                )}
              </div>

              {/* APLICAÇÃO: versão + actualização por dentro (só na app nativa) */}
              {versao && (
                <div className='pt-5 border-t mt-6 space-y-2.5'>
                  <p className='text-xs text-muted-foreground flex items-center gap-2'>
                    <Download className='h-3.5 w-3.5' /> Aplicação v{versao}
                  </p>
                  {apkActual?.nova ? (
                    <div className='rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-2'>
                      <p className='text-xs font-semibold text-amber-900 dark:text-amber-200'>
                        Nova versão {apkActual.versaoRemota} disponível
                      </p>
                      {apkActual.notas && (
                        <p className='text-[11px] leading-snug text-amber-800/90 dark:text-amber-300/90 line-clamp-3'>
                          {apkActual.notas}
                        </p>
                      )}
                      <Button
                        size='sm'
                        className='w-full bg-amber-600 hover:bg-amber-700 text-white'
                        onClick={() => {
                          if (apkActual.urlApk) {
                            abrirDownloadApk(apkActual.urlApk);
                            toast.success('Download iniciado no navegador', {
                              description: 'Quando terminar, abre o ficheiro descarregado para instalar a nova versão.',
                            });
                            setSidebarOpen(false);
                          }
                        }}
                      >
                        <Download className='h-4 w-4 mr-1.5' /> Descarregar actualização
                      </Button>
                    </div>
                  ) : null}
                  <button
                    onClick={verificarAgora}
                    disabled={aVerificar}
                    className='text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 disabled:opacity-60'
                  >
                    {aVerificar ? (
                      <Loader2 className='h-3 w-3 animate-spin' />
                    ) : (
                      <RefreshCw className='h-3 w-3' />
                    )}
                    {aVerificar ? 'A verificar...' : apkActual ? 'Verificar de novo' : 'Verificar actualizações'}
                  </button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <button onClick={() => navigate('home')} className='flex items-center gap-2 font-bold text-lg'>
            <BookOpen className='h-5 w-5 text-amber-600' />
            <span className='hidden sm:inline'>MozLit</span>
          </button>

          {/* Desktop Nav */}
          <nav className='hidden md:flex items-center gap-1 ml-6'>
            {navItems
              .filter((item) => {
                if (item.auth && !user) return false;
                if (item.roles && user && !item.roles.includes(user.role)) return false;
                return true;
              })
              .map((item) => (
                <button
                  key={item.view}
                  onClick={() => navigate(item.view)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    currentView === item.view
                      ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  {item.label}
                </button>
              ))}
          </nav>

          <div className='ml-auto flex items-center gap-2'>
            {user?.role === 'ESCRITOR' || user?.role === 'ADMIN' ? (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => navigate('new-book')}
                className='hidden sm:flex'
              >
                <Plus className='h-4 w-4 mr-1' /> Publicar
              </Button>
            ) : null}
            <Button variant='ghost' size='icon' onClick={toggleDark} aria-label='Alternar modo claro/escuro'>
              {isDark ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
            </Button>
            {user ? (
              <div className='flex items-center gap-2'>
                {/* SINO DE NOTIFICAÇÕES (item 24) */}
                <button
                  onClick={abrirPainelNotif}
                  className='relative inline-flex items-center justify-center rounded-md h-9 w-9 hover:bg-accent transition-colors'
                  aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ''}`}
                >
                  <Bell className='h-4 w-4' />
                  {naoLidas > 0 && (
                    <span
                      className='absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-background'
                      aria-hidden='true'
                    >
                      {naoLidas > 9 ? '9+' : naoLidas}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate('wallet')}
                  className='hidden sm:inline-flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors'
                  aria-label='Moedas'
                >
                  <Coins className='h-3.5 w-3.5' />
                  {(user.moedas ?? 0).toLocaleString('pt-MZ')} MC
                </button>
                <Button variant='ghost' size='icon' onClick={() => navigate('perfil')} aria-label='Meu perfil'>
                  <UserRound className='h-4 w-4' />
                </Button>
                <Button variant='ghost' size='icon' onClick={() => setShowLogoutDialog(true)} aria-label='Sair da conta'>
                  <LogOut className='h-4 w-4' />
                </Button>
              </div>
            ) : (
              <Button variant='default' size='sm' onClick={() => navigate('login')} className='bg-amber-600 hover:bg-amber-700 text-white'>
                <LogIn className='h-4 w-4 mr-1' /> Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* CENTRAL DE NOTIFICAÇÕES (item 24) */}
      <Sheet open={painelNotif} onOpenChange={setPainelNotif}>
        <SheetContent side='right' className='w-full sm:w-96 p-0 flex flex-col'>
          <SheetTitle className='flex items-center justify-between px-4 py-4 border-b'>
            <span className='flex items-center gap-2 text-base font-bold'>
              <Bell className='h-4 w-4 text-amber-600' /> Notificações
            </span>
          </SheetTitle>
          <div className='flex-1 overflow-y-auto'>
            {!user ? (
              <div className='text-center py-14 px-6'>
                <Bell className='h-9 w-9 mx-auto text-muted-foreground/40 mb-3' />
                <p className='text-sm text-muted-foreground mb-4'>Entre na sua conta para ver as suas notificações.</p>
                <Button size='sm' className='bg-amber-600 hover:bg-amber-700 text-white' onClick={() => { setPainelNotif(false); navigate('login'); }}>
                  Entrar
                </Button>
              </div>
            ) : aCarregarNotif ? (
              <div className='space-y-3 p-4'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className='flex gap-3'>
                    <div className='h-9 w-9 rounded-full bg-muted animate-pulse shrink-0' />
                    <div className='flex-1 space-y-2 pt-1'>
                      <div className='h-3 w-3/4 bg-muted rounded animate-pulse' />
                      <div className='h-3 w-1/2 bg-muted rounded animate-pulse' />
                    </div>
                  </div>
                ))}
              </div>
            ) : !notificacoes || notificacoes.length === 0 ? (
              <div className='text-center py-14 px-6'>
                <Bell className='h-9 w-9 mx-auto text-muted-foreground/40 mb-3' />
                <p className='text-sm font-medium mb-1'>Ainda sem notificações</p>
                <p className='text-xs text-muted-foreground'>
                  Quando alguém seguir o seu trabalho, ou os autores que você segue publicarem novidades, aparecem aqui.
                </p>
              </div>
            ) : (
              <ul className='divide-y divide-border/60'>
                {notificacoes.map((n) => {
                  const Icone = iconeNotif[n.tipo] || Bell;
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => abrirNotificacao(n)}
                        className={cn(
                          'w-full text-left px-4 py-3.5 flex gap-3 hover:bg-accent/60 transition-colors',
                          !n.lida && 'bg-amber-50/60 dark:bg-amber-950/15'
                        )}
                      >
                        <span className='mt-0.5 shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center'>
                          <Icone className='h-4 w-4 text-amber-700 dark:text-amber-400' />
                        </span>
                        <span className='flex-1 min-w-0'>
                          <span className='block text-sm font-medium leading-snug'>{n.titulo}</span>
                          {n.corpo && (
                            <span className='block text-xs text-muted-foreground mt-0.5 line-clamp-2'>{n.corpo}</span>
                          )}
                          <span className='block text-[11px] text-muted-foreground/70 mt-1'>{haQuantoDe(n.createdAt)}</span>
                        </span>
                        {!n.lida && <span className='mt-1.5 shrink-0 h-2 w-2 rounded-full bg-amber-500' aria-hidden='true' />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className='flex-1'>
        {children}
      </main>

      {/* Footer (safe-area iOS: barra home do iPhone) */}
      <footer className='border-t py-8 mt-auto pb-safe'>
        <div className='max-w-7xl mx-auto px-4'>
          <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
            <div className='text-center sm:text-left'>
              <p className='text-sm font-medium'>MozLit - Plataforma Literária Moçambicana</p>
              <p className='text-xs text-muted-foreground mt-0.5'>Leitura, Publicação e Monetização</p>
              {versao && <p className='text-xs text-muted-foreground mt-0.5'>Aplicação v{versao}</p>}
            </div>
            <nav className='flex items-center gap-4 text-xs text-muted-foreground'>
              <button onClick={() => navigate('home')} className='hover:text-foreground transition-colors'>Início</button>
              <span className='text-border'>|</span>
              <button onClick={() => navigate('library')} className='hover:text-foreground transition-colors'>Biblioteca</button>
              {user && (user.role === 'ESCRITOR' || user.role === 'ADMIN') && (
                <>
                  <span className='text-border'>|</span>
                  <button onClick={() => navigate('author-dashboard')} className='hover:text-foreground transition-colors'>Painel do Autor</button>
                </>
              )}
              {user?.role === 'ADMIN' && (
                <>
                  <span className='text-border'>|</span>
                  <button onClick={() => navigate('admin')} className='hover:text-foreground transition-colors'>Admin</button>
                </>
              )}
              <span className='text-border'>|</span>
              <a href='/termos' className='hover:text-foreground transition-colors'>Termos</a>
              <span className='text-border'>|</span>
              <a href='/privacidade' className='hover:text-foreground transition-colors'>Privacidade</a>
            </nav>
          </div>
          <p className='text-[11px] italic text-muted-foreground/70 text-center mt-5'>F. M. J. A.</p>
        </div>
      </footer>
    </div>
  );
}
