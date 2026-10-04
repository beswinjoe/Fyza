import { useState } from 'react';
import { Sparkles, ArrowRight, Plane, Plus, CalendarClock, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { useStore } from '../engine/store';
import { today, mkey, inr, fmtDate, relDay, addMonths, monthLabel, daysBetween, parseDate } from '../engine/format';
import { available, monthSummary, insights, forecast, history, upcoming, goalStats, tripTotal, studentCycle, accountBalance, cardStats, loanStats, inWorld, tripDays, netWorth } from '../engine/finance';
import { Money, CountUp, Bar, Icon, AreaChart, BarsChart, Seg, Ring, catIcon, ACC_ICON } from '../components/ui';
import { CreditCard, HandCoins } from 'lucide-react';
import { TxRow } from './Activity';
import { BusinessHero } from './Business';
import { AppState } from '../types/app';


export function Insight({ items, onAsk }: { items: any[]; onAsk: () => void }) {
  return (
    <div className="card card-pad">
      <div className="card-head"><div className="card-title"><span className="spark-dot"><Sparkles /></span>What Fyza noticed</div></div>
      <div className="stack" style={{ gap: 10 }}>
        {items.length === 0 && <p className="muted">Add a few transactions and Fyza will start spotting patterns.</p>}
        {items.slice(0, 3).map((x, i) => (
          <div key={i} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
            {x.tone === 'pos' ? <TrendingDown size={16} className="pos" style={{ marginTop: 2, flexShrink: 0 }} /> : x.tone === 'neg' ? <AlertTriangle size={16} className="neg" style={{ marginTop: 2, flexShrink: 0 }} /> : <TrendingUp size={16} className="faint" style={{ marginTop: 2, flexShrink: 0 }} />}
            <p style={{ fontSize: 13.5 }}>{x.text}</p>
          </div>
        ))}
      </div>
      <button className="command" style={{ marginTop: 18, maxWidth: 'none', height: 38 }} onClick={onAsk}><Sparkles size={14} /><span>Ask about your money…</span><span className="kbd">⌘K</span></button>
    </div>
  );
}

function StudentHero({ state }: { state: AppState }) {
  const c = studentCycle(state);
  if (!c) return null;
  return (
    <div className="card hero">
      <div className="row between wrap">
        <span className="eyebrow">Left until next pocket money</span>
        <span className="chip">{c.daysLeft} days · {fmtDate(c.next)}</span>
      </div>
      <div className="hero-amount"><CountUp v={c.remaining} /></div>
      <Bar value={c.progress} tone={c.progress > 0.85 ? 'neg' : 'accent'} />
      <div className="insight" style={{ marginTop: 18 }}>
        <span className="spark-dot"><Sparkles /></span>
        <p>You have <b>{inr(c.remaining)}</b> left with <b>{c.daysLeft} days</b> to go. At your current pace of {inr(c.rate)}/day, you'll likely have <b className={c.projected < 0 ? 'neg' : 'pos'}>{inr(c.projected)}</b> left. Try to keep it under <b>{inr(c.safeDaily)}/day</b>.</p>
      </div>
      <div className="hero-stats">
        <div className="hero-stat"><div className="eyebrow">Pocket money</div><div className="v num">{inr(c.amount)}</div></div>
        <div className="hero-stat"><div className="eyebrow">Spent</div><div className="v num">{inr(c.spent)}</div></div>
        <div className="hero-stat"><div className="eyebrow">Daily pace</div><div className="v num">{inr(c.rate)}</div></div>
        <div className="hero-stat"><div className="eyebrow">Safe / day</div><div className="v num pos">{inr(c.safeDaily)}</div></div>
      </div>
    </div>
  );
}

function PersonalHero({ state }: { state: AppState }) {
  const now = today();
  const key = mkey(now);
  const s = monthSummary(state, key, 'personal');
  const avail = available(state, 'personal');
  const prev = monthSummary(state, mkey(addMonths(now, -1)), 'personal', now.getDate());
  const d = prev.expense ? (s.expense - prev.expense) / prev.expense : 0;
  const nw = netWorth(state);
  const intAvail = Math.floor(avail);
  return (
    <div className="card hero">
      <div className="row between wrap">
        <span className="eyebrow">Available across accounts</span>
        {prev.expense > 0 && <span className={`chip ${d <= 0 ? 'pos' : 'neg'}`}>{d <= 0 ? '↓' : '↑'} Spending {Math.abs(Math.round(d * 100))}% vs last month</span>}
      </div>
      <div className="hero-amount"><CountUp v={intAvail} /></div>
      <p className="muted" style={{ maxWidth: 520 }}>
        You've earned <b style={{ color: 'var(--text)' }} className="num">{inr(s.income + s.transferIn)}</b> and spent <b style={{ color: 'var(--text)' }} className="num">{inr(s.expense)}</b> so far in {monthLabel(key, true).split(' ')[0]}.
      </p>
      <div className="hero-stats">
        <div className="hero-stat"><div className="eyebrow">Income</div><div className="v num">{inr(s.income + s.transferIn)}</div></div>
        <div className="hero-stat"><div className="eyebrow">Expenses</div><div className="v num">{inr(s.expense)}</div></div>
        <div className="hero-stat"><div className="eyebrow">Cash flow</div><div className={`v num ${s.net + s.transferIn >= 0 ? 'pos' : 'neg'}`}>{inr(s.net + s.transferIn, { sign: true })}</div></div>
        <div className="hero-stat"><div className="eyebrow">Net worth</div><div className="v num">{inr(nw.net, { compact: true })}</div></div>
      </div>
    </div>
  );
}

export function FlowCard({ state, world }: { state: AppState; world: any }) {
  const [mode, setMode] = useState('forecast');
  const hist = history(state, world, 6);
  const fc = forecast(state, world, 6);
  return (
    <div className="card card-pad">
      <div className="card-head">
        <div>
          <div className="card-title">{mode === 'forecast' ? 'Where you’re heading' : 'Where your money went'}</div>
          <div className="faint" style={{ fontSize: 12.5, marginTop: 2 }}>
            {mode === 'forecast' ? <>Projected balance by {fc[5].label}: <b className="num" style={{ color: 'var(--text)' }}>{inr(fc[5].balance, { compact: true })}</b></> : 'Income vs expenses, last 6 months'}
          </div>
        </div>
        <Seg value={mode} onChange={setMode} options={[{ value: 'past', label: 'Past' }, { value: 'forecast', label: 'Future' }]} />
      </div>
      {mode === 'forecast' ? (
        <>
          <AreaChart height={210} labels={fc.map((r) => r.label)} series={[{ name: 'Balance', values: fc.map((r) => r.balance), color: 'var(--chart-1)' }]} />
          <div className="row wrap" style={{ gap: 8, marginTop: 14 }}>
            {fc.filter((r) => r.trips > 0 || r.pressure || r.tripList.length).slice(0, 3).map((r) => (
              <span key={r.key} className={`chip ${r.pressure ? 'warn' : ''}`}>
                {r.tripList.length ? <Plane size={12} /> : <AlertTriangle size={12} />}
                {r.label}: {r.tripList.length ? `${r.tripList.map((t) => t.name).join(', ')} +${inr(r.tripList.reduce((s, t) => s + t.amount, 0), { compact: true })}` : 'tight month'}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <BarsChart labels={hist.map((h) => h.label)} a={hist.map((h) => h.income)} b={hist.map((h) => h.expense)} highlight={5} />
          <div className="legend" style={{ marginTop: 10 }}><span><i style={{ background: 'var(--chart-1)' }} />Income</span><span><i style={{ background: 'var(--text-3)' }} />Expenses</span></div>
        </>
      )}
    </div>
  );
}

export function UpcomingCard({ state, world }: { state: AppState; world: any }) {
  const up = upcoming(state, world, 21).slice(0, 5);
  const total = up.filter((u) => u.type === 'expense').reduce((s, u) => s + u.amount, 0);
  return (
    <div className="card card-pad">
      <div className="card-head"><div className="card-title"><CalendarClock size={16} className="faint" />Coming up</div><span className="faint num" style={{ fontSize: 12.5 }}>{inr(total)} due · 3 weeks</span></div>
      <div className="list">
        {up.length === 0 && <div className="empty">Nothing due soon.</div>}
        {up.map((u) => (
          <div className="li" key={u.id + u.date}>
            <Icon as={catIcon(u.category || '')} size="sm" />
            <div className="meta"><div className="t">{u.name}</div><div className="s">{relDay(u.date)}</div></div>
            <div className={`amt num ${u.type === 'income' ? 'pos' : ''}`}>{u.type === 'income' ? '+' : ''}{inr(u.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GoalsCard({ state, onOpen, onAdd }: { state: AppState; onOpen: (t: string, id: string) => void; onAdd: () => void }) {
  return (
    <div className="card card-pad">
      <div className="card-head"><div className="card-title">Goals</div><button className="btn ghost sm icon" onClick={onAdd}><Plus /></button></div>
      <div className="stack" style={{ gap: 6 }}>
        {state.goals.length === 0 && <div className="empty"><b>No goals yet</b>Save towards a laptop, trip, or emergency fund.</div>}
        {state.goals.slice(0, 4).map((g) => {
          const st = goalStats(g);
          return (
            <div key={g.id} className="li" onClick={() => onOpen('goal', g.id)}>
              <Ring value={st.progress} size={38} color={st.onTrack ? 'var(--accent)' : 'var(--warn)'} />
              <div className="meta"><div className="t">{g.name}</div><div className="s">{inr(g.current, { compact: true })} of {inr(g.target, { compact: true })} · {st.eta ? `by ${monthLabel(st.eta, true)}` : 'set a monthly amount'}</div></div>
              <span className="num faint" style={{ fontSize: 13 }}>{Math.round(st.progress * 100)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TripCard({ state, onOpen }: { state: AppState; onOpen: (t: string, id: string) => void }) {
  const t = [...state.trips].filter((x) => parseDate(x.end).getTime() >= today().getTime()).sort((a, b) => a.start.localeCompare(b.start))[0];
  if (!t) return null;
  const fc = forecast(state, t.world || 'personal', 12);
  const row = fc.find((r) => r.key === t.start.slice(0, 7));
  const total = tripTotal(t);
  return (
    <div className="card card-pad" style={{ cursor: 'pointer' }} onClick={() => onOpen('trip', t.id)}>
      <div className="row between"><span className="eyebrow">Next trip · in {daysBetween(today(), parseDate(t.start))} days</span><Plane size={16} className="faint" /></div>
      <div style={{ fontFamily: 'Inter Tight', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', margin: '8px 0 2px' }}>{t.destination}</div>
      <div className="faint" style={{ fontSize: 13 }}>{fmtDate(t.start)} – {fmtDate(t.end)} · {tripDays(t)} days</div>
      {row && (
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 13 }}>
          <span className="muted">Normal {row.label} spending</span><span className="num">{inr(row.expense - total)}</span>
          <span className="muted">{t.destination} trip</span><span className="num">+{inr(total)}</span>
          <span style={{ borderTop: '1px solid var(--border)', paddingTop: 6, fontWeight: 500 }}>{row.label} projected</span><span className="num" style={{ borderTop: '1px solid var(--border)', paddingTop: 6, fontWeight: 600 }}>{inr(row.expense)}</span>
        </div>
      )}
    </div>
  );
}

export function MoneyCard({ state, world, onOpen, onAdd }: { state: AppState; world: any; onOpen: (t: string, id: string) => void; onAdd: (t: string) => void }) {
  const [tab, setTab] = useState('accounts');
  const accs = state.accounts.filter(inWorld(world));
  const loans = state.loans.filter(inWorld(world));
  return (
    <div className="card card-pad">
      <div className="card-head">
        <Seg value={tab} onChange={setTab} options={[{ value: 'accounts', label: 'Accounts' }, ...(world === 'personal' ? [{ value: 'cards', label: 'Cards' }] : []), { value: 'loans', label: 'Loans' }]} />
        <button className="btn ghost sm icon" onClick={() => onAdd(tab === 'accounts' ? 'account' : tab === 'cards' ? 'card' : 'loan')}><Plus /></button>
      </div>
      <div className="list">
        {tab === 'accounts' && accs.map((a) => (
          <div key={a.id} className="li" onClick={() => onOpen('account', a.id)}>
            <Icon as={ACC_ICON[a.type] || ACC_ICON.other} size="sm" />
            <div className="meta"><div className="t">{a.name}</div><div className="s">{a.institution || a.type}</div></div>
            <Money v={accountBalance(state, a)} className="amt" />
          </div>
        ))}
        {tab === 'cards' && state.cards.map((c) => {
          const s = cardStats(state, c);
          return (
            <div key={c.id} className="li" onClick={() => onOpen('card', c.id)}>
              <Icon as={CreditCard} size="sm" />
              <div className="meta"><div className="t">{c.name} {c.last4 && <span className="faint">•• {c.last4}</span>}</div>
                <div className="s">{c.kind === 'credit' ? `${Math.round(s.utilization * 100)}% used · due ${fmtDate(s.dueDate)}` : 'Debit'}</div></div>
              <Money v={s.spent} className="amt" />
            </div>
          );
        })}
        {tab === 'loans' && loans.map((l) => {
          const s = loanStats(l);
          return (
            <div key={l.id} className="li" onClick={() => onOpen('loan', l.id)}>
              <Icon as={HandCoins} size="sm" />
              <div className="meta"><div className="t">{l.name}</div><div className="s">{inr(s.emi)}/mo · {s.remainingMonths} left</div></div>
              <Money v={s.balance} compact className="amt" />
            </div>
          );
        })}
        {((tab === 'accounts' && !accs.length) || (tab === 'cards' && !state.cards.length) || (tab === 'loans' && !loans.length)) && <div className="empty">Nothing here yet.</div>}
      </div>
    </div>
  );
}

export default function HomePage({ go, openAdd, openPalette, openItem }: { go: (p: string) => void; openAdd: (t?: string) => void; openPalette: () => void; openItem: (t: string, id: string) => void }) {
  const { state } = useStore();
  const world = state.world as string;
  const student = state.profiles.includes('student') && !state.profiles.includes('personal');
  const recent = state.transactions.filter((t) => (t.world || 'personal') === world).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const hour = new Date().getHours();
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="faint" style={{ fontSize: 13 }}>{fmtDate(today(), true)}</div>
          <h1 className="page-title">Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}{state.user.name ? `, ${state.user.name.split(' ')[0]}` : ''}</h1>
        </div>
        <button className="btn primary hide-m" onClick={() => openAdd()}><Plus />Add</button>
      </div>
      <div className="grid g-main stagger">
        <div className="stack">
          {world === 'business' ? <BusinessHero state={state} /> : student ? <StudentHero state={state} /> : <PersonalHero state={state} />}
          <FlowCard state={state} world={world} />
          <div className="grid g-2">
            <UpcomingCard state={state} world={world} />
            <div className="card card-pad">
              <div className="card-head"><div className="card-title">Recent</div><button className="link" onClick={() => go('activity')}>All activity <ArrowRight /></button></div>
              <div className="list">
                {recent.length === 0 && <div className="empty">No recent activity.</div>}
                {recent.map((t) => <TxRow key={t.id} t={t} compact />)}
              </div>
            </div>
          </div>
        </div>
        <div className="stack">
          <Insight items={insights(state, world as any)} onAsk={openPalette} />
          {world === 'personal' && <TripCard state={state} onOpen={openItem} />}
          {world === 'personal' && <GoalsCard state={state} onOpen={openItem} onAdd={() => openAdd('goal')} />}
          <MoneyCard state={state} world={world} onOpen={openItem} onAdd={openAdd} />
        </div>
      </div>
    </div>
  );
}
