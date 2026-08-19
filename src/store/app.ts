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
  | 'new-book';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: string;
  saldo_carteira: number;
  biografia?: string;
  avatar_url?: string;
}

interface AppState {
  // Navigation
  currentView: ViewName;
  viewParams: Record<string, string>;
  navigate: (view: ViewName, params?: Record<string, string>) => void;
  goBack: () => void;
  _history: Array<{ view: ViewName; params: Record<string, string> }>;
  _popstateRegistered: boolean;

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
  navigate: (view, params = {}) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const state = useAppStore.getState();
      // Don't push duplicate entries
      const last = state._history[state._history.length - 1];
      if (!last || last.view !== view || JSON.stringify(last.params) !== JSON.stringify(params)) {
        const newHistory = [...state._history, { view, params: params || {} }];
        // Keep max 50 entries
        if (newHistory.length > 50) newHistory.shift();
        set({ _history: newHistory });
      }
      // Push browser history state so Android back button works
      const key = `mozlit_${view}_${Date.now()}`;
      window.history.pushState({ mozlit: true, view, params: params || {} }, '', `#${key}`);
      // Register popstate listener once
      if (!state._popstateRegistered) {
        set({ _popstateRegistered: true });
        window.addEventListener('popstate', (e) => {
          if (e.state?.mozlit) {
            useAppStore.getState().goBack();
          }
        });
      }
    }
    set({ currentView: view, viewParams: params });
  },
  goBack: () => {
    const state = useAppStore.getState();
    const history = [...state._history];
    // Remove current entry
    history.pop();
    if (history.length > 0) {
      const prev = history[history.length - 1];
      set({ currentView: prev.view, viewParams: prev.params, _history: history });
    } else {
      // No history, go home
      set({ currentView: 'home' as ViewName, viewParams: {}, _history: [{ view: 'home' as ViewName, params: {} }] });
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  },

  _history: [],
  _popstateRegistered: false,
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
  // Seed history with home and replace current browser history entry
  // so Android back button navigates within the SPA instead of exiting
  useAppStore.setState({ _history: [{ view: 'home' as ViewName, params: {} }] });
  window.history.replaceState({ mozlit: true, view: 'home', params: {} }, '', '#mozlit_home');

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