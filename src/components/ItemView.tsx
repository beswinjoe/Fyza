
import { useState } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { useStore } from '../engine/store';
import { money, fmtDate, monthLabel, today, parseDate, daysBetween } from '../engine/format';
import { goalStats, loanStats, cardStats, tripTotal, tripSpent, accountBalance, TRIP_PARTS } from '../engine/finance';
import { Modal, Ring, Bar, Button, Stat, Card, Input, Field, Select, cn } from './ui';
import { AppState } from '../types/app';

function ConfirmDelete({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] text-negative font-medium">Delete {label}?</span>
      <Button variant="danger" size="sm" onClick={onConfirm}><Check className="size-3.5" />Yes</Button>
      <Button variant="ghost" size="sm" onClick={onCancel}><X className="size-3.5" />No</Button>
    </div>
  );
}

export function ItemView({ type, id, onClose }: { type: string; id: string; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [addingExpense, setAddingExpense] = useState(false);
  const [expData, setExpData] = useState({ amount: '', date: today().toISOString().slice(0, 10), category: 'Food', note: '' });
  
  const cats = state.categories.map((c) => ({ value: c, label: c }));
  
  const remove = (col: keyof AppState) => { dispatch({ type: 'remove', col, id }); onClose(); };
  
  const deleteButton = (col: keyof AppState, label: string) => (
    confirmDelete 
      ? <ConfirmDelete label={label} onConfirm={() => remove(col)} onCancel={() => setConfirmDelete(false)} />
      : <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}><Trash2 />Delete {label}</Button>
  );

  if (type === 'goal') {
    const g = state.goals.find((x) => x.id === id);
    if (!g) return null;
    const s = goalStats(g);
    
    const saveEdit = () => {
      const patch: Record<string, unknown> = {};
      if (editData.current !== undefined) patch.current = Math.max(0, Math.min(+editData.current || 0, g.target));
      if (editData.monthly !== undefined) patch.monthly = Math.max(0, +editData.monthly || 0);
      if (editData.name !== undefined && editData.name.trim()) patch.name = editData.name.trim();
      dispatch({ type: 'update', col: 'goals', id, patch });
      setEditing(false);
      setEditData({});
    };
    
    return (
      <Modal title={editing ? 'Edit goal' : g.name} onClose={onClose} foot={
        <div className="flex w-full items-center justify-between">
          {deleteButton('goals', 'goal')}
          {editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditData({}); }}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={saveEdit}>Save</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setEditData({ name: g.name, current: g.current, monthly: g.monthly }); }}><Pencil className="size-3.5" />Edit</Button>
          )}
        </div>
      }>
        {editing ? (
          <div className="flex flex-col gap-4">
            <Field label="Goal Name">
              <Input value={editData.name ?? g.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Amount">
                <Input type="number" value={editData.current ?? g.current} onChange={(e) => setEditData({ ...editData, current: e.target.value })} />
              </Field>
              <Field label="Monthly Contribution">
                <Input type="number" value={editData.monthly ?? g.monthly} onChange={(e) => setEditData({ ...editData, monthly: e.target.value })} />
              </Field>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-4">
              <Ring value={s.progress} size={64} stroke={6} color={s.onTrack ? 'var(--accent)' : 'var(--warning)'} />
              <div>
                <div className="num text-[24px] font-semibold text-foreground">{money(g.current)} <span className="text-[16px] text-foreground-subtle">/ {money(g.target, { compact: true })}</span></div>
                <div className="text-meta text-foreground-subtle">{s.onTrack ? 'On track' : 'Behind schedule'} · {Math.round(s.progress * 100)}%</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3"><Stat label="Monthly target" value={money(g.monthly)} /></Card>
              <Card className="p-3"><Stat label="Estimated completion" value={s.eta ? monthLabel(s.eta, true) : 'Unknown'} /></Card>
              <Card className="p-3"><Stat label="Remaining" value={money(s.left)} /></Card>
              <Card className="p-3"><Stat label="Months needed" value={isFinite(s.monthsNeeded) ? `${s.monthsNeeded}` : '—'} /></Card>
            </div>
            {!s.onTrack && s.required && <div className="mt-4 rounded-lg bg-surface-muted p-3 text-[13px] text-foreground-subtle"><p>You need to save <b className="text-foreground">{money(s.required)}/mo</b> to hit your target by {fmtDate(g.targetDate)}.</p></div>}
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => dispatch({ type: 'update', col: 'goals', id: g.id, patch: { current: Math.min(g.target, g.current + (+g.monthly || 1000)) } })}>+ {money(g.monthly || 1000, { compact: true })}</Button>
            </div>
          </>
        )}
      </Modal>
    );
  }

  if (type === 'trip') {
    const t = state.trips.find((x) => x.id === id);
    if (!t) return null;
    const total = tripTotal(t), spent = tripSpent(state, t);
    const tripTxns = state.transactions.filter((tx) => tx.tripId === t.id && tx.type === 'expense');
    const dStart = daysBetween(today(), parseDate(t.start));
    const dEnd = daysBetween(today(), parseDate(t.end));
    const status = dStart > 0 ? `Starts in ${dStart} days` : dEnd >= 0 ? `${dEnd + 1} days remaining` : 'Completed';
    
    const saveEdit = () => {
      const patch: Record<string, unknown> = {};
      if (editData.destination?.trim()) patch.destination = editData.destination.trim();
      if (editData.note !== undefined) patch.note = editData.note;
      if (editData.start) patch.start = editData.start;
      if (editData.end) patch.end = editData.end;
      const budget: Record<string, number> = {};
      let hasBudget = false;
      for (const p of TRIP_PARTS) {
        const v = editData[`b_${p}`];
        if (v !== undefined) { budget[p] = Math.max(0, +v || 0); hasBudget = true; }
        else { budget[p] = t.budget[p] || 0; }
      }
      if (hasBudget) patch.budget = budget;
      dispatch({ type: 'update', col: 'trips', id, patch });
      setEditing(false);
      setEditData({});
    };
    
    return (
      <Modal title={editing ? 'Edit trip' : t.destination} onClose={onClose} foot={
        <div className="flex w-full items-center justify-between">
          {deleteButton('trips', 'trip')}
          {editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditData({}); }}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={saveEdit}>Save</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setEditData({ destination: t.destination, start: t.start, end: t.end, note: t.note || '', ...Object.fromEntries(TRIP_PARTS.map(p => [`b_${p}`, t.budget[p] || 0])) }); }}><Pencil className="size-3.5" />Edit</Button>
          )}
        </div>
      }>
        {editing ? (
          <div className="flex flex-col gap-4">
            <Field label="Destination">
              <Input value={editData.destination ?? t.destination} onChange={(e) => setEditData({ ...editData, destination: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start date">
                <Input type="date" value={editData.start ?? t.start} onChange={(e) => setEditData({ ...editData, start: e.target.value })} />
              </Field>
              <Field label="End date">
                <Input type="date" value={editData.end ?? t.end} onChange={(e) => setEditData({ ...editData, end: e.target.value })} />
              </Field>
            </div>
            <div className="text-[13px] font-medium text-foreground-muted mb-1">Budget by category</div>
            <div className="flex flex-col divide-y divide-border border-y border-border">
              {TRIP_PARTS.map((p) => (
                <div key={p} className="flex items-center justify-between py-2.5">
                  <label className="text-[14px] font-medium text-foreground capitalize">{p}</label>
                  <Input type="number" className="w-[120px] text-right" placeholder="0" value={editData[`b_${p}`] ?? t.budget[p] ?? 0} onChange={(e) => setEditData({ ...editData, [`b_${p}`]: e.target.value })} />
                </div>
              ))}
            </div>
            <Field label="Note (optional)">
              <Input value={editData.note ?? t.note ?? ''} onChange={(e) => setEditData({ ...editData, note: e.target.value })} />
            </Field>
          </div>
        ) : (
          <>
            <div className="mb-2 text-[13px] text-foreground-subtle">{fmtDate(t.start)} – {fmtDate(t.end, true)} · {status}</div>
            <div className="mb-6 flex items-end justify-between gap-4">
              <Stat label="Total Budget" value={money(total)} size="lg" />
              <Stat label="Spent" value={money(spent)} size="lg" tone={spent > total ? 'negative' : 'positive'} className="text-right" />
            </div>
            <Bar value={total ? spent / total : 0} tone={spent > total ? 'negative' : 'accent'} />
            <div className="mt-1 text-right text-meta text-foreground-subtle">{money(Math.max(0, total - spent))} remaining</div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {TRIP_PARTS.map((p) => (
                <div key={p} className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2">
                  <span className="text-[13px] capitalize text-foreground-subtle">{p}</span><span className="num font-medium">{money(t.budget[p] || 0)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="text-[12px] font-medium uppercase tracking-wider text-foreground-subtle">Trip expenses ({tripTxns.length})</div>
              <Button size="sm" variant="ghost" onClick={() => setAddingExpense(!addingExpense)}>{addingExpense ? 'Cancel' : '+ Add expense'}</Button>
            </div>
            
            {addingExpense && (
              <div className="mt-3 flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/30 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount">
                    <Input type="number" placeholder="0" autoFocus value={expData.amount || ''} onChange={(e) => setExpData({ ...expData, amount: e.target.value })} />
                  </Field>
                  <Field label="Date">
                    <Input type="date" value={expData.date || ''} onChange={(e) => setExpData({ ...expData, date: e.target.value })} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <Select value={expData.category || ''} onChange={(e) => setExpData({ ...expData, category: e.target.value })}>
                      {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Note">
                    <Input placeholder="Dinner, flight..." value={expData.note || ''} onChange={(e) => setExpData({ ...expData, note: e.target.value })} />
                  </Field>
                </div>
                <Button variant="primary" disabled={!expData.amount || !expData.date} onClick={() => {
                  dispatch({ type: 'add', col: 'transactions', item: { type: 'expense', amount: +expData.amount, date: expData.date, category: expData.category || 'Food', note: expData.note, tripId: t.id, world: t.world } });
                  setAddingExpense(false);
                  setExpData({ amount: '', date: expData.date, category: 'Food', note: '' });
                }}>Save expense</Button>
              </div>
            )}
            
            {tripTxns.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-col gap-1">
                  {tripTxns.slice(0, 15).map((tx) => (
                    <div key={tx.id} className="group flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-surface-muted">
                      <div>
                        <span className="text-foreground-muted">{tx.note || tx.category || 'Expense'}</span>
                        <span className="text-meta ml-2 text-foreground-subtle">{fmtDate(tx.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="num font-medium">{money(tx.amount)}</span>
                        <button className="opacity-0 group-hover:opacity-100 p-1 text-negative hover:bg-negative/10 rounded" onClick={(e) => { e.stopPropagation(); if (confirm('Delete this expense?')) dispatch({ type: 'remove', col: 'transactions', id: tx.id }); }}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {tripTxns.length === 0 && !addingExpense && (
              <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center">
                <div className="text-[13px] font-medium text-foreground-muted">No expenses yet</div>
                <div className="mt-1 text-[12.5px] text-foreground-subtle">Add your flights, hotels, and meals here.</div>
              </div>
            )}
          </>
        )}
      </Modal>
    );
  }

  if (type === 'loan') {
    const l = state.loans.find((x) => x.id === id);
    if (!l) return null;
    const s = loanStats(l);
    return (
      <Modal title={l.name} onClose={onClose} foot={deleteButton('loans', 'loan')}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <Stat label="Remaining Balance" value={money(s.balance)} size="lg" />
          <Stat label="Monthly EMI" value={money(s.emi)} size="lg" className="text-right" />
        </div>
        <Bar value={s.progress} tone="accent" className="mb-6" />
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3"><Stat label="Interest paid" value={money(s.interestPaid)} /></Card>
          <Card className="p-3"><Stat label="Interest remaining" value={money(s.interestRemaining)} /></Card>
          <Card className="p-3"><Stat label="Months left" value={`${s.remainingMonths} / ${l.tenureMonths}`} /></Card>
          <Card className="p-3"><Stat label="Next due" value={fmtDate(s.nextDue)} /></Card>
          <Card className="p-3"><Stat label="Total interest" value={money(s.totalInterest)} /></Card>
          <Card className="p-3"><Stat label="End date" value={fmtDate(s.endDate)} /></Card>
        </div>
      </Modal>
    );
  }
  
  if (type === 'card') {
    const c = state.cards.find((x) => x.id === id);
    if (!c) return null;
    const s = cardStats(state, c);
    return (
      <Modal title={c.name} onClose={onClose} foot={deleteButton('cards', 'card')}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <Stat label="Spent this cycle" value={money(s.spent)} size="lg" />
          {c.kind === 'credit' && <Stat label="Available limit" value={money(s.availableLimit)} size="lg" className="text-right" />}
        </div>
        {c.kind === 'credit' && <Bar value={s.utilization} tone={s.utilization > 0.8 ? 'warning' : 'accent'} className="mb-6" />}
        <div className="grid grid-cols-2 gap-3">
          {c.kind === 'credit' && <Card className="p-3"><Stat label="Credit limit" value={money(s.limit)} /></Card>}
          {c.kind === 'credit' && <Card className="p-3"><Stat label="Payment due" value={fmtDate(s.dueDate)} /></Card>}
          {c.kind === 'credit' && <Card className="p-3"><Stat label="Total balance" value={money(s.totalBalance)} /></Card>}
          {c.kind === 'credit' && <Card className="p-3"><Stat label="Statement date" value={fmtDate(s.statementDate)} /></Card>}
        </div>
      </Modal>
    );
  }
  
  if (type === 'account') {
    const a = state.accounts.find((x) => x.id === id);
    if (!a) return null;
    const bal = accountBalance(state, a);
    const txns = state.transactions.filter((tx) => tx.accountId === a.id || tx.fromAccountId === a.id || tx.toAccountId === a.id).sort((x, y) => y.date.localeCompare(x.date));
    
    return (
      <Modal title={a.name} onClose={onClose} foot={deleteButton('accounts', 'account')}>
        <div className="mb-6 flex items-end justify-between gap-4">
          <Stat label="Current balance" value={money(bal)} size="lg" tone={bal >= 0 ? 'positive' : 'negative'} />
          <Stat label="Opening balance" value={money(a.opening)} size="lg" className="text-right" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-3"><Stat label="Type" value={<span className="capitalize">{a.type}</span>} /></Card>
          {a.institution && <Card className="p-3"><Stat label="Institution" value={a.institution} /></Card>}
        </div>
        {txns.length > 0 && (
          <div>
            <div className="mb-2 text-[12px] font-medium uppercase tracking-wider text-foreground-subtle">Recent transactions ({txns.length})</div>
            <div className="flex flex-col gap-1">
              {txns.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px]">
                  <span className="text-foreground-muted truncate mr-3">{tx.note || tx.category || tx.type} · {fmtDate(tx.date)}</span>
                  <span className={cn('num font-medium shrink-0', tx.type === 'income' ? 'text-positive' : '')}>{tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}{money(tx.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    );
  }
  
  if (type === 'recurring') {
    const r = state.recurring.find((x) => x.id === id);
    if (!r) return null;
    
    const saveEdit = () => {
      const patch: Record<string, unknown> = {};
      if (editData.name?.trim()) patch.name = editData.name.trim();
      if (editData.amount !== undefined) patch.amount = Math.max(0, +editData.amount || 0);
      if (editData.day !== undefined) patch.day = Math.max(1, Math.min(31, +editData.day || 1));
      dispatch({ type: 'update', col: 'recurring', id, patch });
      setEditing(false);
      setEditData({});
    };
    
    return (
      <Modal title={editing ? 'Edit subscription' : r.name} onClose={onClose} foot={
        <div className="flex w-full items-center justify-between">
          {deleteButton('recurring', 'subscription')}
          {editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setEditData({}); }}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={saveEdit}>Save</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setEditData({ name: r.name, amount: r.amount, day: r.day }); }}><Pencil className="size-3.5" />Edit</Button>
          )}
        </div>
      }>
        {editing ? (
          <div className="flex flex-col gap-4">
            <Field label="Name">
              <Input value={editData.name ?? r.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount">
                <Input type="number" value={editData.amount ?? r.amount} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} />
              </Field>
              <Field label="Day of month">
                <Input type="number" value={editData.day ?? r.day} onChange={(e) => setEditData({ ...editData, day: e.target.value })} />
              </Field>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-4">
              <Stat label="Amount" value={money(r.amount)} size="lg" />
              <Stat label="Every month on" value={`Day ${r.day}`} size="lg" className="text-right" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3"><Stat label="Type" value={<span className="capitalize">{r.type}</span>} /></Card>
              <Card className="p-3"><Stat label="Category" value={r.category} /></Card>
              <Card className="p-3"><Stat label="Yearly cost" value={money(r.amount * 12, { compact: true })} /></Card>
            </div>
          </>
        )}
      </Modal>
    );
  }

  return null;
}
