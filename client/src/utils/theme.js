const THEME_KEY = "theme";

export function getStoredTheme() {
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" || t === "dark" ? t : null;
}

export function applyTheme(theme) {
  const root = document.documentElement; // <html>
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem(THEME_KEY, theme);
}

export function initTheme() {
  const stored = getStoredTheme();
  if (stored) {
    applyTheme(stored);
    return stored;
  }

  // Default: seguir el sistema
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const theme = prefersDark ? "dark" : "light";
  applyTheme(theme);
  return theme;
}
