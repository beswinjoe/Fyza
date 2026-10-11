/* ================================================================
   Theme engine — Light / Dark / System
   
   Stores user preference in localStorage (separate from AppState
   to avoid coupling theme with financial data). Applies
   data-theme="light" or data-theme="dark" on <html> and keeps
   it in sync with OS changes when set to "system".
   ================================================================ */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'fyza.theme';

/** Read the persisted preference, defaulting to 'system'. */
export function getStoredPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* localStorage unavailable */ }
  return 'system';
}

/** Persist the user's explicit choice. */
export function setStoredPreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch { /* localStorage unavailable */ }
}

/** Resolve 'system' to a concrete theme using the OS media query. */
export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/** Apply the resolved theme to the DOM — sets data-theme on <html>,
 *  updates color-scheme, and updates the meta theme-color tag. */
export function applyTheme(resolved: ResolvedTheme): void {
  const html = document.documentElement;
  html.setAttribute('data-theme', resolved);
  html.style.colorScheme = resolved;

  // Update meta theme-color for mobile browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#0b1020' : '#f7f7f6');
  }
}

/** Initialize the theme system: apply immediately, listen for OS changes.
 *  Returns a cleanup function. */
export function initTheme(): () => void {
  let pref = getStoredPreference();
  applyTheme(resolveTheme(pref));

  // Listen for OS appearance changes (only relevant when pref === 'system')
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  function onOSChange() {
    pref = getStoredPreference();
    if (pref === 'system') {
      applyTheme(resolveTheme('system'));
    }
  }
  mq.addEventListener('change', onOSChange);

  return () => mq.removeEventListener('change', onOSChange);
}

/** Convenience: set preference and immediately apply. */
export function setTheme(pref: ThemePreference): void {
  setStoredPreference(pref);
  applyTheme(resolveTheme(pref));
}
