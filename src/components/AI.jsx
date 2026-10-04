import { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowUp, CornerDownLeft, Check, Undo2, ArrowRight } from 'lucide-react';
import { useStore } from '../engine/store';
import { interpret, SUGGESTIONS } from '../engine/ai';
import { inr } from '../engine/format';
import { AreaChart } from './ui';

export function useAI() {
  const { state, dispatch } = useStore();
  const ask = (text) => {
    const r = interpret(text, state);
    if (r.autoApply && r.actions?.[0]) { dispatch({ type: 'batch', ops: r.actions[0].ops }); r.applied = 0; }
    dispatch({ type: 'set', patch: { aiHistory: [...state.aiHistory.slice(-30), r] } });
    return r;
  };
  return ask;
}

export function suggestionsFor(state) {
  if (state.world === 'business') return SUGGESTIONS.business;
  return state.profiles.includes('student') && !state.profiles.includes('personal') ? SUGGESTIONS.student : SUGGESTIONS.personal;
}

export function AICard({ r, compact }) {
  const { state, dispatch } = useStore();
  const live = state.aiHistory.find((x) => x.id === r.id) || r;
  const apply = (i) => {
    dispatch({ type: 'batch', ops: [...live.actions[i].ops, { type: 'update', col: 'aiHistory', id: r.id, patch: { applied: i } }] });
  };
  const undo = () => {
    const ops = live.actions[live.applied].ops.map((o) => ({ type: 'remove', col: o.col, id: o.item.id }));
    dispatch({ type: 'batch', ops: [...ops, { type: 'update', col: 'aiHistory', id: r.id, patch: { applied: undefined } }] });
  };
  const tone = live.tone;
  return (
    <div className="ai-card">
      <div className="ai-card-body">
        <div className="row" style={{ gap: 8 }}>
          <span className="spark-dot"><Sparkles /></span>
          <span className="eyebrow">{live.kind === 'action' ? 'Ready to add' : live.kind === 'scenario' ? 'Scenario' : 'Answer'}</span>
          {tone && <span className={`chip ${tone}`} style={{ marginLeft: 'auto' }}>{tone === 'pos' ? 'Looks good' : 'Heads up'}</span>}
        </div>
        <div className="ai-title">{live.title}</div>
        <div className="ai-sum">{live.summary}</div>
        {live.bullets?.length > 0 && <div className="ai-bullets">{live.bullets.map((b, i) => <div key={i}>{b}</div>)}</div>}
        {live.breakdown && (
          <div className="row wrap" style={{ marginTop: 12, gap: 6 }}>
            {Object.entries(live.breakdown).map(([k, v]) => <span key={k} className="chip">{k[0].toUpperCase() + k.slice(1)} <b className="num" style={{ color: 'var(--text)' }}>{inr(v, { compact: true })}</b></span>)}
          </div>
        )}
        {live.chart && !compact && (
          <div style={{ marginTop: 16 }}>
            <AreaChart height={150} labels={live.chart.labels} series={[
              { name: 'Current path', values: live.chart.base, color: live.chart.alt ? 'var(--text-3)' : 'var(--chart-1)', dashed: !!live.chart.alt, fill: !live.chart.alt },
              ...(live.chart.alt ? [{ name: 'With this', values: live.chart.alt, color: 'var(--chart-1)' }] : []),
            ]} />
          </div>
        )}
      </div>
      {live.metrics?.length > 0 && (
        <div className="ai-metrics">
          {live.metrics.map((m, i) => <div key={i}><div className="eyebrow">{m.label}</div><div className={`v num ${m.tone || ''}`}>{m.value}</div></div>)}
        </div>
      )}
      {live.actions?.length > 0 && (
        <div className="ai-actions">
          {live.applied != null ? (
            <><span className="applied"><Check /> Added to your workspace</span><button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={undo}><Undo2 /> Undo</button></>
          ) : (
            <>{live.actions.map((a, i) => <button key={i} className="btn primary sm" onClick={() => apply(i)}>{a.label}</button>)}<span className="faint" style={{ fontSize: 12, marginLeft: 'auto' }}>Nothing changes until you confirm</span></>
          )}
        </div>
      )}
    </div>
  );
}

export function Palette({ onClose, onOpenAI }) {
  const { state } = useStore();
  const ask = useAI();
  const [q, setQ] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState(-1);
  const ref = useRef(null);
  const sugg = suggestionsFor(state);
  useEffect(() => { ref.current?.focus(); const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const run = (text) => {
    if (!text.trim()) return;
    setBusy(true); setRes(null);
    setTimeout(() => { setRes(ask(text)); setBusy(false); setQ(''); }, 420);
  };
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette">
        <div className="palette-input">
          <span className="spark-dot" style={{ width: 24, height: 24 }}><Sparkles /></span>
          <input ref={ref} value={q} placeholder="Tell Fyza anything about your money…" onChange={(e) => { setQ(e.target.value); setSel(-1); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(sugg.length - 1, s + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(-1, s - 1)); }
              if (e.key === 'Enter') run(sel >= 0 && !q ? sugg[sel] : q);
            }} />
          <span className="kbd hide-m">esc</span>
        </div>
        <div className="palette-body">
          {busy && <div className="row" style={{ padding: 16, gap: 12 }}><span className="thinking"><i /><i /><i /></span><span className="faint">Reading your finances…</span></div>}
          {res && <div className="stack"><AICard r={res} /><button className="link" style={{ alignSelf: 'flex-end' }} onClick={onOpenAI}>Continue in AI <ArrowRight /></button></div>}
          {!busy && !res && (
            <>
              <div className="eyebrow" style={{ padding: '6px 12px 8px' }}>Try saying</div>
              {sugg.map((s, i) => <button key={s} className={`sugg ${sel === i ? 'sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => run(s)}><CornerDownLeft />{s}</button>)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Composer({ onSubmit, placeholder = 'Ask or tell Fyza anything…' }) {
  const [q, setQ] = useState('');
  return (
    <form className="ai-composer" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { onSubmit(q); setQ(''); } }}>
      <span className="spark-dot"><Sparkles /></span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
      <button className="btn primary icon" disabled={!q.trim()}><ArrowUp /></button>
    </form>
  );
}
