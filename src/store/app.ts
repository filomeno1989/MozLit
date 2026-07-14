import { create } from 'zustand';

export type ViewName =
  | 'home'
  | 'book-detail'
  | 'reader'
  | 'author-dashboard'
  | 'login'
  | 'register'
  | 'wallet'
  | 'library'
  | 'new-book'
  | 'edit-book'
  | 'new-chapter'
  | 'book-chapters';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  saldo_carteira: number;
}

interface AppState {
  // Navigation
  currentView: ViewName;
  viewParams: Record<string, string>;
  navigate: (view: ViewName, params?: Record<string, string>) => void;

  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateBalance: (saldo: number) => void;

  // Theme
  isDark: boolean;
  toggleDark: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  viewParams: {},
  navigate: (view, params = {}) => set({ currentView: view, viewParams: params }),

  user: null,
  token: null,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mozlit_token', token);
      localStorage.setItem('mozlit_user', JSON.stringify(user));
    }
    set({ user, token });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mozlit_token');
      localStorage.removeItem('mozlit_user');
    }
    set({ user: null, token: null });
  },
  updateBalance: (saldo) =>
    set((state) => ({
      user: state.user ? { ...state.user, saldo_carteira: saldo } : null,
    })),

  isDark: false,
  toggleDark: () => set((state) => {
    const next = !state.isDark;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', next);
    }
    return { isDark: next };
  }),

  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));

// Initialize from localStorage
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('mozlit_token');
  const userStr = localStorage.getItem('mozlit_user');
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAppStore.setState({ user, token });
    } catch {
      localStorage.removeItem('mozlit_token');
      localStorage.removeItem('mozlit_user');
    }
  }
  // Initialize dark mode from system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
    useAppStore.setState({ isDark: true });
  }
}