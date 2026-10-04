import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, CornerDownLeft, Check, Undo2, Home, LineChart, Compass, Building2, ArrowUpRight, ArrowDownLeft, Landmark, Target, Plane, MessageSquare, ArrowLeft } from 'lucide-react';
import { useStore } from '../engine/store';
import { interpret, SUGGESTIONS } from '../engine/ai';
import { inr } from '../engine/format';
import { AreaChart, AIMark, Badge, Button, Eyebrow, Kbd, cn, toneText, toTone } from './ui';
import { AppState } from '../types/app';
import { AIResult } from '../types/ai';
import { Action } from '../types/store';

export function useAI() {
  const { state, dispatch } = useStore();
  const ask = async (text: string) => {
    const r = await interpret(text, state);
    if (r.autoApply && r.actions?.[0]) {
      dispatch({ type: 'batch', ops: r.actions[0].ops as Action[] });
      r.applied = 0;
    }
    dispatch({ type: 'set', patch: { aiHistory: [...state.aiHistory.slice(-30), r] } });
    return r;
  };
  return ask;
}

export function suggestionsFor(state: AppState): string[] {
  if (state.world === 'business') return SUGGESTIONS.business;
  return state.profiles.includes('student') && !state.profiles.includes('personal') ? SUGGESTIONS.student : SUGGESTIONS.personal;
}

/** AI response — rendered as a native Fyza surface, not a chatbot bubble. */
export function AICard({ r, compact }: { r: AIResult; compact?: boolean }) {
  const { state, dispatch } = useStore();
  const live = state.aiHistory.find((x) => x.id === r.id) || r;

  const apply = (i: number) => {
    if (!live.actions) return;
    dispatch({ type: 'batch', ops: [...(live.actions[i].ops as Action[]), { type: 'update', col: 'aiHistory', id: r.id, patch: { applied: i } }] });
  };
  const undo = () => {
    if (!live.actions || live.applied == null) return;
    const ops = live.actions[live.applied].ops.map((o) => ({ type: 'remove', col: o.col, id: 'item' in o ? (o.item as { id: string }).id : (o as { id: string }).id }));
    dispatch({ type: 'batch', ops: [...ops, { type: 'update', col: 'aiHistory', id: r.id, patch: { applied: undefined } }] } as Action);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface animate-pop">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <AIMark />
          <Eyebrow>{live.kind === 'action' ? 'Ready to add' : live.kind === 'scenario' ? 'Scenario' : 'Answer'}</Eyebrow>
          {live.tone && live.tone !== 'neutral' && <Badge tone={live.tone} className="ml-auto">{live.tone === 'pos' ? 'Looks good' : 'Heads up'}</Badge>}
        </div>
        <div className="mt-3 text-[15px] font-semibold tracking-[-0.01em]">{live.title}</div>
        <p className="mt-1 text-[13px] leading-5 text-foreground-muted">{live.summary}</p>
        {live.bullets && live.bullets.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-l border-border pl-3 text-[13px] text-foreground-muted">{live.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
        )}
        {live.breakdown && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(live.breakdown).map(([k, v]) => <Badge key={k}>{k[0].toUpperCase() + k.slice(1)} <b className="num font-semibold text-foreground">{inr(v, { compact: true })}</b></Badge>)}
          </div>
        )}
        {live.chart && !compact && (
          <div className="mt-4">
            <AreaChart height={140} labels={live.chart.labels} series={[
              { name: 'Current path', values: live.chart.base, color: live.chart.alt ? 'var(--chart-2)' : 'var(--chart-1)', dashed: !!live.chart.alt, fill: !live.chart.alt },
              ...(live.chart.alt ? [{ name: 'With this', values: live.chart.alt, color: 'var(--chart-1)' }] : []),
            ]} />
          </div>
        )}
      </div>
      {live.metrics && live.metrics.length > 0 && (
        <div className="grid border-t border-border sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))] max-sm:grid-cols-2">
          {live.metrics.map((m, i) => (
            <div key={i} className="min-w-0 border-border px-4 py-3 [&:not(:first-child)]:sm:border-l max-sm:[&:nth-child(even)]:border-l max-sm:[&:nth-child(n+3)]:border-t">
              <Eyebrow>{m.label}</Eyebrow>
              <div className={cn('num mt-1 truncate text-[14px] font-semibold', toneText[toTone(m.tone)])}>{m.value}</div>
            </div>
          ))}
        </div>
      )}
      {live.actions && live.actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-muted/50 px-4 py-2.5">
          {live.applied != null ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-positive"><Check className="size-4" />Added to your workspace</span>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={undo}><Undo2 />Undo</Button>
            </>
          ) : (
            <>
              {live.actions.map((a, i) => <Button key={i} variant="primary" size="sm" onClick={() => apply(i)}>{a.label}</Button>)}
              <span className="ml-auto text-meta text-foreground-subtle">Nothing changes until you confirm</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type Cmd = { id: string; label: string; group: 'Ask Fyza' | 'Suggestions' | 'Add' | 'Navigate' | 'Preferences'; icon: React.ElementType; run: () => void; hint?: string };

export function Palette({ onClose, onNavigate, onAdd, hasBiz }: { onClose: () => void; onNavigate: (p: string) => void; onAdd: (t: string) => void; hasBiz?: boolean }) {
  const { state } = useStore();
  const ask = useAI();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<AIResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sugg = suggestionsFor(state);

  const run = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true); setRes(null);
    try {
      const res = await ask(text);
      setRes(res);
    } finally {
      setBusy(false); setQ('');
    }
  };

  const cmds = useMemo<Cmd[]>(() => {
    const base: Cmd[] = [
      ...sugg.map((s, i) => ({ id: `s${i}`, label: s, group: 'Suggestions' as const, icon: MessageSquare, run: () => run(s) })),
      { id: 'a-exp', label: 'Add expense', group: 'Add', icon: ArrowUpRight, run: () => onAdd('expense'), hint: '⌘E' },
      { id: 'a-inc', label: 'Add income', group: 'Add', icon: ArrowDownLeft, run: () => onAdd('income'), hint: '⌘I' },
      { id: 'a-acc', label: 'Add account', group: 'Add', icon: Landmark, run: () => onAdd('account') },
      { id: 'a-goal', label: 'Create goal', group: 'Add', icon: Target, run: () => onAdd('goal') },
      { id: 'a-trip', label: 'Plan a trip', group: 'Add', icon: Plane, run: () => onAdd('trip') },
      { id: 'n-home', label: 'Go to Home', group: 'Navigate', icon: Home, run: () => onNavigate('home') },
      { id: 'n-act', label: 'Go to Activity', group: 'Navigate', icon: LineChart, run: () => onNavigate('activity') },
      { id: 'n-plan', label: 'Go to Plans', group: 'Navigate', icon: Compass, run: () => onNavigate('plans') },
      ...(hasBiz ? [{ id: 'n-biz', label: 'Go to Business', group: 'Navigate' as const, icon: Building2, run: () => onNavigate('business') }] : []),
    ];
    const t = q.trim().toLowerCase();
    if (!t) return base;
    const matches = base.filter((c) => c.group !== 'Suggestions' && c.label.toLowerCase().includes(t));
    const sMatches = base.filter((c) => c.group === 'Suggestions' && c.label.toLowerCase().includes(t));
    return [{ id: 'ask', label: q.trim(), group: 'Ask Fyza', icon: MessageSquare, run: () => run(q) }, ...sMatches, ...matches];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sugg, hasBiz]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' }); }, [sel]);
  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);

  const groups = cmds.reduce<Record<string, { c: Cmd; i: number }[]>>((g, c, i) => { (g[c.group] ||= []).push({ c, i }); return g; }, {});
  const showList = !busy && !res;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-overlay p-4 pt-[12vh] backdrop-blur-[3px] animate-fade-in max-sm:pt-3" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Ask Fyza" className="flex max-h-[min(560px,80dvh)] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-pop animate-pop">
        <div className="flex items-center gap-3 border-b border-border px-4">
          {res ? (
            <Button variant="ghost" size="sm" icon aria-label="Back" onClick={() => { setRes(null); inputRef.current?.focus(); }} className="-ml-1.5"><ArrowLeft /></Button>
          ) : <AIMark />}
          <input ref={inputRef} value={q} role="combobox" aria-expanded={showList} aria-controls="palette-list" aria-activedescendant={showList ? `cmd-${sel}` : undefined}
            placeholder={res ? 'Ask a follow-up…' : 'Ask or tell Fyza anything…'}
            className="h-14 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground-subtle"
            onChange={(e) => { setQ(e.target.value); if (res) setRes(null); }}
            onKeyDown={(e) => {
              if (!showList) { if (e.key === 'Enter') run(q); return; }
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => (s + 1) % cmds.length); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => (s - 1 + cmds.length) % cmds.length); }
              if (e.key === 'Enter') { e.preventDefault(); cmds[sel]?.run(); }
            }} />
          {q ? <Button variant="primary" size="sm" icon aria-label="Send" onClick={() => run(q)} className="size-7 rounded-md"><ArrowUp /></Button> : <Kbd className="max-sm:hidden">esc</Kbd>}
        </div>

        <div ref={listRef} id="palette-list" role="listbox" className="flex-1 overflow-y-auto overscroll-contain p-2">
          {busy && (
            <div className="flex items-center gap-3 px-3 py-5 text-[13px] text-foreground-subtle" aria-live="polite">
              <span className="flex gap-1">{[0, 1, 2].map((i) => <i key={i} className="size-1.5 rounded-full bg-accent" style={{ animation: `blink 1.2s ${i * 0.15}s infinite` }} />)}</span>
              Reading your finances…
            </div>
          )}
          {res && <div className="p-2"><AICard r={res} /></div>}
          {showList && Object.entries(groups).map(([g, items]) => (
            <div key={g} className="mb-1">
              <div className="px-3 pb-1 pt-2.5"><Eyebrow>{g}</Eyebrow></div>
              {items.map(({ c, i }) => (
                <button key={c.id} id={`cmd-${i}`} data-idx={i} role="option" aria-selected={sel === i} onMouseMove={() => sel !== i && setSel(i)} onClick={c.run}
                  className={cn('flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13.5px] transition-colors', sel === i ? 'bg-surface-muted text-foreground' : 'text-foreground-muted')}>
                  <c.icon className={cn('size-4 shrink-0', c.group === 'Ask Fyza' ? 'text-accent' : 'text-foreground-subtle')} strokeWidth={1.75} />
                  <span className="flex-1 truncate">{c.group === 'Ask Fyza' ? <>Ask Fyza: <span className="text-foreground">“{c.label}”</span></> : c.label}</span>
                  {c.hint && <Kbd>{c.hint}</Kbd>}
                  {sel === i && <CornerDownLeft className="size-3.5 text-foreground-subtle" />}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-foreground-subtle max-sm:hidden">
          <span className="inline-flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd>navigate</span>
          <span className="inline-flex items-center gap-1.5"><Kbd>↵</Kbd>select</span>
          <span className="ml-auto">Fyza reads only your workspace</span>
        </div>
      </div>
    </div>
  );
}
