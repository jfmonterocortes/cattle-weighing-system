const THEME_KEY = 'theme';

export function getStoredTheme() {
  const t = localStorage.getItem(THEME_KEY);
  return t === 'light' || t === 'dark' ? t : null;
}

export function applyTheme(theme) {
  const root = document.documentElement;
  const nextTheme = theme === 'dark' ? 'dark' : 'light';

  root.dataset.theme = nextTheme;

  if (nextTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.style.colorScheme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
}

export function initTheme() {
  const stored = getStoredTheme();
  if (stored) {
    applyTheme(stored);
    return stored;
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  const theme = prefersDark ? 'dark' : 'light';
  applyTheme(theme);
  return theme;
}
