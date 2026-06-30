import { create } from 'zustand';
import { api } from '../lib/api';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  role: 'admin' | 'viewer' | null;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!api.getToken(),
  username: null,
  role: null,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await api.login(username, password);
      set({
        isAuthenticated: true,
        username: result.user.username,
        role: result.user.role,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      throw err;
    }
  },

  logout: () => {
    api.logout();
    set({
      isAuthenticated: false,
      username: null,
      role: null,
    });
  },

  checkAuth: () => {
    const hasToken = !!api.getToken();
    if (!hasToken) {
      set({ isAuthenticated: false, username: null, role: null });
    }
  },
}));
