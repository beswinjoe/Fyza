
import { Trash2 } from 'lucide-react';
import { useStore } from '../engine/store';
import { inr, fmtDate, monthLabel } from '../engine/format';
import { goalStats, loanStats, cardStats, tripTotal, tripSpent, TRIP_PARTS } from '../engine/finance';
import { Modal, Ring, Bar, Button, Stat, Card } from './ui';
import { AppState } from '../types/app';

export function ItemView({ type, id, onClose }: { type: string; id: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const remove = (col: keyof AppState) => { dispatch({ type: 'remove', col, id }); onClose(); };

  if (type === 'goal') {
    const g = state.goals.find((x) => x.id === id);
    if (!g) return null;
    const s = goalStats(g);
    return (
      <Modal title={g.name} onClose={onClose} foot={<Button variant="danger" size="sm" onClick={() => remove('goals')}><Trash2 /> Delete goal</Button>}>
        <div className="mb-6 flex items-center gap-4">
          <Ring value={s.progress} size={64} stroke={6} color={s.onTrack ? 'var(--accent)' : 'var(--warning)'} />
          <div>
            <div className="num text-[24px] font-semibold text-foreground">{inr(g.current)} <span className="text-[16px] text-foreground-subtle">/ {inr(g.target, { compact: true })}</span></div>
            <div className="text-meta text-foreground-subtle">{s.onTrack ? 'On track' : 'Behind schedule'} · {Math.round(s.progress * 100)}%</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3"><Stat label="Monthly target" value={inr(g.monthly)} /></Card>
          <Card className="p-3"><Stat label="Estimated completion" value={s.eta ? monthLabel(s.eta, true) : 'Unknown'} /></Card>
        </div>
        {!s.onTrack && s.required && <div className="mt-4 rounded-lg bg-surface-muted p-3 text-[13px] text-foreground-subtle"><p>You need to save <b className="text-foreground">{inr(s.required)}/mo</b> to hit your target by {fmtDate(g.targetDate)}.</p></div>}
      </Modal>
    );
  }

  if (type === 'trip') {
    const t = state.trips.find((x) => x.id === id);
    if (!t) return null;
    const total = tripTotal(t), spent = tripSpent(state, t);
    return (
      <Modal title={t.destination} onClose={onClose} foot={<Button variant="danger" size="sm" onClick={() => remove('trips')}><Trash2 /> Delete trip</Button>}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <Stat label="Total Budget" value={inr(total)} size="lg" />
          <Stat label="Spent" value={inr(spent)} size="lg" tone={spent > total ? 'negative' : 'positive'} className="text-right" />
        </div>
        <Bar value={total ? spent / total : 0} tone={spent > total ? 'negative' : 'accent'} />
        <div className="mt-6 grid grid-cols-2 gap-3">
          {TRIP_PARTS.map((p) => (
            <div key={p} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
              <span className="text-[13px] capitalize text-foreground-subtle">{p}</span><span className="num font-medium">{inr(t.budget[p] || 0)}</span>
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
      <Modal title={l.name} onClose={onClose} foot={<Button variant="danger" size="sm" onClick={() => remove('loans')}><Trash2 /> Delete loan</Button>}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <Stat label="Remaining Balance" value={inr(s.balance)} size="lg" />
          <Stat label="Monthly EMI" value={inr(s.emi)} size="lg" className="text-right" />
        </div>
        <Bar value={s.progress} tone="accent" className="mb-6" />
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3"><Stat label="Interest paid" value={inr(s.interestPaid)} /></Card>
          <Card className="p-3"><Stat label="Interest remaining" value={inr(s.interestRemaining)} /></Card>
          <Card className="p-3"><Stat label="Months left" value={`${s.remainingMonths} / ${l.tenureMonths}`} /></Card>
          <Card className="p-3"><Stat label="Next due" value={fmtDate(s.nextDue)} /></Card>
        </div>
      </Modal>
    );
  }
  
  if (type === 'card') {
    const c = state.cards.find((x) => x.id === id);
    if (!c) return null;
    const s = cardStats(state, c);
    return (
      <Modal title={c.name} onClose={onClose} foot={<Button variant="danger" size="sm" onClick={() => remove('cards')}><Trash2 /> Delete card</Button>}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <Stat label="Spent this cycle" value={inr(s.spent)} size="lg" />
          {c.kind === 'credit' && <Stat label="Available limit" value={inr(s.availableLimit)} size="lg" className="text-right" />}
        </div>
        {c.kind === 'credit' && <Bar value={s.utilization} tone={s.utilization > 0.8 ? 'warning' : 'accent'} className="mb-6" />}
        <div className="grid grid-cols-2 gap-3">
          {c.kind === 'credit' && <Card className="p-3"><Stat label="Credit limit" value={inr(s.limit)} /></Card>}
          {c.kind === 'credit' && <Card className="p-3"><Stat label="Payment due" value={fmtDate(s.dueDate)} /></Card>}
        </div>
      </Modal>
    );
  }

  return null;
}
