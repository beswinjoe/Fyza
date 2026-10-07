import { useEffect, useRef } from 'react';

/* ================================================================
   Atmosphere — time-aware atmospheric background system
   
   Sets CSS custom properties on the .onb-atmos element to smoothly
   shift the background gradient based on local device time.
   
   Renders NO DOM. Purely side-effect driven.
   ================================================================ */

// ── Color stops for each time-of-day state ──────────────────────
// Each color is [R, G, B, A] where A is 0–1.
// We interpolate between adjacent states based on the fractional hour.

interface AtmColors {
  base: [number, number, number];         // solid background
  lift: [number, number, number, number]; // upper radial glow
  low: [number, number, number, number];  // lower radial glow
  vignette: [number, number, number, number]; // edge vignette
}

// Time anchors (24h clock). Interpolation happens between adjacent anchors.
const STOPS: { hour: number; colors: AtmColors }[] = [
  {
    // 0:00 — NIGHT (deep navy)
    hour: 0,
    colors: {
      base: [11, 16, 32],
      lift: [38, 48, 78, 0.35],
      low: [28, 36, 62, 0.45],
      vignette: [3, 5, 12, 0.55],
    },
  },
  {
    // 5:30 — EARLY MORNING (deep muted blue, slightly brighter)
    hour: 5.5,
    colors: {
      base: [13, 20, 40],
      lift: [48, 62, 100, 0.44],
      low: [38, 52, 88, 0.50],
      vignette: [5, 8, 18, 0.48],
    },
  },
  {
    // 7:00 — MORNING (cool blue, calm atmosphere)
    hour: 7,
    colors: {
      base: [14, 22, 44],
      lift: [55, 72, 112, 0.48],
      low: [44, 60, 98, 0.52],
      vignette: [6, 10, 22, 0.42],
    },
  },
  {
    // 10:00 — DAYTIME (rich soft blue)
    hour: 10,
    colors: {
      base: [14, 22, 44],
      lift: [52, 68, 108, 0.46],
      low: [42, 56, 92, 0.50],
      vignette: [5, 8, 18, 0.44],
    },
  },
  {
    // 16:00 — AFTERNOON (still blue, warming slightly)
    hour: 16,
    colors: {
      base: [14, 21, 42],
      lift: [56, 68, 100, 0.44],
      low: [46, 56, 86, 0.48],
      vignette: [6, 9, 18, 0.44],
    },
  },
  {
    // 17:30 — GOLDEN HOUR (muted blue into warm beige/golden)
    hour: 17.5,
    colors: {
      base: [16, 20, 36],
      lift: [72, 66, 62, 0.38],
      low: [62, 56, 50, 0.42],
      vignette: [10, 8, 6, 0.48],
    },
  },
  {
    // 19:00 — SUNSET (muted blue/purple, soft pink/rose lower area)
    hour: 19,
    colors: {
      base: [14, 16, 32],
      lift: [58, 48, 72, 0.40],
      low: [62, 44, 58, 0.44],
      vignette: [8, 5, 14, 0.52],
    },
  },
  {
    // 20:30 — DUSK (transitioning back to night)
    hour: 20.5,
    colors: {
      base: [12, 16, 34],
      lift: [44, 52, 82, 0.38],
      low: [34, 42, 70, 0.48],
      vignette: [4, 6, 14, 0.52],
    },
  },
  {
    // 22:00 — NIGHT (return to deep navy)
    hour: 22,
    colors: {
      base: [11, 16, 32],
      lift: [38, 48, 78, 0.35],
      low: [28, 36, 62, 0.45],
      vignette: [3, 5, 12, 0.55],
    },
  },
];

// ── Interpolation helpers ───────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgba(a: readonly number[], b: readonly number[], t: number): number[] {
  return a.map((v, i) => lerp(v, b[i], t));
}

function lerpColors(a: AtmColors, b: AtmColors, t: number): AtmColors {
  return {
    base: lerpRgba(a.base, b.base, t) as [number, number, number],
    lift: lerpRgba(a.lift, b.lift, t) as [number, number, number, number],
    low: lerpRgba(a.low, b.low, t) as [number, number, number, number],
    vignette: lerpRgba(a.vignette, b.vignette, t) as [number, number, number, number],
  };
}

function getColorsForTime(fractionalHour: number): AtmColors {
  // Handle wrap-around: the stops go 0..22, and we wrap 22–24 + 0–5.5 as night
  for (let i = 0; i < STOPS.length - 1; i++) {
    const curr = STOPS[i];
    const next = STOPS[i + 1];
    if (fractionalHour >= curr.hour && fractionalHour < next.hour) {
      const t = (fractionalHour - curr.hour) / (next.hour - curr.hour);
      return lerpColors(curr.colors, next.colors, t);
    }
  }
  // After last stop (22:00) or before first (0:00): night colors
  return STOPS[0].colors;
}

function rgb(c: readonly number[]): string {
  return `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])})`;
}

function rgba(c: readonly number[]): string {
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${c[3].toFixed(2)})`;
}

function getFractionalHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

// ── Component ───────────────────────────────────────────────────

const UPDATE_INTERVAL_MS = 60_000; // update every minute

export default function Atmosphere() {
  const rafRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Check reduced-motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function apply() {
      const el = document.querySelector('.onb-atmos') as HTMLElement | null;
      if (!el) return;

      const h = getFractionalHour();
      const c = getColorsForTime(h);

      el.style.setProperty('--atm-base', rgb(c.base));
      el.style.setProperty('--atm-lift', rgba(c.lift));
      el.style.setProperty('--atm-low', rgba(c.low));
      el.style.setProperty('--atm-vignette', rgba(c.vignette));
    }

    // Apply immediately
    apply();

    // If reduced motion, apply once and use interval (no rAF loop)
    if (motionQuery.matches) {
      intervalRef.current = setInterval(apply, UPDATE_INTERVAL_MS);
    } else {
      // Use interval for regular updates (every minute is plenty smooth
      // since the sky changes very slowly)
      intervalRef.current = setInterval(apply, UPDATE_INTERVAL_MS);
    }

    // Listen for reduced-motion changes
    function onMotionChange() {
      // Just re-apply — the transition CSS handles smoothness
      apply();
    }
    motionQuery.addEventListener('change', onMotionChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  // Renders nothing — purely sets CSS custom properties
  return null;
}
