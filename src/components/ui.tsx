import { cur } from '../engine/currency';
import { useEffect, useId, useMemo, useRef, useState, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { X, Wallet, Landmark, PiggyBank, Banknote, CreditCard, Utensils, ShoppingBag, Car, Home as HomeI, Receipt, Tv, Film, HeartPulse, GraduationCap, Plane, TrendingUp, Briefcase, Users, Megaphone, Server, Package, ArrowLeftRight, ShoppingCart, Coins, Target, CircleDollarSign, Check, ChevronDown } from 'lucide-react';
import { inr } from '../engine/format';

/* ================================================================
   Utilities
================================================================ */
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const CAT_ICON: Record<string, React.ElementType> = {
  Food: Utensils, Groceries: ShoppingCart, Transport: Car, Rent: HomeI, Bills: Receipt, Subscriptions: Tv, Shopping: ShoppingBag, Entertainment: Film,
  Health: HeartPulse, Education: GraduationCap, Travel: Plane, EMI: Landmark, Salary: Briefcase, 'Pocket money': Coins, Freelance: Briefcase, Revenue: TrendingUp,
  Payroll: Users, Marketing: Megaphone, Software: Server, Inventory: Package, Operations: Package, Investments: TrendingUp, Transfer: ArrowLeftRight, Card: CreditCard, Goal: Target,
};
export const ACC_ICON: Record<string, React.ElementType> = { bank: Landmark, savings: PiggyBank, cash: Banknote, wallet: Wallet, other: CircleDollarSign };
export const catIcon = (c: string): React.ElementType => CAT_ICON[c] || CircleDollarSign;

type Tone = 'positive' | 'negative' | 'warning' | 'accent' | 'neutral';
/** Legacy tone aliases used by the finance engine (pos/neg/warn). */
export const toTone = (t?: string): Tone => (t === 'pos' ? 'positive' : t === 'neg' ? 'negative' : t === 'warn' ? 'warning' : t === 'accent' ? 'accent' : t === 'positive' || t === 'negative' || t === 'warning' ? t : 'neutral');
export const toneText: Record<Tone, string> = { positive: 'text-positive', negative: 'text-negative', warning: 'text-warning', accent: 'text-accent', neutral: '' };

/* ================================================================
   Typography primitives
================================================================ */
export const Eyebrow = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('text-eyebrow font-medium uppercase text-foreground-subtle', className)}>{children}</div>
);

export const Kbd = ({ children, className }: { children: ReactNode; className?: string }) => (
  <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border bg-surface-muted px-1.5 font-sans text-[10.5px] font-medium text-foreground-subtle', className)}>{children}</kbd>
);

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone | string; className?: string }) {
  const t = toTone(tone);
  const map: Record<Tone, string> = {
    neutral: 'bg-surface-muted text-foreground-muted',
    positive: 'bg-positive/10 text-positive',
    negative: 'bg-negative/10 text-negative',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent-soft text-accent',
  };
  return <span className={cn('inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-2 text-meta font-medium [&_svg]:size-3', map[t], className)}>{children}</span>;
}

/* ================================================================
   Buttons
================================================================ */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
type BtnSize = 'sm' | 'md' | 'lg';
const BTN_BASE = 'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background,color,border,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0';
const BTN_V: Record<BtnVariant, string> = {
  primary: 'bg-inverse text-inverse-foreground hover:opacity-90 shadow-card',
  accent: 'bg-accent text-accent-foreground hover:opacity-90',
  secondary: 'border border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-muted shadow-card',
  ghost: 'text-foreground-muted hover:bg-surface-muted hover:text-foreground',
  danger: 'border border-negative/20 bg-negative/8 text-negative hover:bg-negative/14',
};
const BTN_S: Record<BtnSize, string> = { sm: 'h-8 px-3 text-[13px] [&_svg]:size-3.5', md: 'h-9 px-3.5 text-body [&_svg]:size-4', lg: 'h-11 px-5 text-[15px] [&_svg]:size-4' };
const BTN_ICON: Record<BtnSize, string> = { sm: 'size-8 px-0 [&_svg]:size-4', md: 'size-9 px-0 [&_svg]:size-4', lg: 'size-11 px-0 [&_svg]:size-5' };

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; icon?: boolean }>(
  ({ variant = 'secondary', size = 'md', icon, className, type = 'button', ...p }, ref) => (
    <button ref={ref} type={type} className={cn(BTN_BASE, BTN_V[variant], icon ? BTN_ICON[size] : BTN_S[size], className)} {...p} />
  ),
);
Button.displayName = 'Button';

export const LinkButton = ({ className, ...p }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className={cn('inline-flex items-center gap-1 text-meta font-medium text-foreground-muted transition-colors hover:text-foreground [&_svg]:size-3.5 [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5', className)} {...p} />
);

/* ================================================================
   Surfaces
================================================================ */
/** primary = key sections; secondary = supporting info; plain = inline */
export function Card({ children, className, tone = 'primary', as: As = 'section', ...p }: { children: ReactNode; className?: string; tone?: 'primary' | 'secondary' | 'plain'; as?: React.ElementType } & React.HTMLAttributes<HTMLElement>) {
  const t = { primary: 'liquid rounded-2xl border border-border bg-surface shadow-card', secondary: 'rounded-xl border border-border bg-surface-muted/50', plain: '' }[tone];
  return <As className={cn(t, className)} {...p}>{children}</As>;
}

export function SectionHeader({ title, sub, icon: I, action, className }: { title: ReactNode; sub?: ReactNode; icon?: React.ElementType; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-title font-semibold tracking-[-0.01em] text-foreground">{I && <I className="size-4 text-foreground-subtle" strokeWidth={1.75} />}{title}</h2>
        {sub && <p className="mt-0.5 text-meta text-foreground-subtle">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, action, children }: { eyebrow?: ReactNode; title: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 max-md:mb-6">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-meta text-foreground-subtle">{eyebrow}</div>}
        <h1 className="font-display text-page font-semibold text-foreground max-md:text-[26px] max-md:leading-8">{title}</h1>
        {children}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div role="separator" className={cn('h-px bg-border', className)} />;
}

/** Inline stat — label above, figure below. */
export function Stat({ label, value, tone, className, size = 'md' }: { label: ReactNode; value: ReactNode; tone?: string; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'text-body', md: 'text-[17px] leading-6', lg: 'text-figure' }[size];
  return (
    <div className={cn('min-w-0', className)}>
      <Eyebrow>{label}</Eyebrow>
      <div className={cn('num mt-1 truncate font-semibold tracking-[-0.015em]', s, toneText[toTone(tone)])}>{value}</div>
    </div>
  );
}

/* ================================================================
   Icon badge
================================================================ */
export function Icon({ as: I, tone, size = 'md', className }: { as: React.ElementType; tone?: string; size?: 'sm' | 'md' | 'lg' | string; className?: string }) {
  const t = toTone(tone);
  const toneCls: Record<Tone, string> = {
    neutral: 'bg-surface-muted text-foreground-muted',
    positive: 'bg-positive/10 text-positive',
    negative: 'bg-negative/10 text-negative',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-accent-soft text-accent',
  };
  const sz = size === 'sm' ? 'size-8 rounded-lg [&_svg]:size-4' : size === 'lg' ? 'size-11 rounded-xl [&_svg]:size-5' : 'size-9 rounded-[9px] [&_svg]:size-4';
  return <div className={cn('grid shrink-0 place-items-center border border-border/60', sz, toneCls[t], className)}><I strokeWidth={1.75} /></div>;
}

/* ================================================================
   Empty state
================================================================ */
export function EmptyState({ icon: I, title, description, primaryAction, secondaryAction, size = 'md', className }: {
  icon?: React.ElementType; title: ReactNode; description?: ReactNode;
  primaryAction?: { label: string; onClick: () => void; icon?: React.ElementType };
  secondaryAction?: { label: string; onClick: () => void; icon?: React.ElementType };
  size?: 'sm' | 'md' | 'lg'; className?: string;
}) {
  const pad = { sm: 'py-6', md: 'py-10', lg: 'py-16' }[size];
  return (
    <div className={cn('flex flex-col items-center text-center animate-fade-in', pad, className)}>
      {I && (
        <div className="relative mb-4">
          <div className="grid size-11 place-items-center rounded-xl border border-border bg-surface-muted text-foreground-muted shadow-card"><I className="size-5" strokeWidth={1.5} /></div>
        </div>
      )}
      <div className="text-title font-semibold text-foreground">{title}</div>
      {description && <p className="mt-1.5 max-w-[34ch] text-[13px] leading-5 text-foreground-subtle">{description}</p>}
      {(primaryAction || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {primaryAction && <Button variant="primary" size="sm" onClick={primaryAction.onClick}>{primaryAction.icon && <primaryAction.icon />}{primaryAction.label}</Button>}
          {secondaryAction && <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>{secondaryAction.icon && <secondaryAction.icon />}{secondaryAction.label}</Button>}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   List row
================================================================ */
export function Row({ children, onClick, className, label }: { children: ReactNode; onClick?: () => void; className?: string; label?: string }) {
  const cls = cn('group flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left -mx-2 w-[calc(100%+1rem)]', onClick && 'cursor-pointer transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted', className);
  return onClick
    ? <button type="button" aria-label={label} className={cls} onClick={onClick}>{children}</button>
    : <div className={cls}>{children}</div>;
}
export const RowMeta = ({ title, sub }: { title: ReactNode; sub?: ReactNode }) => (
  <div className="min-w-0 flex-1">
    <div className="truncate text-body font-medium text-foreground">{title}</div>
    {sub && <div className="mt-0.5 truncate text-meta text-foreground-subtle">{sub}</div>}
  </div>
);

/* ================================================================
   Money
================================================================ */
export function Money({ v, compact, sign, className = '' }: { v: number | string; compact?: boolean; sign?: boolean; className?: string; split?: boolean }) {
  return <span className={cn('num', className)}>{inr(v, { compact, sign })}</span>;
}

export function CountUp({ v, compact, className = '' }: { v: number; compact?: boolean; className?: string }) {
  const [x, setX] = useState(v);
  const prev = useRef(v);
  useEffect(() => {
    const from = prev.current, to = v, t0 = performance.now();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    prev.current = v;
    if (reduce || from === to) { setX(to); return; }
    let raf: number;
    const step = (t: number) => { const p = Math.min(1, (t - t0) / 700); const e = 1 - Math.pow(1 - p, 3); setX(from + (to - from) * e); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return <span className={cn('num', className)}>{inr(x, { compact })}</span>;
}

/** Hero figure — splits the currency symbol so it reads as a premium number. */
export function HeroAmount({ v, className }: { v: number; className?: string }) {
  return (
    <div className={cn('font-display text-hero font-semibold text-foreground max-md:text-[44px] max-[400px]:text-[38px]', className)}>
      <CountUp v={v} className="[font-feature-settings:'tnum']" />
    </div>
  );
}

/* ================================================================
   Progress
================================================================ */
export const Bar = ({ value, tone = 'accent', className }: { value: number; tone?: string; className?: string }) => {
  const t = toTone(tone);
  const fill: Record<Tone, string> = { accent: 'bg-accent', positive: 'bg-positive', negative: 'bg-negative', warning: 'bg-warning', neutral: 'bg-foreground-muted' };
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-surface-muted', className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-700 ease-out-soft', fill[t])} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  );
};

export function Ring({ value, size = 44, stroke = 4, color = 'var(--accent)' }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-muted)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value)))} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
    </svg>
  );
}

/* ================================================================
   Segmented control
================================================================ */
export function Seg({ value, onChange, options, className, size = 'md', label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; icon?: React.ElementType }[]; className?: string; size?: 'sm' | 'md'; label?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-surface-muted p-0.5', className)}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} role="tab" type="button" aria-selected={on} onClick={() => onChange(o.value)}
            className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-all duration-150 [&_svg]:size-3.5',
              size === 'sm' ? 'h-6 px-2 text-meta' : 'h-7 px-2.5 text-[13px]',
              on ? 'bg-surface text-foreground shadow-card ring-1 ring-border' : 'text-foreground-subtle hover:text-foreground')}>
            {o.icon && <o.icon />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ================================================================
   Form controls
================================================================ */
const CONTROL = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-body text-foreground shadow-card outline-none transition-[border,box-shadow] duration-150 placeholder:text-foreground-subtle hover:border-border-strong focus:border-border-strong focus:ring-4 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-negative/50 aria-[invalid=true]:focus:ring-negative/10';

export function Field({ label, hint, error, children, full, htmlFor, className }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; full?: boolean; htmlFor?: string; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', full && 'col-span-full', className)}>
      {label && <label htmlFor={htmlFor} className="text-meta font-medium text-foreground-muted">{label}</label>}
      {children}
      {error ? <p className="text-meta text-negative" role="alert">{error}</p> : hint ? <p className="text-meta text-foreground-subtle">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(CONTROL, p.type === 'number' && 'num', className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn(CONTROL, 'h-auto min-h-20 resize-y py-2.5', className)} {...p} />
);

export const Select = ({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="relative min-w-0">
    <select className={cn(CONTROL, 'cursor-pointer appearance-none pr-9', className)} {...p}>{children}</select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-foreground-subtle" />
  </div>
);

/** The primary amount input — large, currency-prefixed, tabular. */
export function MoneyInput({ value, onChange, autoFocus, id, invalid, onBlur, placeholder = '0.00', size = 'lg' }: { value: number | string; onChange: (v: number | '') => void; autoFocus?: boolean; id?: string; invalid?: boolean; onBlur?: () => void; placeholder?: string; size?: 'md' | 'lg' }) {
  const big = size === 'lg';
  return (
    <div className={cn('group relative flex items-center rounded-xl border bg-surface shadow-card transition-[border,box-shadow] duration-150 focus-within:ring-4',
      invalid ? 'border-negative/50 focus-within:ring-negative/10' : 'border-border hover:border-border-strong focus-within:border-border-strong focus-within:ring-accent-soft',
      big ? 'h-16 px-4' : 'h-10 px-3')}>
      <span className={cn('num select-none text-foreground-subtle', big ? 'mr-2 text-[28px] font-medium' : 'mr-1.5 text-body')}>{cur()}</span>
      <input id={id} type="number" inputMode="decimal" step="any" min="0" autoFocus={autoFocus} aria-invalid={invalid || undefined}
        className={cn('num w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-foreground-subtle/60', big ? 'font-display text-[32px] font-semibold tracking-[-0.03em]' : 'text-body')}
        placeholder={placeholder} value={value} onBlur={onBlur}
        onChange={(e) => onChange(e.target.value === '' ? '' : +e.target.value)} />
    </div>
  );
}

/* ================================================================
   Overlays — shared dialog behaviour
================================================================ */
function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = ref.current;
    // Focus first focusable that isn't the close button (or the panel itself)
    requestAnimationFrame(() => {
      if (!node || node.contains(document.activeElement)) return;
      const f = node.querySelector<HTMLElement>('[autofocus], input, select, textarea, button:not([data-close])');
      (f || node).focus();
    });
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close.current(); }
      if (e.key === 'Tab' && node) {
        const els = [...node.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prevOverflow; prevFocus?.focus?.(); };
  }, []);
  return ref;
}

const CloseBtn = ({ onClick }: { onClick: () => void }) => (
  <Button data-close variant="ghost" size="sm" icon aria-label="Close" onClick={onClick} className="-mr-1.5"><X /></Button>
);

export function Modal({ title, onClose, children, foot, wide, description }: { title: ReactNode; onClose: () => void; children: ReactNode; foot?: ReactNode; wide?: boolean; description?: ReactNode }) {
  const ref = useDialog(onClose);
  const id = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-[3px] animate-fade-in sm:items-start sm:p-6 sm:pt-[10vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} tabIndex={-1}
        className={cn('flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-surface-elevated shadow-pop outline-none max-sm:animate-sheet sm:max-h-[80vh] sm:rounded-2xl sm:animate-pop', wide ? 'sm:max-w-[640px]' : 'sm:max-w-[480px]')}>
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-border-strong sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4 sm:pt-5">
          <div className="min-w-0">
            <h2 id={id} className="flex items-center gap-1 text-[16px] font-semibold tracking-[-0.015em]">{title}</h2>
            {description && <p className="mt-0.5 text-meta text-foreground-subtle">{description}</p>}
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {foot && <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-muted/40 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{foot}</div>}
      </div>
    </div>
  );
}

export function Drawer({ onClose, children, title, foot }: { onClose: () => void; children: ReactNode; title?: ReactNode; foot?: ReactNode }) {
  const ref = useDialog(onClose);
  const id = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-overlay backdrop-blur-[2px] animate-fade-in sm:items-stretch" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={title ? id : undefined} tabIndex={-1}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border-border bg-surface-elevated shadow-pop outline-none max-sm:animate-sheet max-sm:border-t sm:m-2 sm:max-h-none sm:w-[420px] sm:rounded-2xl sm:border sm:animate-drawer">
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-border-strong sm:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 id={id} className="text-[16px] font-semibold tracking-[-0.015em]">{title}</h2>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {foot && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{foot}</div>}
      </div>
    </div>
  );
}

export function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, [msg, onDone]);
  return (
    <div role="status" aria-live="polite" className="fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 rounded-xl border border-border bg-surface-elevated py-2.5 pl-3 pr-4 text-[13px] font-medium shadow-pop animate-pop max-lg:bottom-[calc(84px+env(safe-area-inset-bottom))]">
      <span className="grid size-5 place-items-center rounded-full bg-positive/15 text-positive"><Check className="size-3" strokeWidth={2.5} /></span>{msg}
    </div>
  );
}

/* ================================================================
   Charts (pure SVG)
================================================================ */
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

function useWidth(init: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(init);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, e.contentRect.width)));
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const Tip = ({ left, top, w, children }: { left: number; top: number; w: number; children: ReactNode }) => (
  <div className="pointer-events-none absolute z-10 min-w-[140px] rounded-lg border border-border bg-inverse px-3 py-2 text-[13px] font-medium text-inverse-foreground shadow-pop transition-all duration-200 ease-out"
    style={{ left: Math.min(Math.max(left, 74), w - 74), top: Math.max(top, 30), transform: 'translate(-50%, calc(-100% - 10px))' }}>{children}</div>
);

interface AreaSeries { name: string; values: number[]; color: string; dashed?: boolean; fill?: boolean; width?: number }

export function AreaChart({ labels, series, height = 200, split, fmt = (v: number) => inr(v, { compact: true }), showAxis = true, externalHover, onHover }: { labels: string[]; series: AreaSeries[]; height?: number; split?: number; fmt?: (v: number) => string; showAxis?: boolean; externalHover?: number | null; onHover?: (i: number | null) => void }) {
  const [ref, w] = useWidth(600);
  const [internalHover, setInternalHover] = useState<number | null>(null);
  const hover = externalHover !== undefined ? externalHover : internalHover;
  const setHoverState = onHover || setInternalHover;
  const pad = { l: showAxis ? 48 : 4, r: 8, t: 12, b: showAxis ? 26 : 4 };
  const all = series.flatMap((s) => s.values).filter((v) => v != null && Number.isFinite(v));
  let min = Math.min(0, ...all), max = Math.max(...all, 1);
  const span = max - min || 1; max += span * 0.08; if (min < 0) min -= span * 0.08;
  const n = labels.length;
  const x = (i: number) => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, n - 1);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b);
  const ticks = useMemo(() => [0, 0.5, 1].map((p) => min + (max - min) * p), [min, max]);
  const gid = useId().replace(/:/g, '');
  const step = Math.ceil(n / Math.max(2, Math.floor(w / 64)));

  return (
    <div ref={ref} className="relative select-none" onMouseLeave={() => setHoverState(null)}
      onMouseMove={(e) => { if (!ref.current) return; const r = ref.current.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left - pad.l) / (w - pad.l - pad.r)) * (n - 1)); setHoverState(Math.max(0, Math.min(n - 1, i))); }}>
      <svg className="block w-full overflow-visible" width={w} height={height} role="img" aria-label={series.map((s) => s.name).join(' and ') + ' chart'}>
        <defs>
          {series.map((s, k) => (
            <linearGradient key={k} id={`${gid}${k}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={s.fill === false ? 0 : 0.08} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {showAxis && ticks.map((t, i) => (
          <g key={i} className="anim-grid"><line stroke="var(--chart-grid)" strokeOpacity=".25" x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} strokeDasharray={i === 0 ? '' : '2 4'} />
            <text className="text-[10px] fill-foreground-subtle" x={pad.l - 10} y={y(t) + 3} textAnchor="end">{fmt(t)}</text></g>
        ))}
        {min < 0 && <line x1={pad.l} x2={w - pad.r} y1={y(0)} y2={y(0)} stroke="var(--negative)" strokeOpacity=".4" strokeDasharray="3 3" />}
        {split != null && split < n - 1 && <rect x={x(split)} y={pad.t} width={w - pad.r - x(split)} height={height - pad.t - pad.b} fill="var(--foreground)" opacity=".025" rx="4" />}
        {series.map((s, k) => {
          const pts = s.values.map((v, i) => [x(i), y(v)] as [number, number]);
          const line = smooth(pts);
          const area = `${line} L${x(n - 1)},${y(Math.max(min, 0))} L${x(0)},${y(Math.max(min, 0))} Z`;
          return (
            <g key={k}>
              <path d={area} fill={`url(#${gid}${k})`} className="anim-reveal-area" />
              <path d={line} fill="none" stroke={s.color} strokeWidth={s.width || 1.5} strokeDasharray={s.dashed ? '4 5' : undefined} strokeLinecap="round"
                className={!s.dashed ? "anim-draw" : ""} />
            </g>
          );
        })}
        {showAxis && labels.map((l, i) => (i % step === 0 || i === n - 1) && <text className="text-[10px] fill-foreground-subtle" key={i} x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{l}</text>)}
        {hover != null && (
          <g className="transition-opacity duration-200" style={{ opacity: hover != null ? 1 : 0 }}>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="var(--border-strong)" className="transition-all duration-200 ease-out" />
            {series.map((s, k) => <circle key={k} cx={x(hover)} cy={y(s.values[hover])} r={3.5} fill="var(--surface)" stroke={s.color} strokeWidth="2" className="transition-all duration-200 ease-out anim-point" />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <Tip left={x(hover)} top={Math.min(...series.map((s) => y(s.values[hover])))} w={w}>
          <div className="mb-1 text-inverse-foreground/70">{labels[hover]}</div>
          {series.map((s, k) => <div key={k} className="flex items-center gap-2"><span className="text-inverse-foreground">{s.name}</span><b className="num ml-auto pl-3 font-semibold">{fmt(s.values[hover])}</b></div>)}
        </Tip>
      )}
    </div>
  );
}

export function BarsChart({ labels, a, b, height = 180, names = ['Income', 'Expenses'], highlight }: { labels: string[]; a: number[]; b: number[]; height?: number; names?: [string, string]; highlight?: number }) {
  const [ref, w] = useWidth(500);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...a, ...b, 1) * 1.1;
  const n = labels.length, slot = (w - 8) / n, bw = Math.min(12, slot / 4);
  const h = height - 22;
  return (
    <div ref={ref} className="relative select-none">
      <svg className="block w-full overflow-visible" width={w} height={height} role="img" aria-label={`${names[0]} vs ${names[1]} chart`}>
        <line stroke="var(--chart-grid)" x1="0" x2={w} y1={h} y2={h} />
        {labels.map((l, i) => {
          const cx = 4 + slot * i + slot / 2;
          const dim = hover != null && hover !== i;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ transition: 'opacity .2s', opacity: dim ? 0.35 : 1 }}>
              <rect x={cx - slot / 2} y="0" width={slot} height={height} fill="transparent" />
              <rect x={cx - bw - 1.5} y={h - (a[i] / max) * h} width={bw} height={(a[i] / max) * h} rx="3" fill="var(--chart-1)" opacity={highlight === i || highlight == null ? 1 : 0.55} />
              <rect x={cx + 1.5} y={h - (b[i] / max) * h} width={bw} height={(b[i] / max) * h} rx="3" fill="var(--chart-2)" opacity={highlight === i || highlight == null ? 0.9 : 0.45} />
              <text x={cx} y={height - 4} textAnchor="middle">{l}</text>
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <Tip left={4 + slot * hover + slot / 2} top={h - (Math.max(a[hover], b[hover]) / max) * h} w={w}>
          <div className="mb-1 text-foreground-subtle">{labels[hover]}</div>
          <div className="flex gap-3"><span className="text-foreground-muted">{names[0]}</span><b className="num ml-auto font-semibold">{inr(a[hover], { compact: true })}</b></div>
          <div className="flex gap-3"><span className="text-foreground-muted">{names[1]}</span><b className="num ml-auto font-semibold">{inr(b[hover], { compact: true })}</b></div>
        </Tip>
      )}
    </div>
  );
}

export const Legend = ({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) => (
  <div className="flex flex-wrap items-center gap-4 text-meta text-foreground-subtle">
    {items.map((i) => (
      <span key={i.label} className="inline-flex items-center gap-1.5">
        <i className="h-0.5 w-3 rounded-full" style={i.dashed ? { backgroundImage: `linear-gradient(90deg, ${i.color} 50%, transparent 50%)`, backgroundSize: '4px 2px' } : { background: i.color }} />{i.label}
      </span>
    ))}
  </div>
);

/** Subtle AI glyph — a small accent dot, never neon. */
export const AIMark = ({ className }: { className?: string }) => (
  <span className={cn('relative inline-grid size-5 shrink-0 place-items-center rounded-md bg-accent-soft', className)} aria-hidden>
    <span className="size-1.5 rounded-full bg-accent" />
  </span>
);
