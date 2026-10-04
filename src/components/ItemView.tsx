
import { Trash2 } from 'lucide-react';
import { useStore } from '../engine/store';
import { inr, fmtDate, monthLabel } from '../engine/format';
import { goalStats, loanStats, cardStats, tripTotal, tripSpent, TRIP_PARTS } from '../engine/finance';
import { Modal, Ring, Bar } from './ui';
import { AppState } from '../types/app';

export function ItemView({ type, id, onClose }: { type: string; id: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const remove = (col: keyof AppState) => { dispatch({ type: 'remove', col, id }); onClose(); };

  if (type === 'goal') {
    const g = state.goals.find((x) => x.id === id);
    if (!g) return null;
    const s = goalStats(g);
    return (
      <Modal title={g.name} onClose={onClose} foot={<button className="btn danger sm" onClick={() => remove('goals')}><Trash2 /> Delete goal</button>}>
        <div className="row" style={{ gap: 16, marginBottom: 24 }}>
          <Ring value={s.progress} size={64} stroke={6} color={s.onTrack ? 'var(--accent)' : 'var(--warn)'} />
          <div>
            <div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{inr(g.current)} <span className="faint" style={{ fontSize: 16 }}>/ {inr(g.target, { compact: true })}</span></div>
            <div className="faint">{s.onTrack ? 'On track' : 'Behind schedule'} · {Math.round(s.progress * 100)}%</div>
          </div>
        </div>
        <div className="grid g-2">
          <div className="card card-pad"><div className="eyebrow">Monthly target</div><div className="v num">{inr(g.monthly)}</div></div>
          <div className="card card-pad"><div className="eyebrow">Estimated completion</div><div className="v">{s.eta ? monthLabel(s.eta, true) : 'Unknown'}</div></div>
        </div>
        {!s.onTrack && s.required && <div className="insight" style={{ marginTop: 16 }}><p>You need to save <b>{inr(s.required)}/mo</b> to hit your target by {fmtDate(g.targetDate)}.</p></div>}
      </Modal>
    );
  }

  if (type === 'trip') {
    const t = state.trips.find((x) => x.id === id);
    if (!t) return null;
    const total = tripTotal(t), spent = tripSpent(state, t);
    return (
      <Modal title={t.destination} onClose={onClose} foot={<button className="btn danger sm" onClick={() => remove('trips')}><Trash2 /> Delete trip</button>}>
        <div className="row between" style={{ marginBottom: 24 }}>
          <div><div className="faint">Total Budget</div><div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{inr(total)}</div></div>
          <div style={{ textAlign: 'right' }}><div className="faint">Spent</div><div className="num" style={{ fontSize: 24, fontWeight: 600, color: spent > total ? 'var(--neg)' : 'var(--pos)' }}>{inr(spent)}</div></div>
        </div>
        <Bar value={total ? spent / total : 0} tone={spent > total ? 'neg' : 'accent'} />
        <div className="grid g-2" style={{ marginTop: 24, gap: 12 }}>
          {TRIP_PARTS.map((p) => (
            <div key={p} className="row between" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <span className="muted" style={{ textTransform: 'capitalize' }}>{p}</span><span className="num">{inr(t.budget[p] || 0)}</span>
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  if (type === 'loan') {
    const l = state.loans.find((x) => x.id === id);
    if (!l) return null;
    const s = loanStats(l);
    return (
      <Modal title={l.name} onClose={onClose} foot={<button className="btn danger sm" onClick={() => remove('loans')}><Trash2 /> Delete loan</button>}>
        <div className="row between" style={{ marginBottom: 24 }}>
          <div><div className="faint">Remaining Balance</div><div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{inr(s.balance)}</div></div>
          <div style={{ textAlign: 'right' }}><div className="faint">Monthly EMI</div><div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{inr(s.emi)}</div></div>
        </div>
        <div className="bar" style={{ marginBottom: 24 }}><i style={{ width: `${s.progress * 100}%`, background: 'var(--accent)' }} /></div>
        <div className="grid g-2">
          <div className="card card-pad"><div className="eyebrow">Interest paid</div><div className="v num">{inr(s.interestPaid)}</div></div>
          <div className="card card-pad"><div className="eyebrow">Interest remaining</div><div className="v num">{inr(s.interestRemaining)}</div></div>
          <div className="card card-pad"><div className="eyebrow">Months left</div><div className="v num">{s.remainingMonths} / {l.tenureMonths}</div></div>
          <div className="card card-pad"><div className="eyebrow">Next due</div><div className="v">{fmtDate(s.nextDue)}</div></div>
        </div>
      </Modal>
    );
  }
  
  if (type === 'card') {
    const c = state.cards.find((x) => x.id === id);
    if (!c) return null;
    const s = cardStats(state, c);
    return (
      <Modal title={c.name} onClose={onClose} foot={<button className="btn danger sm" onClick={() => remove('cards')}><Trash2 /> Delete card</button>}>
        <div className="row between" style={{ marginBottom: 24 }}>
          <div><div className="faint">Spent this cycle</div><div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{inr(s.spent)}</div></div>
          {c.kind === 'credit' && <div style={{ textAlign: 'right' }}><div className="faint">Available limit</div><div className="num" style={{ fontSize: 24, fontWeight: 600 }}>{inr(s.availableLimit)}</div></div>}
        </div>
        {c.kind === 'credit' && <div className="bar" style={{ marginBottom: 24 }}><i style={{ width: `${s.utilization * 100}%`, background: s.utilization > 0.8 ? 'var(--warn)' : 'var(--accent)' }} /></div>}
        <div className="grid g-2">
          {c.kind === 'credit' && <div className="card card-pad"><div className="eyebrow">Credit limit</div><div className="v num">{inr(s.limit)}</div></div>}
          {c.kind === 'credit' && <div className="card card-pad"><div className="eyebrow">Payment due</div><div className="v">{fmtDate(s.dueDate)}</div></div>}
        </div>
      </Modal>
    );
  }

  return null;
}
