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
  top: [number, number, number];
  mid: [number, number, number];
  bottom: [number, number, number];
}

// Time anchors (24h clock). Interpolation happens between adjacent anchors.
const STOPS: { hour: number; colors: AtmColors }[] = [
  {
    // 0:00 — NIGHT (deep navy)
    hour: 0,
    colors: {
      top: [6, 9, 18],
      mid: [10, 14, 28],
      bottom: [14, 20, 38],
    },
  },
  {
    // 5:30 — EARLY MORNING (deep muted blue, slightly brighter)
    hour: 5.5,
    colors: {
      top: [8, 12, 24],
      mid: [14, 22, 42],
      bottom: [22, 34, 58],
    },
  },
  {
    // 7:00 — MORNING (cool blue, calm atmosphere)
    hour: 7,
    colors: {
      top: [12, 18, 32],
      mid: [18, 28, 52],
      bottom: [28, 42, 68],
    },
  },
  {
    // 10:00 — DAYTIME (rich soft blue)
    hour: 10,
    colors: {
      top: [14, 20, 36],
      mid: [20, 30, 54],
      bottom: [30, 44, 72],
    },
  },
  {
    // 16:00 — AFTERNOON (still blue, warming slightly)
    hour: 16,
    colors: {
      top: [14, 18, 34],
      mid: [22, 28, 50],
      bottom: [32, 40, 66],
    },
  },
  {
    // 17:30 — GOLDEN HOUR (muted blue into warm beige/golden)
    hour: 17.5,
    colors: {
      top: [16, 18, 32],
      mid: [28, 28, 42],
      bottom: [42, 38, 48],
    },
  },
  {
    // 19:00 — SUNSET (muted blue/purple, soft pink/rose lower area)
    hour: 19,
    colors: {
      top: [14, 15, 30],
      mid: [24, 20, 38],
      bottom: [38, 26, 42],
    },
  },
  {
    // 20:30 — DUSK (transitioning back to night)
    hour: 20.5,
    colors: {
      top: [10, 12, 24],
      mid: [16, 20, 36],
      bottom: [22, 28, 48],
    },
  },
  {
    // 22:00 — NIGHT (return to deep navy)
    hour: 22,
    colors: {
      top: [6, 9, 18],
      mid: [10, 14, 28],
      bottom: [14, 20, 38],
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
    top: lerpRgba(a.top, b.top, t) as [number, number, number],
    mid: lerpRgba(a.mid, b.mid, t) as [number, number, number],
    bottom: lerpRgba(a.bottom, b.bottom, t) as [number, number, number],
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

function getFractionalHour(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

// ── Component ───────────────────────────────────────────────────

const UPDATE_INTERVAL_MS = 60_000; // update every minute

export default function Atmosphere() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Check reduced-motion preference
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function apply() {
      const el = document.querySelector('.onb-atmos') as HTMLElement | null;
      if (!el) return;

      const h = getFractionalHour();
      const c = getColorsForTime(h);

      el.style.setProperty('--atm-top', rgb(c.top));
      el.style.setProperty('--atm-mid', rgb(c.mid));
      el.style.setProperty('--atm-bottom', rgb(c.bottom));
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
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  // Renders nothing — purely sets CSS custom properties
  return null;
}
