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
  login: (token: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (token: string) => {
    api.setToken(token);
    const result = await api.getMe();

    if (result.success && result.data) {
      set({
        user: result.data,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    }

    api.clearToken();
    set({ isLoading: false });
    return false;
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
