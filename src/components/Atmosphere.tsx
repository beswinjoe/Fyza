import { useEffect, useRef } from 'react';
import { estTime } from '../engine/format';

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
    // 0:00 — NIGHT (deep starry night)
    hour: 0,
    colors: {
      top: [3, 5, 12],
      mid: [6, 10, 20],
      bottom: [8, 12, 24],
    },
  },
  {
    // 5:30 — DAWN (deep muted blue, hint of dawn glow)
    hour: 5.5,
    colors: {
      top: [12, 18, 36],
      mid: [20, 25, 45],
      bottom: [40, 30, 50],
    },
  },
  {
    // 7:00 — MORNING (gentle cool blue)
    hour: 7,
    colors: {
      top: [20, 35, 60],
      mid: [30, 45, 70],
      bottom: [50, 65, 85],
    },
  },
  {
    // 10:00 — DAYTIME (brighter sky blue, but still dark-mode compatible)
    hour: 10,
    colors: {
      top: [30, 50, 80],
      mid: [45, 70, 100],
      bottom: [60, 90, 120],
    },
  },
  {
    // 16:00 — AFTERNOON (slightly warmer neutral blue)
    hour: 16,
    colors: {
      top: [25, 45, 75],
      mid: [35, 60, 90],
      bottom: [55, 80, 110],
    },
  },
  {
    // 17:30 — GOLDEN HOUR (subtle amber/gold blend)
    hour: 17.5,
    colors: {
      top: [20, 30, 60],
      mid: [40, 45, 60],
      bottom: [80, 60, 45],
    },
  },
  {
    // 19:00 — SUNSET (muted blue fading to soft rose)
    hour: 19,
    colors: {
      top: [15, 20, 45],
      mid: [35, 30, 55],
      bottom: [70, 35, 50],
    },
  },
  {
    // 20:30 — DUSK (darkening indigo)
    hour: 20.5,
    colors: {
      top: [8, 12, 30],
      mid: [15, 20, 40],
      bottom: [25, 25, 50],
    },
  },
  {
    // 22:00 — NIGHT (return to deep night)
    hour: 22,
    colors: {
      top: [3, 5, 12],
      mid: [6, 10, 20],
      bottom: [8, 12, 24],
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
  return estTime().fractional;
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
