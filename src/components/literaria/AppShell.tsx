'use client';

import { useAppStore, type ViewName } from '@/store/app';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import {
  BookOpen,
  Home,
  LogIn,
  LogOut,
  Moon,
  Sun,
  Menu,
  Wallet,
  Library,
  PenTool,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { view: 'home' as ViewName, label: 'Início', icon: Home, auth: false, roles: undefined as string[] | undefined },
  { view: 'library' as ViewName, label: 'Minha Biblioteca', icon: Library, auth: true, roles: undefined },
  { view: 'wallet' as ViewName, label: 'Carteira', icon: Wallet, auth: true, roles: undefined },
  { view: 'author-dashboard' as ViewName, label: 'Painel do Autor', icon: PenTool, auth: true, roles: ['ESCRITOR', 'ADMIN'] },
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
    <nav className="flex flex-col gap-1">
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
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, currentView, navigate, isDark, toggleDark, sidebarOpen, setSidebarOpen, clearAuth } = useAppStore();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-14 items-center px-4 gap-3">
          {/* Mobile menu */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <SheetTitle className="flex items-center gap-2 text-lg font-bold mb-6">
                <BookOpen className="h-5 w-5 text-amber-600" />
                MozLit
              </SheetTitle>
              <NavLinks user={user} currentView={currentView} navigate={navigate} onClick={() => setSidebarOpen(false)} />
              <div className="pt-6 border-t mt-8">
                {user ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">{user.nome}</p>
                    <button
                      onClick={() => {
                        clearAuth();
                        navigate('home');
                        setSidebarOpen(false);
                      }}
                      className="flex items-center gap-2 text-sm text-destructive hover:underline"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate('login');
                      setSidebarOpen(false);
                    }}
                  >
                    <LogIn className="h-4 w-4 mr-2" /> Entrar
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <button onClick={() => navigate('home')} className="flex items-center gap-2 font-bold text-lg">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <span className="hidden sm:inline">MozLit</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
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

          <div className="ml-auto flex items-center gap-2">
            {user?.role === 'ESCRITOR' || user?.role === 'ADMIN' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('new-book')}
                className="hidden sm:flex"
              >
                <Plus className="h-4 w-4 mr-1" /> Publicar
              </Button>
            ) : null}
            <Button variant="ghost" size="icon" onClick={toggleDark}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-sm text-muted-foreground">
                  {user.saldo_carteira.toFixed(2)} MZN
                </span>
                <Button variant="ghost" size="icon" onClick={() => clearAuth()}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate('login')} className="bg-amber-600 hover:bg-amber-700 text-white">
                <LogIn className="h-4 w-4 mr-1" /> Entrar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>MozLit - Plataforma Literária Moçambicana</p>
          <p className="mt-1">Leitura, Publicação e Monetização</p>
        </div>
      </footer>
    </div>
  );
}