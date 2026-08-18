'use client';

import { useEffect } from 'react';
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

function ViewRouter() {
  const { currentView } = useAppStore();

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
  const { token, user } = useAppStore();

  // Validate token on mount
  useEffect(() => {
    if (token && user) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) {
            useAppStore.getState().clearAuth();
          }
        })
        .catch(() => {});
    }
  }, [token, user]);

  return (
    <AppShell>
      <ViewRouter />
    </AppShell>
  );
}