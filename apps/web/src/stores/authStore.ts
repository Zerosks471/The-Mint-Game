import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { authApi } from '../api/auth';

interface User {
  id: string;
  email: string;
  username: string;
  isPremium: boolean;
  displayName?: string;
  theme?: 'light' | 'dark';
  soundEnabled?: boolean;
  musicEnabled?: boolean;
  notificationsEnabled?: boolean;
  avatarId?: string;
  avatarFrameId?: string | null;
  badgeId?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login({ email, password });

          if (response.success && response.data) {
            const { user, accessToken } = response.data;
            const userData = user as Record<string, unknown>;
            apiClient.setAccessToken(accessToken);
            set({
              user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isPremium: user.isPremium,
                displayName: userData.displayName as string | undefined,
                theme: userData.theme as 'light' | 'dark' | undefined,
                soundEnabled: userData.soundEnabled as boolean | undefined,
                musicEnabled: userData.musicEnabled as boolean | undefined,
                notificationsEnabled: userData.notificationsEnabled as boolean | undefined,
                avatarId: userData.avatarId as string | undefined,
                avatarFrameId: userData.avatarFrameId as string | null | undefined,
                badgeId: userData.badgeId as string | null | undefined,
              },
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({
              error: response.error?.message || 'Login failed',
              isLoading: false,
            });
            return false;
          }
        } catch {
          set({
            error: 'Network error. Please try again.',
            isLoading: false,
          });
          return false;
        }
      },

      register: async (email: string, username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register({ email, username, password });

          if (response.success && response.data) {
            const { user, accessToken } = response.data;
            const userData = user as Record<string, unknown>;
            apiClient.setAccessToken(accessToken);
            set({
              user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isPremium: user.isPremium,
                displayName: userData.displayName as string | undefined,
                theme: userData.theme as 'light' | 'dark' | undefined,
                soundEnabled: userData.soundEnabled as boolean | undefined,
                musicEnabled: userData.musicEnabled as boolean | undefined,
                notificationsEnabled: userData.notificationsEnabled as boolean | undefined,
                avatarId: userData.avatarId as string | undefined,
                avatarFrameId: userData.avatarFrameId as string | null | undefined,
                badgeId: userData.badgeId as string | null | undefined,
              },
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } else {
            set({
              error: response.error?.message || 'Registration failed',
              isLoading: false,
            });
            return false;
          }
        } catch {
          set({
            error: 'Network error. Please try again.',
            isLoading: false,
          });
          return false;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors
        }
        apiClient.setAccessToken(null);
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        // Try to refresh the token and get user data
        try {
          const refreshResponse = await authApi.refresh();
          if (refreshResponse.success && refreshResponse.data) {
            apiClient.setAccessToken(refreshResponse.data.accessToken);

            const userResponse = await authApi.getMe();
            if (userResponse.success && userResponse.data) {
              const userData = userResponse.data as Record<string, unknown>;
              set({
                user: {
                  id: userData.id as string,
                  email: userData.email as string,
                  username: userData.username as string,
                  isPremium: userData.isPremium as boolean,
                  avatarId: userData.avatarId as string | undefined,
                  avatarFrameId: userData.avatarFrameId as string | null | undefined,
                  badgeId: userData.badgeId as string | null | undefined,
                },
                isAuthenticated: true,
              });
              return true;
            }
          }
        } catch {
          // Token refresh failed
        }

        set({
          user: null,
          isAuthenticated: false,
        });
        return false;
      },

      clearError: () => set({ error: null }),

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist user info, not tokens (handled by HTTP-only cookies)
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
