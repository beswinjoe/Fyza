import { useState } from 'react';
import { Landmark, CreditCard, HandCoins, ArrowDownLeft, ArrowUpRight, Repeat, Target, Plane, ArrowLeftRight, TrendingUp, Building2, Home, Car, Shapes, ChevronLeft, Sparkles } from 'lucide-react';
import { useStore } from '../engine/store';
import { ymd, today, inr, addDays } from '../engine/format';
import { emi, TRIP_PARTS, tripDays } from '../engine/finance';
import { estimateTrip } from '../engine/ai';
import { Modal, Icon, Button, Input, Select, Field, cn, Kbd, AIMark } from './ui';
import { useAI, AICard } from './AI';
import { AIResult } from '../types/ai';
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

const n = (x: any) => {
  if (typeof x === 'string') return +x.replace(/[^0-9.-]+/g, '') || 0;
  return +x || 0;
};

function toOps(type: string, v: Record<string, any>, state: AppState) {
  const world = state.world;
  const accWorld = (id: string) => state.accounts.find((a) => a.id === id)?.world || 'personal';
  
  switch (type) {
    case 'expense': case 'income':
      return [{ col: 'transactions', item: { type, amount: n(v.amount), note: v.note || v.category, category: v.category, date: v.date, accountId: v.accountId || undefined, cardId: v.cardId || undefined, tripId: v.tripId || undefined, tags: (v.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean), world: v.accountId ? accWorld(v.accountId) : world } }];
    case 'recurring': return [{ col: 'recurring', item: { name: v.name || v.category, type: v.type, amount: n(v.amount), day: n(v.day) || 1, category: v.category, accountId: v.accountId || undefined, world: v.accountId ? accWorld(v.accountId) : world } }];
    case 'account': return [{ col: 'accounts', item: { name: v.name || 'Account', type: v.type, institution: v.institution, opening: n(v.opening), currency: v.currency, notes: v.notes, world } }];
    case 'card': return [{ col: 'cards', item: { name: v.name || 'Card', kind: v.kind, last4: v.last4, limit: n(v.limit), statementDay: n(v.statementDay), dueDay: n(v.dueDay), accountId: v.accountId || undefined } }];
    case 'loan': return [{ col: 'loans', item: { name: v.name || 'Loan', type: v.type, lender: v.lender, principal: n(v.principal), rate: n(v.rate), tenureMonths: n(v.tenureMonths), startDate: v.startDate, world } }];
    case 'goal': {
      const months = Math.max(1, Math.round((new Date(v.targetDate).getTime() - today().getTime()) / (30.4 * 86400000)));
      return [{ col: 'goals', item: { name: v.name || 'Goal', kind: v.kind, target: n(v.target), current: n(v.current), targetDate: v.targetDate, monthly: n(v.monthly) || Math.ceil((n(v.target) - n(v.current)) / months / 100) * 100, world } }];
    }
    case 'trip': return [{ col: 'trips', item: { destination: v.destination || 'Trip', start: v.start, end: v.end, budget: Object.fromEntries(TRIP_PARTS.map((p) => [p, n(v[`b_${p}`])])), world } }];
    case 'transfer': return [{ col: 'transactions', item: { type: 'transfer', amount: n(v.amount), fromAccountId: v.fromAccountId || undefined, toAccountId: v.toAccountId || undefined, fromWorld: v.fromAccountId ? accWorld(v.fromAccountId) : world, toWorld: v.toAccountId ? accWorld(v.toAccountId) : world, date: v.date, note: v.note || 'Transfer', world: v.fromAccountId ? accWorld(v.fromAccountId) : world, tags: [] } }];
    default: return [];
  }
}

export function AddFlow({ initial, onClose, onDone }: { initial: string | null; onClose: () => void; onDone?: (msg: string) => void }) {
  const { state, dispatch } = useStore();
  const [type, setType] = useState<string | null>(initial || null);
  const meta = TYPES.find((t) => t.k === type);
  const ask = useAI();
  const [nl, setNl] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AIResult | null>(null);
  
  const [v, setV] = useState<Record<string, any>>({ date: ymd(today()), start: ymd(addDays(today(), 30)), end: ymd(addDays(today(), 34)), targetDate: ymd(new Date(today().getFullYear() + 1, today().getMonth(), 1)) });
  const [showOptional, setShowOptional] = useState(false);
  
  const set = (k: string, x: any) => setV((p) => ({ ...p, [k]: x }));
  
  const accs = [{ value: '', label: 'None' }, ...state.accounts.map((a) => ({ value: a.id, label: `${a.name}${a.world === 'business' ? ' · Business' : ''}` }))];
  const cards = [{ value: '', label: 'None' }, ...state.cards.map((c) => ({ value: c.id, label: c.name }))];
  const cats = state.categories.map((c) => ({ value: c, label: c }));
  const trips = [{ value: '', label: 'None' }, ...state.trips.map((x) => ({ value: x.id, label: x.destination }))];

  const pick = (k: string) => { setType(k); setV({ date: ymd(today()), start: ymd(addDays(today(), 30)), end: ymd(addDays(today(), 34)), targetDate: ymd(new Date(today().getFullYear() + 1, today().getMonth(), 1)) }); setShowOptional(false); };
  
  const autoTrip = () => {
    const days = tripDays({ start: v.start, end: v.end } as any);
    const est = estimateTrip(v.destination || '', days);
    setV((p) => ({ ...p, ...Object.fromEntries(TRIP_PARTS.map((x) => [`b_${x}`, est[x]])) }));
  };

  const runNl = async () => {
    if (!nl.trim()) return;
    setBusy(true); setRes(null);
    try {
      const r = await ask(nl);
      setRes(r);
    } finally {
      setBusy(false); setNl('');
    }
  };

  const valid = type && (n(v.amount) > 0 || n(v.principal) > 0 || n(v.target) > 0 || v.name || v.destination);
  
  const submit = () => {
    // defaults
    const payload = { ...v };
    if (type === 'recurring' && !payload.type) payload.type = 'expense';
    if (type === 'recurring' && !payload.category) payload.category = 'Bills';
    if (type === 'expense' && !payload.category) payload.category = 'Food';
    if (type === 'income' && !payload.category) payload.category = 'Salary';

    const ops = toOps(type!, payload, state);
    dispatch({ type: 'batch', ops: ops.map((o) => ({ type: 'add', ...(o as any) })) });
    onDone?.(`${meta?.label} added`);
    onClose();
  };

  if (!type) {
    return (
      <Modal title="Add to your workspace" onClose={onClose} wide>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col rounded-xl border border-border bg-surface shadow-card focus-within:border-border-strong focus-within:ring-4 focus-within:ring-accent-soft transition-all">
            <div className="flex items-center gap-3 px-4 pt-4">
              <AIMark className="shrink-0" />
              <input
                autoFocus
                type="text"
                value={nl}
                onChange={(e) => setNl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runNl();
                }}
                placeholder="I spent 850 on dinner..."
                className="w-full bg-transparent text-[16px] text-foreground outline-none placeholder:text-foreground-subtle"
              />
              {busy ? (
                <span className="flex gap-1 shrink-0">
                  {[0, 1, 2].map((i) => <i key={i} className="size-1.5 rounded-full bg-accent" style={{ animation: `blink 1.2s ${i * 0.15}s infinite` }} />)}
                </span>
              ) : (
                <Button variant="primary" size="sm" onClick={runNl} disabled={!nl.trim()} className="shrink-0">Enter <Kbd className="bg-transparent shadow-none border-transparent text-background/80">↵</Kbd></Button>
              )}
            </div>
            <div className="p-4 pt-3">
              {res ? (
                <AICard r={res} />
              ) : (
                <p className="text-[13px] text-foreground-subtle">
                  Fyza understands natural language. Type things like &ldquo;Got 50,000 salary&rdquo; or &ldquo;Create a 5,000/mo SIP&rdquo;.
                </p>
              )}
            </div>
          </div>
          
          <div>
            <div className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-foreground-subtle">
              <div className="h-px flex-1 bg-border" /> Or add manually <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 stagger">
              {TYPES.map((t) => (
                <button key={t.k} className={cn("flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-3 text-left transition-colors", t.soon ? "opacity-50 cursor-not-allowed" : "hover:border-border-strong hover:bg-surface-muted")} disabled={t.soon} onClick={() => pick(t.k)}>
                  <div className="flex items-center gap-2">
                    <Icon as={t.icon} size="sm" />
                    <b className="text-[13px] font-medium text-foreground block">{t.label}</b>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  const renderFields = () => {
    switch (type) {
      case 'recurring':
        return (
          <div className="flex flex-col gap-6">
            <div className="text-center space-y-3 pt-4 pb-2">
              <div className="text-[15px] font-medium text-foreground-muted">I pay</div>
              <input autoFocus type="text" inputMode="decimal" className="w-full bg-transparent text-center font-display text-[48px] font-semibold text-foreground outline-none placeholder:text-border-strong" placeholder="0" value={v.amount || ''} onChange={(e) => set('amount', e.target.value)} />
              <div className="text-[15px] font-medium text-foreground-muted">every month for</div>
              <input type="text" className="w-full bg-transparent text-center text-[24px] font-medium text-foreground outline-none placeholder:text-border-strong" placeholder="Rent, Netflix, Gym" value={v.name || ''} onChange={(e) => set('name', e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Field label="Direction">
                <Select value={v.type || 'expense'} onChange={(e) => set('type', e.target.value)}>
                  <option value="expense">Money out</option>
                  <option value="income">Money in</option>
                </Select>
              </Field>
              <Field label="Category">
                <Select value={v.category || (v.type === 'income' ? 'Salary' : 'Bills')} onChange={(e) => set('category', e.target.value)}>
                  {[...cats, { value: 'Salary', label: 'Salary' }].map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="On what day of the month?">
              <Input type="number" min="1" max="31" placeholder="1" value={v.day || ''} onChange={(e) => set('day', e.target.value)} />
            </Field>

            {!showOptional ? (
              <Button variant="ghost" onClick={() => setShowOptional(true)}>+ Add optional account tracking</Button>
            ) : (
              <Field label="Account (Optional)">
                <Select value={v.accountId || ''} onChange={(e) => set('accountId', e.target.value)}>
                  {accs.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </Field>
            )}
          </div>
        );

      case 'expense':
        return (
          <div className="flex flex-col gap-5">
            <input autoFocus type="text" inputMode="decimal" className="w-full bg-transparent font-display text-[48px] font-semibold text-foreground outline-none placeholder:text-border-strong mb-2" placeholder="0" value={v.amount || ''} onChange={(e) => set('amount', e.target.value)} />
            <Field label="What was it for?">
              <Input placeholder="Dinner, cab, groceries..." value={v.note || ''} onChange={(e) => set('note', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category">
                <Select value={v.category || 'Food'} onChange={(e) => set('category', e.target.value)}>
                  {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="Date">
                <Input type="date" value={v.date || ''} onChange={(e) => set('date', e.target.value)} />
              </Field>
            </div>
            
            {!showOptional ? (
              <Button variant="ghost" onClick={() => setShowOptional(true)}>+ More options (Account, Card, Trip)</Button>
            ) : (
              <div className="grid gap-4 mt-2 p-4 rounded-xl border border-border bg-surface-muted/30">
                <Field label="Account (Optional)">
                  <Select value={v.accountId || ''} onChange={(e) => set('accountId', e.target.value)}>
                    {accs.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </Select>
                </Field>
                <Field label="Card (Optional)">
                  <Select value={v.cardId || ''} onChange={(e) => set('cardId', e.target.value)}>
                    {cards.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                </Field>
                <Field label="Trip (Optional)">
                  <Select value={v.tripId || ''} onChange={(e) => set('tripId', e.target.value)}>
                    {trips.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </Select>
                </Field>
              </div>
            )}
          </div>
        );

      case 'income':
        return (
          <div className="flex flex-col gap-5">
            <input autoFocus type="text" inputMode="decimal" className="w-full bg-transparent font-display text-[48px] font-semibold text-positive outline-none placeholder:text-border-strong mb-2" placeholder="0" value={v.amount || ''} onChange={(e) => set('amount', e.target.value)} />
            <Field label="Source">
              <Input placeholder="Salary, freelance project, bonus..." value={v.note || ''} onChange={(e) => set('note', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={v.category || 'Salary'} onChange={(e) => set('category', e.target.value)}>
                  {['Salary', 'Pocket money', 'Freelance', 'Revenue', 'Other income'].map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Date">
                <Input type="date" value={v.date || ''} onChange={(e) => set('date', e.target.value)} />
              </Field>
            </div>
            
            {!showOptional ? (
              <Button variant="ghost" onClick={() => setShowOptional(true)}>+ Add optional account tracking</Button>
            ) : (
              <Field label="Into Account (Optional)">
                <Select value={v.accountId || ''} onChange={(e) => set('accountId', e.target.value)}>
                  {accs.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </Field>
            )}
          </div>
        );

      case 'goal': {
        const months = Math.max(1, Math.round((new Date(v.targetDate).getTime() - today().getTime()) / (30.4 * 86400000)));
        const need = Math.max(0, (v.target || 0) - (v.current || 0));
        return (
          <div className="flex flex-col gap-5">
            <Field label="Goal Name">
              <Input autoFocus placeholder="Emergency fund, new laptop..." value={v.name || ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Target Amount">
                <Input type="number" placeholder="0" value={v.target || ''} onChange={(e) => set('target', e.target.value)} />
              </Field>
              <Field label="Already Saved">
                <Input type="number" placeholder="0" value={v.current || ''} onChange={(e) => set('current', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Target Date">
                <Input type="date" value={v.targetDate || ''} onChange={(e) => set('targetDate', e.target.value)} />
              </Field>
              <Field label="Type">
                <Select value={v.kind || 'custom'} onChange={(e) => set('kind', e.target.value)}>
                  {['emergency', 'laptop', 'phone', 'car', 'trip', 'education', 'house', 'business', 'custom'].map(c => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
                </Select>
              </Field>
            </div>
            
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-muted border border-border">
              <div><div className="text-[12px] text-foreground-subtle uppercase font-medium tracking-wider mb-1">Remaining</div><div className="font-semibold">{inr(need, { compact: true })}</div></div>
              <div><div className="text-[12px] text-foreground-subtle uppercase font-medium tracking-wider mb-1">Months</div><div className="font-semibold">{months}</div></div>
              <div><div className="text-[12px] text-foreground-subtle uppercase font-medium tracking-wider mb-1">Needed / mo</div><div className="font-semibold">{inr(need / months)}</div></div>
            </div>
          </div>
        );
      }
      
      case 'trip': {
        const total = TRIP_PARTS.reduce((s, p) => s + (+v[`b_${p}`] || 0), 0);
        return (
          <div className="flex flex-col gap-5">
            <Field label="Destination">
              <Input autoFocus placeholder="Goa, Paris, Tokyo..." value={v.destination || ''} onChange={(e) => set('destination', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From Date">
                <Input type="date" value={v.start || ''} onChange={(e) => set('start', e.target.value)} />
              </Field>
              <Field label="To Date">
                <Input type="date" value={v.end || ''} onChange={(e) => set('end', e.target.value)} />
              </Field>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-muted border border-border">
              <div><div className="text-[12px] text-foreground-subtle uppercase font-medium tracking-wider mb-1">Trip budget · {tripDays({ start: v.start, end: v.end } as any)} days</div><div className="text-[20px] font-semibold">{inr(total)}</div></div>
              <Button size="sm" onClick={autoTrip}><Sparkles className="size-4 mr-1.5" /> Estimate for me</Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {TRIP_PARTS.map((p) => (
                <Field key={p} label={p[0].toUpperCase() + p.slice(1)}>
                  <Input type="number" placeholder="0" value={v[`b_${p}`] || ''} onChange={(e) => set(`b_${p}`, e.target.value)} />
                </Field>
              ))}
            </div>
          </div>
        );
      }

      case 'loan': {
        const e = emi(+v.principal || 0, +v.rate || 0, +v.tenureMonths || 0);
        return (
          <div className="flex flex-col gap-5">
            <Field label="Loan Name">
              <Input autoFocus placeholder="Home loan, car loan..." value={v.name || ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Principal Amount">
                <Input type="number" placeholder="0" value={v.principal || ''} onChange={(e) => set('principal', e.target.value)} />
              </Field>
              <Field label="Interest Rate (% p.a.)">
                <Input type="number" placeholder="9" value={v.rate || ''} onChange={(e) => set('rate', e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tenure (months)">
                <Input type="number" placeholder="36" value={v.tenureMonths || ''} onChange={(e) => set('tenureMonths', e.target.value)} />
              </Field>
              <Field label="Start Date">
                <Input type="date" value={v.startDate || ''} onChange={(e) => set('startDate', e.target.value)} />
              </Field>
            </div>
            
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-muted border border-border">
              <div><div className="text-[12px] text-foreground-subtle uppercase font-medium tracking-wider mb-1">EMI</div><div className="font-semibold">{inr(e)}</div></div>
              <div><div className="text-[12px] text-foreground-subtle uppercase font-medium tracking-wider mb-1">Interest</div><div className="font-semibold text-negative">{inr(e * v.tenureMonths - v.principal, { compact: true })}</div></div>
              <div><div className="text-[12px] text-foreground-subtle uppercase font-medium tracking-wider mb-1">Total</div><div className="font-semibold">{inr(e * v.tenureMonths, { compact: true })}</div></div>
            </div>
          </div>
        );
      }

      case 'account':
        return (
          <div className="flex flex-col gap-5">
            <Field label="Account Name">
              <Input autoFocus placeholder="HDFC Savings, Cash Wallet..." value={v.name || ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={v.type || 'bank'} onChange={(e) => set('type', e.target.value)}>
                  {[['bank', 'Bank account'], ['savings', 'Savings account'], ['cash', 'Cash'], ['wallet', 'Wallet'], ['other', 'Other']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </Select>
              </Field>
              <Field label="Current Balance">
                <Input type="number" placeholder="0" value={v.opening || ''} onChange={(e) => set('opening', e.target.value)} />
              </Field>
            </div>
          </div>
        );
        
      case 'card':
        return (
          <div className="flex flex-col gap-5">
            <Field label="Card Name">
              <Input autoFocus placeholder="HDFC Regalia, ICICI Amazon..." value={v.name || ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={v.kind || 'credit'} onChange={(e) => set('kind', e.target.value)}>
                  <option value="credit">Credit card</option>
                  <option value="debit">Debit card</option>
                </Select>
              </Field>
              <Field label="Last 4 Digits (Optional)">
                <Input placeholder="4821" value={v.last4 || ''} onChange={(e) => set('last4', e.target.value)} />
              </Field>
            </div>
            {(!v.kind || v.kind === 'credit') && (
              <>
                <Field label="Credit Limit">
                  <Input type="number" placeholder="0" value={v.limit || ''} onChange={(e) => set('limit', e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Statement Day">
                    <Input type="number" placeholder="15" value={v.statementDay || ''} onChange={(e) => set('statementDay', e.target.value)} />
                  </Field>
                  <Field label="Payment Due Day">
                    <Input type="number" placeholder="3" value={v.dueDay || ''} onChange={(e) => set('dueDay', e.target.value)} />
                  </Field>
                </div>
              </>
            )}
            <Field label="Linked Account (Optional)">
              <Select value={v.accountId || ''} onChange={(e) => set('accountId', e.target.value)}>
                {accs.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </Select>
            </Field>
          </div>
        );

      case 'transfer':
        return (
          <div className="flex flex-col gap-5">
            <input autoFocus type="text" inputMode="decimal" className="w-full bg-transparent font-display text-[48px] font-semibold text-foreground outline-none placeholder:text-border-strong mb-2" placeholder="0" value={v.amount || ''} onChange={(e) => set('amount', e.target.value)} />
            <Field label="Note (Optional)">
              <Input placeholder="Owner draw, savings..." value={v.note || ''} onChange={(e) => set('note', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From Account">
                <Select value={v.fromAccountId || ''} onChange={(e) => set('fromAccountId', e.target.value)}>
                  {accs.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </Field>
              <Field label="To Account">
                <Select value={v.toAccountId || ''} onChange={(e) => set('toAccountId', e.target.value)}>
                  {accs.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Date">
              <Input type="date" value={v.date || ''} onChange={(e) => set('date', e.target.value)} />
            </Field>
          </div>
        );
        
      default:
        return <div className="text-foreground-subtle">Configuration for {type} is loading...</div>;
    }
  };

  return (
    <Modal title={<div className="flex items-center gap-2"><Button variant="ghost" size="sm" icon onClick={() => setType(null)} className="-ml-2"><ChevronLeft /></Button>New {meta?.label.toLowerCase()}</div>} onClose={onClose}
      foot={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!valid} onClick={submit}>Add {meta?.label.toLowerCase()}</Button></>}>
      {renderFields()}
    </Modal>
  );
}
