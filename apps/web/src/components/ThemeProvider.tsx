import { useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const initializeTheme = useThemeStore((state) => state.initializeTheme);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    // Initialize theme from user preference if logged in, otherwise use stored preference
    initializeTheme(user?.theme as 'light' | 'dark' | undefined);
  }, [user?.theme, initializeTheme]);

  return <>{children}</>;
}
