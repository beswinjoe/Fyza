import { useMemo, useState } from 'react';
import { Search, ArrowLeftRight, Trash2 } from 'lucide-react';
import { useStore } from '../engine/store';
import { inr, fmtDate, relDay, today, mkey, addMonths, monthLabel } from '../engine/format';
import { Icon, catIcon, Seg } from '../components/ui';

export function TxRow({ t, compact, onDelete }) {
  const { state } = useStore();
  const acc = state.accounts.find((a) => a.id === (t.accountId || t.fromAccountId));
  const card = state.cards.find((c) => c.id === t.cardId);
  const trip = state.trips.find((x) => x.id === t.tripId);
  const isT = t.type === 'transfer';
  const cross = isT && t.fromWorld !== t.toWorld;
  const viewWorld = state.world;
  const sign = isT ? (cross ? (t.toWorld === viewWorld ? '+' : '−') : '') : t.type === 'income' ? '+' : '−';
  return (
    <div className="li">
      <Icon as={isT ? ArrowLeftRight : catIcon(t.category)} size="sm" tone={t.type === 'income' ? 'pos' : cross ? 'violet' : undefined} />
      <div className="meta">
        <div className="t">{t.note || t.category}</div>
        <div className="s">{compact ? relDay(t.date) : [isT ? (cross ? 'Transfer between worlds' : 'Transfer') : t.category, card?.name || acc?.name, trip && `✈ ${trip.destination}`, ...(t.tags || []).map((x) => '#' + x)].filter(Boolean).join(' · ')}</div>
      </div>
      <div className={`amt num ${t.type === 'income' || sign === '+' ? 'pos' : ''}`} style={isT && !cross ? { color: 'var(--text-3)' } : undefined}>{sign}{inr(t.amount).replace('−', '')}</div>
      {onDelete && <button className="btn ghost icon sm hide-m" onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}><Trash2 /></button>}
    </div>
  );
}

export default function ActivityPage() {
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [scope, setScope] = useState(state.world);
  const [f, setF] = useState({ account: '', category: '', card: '', trip: '', month: '' });
  const months = [0, 1, 2, 3, 4].map((i) => mkey(addMonths(today(), -i)));
  const list = useMemo(() => state.transactions.filter((t) => {
    if (scope !== 'all' && (t.world || 'personal') !== scope && !(t.type === 'transfer' && t.toWorld === scope)) return false;
    if (type !== 'all' && t.type !== type) return false;
    if (f.account && t.accountId !== f.account && t.fromAccountId !== f.account && t.toAccountId !== f.account) return false;
    if (f.category && t.category !== f.category) return false;
    if (f.card && t.cardId !== f.card) return false;
    if (f.trip && t.tripId !== f.trip) return false;
    if (f.month && !t.date.startsWith(f.month)) return false;
    if (q) { const s = `${t.note} ${t.category} ${(t.tags || []).join(' ')}`.toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date)), [state.transactions, scope, type, f, q]);

  const groups = useMemo(() => {
    const g = new Map();
    for (const t of list.slice(0, 300)) { if (!g.has(t.date)) g.set(t.date, []); g.get(t.date).push(t); }
    return [...g.entries()];
  }, [list]);
  const totIn = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totOut = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const sel = (k, opts, label) => (
    <select className="select" style={{ width: 'auto', height: 32, fontSize: 13, borderRadius: 9 }} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
      <option value="">{label}</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
  const hasBiz = state.accounts.some((a) => a.world === 'business');

  return (
    <div className="page">
      <div className="page-head">
        <div><div className="eyebrow">Past</div><h1 className="page-title">Activity</h1></div>
        <div className="row" style={{ gap: 24 }}>
          <div><div className="eyebrow">In</div><div className="num pos" style={{ fontSize: 18, fontWeight: 600 }}>{inr(totIn, { compact: true })}</div></div>
          <div><div className="eyebrow">Out</div><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{inr(totOut, { compact: true })}</div></div>
        </div>
      </div>
      <div className="card card-pad">
        <div className="row wrap" style={{ gap: 8, marginBottom: 6 }}>
          <div className="command" style={{ maxWidth: 280, height: 34, flex: '1 1 200px' }}><Search /><input style={{ background: 'none', border: 'none', outline: 'none', flex: 1 }} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Seg value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Out' }, { value: 'income', label: 'In' }, { value: 'transfer', label: 'Transfers' }]} />
          {hasBiz && <Seg value={scope} onChange={setScope} options={[{ value: 'personal', label: 'Personal' }, { value: 'business', label: 'Business' }, { value: 'all', label: 'Both' }]} />}
        </div>
        <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
          {sel('month', months.map((m) => ({ value: m, label: monthLabel(m, true) })), 'Any month')}
          {sel('account', state.accounts.map((a) => ({ value: a.id, label: a.name })), 'All accounts')}
          {sel('category', state.categories.map((c) => ({ value: c, label: c })), 'All categories')}
          {state.cards.length > 0 && sel('card', state.cards.map((c) => ({ value: c.id, label: c.name })), 'Any card')}
          {state.trips.length > 0 && sel('trip', state.trips.map((t) => ({ value: t.id, label: t.destination })), 'Any trip')}
          {Object.values(f).some(Boolean) && <button className="btn ghost sm" onClick={() => setF({ account: '', category: '', card: '', trip: '', month: '' })}>Clear</button>}
        </div>
        {groups.length === 0 && <div className="empty"><b>No matching activity</b>Try removing a filter.</div>}
        {groups.map(([d, items]) => {
          const net = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
          return (
            <div key={d}>
              <div className="day-head"><span>{relDay(d) === fmtDate(d) ? fmtDate(d, true) : `${relDay(d)} · ${fmtDate(d)}`}</span><span className="num">{inr(net, { sign: true })}</span></div>
              <div className="list">{items.map((t) => <TxRow key={t.id} t={t} onDelete={(id) => dispatch({ type: 'remove', col: 'transactions', id })} />)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
