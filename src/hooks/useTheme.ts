import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const listeners = new Set<() => void>();
const systemDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
let currentTheme: Theme = typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark' ? 'dark' : systemDark() ? 'dark' : 'light';

function applyTheme(theme: Theme) {
  currentTheme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
  listeners.forEach((listener) => listener());
}
if (typeof document !== 'undefined') applyTheme(currentTheme);

export function useTheme() {
  const theme = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => currentTheme,
    () => 'light' as Theme
  );
  return {
    theme,
    setTheme: applyTheme,
    toggleTheme: () => applyTheme(currentTheme === 'light' ? 'dark' : 'light'),
  };
}
