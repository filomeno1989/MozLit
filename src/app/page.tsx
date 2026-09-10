'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/store/app';
import AppShell from '@/components/literaria/AppShell';
import HomePage from '@/components/literaria/HomePage';
import BookDetailPage from '@/components/literaria/BookDetailPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

/**
 * PERFORMANCE: as vistas pesadas (Tiptap/ProseMirror, painéis admin, leitor)
 * são carregadas SOB DEMANDA. Assim o leitor comum deixa de descarregar
 * ~200-300KB de editor e painéis que nunca abre — decisivo em dados móveis.
 */
function CarregandoVista() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
    </div>
  );
}

const EReaderPage = dynamic(() => import('@/components/literaria/EReaderPage'), { ssr: false, loading: CarregandoVista });
const AuthorDashboard = dynamic(() => import('@/components/literaria/AuthorDashboard'), { ssr: false, loading: CarregandoVista });
const LoginPage = dynamic(() => import('@/components/literaria/LoginPage'), { ssr: false, loading: CarregandoVista });
const RegisterPage = dynamic(() => import('@/components/literaria/RegisterPage'), { ssr: false, loading: CarregandoVista });
const WalletPage = dynamic(() => import('@/components/literaria/WalletPage'), { ssr: false, loading: CarregandoVista });
const LibraryPage = dynamic(() => import('@/components/literaria/LibraryPage'), { ssr: false, loading: CarregandoVista });
const NewBookPage = dynamic(() => import('@/components/literaria/NewBookPage'), { ssr: false, loading: CarregandoVista });
const AdminPanel = dynamic(() => import('@/components/literaria/AdminPanel'), { ssr: false, loading: CarregandoVista });
const PerfilPage = dynamic(() => import('@/components/literaria/PerfilPage'), { ssr: false, loading: CarregandoVista });

/** Views that require authentication */
const PROTECTED_VIEWS = new Set(['wallet', 'library', 'author-dashboard', 'new-book', 'perfil', 'admin']);

/** Views that require ESCRITOR or ADMIN role */
const WRITER_VIEWS = new Set(['author-dashboard', 'new-book']);

/** Views that require ADMIN role */
const ADMIN_VIEWS = new Set(['admin']);

function ViewRouter() {
  const { currentView, user, navigate } = useAppStore();

  // Route protection: redirect to login if accessing protected view without auth
  useEffect(() => {
    if (PROTECTED_VIEWS.has(currentView) && !user) {
      navigate('login');
    } else if (WRITER_VIEWS.has(currentView) && user && user.role !== 'ESCRITOR' && user.role !== 'ADMIN') {
      navigate('home');
    } else if (ADMIN_VIEWS.has(currentView) && user && user.role !== 'ADMIN') {
      navigate('home');
    }
  }, [currentView, user, navigate]);

  switch (currentView) {
    case 'home':
      return <HomePage />;
    case 'book-detail':
      return <BookDetailPage />;
    case 'reader':
      return <EReaderPage />;
    case 'author-dashboard':
      return <AuthorDashboard />;
    case 'login':
      return <LoginPage />;
    case 'register':
      return <RegisterPage />;
    case 'wallet':
      return <WalletPage />;
    case 'library':
      return <LibraryPage />;
    case 'new-book':
      return <NewBookPage />;
    case 'perfil':
      return <PerfilPage />;
    case 'admin':
      return <AdminPanel />;
    default:
      return <HomePage />;
  }
}

export default function MozLitApp() {
  const { user, isDark } = useAppStore();
  // Validação de sessão: iniciada apenas quando há token guardado
  const [initializing, setInitializing] = useState(true);

  // Initialize app: validate token, sync saldo, restore dark mode
  useEffect(() => {
    // Lê o estado actual do store (evita closure obsoleto entre montagens)
    const { token: tokenActual, setAuth, updateBalance, clearAuth, toggleDark } = useAppStore.getState();

    // Restore dark mode preference
    const savedDark = localStorage.getItem('mozlit_dark');
    if (savedDark !== null && (savedDark === 'true') !== document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.toggle('dark', savedDark === 'true');
      toggleDark();
    }

    // Validate token and sync saldo
    if (!tokenActual) {
      queueMicrotask(() => setInitializing(false));
      return;
    }

    let cancelado = false;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${tokenActual}` },
    })
      .then((res) => {
        if (!res.ok) {
          clearAuth();
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelado && data?.user) {
          // Se o papel mudou na base de dados, /api/auth/me devolve um token
          // novo — guardamos para que as permissões fiquem válidas de imediato.
          setAuth(data.user, data.token || tokenActual);
          // Sync saldo from server
          if (typeof data.user.saldo_carteira === 'number') {
            updateBalance(data.user.saldo_carteira);
          }
        }
      })
      .catch(() => {
        // On network error, keep local state
      })
      .finally(() => {
        if (!cancelado) setInitializing(false);
      });
    return () => { cancelado = true; };
  }, []);

  // Persist dark mode changes
  useEffect(() => {
    localStorage.setItem('mozlit_dark', String(isDark));
  }, [isDark]);

  // Initial loading screen (durante a validação da sessão guardada)
  // Spinner também no SSR — evita mismatch de hidratação com sessão guardada
  if (initializing) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ErrorBoundary>
        <ViewRouter />
      </ErrorBoundary>
    </AppShell>
  );
}