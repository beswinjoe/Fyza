import { useState } from 'react';
import { Building2, Plus, ReceiptText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useStore } from '../engine/store';
import { businessMetrics, inWorld } from '../engine/finance';
import { money, monthLabel, fmtDate } from '../engine/format';
import { Bar, AreaChart, Seg, Card, PageHeader, SectionHeader, EmptyState, Badge, Stat, HeroAmount, Eyebrow, Legend, Row, RowMeta, Icon, cn } from '../components/ui';
import { AppState } from '../types/app';

export function BusinessHero({ state }: { state: AppState }) {
  const m = businessMetrics(state);
  return (
    <Card className="relative overflow-hidden p-7 max-md:p-5">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent-soft blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Eyebrow>Profit · {monthLabel(m.period)}</Eyebrow>
          {m.revenue > 0 && <Badge tone={m.margin > 0.2 ? 'positive' : m.margin > 0 ? 'neutral' : 'warning'}>{Math.round(m.margin * 100)}% margin</Badge>}
        </div>
        <HeroAmount v={m.profit} className="mt-4" />
        <p className="mt-3 max-w-[56ch] text-[14px] leading-6 text-foreground-muted">
          {m.revenue + m.expenses > 0
            ? <>Revenue of <b className="num font-semibold text-foreground">{money(m.revenue)}</b> against <b className="num font-semibold text-foreground">{money(m.expenses)}</b> in expenses last month.</>
            : 'No business revenue or expenses were recorded last month.'}
        </p>
        <div className="mt-7 grid grid-cols-4 gap-x-6 gap-y-5 border-t border-border pt-5 max-md:grid-cols-2">
          <Stat label="Revenue" value={money(m.revenue)} />
          <Stat label="Expenses" value={money(m.expenses)} />
          <Stat label="Cash" value={money(m.cash, { compact: true })} />
          <Stat label="Runway" value={Number.isFinite(m.runway) && m.runway <= 99 ? `${m.runway.toFixed(1)} mo` : '—'} tone={m.runway < 3 ? 'warning' : undefined} />
        </div>
      </div>
    </Card>
  );
}

export default function BusinessPage({ openAdd }: { openAdd: (t?: string) => void }) {
  const { state, dispatch } = useStore();
  const m = businessMetrics(state);
  const [tab, setTab] = useState('overview');
  const hasData = state.accounts.some(inWorld('business')) || state.transactions.some((t) => (t.world || 'personal') === 'business') || state.invoices.length > 0;
  const toBiz = (t: string) => { if (state.world !== 'business') dispatch({ type: 'set', patch: { world: 'business' } }); openAdd(t); };
  const invoices = [...state.invoices].sort((a, b) => (a.due || '').localeCompare(b.due || ''));

  if (!hasData) {
    return (
      <div className="animate-fade-in">
        <PageHeader eyebrow="Business" title="Workspace" />
        <Card>
          <EmptyState size="lg" icon={Building2} title="No business data yet"
            description="Add revenue or expenses to start seeing profit, cash, and runway — kept separate from your personal money."
            primaryAction={{ label: 'Record revenue', onClick: () => toBiz('income'), icon: Plus }}
            secondaryAction={{ label: 'Record expense', onClick: () => toBiz('expense') }} />
        </Card>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {[['Profit & margin', 'Monthly profit and margin, calculated from your business activity.'], ['Cash & runway', 'How long your cash lasts at your current burn rate.'], ['Invoices', 'What you’re owed and what you owe, in one place.']].map(([t, d]) => (
            <Card key={t} tone="secondary" className="p-5">
              <div className="text-[13px] font-semibold">{t}</div>
              <p className="mt-1 text-[13px] leading-5 text-foreground-subtle">{d}</p>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Business" title="Workspace" action={<Seg label="View" value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Overview' }, { value: 'cashflow', label: 'Cash flow' }]} />} />

      {tab === 'overview' && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] stagger">
          <div className="flex min-w-0 flex-col gap-5">
            <BusinessHero state={state} />
            <Card className="p-5">
              <SectionHeader title="Runway & burn" sub="Average over the last 3 months" />
              <div className="grid grid-cols-3 gap-6 max-sm:grid-cols-1 max-sm:gap-4">
                <Stat size="lg" label="Avg revenue" value={money(m.avgRev)} />
                <Stat size="lg" label="Avg burn" value={money(m.avgExp)} />
                <Stat size="lg" label="Net burn" value={money(m.netBurn, { sign: true })} tone={m.netBurn > 0 ? 'negative' : 'positive'} />
              </div>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-meta text-foreground-subtle">
                  <span>Runway {Number.isFinite(m.runway) && m.runway <= 99 ? `· ${m.runway.toFixed(1)} months` : '· no burn yet'}</span>
                  <span className="num">{money(m.cash, { compact: true })} cash</span>
                </div>
                <Bar value={Number.isFinite(m.runway) ? Math.min(1, m.runway / 12) : 1} tone={m.runway < 3 ? 'warning' : 'positive'} />
              </div>
            </Card>
          </div>
          <Card className="p-5">
            <SectionHeader icon={ReceiptText} title="Invoices" />
            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <Stat label="Receivable" value={money(m.receivable)} tone={m.receivable ? 'positive' : undefined} />
              <Stat label="Payable" value={money(m.payable)} tone={m.payable ? 'negative' : undefined} />
            </div>
            {invoices.length === 0 ? (
              <p className="pt-4 text-[13px] leading-5 text-foreground-subtle">No invoices yet. Invoices you create will show what you're owed and what's due.</p>
            ) : (
              <div className="pt-2">
                {invoices.slice(0, 6).map((i) => (
                  <Row key={i.id}>
                    <Icon as={i.kind === 'payable' ? ArrowUpRight : ArrowDownLeft} size="sm" tone={i.kind === 'payable' ? undefined : 'pos'} />
                    <RowMeta title={i.client || 'Invoice'} sub={[i.status, i.due && `due ${fmtDate(i.due)}`].filter(Boolean).join(' · ')} />
                    <span className={cn('num text-body font-medium', i.status === 'paid' && 'text-foreground-subtle line-through')}>{money(i.amount)}</span>
                  </Row>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'cashflow' && (
        <Card className="p-5 animate-rise">
          <SectionHeader title="Revenue vs expenses" sub="Last three months and month to date" action={<Legend items={[{ label: 'Revenue', color: 'var(--chart-1)' }, { label: 'Expenses', color: 'var(--chart-2)', dashed: true }]} />} />
          <AreaChart height={280} labels={['3 mo avg', '2 mo ago', 'Last month', 'This month']} series={[
            { name: 'Revenue', values: [m.avgRev, m.prev.income, m.cur.income, m.mtd.income], color: 'var(--chart-1)' },
            { name: 'Expenses', values: [m.avgExp, m.prev.expense, m.cur.expense, m.mtd.expense], color: 'var(--chart-2)', dashed: true, fill: false },
          ]} />
        </Card>
      )}
    </div>
  );
}
