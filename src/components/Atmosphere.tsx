import { useEffect } from 'react';

/* ================================================================
   Atmosphere — Theme-driven atmospheric background system
   
   Dark mode  = Night gradient   (deep starry navy: #0b1020 -> #0f162c -> #141c38)
   Light mode = Morning gradient (clear morning sky: #5a9ee6 -> #a4caf4 -> #e2ecf7)
   
   Sets CSS custom properties on .onb-atmos elements to smoothly
   transition between night and morning gradients on theme toggle.
   ================================================================ */

export const NIGHT_GRADIENT = {
  top: '#0b1020',
  mid: '#0f162c',
  bottom: '#141c38',
} as const;

export const MORNING_GRADIENT = {
  top: '#5a9ee6',
  mid: '#a4caf4',
  bottom: '#e2ecf7',
} as const;

// Alias for backwards compatibility
export const DAY_GRADIENT = MORNING_GRADIENT;

export function getActiveTheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function applyAtmosphere() {
  const theme = getActiveTheme();
  const colors = theme === 'light' ? MORNING_GRADIENT : NIGHT_GRADIENT;
  const elements = document.querySelectorAll<HTMLElement>('.onb-atmos');
  elements.forEach((el) => {
    el.style.setProperty('--atm-top', colors.top);
    el.style.setProperty('--atm-mid', colors.mid);
    el.style.setProperty('--atm-bottom', colors.bottom);
  });
}

export default function Atmosphere() {
  useEffect(() => {
    // Apply current gradient immediately
    applyAtmosphere();

    // Listen for theme changes on <html data-theme="...">
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          applyAtmosphere();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
