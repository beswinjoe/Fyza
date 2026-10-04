import { useMemo, useState } from 'react';
import { Landmark, CreditCard, HandCoins, ArrowDownLeft, ArrowUpRight, Repeat, Target, Plane, ArrowLeftRight, TrendingUp, Building2, Home, Car, Shapes, ChevronLeft } from 'lucide-react';
import { useStore } from '../engine/store';
import { ymd, today, inr, addDays } from '../engine/format';
import { emi, TRIP_PARTS, tripDays } from '../engine/finance';
import { estimateTrip } from '../engine/ai';
import { Modal, Icon } from './ui';
import { AppState } from '../types/app';


export const TYPES = [
  { k: 'expense', label: 'Expense', icon: ArrowUpRight, d: 'Something you paid for' },
  { k: 'income', label: 'Income', icon: ArrowDownLeft, d: 'Salary, pocket money, sales' },
  { k: 'recurring', label: 'Recurring', icon: Repeat, d: 'Rent, bills, subscriptions' },
  { k: 'account', label: 'Account', icon: Landmark, d: 'Bank, cash, wallet' },
  { k: 'card', label: 'Card', icon: CreditCard, d: 'Credit or debit card' },
  { k: 'loan', label: 'Loan', icon: HandCoins, d: 'EMIs calculated for you' },
  { k: 'goal', label: 'Goal', icon: Target, d: 'Save towards something' },
  { k: 'trip', label: 'Trip', icon: Plane, d: 'Plan travel spending' },
  { k: 'transfer', label: 'Transfer', icon: ArrowLeftRight, d: 'Between accounts or worlds' },
  { k: 'investment', label: 'Investment', icon: TrendingUp, d: 'Coming soon', soon: true },
  { k: 'property', label: 'Property', icon: Home, d: 'Coming soon', soon: true },
  { k: 'vehicle', label: 'Vehicle', icon: Car, d: 'Coming soon', soon: true },
  { k: 'business', label: 'Business', icon: Building2, d: 'Coming soon', soon: true },
  { k: 'custom', label: 'Custom', icon: Shapes, d: 'Coming soon', soon: true },
];

type FieldDef = {
  k: string;
  label?: string;
  type: string;
  full?: boolean;
  ph?: string;
  options?: { value: string; label: string }[];
  def?: any;
  creatable?: boolean;
  when?: (v: any) => boolean;
};

function schema(type: string, state: AppState): FieldDef[] {
  const accs = state.accounts.map((a) => ({ value: a.id, label: `${a.name}${a.world === 'business' ? ' · Business' : ''}` }));
  const cards = [{ value: '', label: 'None' }, ...state.cards.map((c) => ({ value: c.id, label: c.name }))];
  const cats = state.categories.map((c) => ({ value: c, label: c }));
  const t = ymd(today());
  switch (type) {
    case 'expense': return [
      { k: 'amount', label: 'Amount', type: 'money', full: true },
      { k: 'note', label: 'What for', type: 'text', ph: 'Dinner at Toit' },
      { k: 'category', label: 'Category', type: 'select', options: cats, def: 'Food', creatable: true },
      { k: 'date', label: 'Date', type: 'date', def: t },
      { k: 'accountId', label: 'Account', type: 'select', options: accs },
      { k: 'cardId', label: 'Card', type: 'select', options: cards, def: '' },
      { k: 'tripId', label: 'Trip', type: 'select', options: [{ value: '', label: 'None' }, ...state.trips.map((x) => ({ value: x.id, label: x.destination }))], def: '' },
      { k: 'tags', label: 'Tags', type: 'text', ph: 'comma, separated', full: true },
    ];
    case 'income': return [
      { k: 'amount', label: 'Amount', type: 'money', full: true },
      { k: 'note', label: 'Source', type: 'text', ph: 'Freelance — logo project' },
      { k: 'category', label: 'Type', type: 'select', options: ['Salary', 'Pocket money', 'Freelance', 'Revenue', 'Other income'].map((c) => ({ value: c, label: c })), def: 'Salary' },
      { k: 'date', label: 'Date', type: 'date', def: t },
      { k: 'accountId', label: 'Into account', type: 'select', options: accs },
    ];
    case 'recurring': return [
      { k: 'amount', label: 'Amount per month', type: 'money', full: true },
      { k: 'name', label: 'Name', type: 'text', ph: 'Rent, Netflix, Salary…' },
      { k: 'type', label: 'Direction', type: 'select', options: [{ value: 'expense', label: 'Money out' }, { value: 'income', label: 'Money in' }], def: 'expense' },
      { k: 'category', label: 'Category', type: 'select', options: [...cats, { value: 'Salary', label: 'Salary' }, { value: 'Pocket money', label: 'Pocket money' }], def: 'Bills' },
      { k: 'day', label: 'Day of month', type: 'number', def: 1 },
      { k: 'accountId', label: 'Account', type: 'select', options: accs },
    ];
    case 'account': return [
      { k: 'name', label: 'Name', type: 'text', ph: 'HDFC Savings', full: true },
      { k: 'type', label: 'Type', type: 'select', options: [['bank', 'Bank account'], ['savings', 'Savings account'], ['cash', 'Cash'], ['wallet', 'Wallet'], ['other', 'Other']].map(([value, label]) => ({ value, label })), def: 'bank' },
      { k: 'institution', label: 'Institution', type: 'text', ph: 'HDFC Bank' },
      { k: 'opening', label: 'Current balance', type: 'money' },
      { k: 'currency', label: 'Currency', type: 'select', options: ['INR', 'USD', 'EUR'].map((c) => ({ value: c, label: c })), def: 'INR' },
      { k: 'notes', label: 'Notes', type: 'textarea', full: true },
    ];
    case 'card': return [
      { k: 'name', label: 'Card name', type: 'text', ph: 'HDFC Regalia', full: true },
      { k: 'kind', label: 'Type', type: 'select', options: [{ value: 'credit', label: 'Credit card' }, { value: 'debit', label: 'Debit card' }], def: 'credit' },
      { k: 'last4', label: 'Last 4 digits', type: 'text', ph: '4821' },
      { k: 'limit', label: 'Credit limit', type: 'money', when: (v) => v.kind === 'credit' },
      { k: 'statementDay', label: 'Statement day', type: 'number', def: 15, when: (v) => v.kind === 'credit' },
      { k: 'dueDay', label: 'Payment due day', type: 'number', def: 3, when: (v) => v.kind === 'credit' },
      { k: 'accountId', label: 'Linked account', type: 'select', options: accs },
    ];
    case 'loan': return [
      { k: 'name', label: 'Name', type: 'text', ph: 'Home loan', full: true },
      { k: 'type', label: 'Loan type', type: 'select', options: ['personal', 'home', 'vehicle', 'education', 'business', 'custom'].map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })), def: 'personal' },
      { k: 'lender', label: 'Lender', type: 'text', ph: 'SBI' },
      { k: 'principal', label: 'Principal', type: 'money' },
      { k: 'rate', label: 'Interest rate (% p.a.)', type: 'number', def: 9 },
      { k: 'tenureMonths', label: 'Tenure (months)', type: 'number', def: 36 },
      { k: 'startDate', label: 'Start date', type: 'date', def: t },
      { k: '_preview', type: 'loanPreview' },
    ];
    case 'goal': return [
      { k: 'name', label: 'Goal', type: 'text', ph: 'Emergency fund', full: true },
      { k: 'kind', label: 'Type', type: 'select', options: ['emergency', 'laptop', 'phone', 'car', 'trip', 'education', 'house', 'business', 'custom'].map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) })), def: 'custom' },
      { k: 'target', label: 'Target amount', type: 'money' },
      { k: 'current', label: 'Already saved', type: 'money', def: 0 },
      { k: 'targetDate', label: 'Target date', type: 'date', def: ymd(new Date(today().getFullYear() + 1, today().getMonth(), 1)) },
      { k: 'monthly', label: 'Monthly contribution', type: 'money', ph: 'Auto' },
      { k: '_preview', type: 'goalPreview' },
    ];
    case 'trip': return [
      { k: 'destination', label: 'Destination', type: 'text', ph: 'Goa', full: true },
      { k: 'start', label: 'From', type: 'date', def: ymd(addDays(today(), 30)) },
      { k: 'end', label: 'To', type: 'date', def: ymd(addDays(today(), 34)) },
      ...TRIP_PARTS.map((p) => ({ k: `b_${p}`, label: p[0].toUpperCase() + p.slice(1), type: 'money' })),
      { k: '_preview', type: 'tripPreview' },
    ];
    case 'transfer': return [
      { k: 'amount', label: 'Amount', type: 'money', full: true },
      { k: 'fromAccountId', label: 'From', type: 'select', options: accs },
      { k: 'toAccountId', label: 'To', type: 'select', options: accs },
      { k: 'date', label: 'Date', type: 'date', def: t },
      { k: 'note', label: 'Note', type: 'text', ph: 'Owner draw' },
    ];
    default: return [];
  }
}

function toOps(type: string, v: Record<string, any>, state: AppState) {
  const n = (x: any) => +x || 0;
  const world = state.world;
  const accWorld = (id: string) => state.accounts.find((a) => a.id === id)?.world || 'personal';
  switch (type) {
    case 'expense': case 'income':
      return [{ col: 'transactions', item: { type, amount: n(v.amount), note: v.note || v.category, category: v.category, date: v.date, accountId: v.accountId, cardId: v.cardId || undefined, tripId: v.tripId || undefined, tags: (v.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean), world: accWorld(v.accountId) } }];
    case 'recurring': return [{ col: 'recurring', item: { name: v.name || v.category, type: v.type, amount: n(v.amount), day: n(v.day) || 1, category: v.category, accountId: v.accountId, world: accWorld(v.accountId) } }];
    case 'account': return [{ col: 'accounts', item: { name: v.name || 'Account', type: v.type, institution: v.institution, opening: n(v.opening), currency: v.currency, notes: v.notes, world } }];
    case 'card': return [{ col: 'cards', item: { name: v.name || 'Card', kind: v.kind, last4: v.last4, limit: n(v.limit), statementDay: n(v.statementDay), dueDay: n(v.dueDay), accountId: v.accountId } }];
    case 'loan': return [{ col: 'loans', item: { name: v.name || 'Loan', type: v.type, lender: v.lender, principal: n(v.principal), rate: n(v.rate), tenureMonths: n(v.tenureMonths), startDate: v.startDate, world } }];
    case 'goal': {
      const months = Math.max(1, Math.round((new Date(v.targetDate).getTime() - today().getTime()) / (30.4 * 86400000)));
      return [{ col: 'goals', item: { name: v.name || 'Goal', kind: v.kind, target: n(v.target), current: n(v.current), targetDate: v.targetDate, monthly: n(v.monthly) || Math.ceil((n(v.target) - n(v.current)) / months / 100) * 100, world } }];
    }
    case 'trip': return [{ col: 'trips', item: { destination: v.destination || 'Trip', start: v.start, end: v.end, budget: Object.fromEntries(TRIP_PARTS.map((p) => [p, n(v[`b_${p}`])])), world } }];
    case 'transfer': return [{ col: 'transactions', item: { type: 'transfer', amount: n(v.amount), fromAccountId: v.fromAccountId, toAccountId: v.toAccountId, fromWorld: accWorld(v.fromAccountId), toWorld: accWorld(v.toAccountId), date: v.date, note: v.note || 'Transfer', world: accWorld(v.fromAccountId), tags: [] } }];
    default: return [];
  }
}

export function AddFlow({ initial, onClose, onDone }: { initial: string | null; onClose: () => void; onDone?: (msg: string) => void }) {
  const { state, dispatch } = useStore();
  const [type, setType] = useState<string | null>(initial || null);
  const meta = TYPES.find((t) => t.k === type);
  const fields = useMemo(() => (type ? schema(type, state) : []), [type, state]);
  const [v, setV] = useState<Record<string, any>>({});
  const val = (f: FieldDef) => v[f.k] ?? f.def ?? (f.type === 'select' ? f.options?.[0]?.value : '');
  const values = Object.fromEntries(fields.map((f) => [f.k, val(f)]));
  const set = (k: string, x: any) => setV((p) => ({ ...p, [k]: x }));

  const pick = (k: string) => { setType(k); setV({}); };
  const autoTrip = () => {
    const days = tripDays({ start: values.start, end: values.end } as any);
    const est = estimateTrip(values.destination || '', days);
    setV((p) => ({ ...p, ...Object.fromEntries(TRIP_PARTS.map((x) => [`b_${x}`, est[x]])) }));
  };
  const valid = type && (values.amount > 0 || values.principal > 0 || values.target > 0 || values.name || values.destination);
  const submit = () => {
    const ops = toOps(type!, values, state);
    dispatch({ type: 'batch', ops: ops.map((o) => ({ type: 'add', ...(o as any) })) });
    onDone?.(`${meta?.label} added`);
    onClose();
  };

  if (!type) {
    return (
      <Modal title="Add to your workspace" onClose={onClose} wide>
        <div className="type-grid stagger">
          {TYPES.map((t) => (
            <button key={t.k} className={`type-btn ${t.soon ? 'soon' : ''}`} disabled={t.soon} onClick={() => pick(t.k)}>
              <Icon as={t.icon} size="sm" />
              <div><b>{t.label}</b><small style={{ display: 'block' }}>{t.d}</small></div>
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={<><button className="btn ghost icon sm" onClick={() => setType(null)} style={{ marginLeft: -8 }}><ChevronLeft /></button>New {meta?.label.toLowerCase()}</>} onClose={onClose}
      foot={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={!valid} onClick={submit}>Add {meta?.label.toLowerCase()}</button></>}>
      <div className="form">
        {fields.filter((f) => !f.when || f.when(values)).map((f) => {
          if (f.type === 'loanPreview') {
            const e = emi(+values.principal || 0, +values.rate || 0, +values.tenureMonths || 0);
            return <div className="preview" key={f.k}>
              <div><div className="eyebrow">EMI</div><div className="v num">{inr(e)}</div></div>
              <div><div className="eyebrow">Interest</div><div className="v num neg">{inr(e * values.tenureMonths - values.principal, { compact: true })}</div></div>
              <div><div className="eyebrow">Total</div><div className="v num">{inr(e * values.tenureMonths, { compact: true })}</div></div>
            </div>;
          }
          if (f.type === 'goalPreview') {
            const months = Math.max(1, Math.round((new Date(values.targetDate).getTime() - today().getTime()) / (30.4 * 86400000)));
            const need = Math.max(0, (values.target || 0) - (values.current || 0));
            return <div className="preview" key={f.k}>
              <div><div className="eyebrow">Remaining</div><div className="v num">{inr(need, { compact: true })}</div></div>
              <div><div className="eyebrow">Months</div><div className="v num">{months}</div></div>
              <div><div className="eyebrow">Needed / mo</div><div className="v num">{inr(need / months)}</div></div>
            </div>;
          }
          if (f.type === 'tripPreview') {
            const total = TRIP_PARTS.reduce((s, p) => s + (+values[`b_${p}`] || 0), 0);
            return <div className="preview" key={f.k} style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
              <div><div className="eyebrow">Trip budget · {tripDays({ start: values.start, end: values.end } as any)} days</div><div className="v num">{inr(total)}</div></div>
              <button className="btn sm" onClick={autoTrip}>✦ Estimate for me</button>
            </div>;
          }
          return (
            <div key={f.k} className={`field ${f.full ? 'full' : ''}`}>
              <label>{f.label}</label>
              {f.type === 'select' ? (
                <select className="select" value={val(f)} onChange={(e) => set(f.k, e.target.value)}>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea className="textarea" value={val(f)} onChange={(e) => set(f.k, e.target.value)} />
              ) : (
                <input autoFocus={f.full && f.type === 'money'} className={`input ${f.type === 'money' && f.full ? 'big' : ''}`} type={f.type === 'money' || f.type === 'number' ? 'number' : f.type}
                  placeholder={f.ph || (f.type === 'money' ? '₹0' : '')} value={val(f)} onChange={(e) => set(f.k, f.type === 'money' || f.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value)} />
              )}
            </div>
          );
        })}
        {type === 'expense' && (
          <div className="field full"><label>New category</label>
            <div className="row"><input className="input" placeholder="e.g. Pets" value={v._newcat || ''} onChange={(e) => set('_newcat', e.target.value)} />
              <button className="btn" onClick={() => { if (v._newcat) { dispatch({ type: 'set', patch: { categories: [...state.categories, v._newcat] } }); set('category', v._newcat); set('_newcat', ''); } }}>Add</button></div>
          </div>
        )}
      </div>
    </Modal>
  );
}
