import { useState } from 'react';
import { useStore } from '../engine/store';
import { businessMetrics } from '../engine/finance';
import { inr, monthLabel } from '../engine/format';
import { CountUp, Bar, AreaChart, Seg } from '../components/ui';

import { AppState } from '../types/app';

export function BusinessHero({ state }: { state: AppState }) {
  const m = businessMetrics(state);
  return (
    <div className="card hero">
      <div className="row between wrap">
        <span className="eyebrow">Business Performance · {monthLabel(m.period)}</span>
        <span className={`chip ${m.margin > 0.2 ? 'pos' : m.margin > 0 ? '' : 'warn'}`}>{Math.round(m.margin * 100)}% margin</span>
      </div>
      <div className="hero-amount"><CountUp v={m.profit} /></div>
      <p className="muted" style={{ maxWidth: 520 }}>
        You generated <b style={{ color: 'var(--text)' }} className="num">{inr(m.revenue)}</b> in revenue and had <b style={{ color: 'var(--text)' }} className="num">{inr(m.expenses)}</b> in expenses last month.
      </p>
      <div className="hero-stats">
        <div className="hero-stat"><div className="eyebrow">Revenue</div><div className="v num">{inr(m.revenue)}</div></div>
        <div className="hero-stat"><div className="eyebrow">Expenses</div><div className="v num">{inr(m.expenses)}</div></div>
        <div className="hero-stat"><div className="eyebrow">Cash on hand</div><div className="v num">{inr(m.cash, { compact: true })}</div></div>
        <div className="hero-stat"><div className="eyebrow">Runway</div><div className="v num">{m.runway > 99 ? '∞' : m.runway.toFixed(1)} mo</div></div>
      </div>
    </div>
  );
}

export default function BusinessPage() {
  const { state } = useStore();
  const m = businessMetrics(state);
  const [tab, setTab] = useState('overview');

  return (
    <div className="page">
      <div className="page-head">
        <div><div className="eyebrow">Business</div><h1 className="page-title">Workspace</h1></div>
        <Seg value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Overview' }, { value: 'cashflow', label: 'Cash Flow' }]} />
      </div>
      
      {tab === 'overview' && (
        <div className="grid g-main stagger">
          <div className="stack">
            <BusinessHero state={state} />
            <div className="card card-pad">
              <div className="card-head"><div><div className="card-title">Runway & Burn</div><div className="faint" style={{ fontSize: 12.5 }}>Average over last 3 months</div></div></div>
              <div className="row wrap" style={{ gap: 24, marginTop: 10 }}>
                <div><div className="eyebrow">Avg Revenue</div><div className="v num" style={{ fontSize: 22, fontWeight: 600 }}>{inr(m.avgRev)}</div></div>
                <div><div className="eyebrow">Avg Burn</div><div className="v num" style={{ fontSize: 22, fontWeight: 600 }}>{inr(m.avgExp)}</div></div>
                <div><div className="eyebrow">Net Burn</div><div className={`v num ${m.netBurn > 0 ? 'neg' : 'pos'}`} style={{ fontSize: 22, fontWeight: 600 }}>{inr(m.netBurn, { sign: true })}</div></div>
              </div>
              <div style={{ marginTop: 24 }}><div className="row between faint" style={{ fontSize: 12, marginBottom: 6 }}><span>Cash vs Runway ({m.runway > 99 ? 'Infinite' : m.runway.toFixed(1)} months)</span><span className="num">{inr(m.cash, { compact: true })}</span></div>
              <Bar value={Math.min(1, m.runway / 12)} tone={m.runway < 3 ? 'warn' : 'pos'} /></div>
            </div>
          </div>
          <div className="stack">
            <div className="card card-pad">
              <div className="card-title" style={{ marginBottom: 16 }}>Invoices</div>
              <div className="list">
                <div className="li">
                  <div className="meta"><div className="t">Awaiting payment</div><div className="s">Receivables</div></div>
                  <div className="amt num pos">{inr(m.receivable)}</div>
                </div>
                <div className="li">
                  <div className="meta"><div className="t">To pay</div><div className="s">Payables</div></div>
                  <div className="amt num neg">{inr(m.payable)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'cashflow' && (
        <div className="card card-pad stagger">
          <div className="card-title" style={{ marginBottom: 16 }}>Revenue vs Expenses</div>
          <AreaChart height={300} labels={['3 mo ago', '2 mo ago', 'Last mo', 'This mo']} series={[
            { name: 'Revenue', values: [m.avgRev, m.prev.income, m.cur.income, m.mtd.income], color: 'var(--pos)' },
            { name: 'Expenses', values: [m.avgExp, m.prev.expense, m.cur.expense, m.mtd.expense], color: 'var(--neg)' }
          ]} />
        </div>
      )}
    </div>
  );
}
