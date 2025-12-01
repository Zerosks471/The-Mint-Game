import { create } from 'zustand';

// Gaming Dashboard theme - dark mode only
interface ThemeState {
  theme: 'dark';
  initialized: boolean;
  initializeTheme: () => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: 'dark',
  initialized: false,

  initializeTheme: () => {
    // Always dark mode - ensure the class is set
    document.documentElement.classList.add('dark');
    set({ initialized: true });
  },
}));
