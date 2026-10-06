import { useMemo, useState } from 'react';
import { Search, ArrowLeftRight, Trash2, Plus, ReceiptText, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../engine/store';
import { money, fmtDate, relDay, today, mkey, addMonths, monthLabel } from '../engine/format';
import { Icon, catIcon, Seg, Card, PageHeader, EmptyState, Button, Drawer, Badge, Eyebrow, Select, Divider, cn } from '../components/ui';
import { Transaction } from '../types/finance';

function useTxMeta(t: Transaction) {
  const { state } = useStore();
  const acc = state.accounts.find((a) => a.id === (t.accountId || t.fromAccountId));
  const toAcc = state.accounts.find((a) => a.id === t.toAccountId);
  const card = state.cards.find((c) => c.id === t.cardId);
  const trip = state.trips.find((x) => x.id === t.tripId);
  const isT = t.type === 'transfer';
  const cross = isT && t.fromWorld !== t.toWorld;
  const sign = isT ? (cross ? (t.toWorld === state.world ? '+' : '−') : '') : t.type === 'income' ? '+' : '−';
  return { acc, toAcc, card, trip, isT, cross, sign };
}

export function TxRow({ t, compact, onOpen }: { t: Transaction; compact?: boolean; onOpen?: (t: Transaction) => void; onDelete?: (id: string) => void }) {
  const { acc, card, trip, isT, cross, sign } = useTxMeta(t);
  const title = t.note || t.category || (isT ? 'Transfer' : 'Transaction');
  const sub = compact ? relDay(t.date) : [isT ? (cross ? 'Between workspaces' : 'Transfer') : t.category, card?.name || acc?.name, trip && `✈ ${trip.destination}`, ...(t.tags || []).map((x) => '#' + x)].filter(Boolean).join(' · ');
  const Inner = (
    <>
      <Icon as={isT ? ArrowLeftRight : catIcon(t.category || '')} size="sm" tone={t.type === 'income' ? 'pos' : undefined} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-body font-medium text-foreground">{title}</div>
        <div className="mt-0.5 truncate text-meta text-foreground-subtle">{sub}</div>
      </div>
      <div className={cn('num shrink-0 text-right text-body font-medium', sign === '+' ? 'text-positive' : isT && !cross ? 'text-foreground-subtle' : 'text-foreground')}>
        {sign}{money(t.amount).replace('−', '')}
      </div>
    </>
  );
  const cls = 'group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2.5 text-left';
  return onOpen
    ? <button type="button" className={cn(cls, 'transition-colors hover:bg-surface-muted')} onClick={() => onOpen(t)}>{Inner}</button>
    : <div className={cls}>{Inner}</div>;
}

function TxDetail({ t, onClose }: { t: Transaction; onClose: () => void }) {
  const { dispatch } = useStore();
  const { acc, toAcc, card, trip, isT, cross, sign } = useTxMeta(t);
  const rows: [string, React.ReactNode][] = [
    ['Date', fmtDate(t.date, true)],
    ['Type', <span key="type" className="capitalize">{isT ? (cross ? 'Transfer between workspaces' : 'Transfer') : t.type}</span>],
    ...(t.category && !isT ? [['Category', t.category] as [string, string]] : []),
    ...(isT ? [['From', acc?.name || '—'] as [string, string], ['To', toAcc?.name || '—'] as [string, string]] : [['Account', acc?.name || '—'] as [string, string]]),
    ...(card ? [['Card', card.name] as [string, string]] : []),
    ...(trip ? [['Trip', trip.destination] as [string, string]] : []),
    ...(t.recurringId ? [['Source', 'Recurring item'] as [string, string]] : []),
  ];
  return (
    <Drawer title="Transaction" onClose={onClose}
      foot={<Button variant="danger" size="sm" onClick={() => { dispatch({ type: 'remove', col: 'transactions', id: t.id }); onClose(); }}><Trash2 />Delete</Button>}>
      <div className="flex flex-col items-center pb-6 pt-4 text-center">
        <Icon as={isT ? ArrowLeftRight : catIcon(t.category || '')} size="lg" tone={t.type === 'income' ? 'pos' : undefined} />
        <div className={cn('num mt-4 font-display text-[40px] font-semibold leading-none tracking-[-0.035em]', sign === '+' && 'text-positive')}>{sign}{money(t.amount).replace('−', '')}</div>
        <div className="mt-2 text-body text-foreground-muted">{t.note || t.category}</div>
      </div>
      <Divider />
      <dl className="divide-y divide-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 py-3 text-[13px]">
            <dt className="text-foreground-subtle">{k}</dt><dd className="truncate text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {t.tags && t.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{t.tags.map((x) => <Badge key={x}>#{x}</Badge>)}</div>}
    </Drawer>
  );
}

export default function ActivityPage({ openAdd }: { openAdd: (t?: string) => void }) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [scope, setScope] = useState<string>(state.world);
  const [f, setF] = useState({ account: '', category: '', card: '', trip: '', month: '' });
  const [open, setOpen] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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
    const g = new Map<string, Transaction[]>();
    for (const t of list.slice(0, 300)) { if (!g.has(t.date)) g.set(t.date, []); g.get(t.date)!.push(t); }
    return [...g.entries()];
  }, [list]);
  const totIn = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totOut = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const activeFilters = Object.values(f).filter(Boolean).length;
  const sel = (k: keyof typeof f, opts: { value: string; label: string }[], label: string) => (
    <div className="w-[170px] max-sm:w-full">
      <Select aria-label={label} className="h-8 text-[13px]" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
        <option value="">{label}</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </div>
  );
  const hasBiz = state.accounts.some((a) => a.world === 'business');
  const empty = state.transactions.length === 0;

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Past" title="Activity" action={
        empty ? <Button variant="primary" size="sm" onClick={() => openAdd('expense')}><Plus />Add transaction</Button> : (
          <div className="flex items-center gap-6">
            <div className="text-right"><Eyebrow>Money in</Eyebrow><div className="num mt-0.5 text-[17px] font-semibold text-positive">{money(totIn, { compact: true })}</div></div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right"><Eyebrow>Money out</Eyebrow><div className="num mt-0.5 text-[17px] font-semibold">{money(totOut, { compact: true })}</div></div>
          </div>
        )} />

      {empty ? (
        <Card>
          <EmptyState size="lg" icon={ReceiptText} title="No activity yet"
            description="Add your first income or expense."
            primaryAction={{ label: 'Add transaction', onClick: () => openAdd('expense'), icon: Plus }}
            secondaryAction={{ label: 'Add income', onClick: () => openAdd('income') }} />
        </Card>
      ) : (
        <Card>
          {/* Toolbar */}
          <div className="sticky top-14 z-10 rounded-t-xl border-b border-border bg-surface/90 px-5 py-3 backdrop-blur-md max-md:px-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex h-8 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 transition-[box-shadow,border] focus-within:border-border-strong focus-within:ring-4 focus-within:ring-accent-soft">
                <Search className="size-3.5 shrink-0 text-foreground-subtle" />
                <input aria-label="Search transactions" className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-foreground-subtle" placeholder="Search notes, categories, tags" value={q} onChange={(e) => setQ(e.target.value)} />
                {q && <button aria-label="Clear search" onClick={() => setQ('')} className="text-foreground-subtle hover:text-foreground"><X className="size-3.5" /></button>}
              </label>
              <Seg label="Type" value={type} onChange={setType} options={[{ value: 'all', label: 'All' }, { value: 'expense', label: 'Out' }, { value: 'income', label: 'In' }, { value: 'transfer', label: 'Transfers' }]} />
              {hasBiz && <Seg label="Workspace" value={scope} onChange={setScope} options={[{ value: 'personal', label: 'Personal' }, { value: 'business', label: 'Business' }, { value: 'all', label: 'Both' }]} />}
              <Button variant={showFilters || activeFilters ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
                <SlidersHorizontal />Filters{activeFilters > 0 && <span className="num grid size-4 place-items-center rounded-full bg-inverse text-[10px] text-inverse-foreground">{activeFilters}</span>}
              </Button>
            </div>
            {showFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2 animate-rise">
                {sel('month', months.map((m) => ({ value: m, label: monthLabel(m, true) })), 'Any month')}
                {sel('account', state.accounts.map((a) => ({ value: a.id, label: a.name })), 'All accounts')}
                {sel('category', state.categories.map((c) => ({ value: c, label: c })), 'All categories')}
                {state.cards.length > 0 && sel('card', state.cards.map((c) => ({ value: c.id, label: c.name })), 'Any card')}
                {state.trips.length > 0 && sel('trip', state.trips.map((t) => ({ value: t.id, label: t.destination })), 'Any trip')}
                {activeFilters > 0 && <Button variant="ghost" size="sm" onClick={() => setF({ account: '', category: '', card: '', trip: '', month: '' })}>Clear</Button>}
              </div>
            )}
          </div>

          <div className="relative px-5 pb-5 pt-2 max-md:px-4">
            <div className="absolute bottom-0 left-[38px] top-6 w-px bg-border max-md:left-[34px]" />
            {groups.length === 0 && <EmptyState icon={Search} title="No matching activity" description="Try a different search or remove a filter." />}
            {groups.map(([d, items]) => {
              const net = items.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0);
              return (
                <section key={d} className="relative mt-6 first:mt-0">
                  <div className="flex items-center justify-between pb-2 text-meta">
                    <div className="flex items-center gap-4">
                      <div className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface shadow-[0_0_0_8px_var(--surface)]">
                        <div className="size-2 rounded-full bg-border-strong" />
                      </div>
                      <span className="font-medium text-foreground">{relDay(d) === fmtDate(d) ? fmtDate(d, true) : <>{relDay(d)} <span className="text-foreground-subtle">· {fmtDate(d)}</span></>}</span>
                    </div>
                    <span className={cn('num', net > 0 ? 'text-positive' : 'text-foreground-subtle')}>{money(net, { sign: true })}</span>
                  </div>
                  <div className="ml-[42px] mt-2 flex flex-col gap-1 max-md:ml-10">
                    {items.map((t) => <TxRow key={t.id} t={t} onOpen={setOpen} />)}
                  </div>
                </section>
              );
            })}
          </div>
        </Card>
      )}
      {open && <TxDetail t={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
