import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Wallet, Landmark, PiggyBank, Banknote, CreditCard, Utensils, ShoppingBag, Car, Home as HomeI, Receipt, Tv, Film, HeartPulse, GraduationCap, Plane, Repeat, TrendingUp, Briefcase, Users, Megaphone, Server, Package, ArrowLeftRight, ShoppingCart, Coins, Target, CircleDollarSign, Check } from 'lucide-react';
import { inr } from '../engine/format';

export const CAT_ICON = {
  Food: Utensils, Groceries: ShoppingCart, Transport: Car, Rent: HomeI, Bills: Receipt, Subscriptions: Tv, Shopping: ShoppingBag, Entertainment: Film,
  Health: HeartPulse, Education: GraduationCap, Travel: Plane, EMI: Landmark, Salary: Briefcase, 'Pocket money': Coins, Freelance: Briefcase, Revenue: TrendingUp,
  Payroll: Users, Marketing: Megaphone, Software: Server, Inventory: Package, Operations: Package, Investments: TrendingUp, Transfer: ArrowLeftRight, Card: CreditCard, Goal: Target,
};
export const ACC_ICON = { bank: Landmark, savings: PiggyBank, cash: Banknote, wallet: Wallet, other: CircleDollarSign };
export const catIcon = (c) => CAT_ICON[c] || CircleDollarSign;

export function Money({ v, compact, sign, className = '', split }) {
  const s = inr(v, { compact, sign });
  if (split && !compact) {
    return <span className={`num ${className}`}>{s}<span className="dec">.00</span></span>;
  }
  return <span className={`num ${className}`}>{s}</span>;
}

// Animated count-up number
export function CountUp({ v, compact, className = '' }) {
  const [x, setX] = useState(v);
  const prev = useRef(v);
  useEffect(() => {
    const from = prev.current, to = v, t0 = performance.now();
    let raf;
    const step = (t) => { const p = Math.min(1, (t - t0) / 700); const e = 1 - Math.pow(1 - p, 3); setX(from + (to - from) * e); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); prev.current = v;
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return <span className={`num ${className}`}>{inr(x, { compact })}</span>;
}

export const Bar = ({ value, tone = '' }) => <div className={`bar ${tone}`}><i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;

export function Icon({ as: I, tone, size }) {
  const style = tone ? { color: `var(--${tone})`, background: `color-mix(in srgb, var(--${tone}) 12%, transparent)` } : undefined;
  return <div className={`ico ${size || ''}`} style={style}><I /></div>;
}

export function Modal({ title, onClose, children, foot, wide }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head"><div className="card-title">{title}</div><button className="btn ghost icon sm" onClick={onClose}><X /></button></div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
}

export function Drawer({ onClose, children }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="drawer">{children}</div></div>;
}

export function Seg({ value, onChange, options }) {
  return <div className="seg">{options.map((o) => <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.icon && <o.icon />}{o.label}</button>)}</div>;
}

export function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, [msg, onDone]);
  return <div className="toast"><Check />{msg}</div>;
}

/* ---------- Charts (pure SVG) ---------- */
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

export function AreaChart({ labels, series, height = 200, split, fmt = (v) => inr(v, { compact: true }), showAxis = true }) {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const pad = { l: showAxis ? 44 : 4, r: 8, t: 12, b: showAxis ? 24 : 4 };
  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  let min = Math.min(0, ...all), max = Math.max(...all, 1);
  const span = max - min || 1; max += span * 0.08; if (min < 0) min -= span * 0.08;
  const n = labels.length;
  const x = (i) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, n - 1);
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b);
  const ticks = useMemo(() => [0, 0.5, 1].map((p) => min + (max - min) * p), [min, max]);
  const gid = useMemo(() => 'g' + Math.random().toString(36).slice(2, 7), []);

  return (
    <div ref={ref} style={{ position: 'relative' }} onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => { const r = ref.current.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left - pad.l) / (w - pad.l - pad.r)) * (n - 1)); setHover(Math.max(0, Math.min(n - 1, i))); }}>
      <svg className="chart" width={w} height={height}>
        <defs>
          {series.map((s, k) => (
            <linearGradient key={k} id={`${gid}${k}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={s.fill === false ? 0 : 0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {showAxis && ticks.map((t, i) => (
          <g key={i}><line className="grid-line" x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} strokeDasharray={i === 0 ? '' : '2 4'} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end">{fmt(t)}</text></g>
        ))}
        {min < 0 && <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} stroke="var(--neg)" strokeOpacity=".35" strokeDasharray="3 3" />}
        {split != null && split < n - 1 && <rect x={x(split)} y={pad.t} width={w - pad.r - x(split)} height={height - pad.t - pad.b} fill="var(--text)" opacity=".018" />}
        {series.map((s, k) => {
          const pts = s.values.map((v, i) => [x(i), y(v)]);
          const line = smooth(pts);
          const area = `${line} L${x(n - 1)},${y(Math.max(min, 0))} L${x(0)},${y(Math.max(min, 0))} Z`;
          return (
            <g key={k}>
              <path d={area} fill={`url(#${gid}${k})`} />
              <path d={line} fill="none" stroke={s.color} strokeWidth={s.width || 2} strokeDasharray={s.dashed ? '5 5' : undefined} strokeLinecap="round"
                style={!s.dashed ? { strokeDasharray: 3000, '--len': 3000, animation: 'draw 1.4s cubic-bezier(.2,.8,.2,1) both' } : undefined} />
            </g>
          );
        })}
        {showAxis && labels.map((l, i) => (n <= 12 || i % Math.ceil(n / 8) === 0) && <text key={i} x={x(i)} y={height - 6} textAnchor="middle">{l}</text>)}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="var(--border-2)" />
            {series.map((s, k) => <circle key={k} cx={x(hover)} cy={y(s.values[hover])} r="4" fill="var(--surface)" stroke={s.color} strokeWidth="2" />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: x(hover), top: Math.min(...series.map((s) => y(s.values[hover]))) }}>
          <div className="faint" style={{ marginBottom: 2 }}>{labels[hover]}</div>
          {series.map((s, k) => <div key={k} className="row" style={{ gap: 6 }}><i style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} /><span className="muted">{s.name}</span><b className="num" style={{ marginLeft: 'auto', paddingLeft: 10 }}>{fmt(s.values[hover])}</b></div>)}
        </div>
      )}
    </div>
  );
}

export function BarsChart({ labels, a, b, height = 180, names = ['Income', 'Expenses'], highlight }) {
  const ref = useRef(null);
  const [w, setW] = useState(500);
  const [hover, setHover] = useState(null);
  useEffect(() => { const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); if (ref.current) ro.observe(ref.current); return () => ro.disconnect(); }, []);
  const max = Math.max(...a, ...b, 1) * 1.1;
  const n = labels.length, slot = (w - 8) / n, bw = Math.min(14, slot / 4);
  const h = height - 22;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={height}>
        <line className="grid-line" x1="0" x2={w} y1={h} y2={h} />
        {labels.map((l, i) => {
          const cx = 4 + slot * i + slot / 2;
          const dim = hover != null && hover !== i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ transition: 'opacity .2s', opacity: dim ? 0.35 : 1 }}>
              <rect x={cx - slot / 2} y="0" width={slot} height={height} fill="transparent" />
              <rect x={cx - bw - 2} y={h - (a[i] / max) * h} width={bw} height={(a[i] / max) * h} rx="4" fill="var(--chart-1)" opacity={highlight === i || highlight == null ? 1 : 0.55} />
              <rect x={cx + 2} y={h - (b[i] / max) * h} width={bw} height={(b[i] / max) * h} rx="4" fill="var(--text-3)" opacity={highlight === i || highlight == null ? 0.9 : 0.5} />
              <text x={cx} y={height - 4} textAnchor="middle">{l}</text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div className="chart-tip" style={{ left: 4 + slot * hover + slot / 2, top: h - (Math.max(a[hover], b[hover]) / max) * h }}>
          <div className="faint">{labels[hover]}</div>
          <div className="row" style={{ gap: 12 }}><span className="muted">{names[0]}</span><b className="num" style={{ marginLeft: 'auto' }}>{inr(a[hover], { compact: true })}</b></div>
          <div className="row" style={{ gap: 12 }}><span className="muted">{names[1]}</span><b className="num" style={{ marginLeft: 'auto' }}>{inr(b[hover], { compact: true })}</b></div>
        </div>
      )}
    </div>
  );
}

export function Ring({ value, size = 44, stroke = 4, color = 'var(--accent)' }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
    </svg>
  );
}
