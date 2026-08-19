'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app';
import AppShell from '@/components/literaria/AppShell';
import HomePage from '@/components/literaria/HomePage';
import BookDetailPage from '@/components/literaria/BookDetailPage';
import EReaderPage from '@/components/literaria/EReaderPage';
import AuthorDashboard from '@/components/literaria/AuthorDashboard';
import LoginPage from '@/components/literaria/LoginPage';
import RegisterPage from '@/components/literaria/RegisterPage';
import WalletPage from '@/components/literaria/WalletPage';
import LibraryPage from '@/components/literaria/LibraryPage';
import NewBookPage from '@/components/literaria/NewBookPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

/** Views that require authentication */
const PROTECTED_VIEWS = new Set(['wallet', 'library', 'author-dashboard', 'new-book']);

/** Views that require ESCRITOR or ADMIN role */
const WRITER_VIEWS = new Set(['author-dashboard', 'new-book']);

function ViewRouter() {
  const { currentView, user, navigate } = useAppStore();

  // Route protection: redirect to login if accessing protected view without auth
  useEffect(() => {
    if (PROTECTED_VIEWS.has(currentView) && !user) {
      navigate('login');
    } else if (WRITER_VIEWS.has(currentView) && user && user.role !== 'ESCRITOR' && user.role !== 'ADMIN') {
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
    default:
      return <HomePage />;
  }
}

export default function MozLitApp() {
  const { token, user, setAuth, updateBalance, clearAuth, isDark, toggleDark } = useAppStore();
  const [initializing, setInitializing] = useState(true);

  // Initialize app: validate token, sync saldo, restore dark mode
  useEffect(() => {
    // Restore dark mode preference
    const savedDark = localStorage.getItem('mozlit_dark');
    if (savedDark !== null) {
      const isDarkSaved = savedDark === 'true';
      if (isDarkSaved !== isDark) {
        document.documentElement.classList.toggle('dark', isDarkSaved);
        toggleDark();
      }
    }

    // Validate token and sync saldo
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) {
            clearAuth();
            return;
          }
          return res.json();
        })
        .then((data) => {
          if (data?.user) {
            setAuth(data.user, token);
            // Sync saldo from server
            if (typeof data.user.saldo_carteira === 'number') {
              updateBalance(data.user.saldo_carteira);
            }
          }
        })
        .catch(() => {
          // On network error, keep local state
        })
        .finally(() => setInitializing(false));
    } else {
      setInitializing(false);
    }
  }, []);

  // Persist dark mode changes
  useEffect(() => {
    localStorage.setItem('mozlit_dark', String(isDark));
  }, [isDark]);

  // Initial loading screen
  if (initializing && token) {
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