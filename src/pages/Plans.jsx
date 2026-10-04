import { useState } from 'react';
import { Plus, Plane, Sparkles, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../engine/store';
import { inr, fmtDate, monthLabel } from '../engine/format';
import { forecast, goalStats, tripTotal, tripSpent, tripDays, TRIP_PARTS, inWorld } from '../engine/finance';
import { AreaChart, Seg, Ring, Bar } from '../components/ui';

function ForecastView({ state, world }) {
  const fc = forecast(state, world, 6);
  const [sel, setSel] = useState(0);
  const r = fc[sel];
  return (
    <div className="grid g-main">
      <div className="card card-pad">
        <div className="card-head"><div><div className="card-title">Projected balance</div><div className="faint" style={{ fontSize: 12.5 }}>Based on recurring income & bills, EMIs, trips and your typical spending</div></div></div>
        <AreaChart height={240} labels={fc.map((x) => x.label)} series={[{ name: 'Balance', values: fc.map((x) => x.balance), color: 'var(--chart-1)' }]} />
        <div className="row" style={{ gap: 6, marginTop: 18, overflowX: 'auto' }}>
          {fc.map((x, i) => (
            <button key={x.key} onClick={() => setSel(i)} className="card" style={{ flex: '1 0 96px', padding: '10px 12px', textAlign: 'left', borderColor: i === sel ? 'var(--text)' : undefined, boxShadow: 'none', transition: 'border .15s' }}>
              <div className="eyebrow row" style={{ gap: 4 }}>{x.label}{x.pressure && <AlertTriangle size={11} className="warn" />}{x.tripList.length > 0 && <Plane size={11} />}</div>
              <div className={`num ${x.net >= 0 ? 'pos' : 'neg'}`} style={{ fontWeight: 600, marginTop: 2 }}>{inr(x.net, { compact: true, sign: true })}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="card card-pad">
        <div className="eyebrow">{monthLabel(r.key, true)}</div>
        <div className="num" style={{ fontSize: 30, fontWeight: 600, margin: '6px 0 4px' }}>{inr(r.balance)}</div>
        <div className="faint" style={{ fontSize: 13 }}>Expected balance at month end</div>
        <div className="divider" />
        {[
          ['Income', r.income, 'pos'],
          ['Recurring bills', -r.recurring - (sel === 0 ? 0 : 0)],
          ['EMIs', -r.emis],
          ['Everyday spending', -r.variable],
          ...(sel === 0 ? [['Already spent', -(r.expense - r.recurring - r.emis - r.variable - r.trips - r.oneTime)]] : []),
          ...r.tripList.map((t) => [`✈ ${t.name}`, -t.amount, 'warn']),
        ].filter(([, v]) => Math.round(v) !== 0).map(([l, v, tone]) => (
          <div key={l} className="row between" style={{ padding: '7px 0', fontSize: 13.5 }}><span className="muted">{l}</span><span className={`num ${tone || ''}`}>{inr(v, { sign: true })}</span></div>
        ))}
        <div className="row between" style={{ padding: '10px 0 0', borderTop: '1px solid var(--border)', marginTop: 6, fontWeight: 600 }}><span>Net</span><span className={`num ${r.net >= 0 ? 'pos' : 'neg'}`}>{inr(r.net, { sign: true })}</span></div>
        {r.tripList.length > 0 && (
          <div className="insight" style={{ marginTop: 16 }}><span className="spark-dot"><Sparkles /></span>
            <p>Normal {r.label} expenses would be about <b>{inr(r.expense - r.tripList.reduce((s, t) => s + t.amount, 0))}</b>. With {r.tripList.map((t) => t.name).join(', ')} ({inr(r.tripList.reduce((s, t) => s + t.amount, 0))}), the month totals <b>{inr(r.expense)}</b>.</p></div>
        )}
      </div>
    </div>
  );
}

function GoalsView({ state, dispatch, openAdd, openItem }) {
  return (
    <div className="grid g-3 stagger">
      {state.goals.map((g) => {
        const s = goalStats(g);
        return (
          <div key={g.id} className="card card-pad" style={{ cursor: 'pointer' }} onClick={() => openItem('goal', g.id)}>
            <div className="row between"><span className="eyebrow">{g.kind}</span><span className={`chip ${s.onTrack ? 'pos' : 'warn'}`}>{s.onTrack ? 'On track' : 'Behind'}</span></div>
            <div className="row" style={{ gap: 14, margin: '16px 0' }}>
              <Ring value={s.progress} size={56} stroke={5} color={s.onTrack ? 'var(--accent)' : 'var(--warn)'} />
              <div><div style={{ fontWeight: 600, fontSize: 16 }}>{g.name}</div><div className="num muted">{inr(g.current)} <span className="faint">/ {inr(g.target, { compact: true })}</span></div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
              <div><div className="faint">Monthly</div><div className="num">{inr(g.monthly)}</div></div>
              <div><div className="faint">Completes</div><div>{s.eta ? monthLabel(s.eta, true) : '—'}</div></div>
            </div>
            {!s.onTrack && s.required && <div className="faint" style={{ fontSize: 12.5, marginTop: 12 }}>Needs {inr(s.required)}/mo to hit {fmtDate(g.targetDate, true)}.</div>}
            <div className="row" style={{ gap: 6, marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
              <button className="btn sm" onClick={() => dispatch({ type: 'update', col: 'goals', id: g.id, patch: { current: Math.min(g.target, g.current + (+g.monthly || 1000)) } })}>+ {inr(g.monthly || 1000, { compact: true })}</button>
            </div>
          </div>
        );
      })}
      <button className="card card-pad type-btn" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 220, borderStyle: 'dashed' }} onClick={() => openAdd('goal')}><Plus size={20} /><b>New goal</b></button>
    </div>
  );
}

function TripsView({ state, openAdd, openItem }) {
  return (
    <div className="grid g-2 stagger">
      {state.trips.map((t) => {
        const total = tripTotal(t), spent = tripSpent(state, t);
        return (
          <div key={t.id} className="card card-pad" style={{ cursor: 'pointer' }} onClick={() => openItem('trip', t.id)}>
            <div className="row between"><div><div style={{ fontFamily: 'Inter Tight', fontSize: 22, fontWeight: 600 }}>{t.destination}</div><div className="faint">{fmtDate(t.start)} – {fmtDate(t.end, true)} · {tripDays(t)} days</div></div>
              <div style={{ textAlign: 'right' }}><div className="num" style={{ fontSize: 20, fontWeight: 600 }}>{inr(total)}</div><div className="faint" style={{ fontSize: 12 }}>{inr(total / tripDays(t))}/day</div></div></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
              {TRIP_PARTS.map((p) => <div key={p}><div className="faint" style={{ fontSize: 12, textTransform: 'capitalize' }}>{p}</div><div className="num">{inr(t.budget[p] || 0)}</div></div>)}
            </div>
            <div style={{ marginTop: 16 }}><div className="row between faint" style={{ fontSize: 12, marginBottom: 6 }}><span>Spent so far</span><span className="num">{inr(spent)} / {inr(total)}</span></div><Bar value={total ? spent / total : 0} tone="accent" /></div>
          </div>
        );
      })}
      <button className="card card-pad type-btn" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 200, borderStyle: 'dashed' }} onClick={() => openAdd('trip')}><Plane size={20} /><b>Plan a trip</b></button>
    </div>
  );
}

const PRESETS = {
  personal: [
    ['Buy ₹1.5L laptop', { oneTime: 150000, oneTimeMonth: 1 }], ['Save ₹15k / month', { monthlySave: 15000 }], ['Salary → ₹1L', { incomeDelta: 25000 }],
    ['Lose income 3 months', { incomeLoss: 3 }], ['Rent +₹5,000', { expenseDelta: 5000 }],
  ],
  business: [['Revenue −20%', { revenuePct: -0.2 }], ['Hire at ₹40k/mo', { expenseDelta: 40000 }], ['New ₹2L campaign', { oneTime: 200000, oneTimeMonth: 1 }], ['Revenue +30%', { revenuePct: 0.3 }]],
};

function ScenarioView({ state, dispatch, world }) {
  const [sc, setSc] = useState({});
  const [name, setName] = useState('');
  const base = forecast(state, world, 12), alt = forecast(state, world, 12, { ...sc, expenseDelta: (sc.expenseDelta || 0) + (sc.monthlySave || 0) });
  const d = alt[11].balance - base[11].balance;
  const minAlt = Math.min(...alt.map((r) => r.balance));
  const num = (k, label, step = 1000, suffix = '') => (
    <div className="field"><label>{label}</label><input className="input" type="number" step={step} value={sc[k] ?? ''} placeholder={'0' + suffix} onChange={(e) => setSc({ ...sc, [k]: e.target.value === '' ? undefined : +e.target.value })} /></div>
  );
  const saved = (state.scenarios || []).filter(inWorld(world));
  return (
    <div className="grid g-main">
      <div className="stack">
        <div className="card card-pad">
          <div className="card-head"><div><div className="card-title">Compare futures</div><div className="faint" style={{ fontSize: 12.5 }}>Nothing here touches your real data.</div></div>
            <div className="legend"><span><i style={{ background: 'var(--text-3)' }} />Current path</span><span><i style={{ background: 'var(--chart-1)' }} />Scenario</span></div></div>
          <AreaChart height={250} labels={base.map((r) => r.label)} series={[{ name: 'Current', values: base.map((r) => r.balance), color: 'var(--text-3)', dashed: true, fill: false }, { name: 'Scenario', values: alt.map((r) => r.balance), color: 'var(--chart-1)' }]} />
          <div className="ai-metrics" style={{ margin: '18px -22px -22px' }}>
            <div><div className="eyebrow">In 12 months</div><div className="v num">{inr(base[11].balance, { compact: true })}</div></div>
            <div><div className="eyebrow">With scenario</div><div className={`v num ${d >= 0 ? 'pos' : 'neg'}`}>{inr(alt[11].balance, { compact: true })}</div></div>
            <div><div className="eyebrow">Difference</div><div className={`v num ${d >= 0 ? 'pos' : 'neg'}`}>{inr(d, { compact: true, sign: true })}</div></div>
            <div><div className="eyebrow">Lowest point</div><div className={`v num ${minAlt < 0 ? 'neg' : ''}`}>{inr(minAlt, { compact: true })}</div></div>
          </div>
        </div>
        {sc.monthlySave > 0 && <div className="insight"><span className="spark-dot"><Sparkles /></span><p>Setting aside <b>{inr(sc.monthlySave)}</b> monthly builds <b>{inr(sc.monthlySave * 11, { compact: true })}</b> in savings over the year, while your spending balance stays {minAlt >= 0 ? 'positive' : <b className="neg">under pressure</b>}.</p></div>}
      </div>
      <div className="stack">
        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 12 }}>Quick scenarios</div>
          <div className="row wrap" style={{ gap: 6 }}>{(PRESETS[world] || PRESETS.personal).map(([l, s]) => <button key={l} className={`chip btnchip ${JSON.stringify(sc) === JSON.stringify(s) ? 'on' : ''}`} onClick={() => setSc(s)}>{l}</button>)}</div>
          <div className="divider" />
          <div className="form">
            {num('incomeDelta', world === 'business' ? 'Revenue change / mo' : 'Income change / mo')}
            {num('expenseDelta', 'Expense change / mo')}
            {num('oneTime', 'One-time purchase', 5000)}
            {num('oneTimeMonth', 'In month #', 1)}
            {num('incomeLoss', 'No income for (months)', 1)}
            {num('monthlySave', 'Save monthly')}
          </div>
          <div className="row" style={{ marginTop: 16, gap: 8 }}>
            <input className="input" placeholder="Name this scenario" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn primary" disabled={!Object.values(sc).some(Boolean)} onClick={() => { dispatch({ type: 'add', col: 'scenarios', item: { name: name || 'Untitled scenario', sc, world } }); setName(''); }}>Save</button>
          </div>
          <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setSc({})}>Reset</button>
        </div>
        {saved.length > 0 && (
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 8 }}>Saved scenarios</div>
            <div className="list">{saved.map((s) => (
              <div key={s.id} className="li" onClick={() => setSc(s.sc)}>
                <div className="meta"><div className="t">{s.name}</div><div className="s num">{inr(forecast(state, world, 12, s.sc)[11].balance, { compact: true })} in 12 mo</div></div>
                <button className="btn ghost icon sm" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'remove', col: 'scenarios', id: s.id }); }}><Trash2 /></button>
              </div>
            ))}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlansPage({ openAdd, openItem }) {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState('forecast');
  const world = state.world;
  return (
    <div className="page">
      <div className="page-head">
        <div><div className="eyebrow">Future</div><h1 className="page-title">Plans</h1></div>
        <Seg value={tab} onChange={setTab} options={[{ value: 'forecast', label: 'Forecast' }, ...(world === 'personal' ? [{ value: 'goals', label: 'Goals' }, { value: 'trips', label: 'Trips' }] : []), { value: 'whatif', label: 'What-if' }]} />
      </div>
      {tab === 'forecast' && <ForecastView state={state} world={world} />}
      {tab === 'goals' && <GoalsView state={state} dispatch={dispatch} openAdd={openAdd} openItem={openItem} />}
      {tab === 'trips' && <TripsView state={state} openAdd={openAdd} openItem={openItem} />}
      {tab === 'whatif' && <ScenarioView state={state} dispatch={dispatch} world={world} />}
    </div>
  );
}
