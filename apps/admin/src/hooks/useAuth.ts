import { create } from 'zustand';
import { api } from '@/lib/api';

interface AdminUser {
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: AdminUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (username: string, password: string) => {
    const result = await api.login(username, password);

    if (result.success && result.data) {
      set({
        user: result.data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }

    set({ isLoading: false });
    return {
      success: false,
      error: result.error?.message || 'Login failed',
    };
  },

  logout: () => {
    api.clearToken();
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    const token = api.getToken();
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const result = await api.getMe();
    if (result.success && result.data) {
      set({
        user: result.data,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      api.clearToken();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
