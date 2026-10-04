import { useState } from 'react';
import { ArrowRight, Plane, Plus, CalendarClock, TrendingDown, TrendingUp, AlertTriangle, Landmark, ReceiptText, Target, Compass, CreditCard, HandCoins, Wallet } from 'lucide-react';
import { useStore } from '../engine/store';
import { today, mkey, inr, fmtDate, relDay, addMonths, monthLabel, daysBetween, parseDate } from '../engine/format';
import { available, monthSummary, insights, forecast, history, upcoming, goalStats, tripTotal, studentCycle, accountBalance, cardStats, loanStats, inWorld, tripDays, netWorth } from '../engine/finance';
import { Money, Bar, Icon, AreaChart, BarsChart, Seg, Ring, catIcon, ACC_ICON, Card, SectionHeader, EmptyState, Button, LinkButton, Badge, Eyebrow, Stat, HeroAmount, Legend, AIMark, Row, RowMeta, Kbd, cn } from '../components/ui';
import { TxRow } from './Activity';
import { BusinessHero } from './Business';
import { AppState } from '../types/app';
import { World } from '../types/finance';

type OpenItem = (t: string, id: string) => void;

/* ---------- Insight (AI layer) ---------- */
export function Insight({ items, onAsk }: { items: { tone: string; text: string }[]; onAsk: () => void }) {
  return (
    <Card className="p-5">
      <SectionHeader title={<><AIMark />What Fyza noticed</>} />
      <div className="flex flex-col gap-3">
        {items.length === 0 && <p className="text-[13px] leading-5 text-foreground-subtle">As you add activity, Fyza will surface patterns and anything that needs your attention here.</p>}
        {items.slice(0, 3).map((x, i) => {
          const I = x.tone === 'pos' ? TrendingDown : x.tone === 'neg' ? AlertTriangle : TrendingUp;
          return (
            <div key={i} className="flex items-start gap-2.5">
              <I className={cn('mt-0.5 size-4 shrink-0', x.tone === 'pos' ? 'text-positive' : x.tone === 'neg' ? 'text-negative' : 'text-foreground-subtle')} strokeWidth={1.75} />
              <p className="text-[13px] leading-5 text-foreground-muted">{x.text}</p>
            </div>
          );
        })}
      </div>
      <button onClick={onAsk} className="mt-5 flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 text-left text-[13px] text-foreground-subtle transition-colors hover:border-border-strong hover:text-foreground-muted">
        <span className="flex-1">Ask about your money…</span><Kbd>⌘K</Kbd>
      </button>
    </Card>
  );
}

/* ---------- Heroes ---------- */
function HeroShell({ eyebrow, badge, amount, children, stats }: { eyebrow: React.ReactNode; badge?: React.ReactNode; amount: number; children?: React.ReactNode; stats: React.ReactNode }) {
  return (
    <Card className="relative overflow-hidden p-7 max-md:p-5">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent-soft blur-3xl" aria-hidden />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2"><Eyebrow>{eyebrow}</Eyebrow>{badge}</div>
        <HeroAmount v={amount} className="mt-4" />
        {children && <div className="mt-3 max-w-[56ch] text-[14px] leading-6 text-foreground-muted">{children}</div>}
        <div className="mt-7 grid grid-cols-4 gap-x-6 gap-y-5 border-t border-border pt-5 max-md:grid-cols-2">{stats}</div>
      </div>
    </Card>
  );
}

function StudentHero({ state }: { state: AppState }) {
  const c = studentCycle(state);
  if (!c) return <PersonalHero state={state} />;
  return (
    <HeroShell eyebrow="Left until next pocket money" amount={c.remaining} badge={<Badge>{c.daysLeft} days · {fmtDate(c.next)}</Badge>}
      stats={<>
        <Stat label="Pocket money" value={inr(c.amount)} />
        <Stat label="Spent" value={inr(c.spent)} />
        <Stat label="Daily pace" value={inr(c.rate)} />
        <Stat label="Safe / day" value={inr(c.safeDaily)} tone="positive" />
      </>}>
      <Bar value={c.progress} tone={c.progress > 0.85 ? 'neg' : 'accent'} className="mb-3 mt-1" />
      At your current pace you'll likely have <b className={cn('num font-semibold', c.projected < 0 ? 'text-negative' : 'text-foreground')}>{inr(c.projected)}</b> left. Try to keep it under <b className="num font-semibold text-foreground">{inr(c.safeDaily)}/day</b>.
    </HeroShell>
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
  const flow = s.net + s.transferIn;
  return (
    <HeroShell eyebrow="Available across accounts" amount={Math.floor(avail)}
      badge={prev.expense > 0 && <Badge tone={d <= 0 ? 'positive' : 'negative'}>{d <= 0 ? '↓' : '↑'} Spending {Math.abs(Math.round(d * 100))}% vs last month</Badge>}
      stats={<>
        <Stat label="Income" value={inr(s.income + s.transferIn)} />
        <Stat label="Spent" value={inr(s.expense)} />
        <Stat label="Cash flow" value={inr(flow, { sign: true })} tone={flow >= 0 ? 'positive' : 'negative'} />
        <Stat label="Net worth" value={inr(nw.net, { compact: true })} />
      </>}>
      {s.income + s.expense > 0
        ? <>So far in {monthLabel(key, true).split(' ')[0]} you've brought in <b className="num font-semibold text-foreground">{inr(s.income + s.transferIn)}</b> and spent <b className="num font-semibold text-foreground">{inr(s.expense)}</b>.</>
        : <>No income or spending recorded in {monthLabel(key, true).split(' ')[0]} yet.</>}
    </HeroShell>
  );
}

/* ---------- Cards ---------- */
export function FlowCard({ state, world }: { state: AppState; world: World }) {
  const [mode, setMode] = useState('forecast');
  const hist = history(state, world, 6);
  const fc = forecast(state, world, 6);
  return (
    <Card className="p-5">
      <SectionHeader title={mode === 'forecast' ? 'Where you’re heading' : 'Where your money went'}
        sub={mode === 'forecast' ? <>Projected balance by {fc[5].label}: <b className="num font-semibold text-foreground">{inr(fc[5].balance, { compact: true })}</b></> : 'Income vs spending, last 6 months'}
        action={<Seg size="sm" label="Timeframe" value={mode} onChange={setMode} options={[{ value: 'past', label: 'Past' }, { value: 'forecast', label: 'Future' }]} />} />
      {mode === 'forecast' ? (
        <>
          <AreaChart height={200} labels={fc.map((r) => r.label)} series={[{ name: 'Balance', values: fc.map((r) => r.balance), color: 'var(--chart-1)' }]} />
          {fc.some((r) => r.pressure || r.tripList.length) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {fc.filter((r) => r.trips > 0 || r.pressure || r.tripList.length).slice(0, 3).map((r) => (
                <Badge key={r.key} tone={r.pressure ? 'warning' : 'neutral'}>
                  {r.tripList.length ? <Plane /> : <AlertTriangle />}
                  {r.label}: {r.tripList.length ? `${r.tripList.map((t) => t.name).join(', ')} +${inr(r.tripList.reduce((s, t) => s + t.amount, 0), { compact: true })}` : 'tight month'}
                </Badge>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <BarsChart labels={hist.map((h) => h.label)} a={hist.map((h) => h.income)} b={hist.map((h) => h.expense)} highlight={5} />
          <div className="mt-3"><Legend items={[{ label: 'Income', color: 'var(--chart-1)' }, { label: 'Spending', color: 'var(--chart-2)' }]} /></div>
        </>
      )}
    </Card>
  );
}

export function UpcomingCard({ state, world }: { state: AppState; world: World }) {
  const up = upcoming(state, world, 21).slice(0, 5);
  const total = up.filter((u) => u.type === 'expense').reduce((s, u) => s + u.amount, 0);
  return (
    <Card className="p-5">
      <SectionHeader icon={CalendarClock} title="Coming up" action={up.length > 0 && <span className="num text-meta text-foreground-subtle">{inr(total)} due · 3 wks</span>} />
      {up.length === 0 ? (
        <p className="py-4 text-[13px] text-foreground-subtle">Nothing due in the next three weeks. Recurring bills and EMIs appear here.</p>
      ) : up.map((u) => (
        <Row key={u.id + u.date}>
          <Icon as={catIcon(u.category || '')} size="sm" />
          <RowMeta title={u.name} sub={relDay(u.date)} />
          <span className={cn('num text-body font-medium', u.type === 'income' && 'text-positive')}>{u.type === 'income' ? '+' : ''}{inr(u.amount)}</span>
        </Row>
      ))}
    </Card>
  );
}

export function GoalsCard({ state, onOpen, onAdd }: { state: AppState; onOpen: OpenItem; onAdd: () => void }) {
  return (
    <Card className="p-5">
      <SectionHeader title="Goals" action={state.goals.length > 0 && <Button variant="ghost" size="sm" icon aria-label="Create goal" onClick={onAdd}><Plus /></Button>} />
      {state.goals.length === 0 ? (
        <EmptyState size="sm" icon={Target} title="No goals yet" description="Create a goal and Fyza will track the path." primaryAction={{ label: 'Create goal', onClick: onAdd }} />
      ) : state.goals.slice(0, 4).map((g) => {
        const st = goalStats(g);
        return (
          <Row key={g.id} onClick={() => onOpen('goal', g.id)}>
            <Ring value={st.progress} size={34} stroke={3.5} color={st.onTrack ? 'var(--accent)' : 'var(--warning)'} />
            <RowMeta title={g.name} sub={<>{inr(g.current, { compact: true })} of {inr(g.target, { compact: true })} · {st.eta ? `by ${monthLabel(st.eta, true)}` : 'set a monthly amount'}</>} />
            <span className="num text-meta text-foreground-subtle">{Math.round(st.progress * 100)}%</span>
          </Row>
        );
      })}
    </Card>
  );
}

export function TripCard({ state, onOpen }: { state: AppState; onOpen: OpenItem }) {
  const t = [...state.trips].filter((x) => parseDate(x.end).getTime() >= today().getTime()).sort((a, b) => a.start.localeCompare(b.start))[0];
  if (!t) return null;
  const fc = forecast(state, t.world || 'personal', 12);
  const row = fc.find((r) => r.key === t.start.slice(0, 7));
  const total = tripTotal(t);
  return (
    <Card as="button" className="w-full p-5 text-left transition-colors hover:border-border-strong" onClick={() => onOpen('trip', t.id)}>
      <div className="flex items-center justify-between"><Eyebrow>Next trip · in {daysBetween(today(), parseDate(t.start))} days</Eyebrow><Plane className="size-4 text-foreground-subtle" strokeWidth={1.75} /></div>
      <div className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em]">{t.destination}</div>
      <div className="text-meta text-foreground-subtle">{fmtDate(t.start)} – {fmtDate(t.end)} · {tripDays(t)} days</div>
      {row && (
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-y-1.5 text-[13px]">
          <span className="text-foreground-muted">Normal {row.label} spending</span><span className="num">{inr(row.expense - total)}</span>
          <span className="text-foreground-muted">{t.destination} trip</span><span className="num">+{inr(total)}</span>
          <span className="border-t border-border pt-1.5 font-medium">{row.label} projected</span><span className="num border-t border-border pt-1.5 font-semibold">{inr(row.expense)}</span>
        </div>
      )}
    </Card>
  );
}

export function MoneyCard({ state, world, onOpen, onAdd }: { state: AppState; world: World; onOpen: OpenItem; onAdd: (t: string) => void }) {
  const [tab, setTab] = useState('accounts');
  const accs = state.accounts.filter(inWorld(world));
  const loans = state.loans.filter(inWorld(world));
  const addType = tab === 'accounts' ? 'account' : tab === 'cards' ? 'card' : 'loan';
  const empty = (tab === 'accounts' && !accs.length) || (tab === 'cards' && !state.cards.length) || (tab === 'loans' && !loans.length);
  const emptyCopy: Record<string, [React.ElementType, string, string]> = {
    accounts: [Landmark, 'No accounts yet', 'Add cash, bank, savings, or wallet tracking later.'],
    cards: [CreditCard, 'No cards yet', 'Add a credit card to track utilisation and due dates.'],
    loans: [HandCoins, 'No loans', 'Add a loan and Fyza will calculate EMIs and payoff for you.'],
  };
  const [EI, et, ed] = emptyCopy[tab];
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Seg size="sm" label="Holdings" value={tab} onChange={setTab} options={[{ value: 'accounts', label: 'Accounts' }, ...(world === 'personal' ? [{ value: 'cards', label: 'Cards' }] : []), { value: 'loans', label: 'Loans' }]} />
        {!empty && <Button variant="ghost" size="sm" icon aria-label={`Add ${addType}`} onClick={() => onAdd(addType)}><Plus /></Button>}
      </div>
      {empty && <EmptyState size="sm" icon={EI} title={et} description={ed} primaryAction={{ label: `Add ${addType}`, onClick: () => onAdd(addType), icon: Plus }} />}
      {tab === 'accounts' && accs.map((a) => (
        <Row key={a.id} onClick={() => onOpen('account', a.id)}>
          <Icon as={ACC_ICON[a.type] || ACC_ICON.other} size="sm" />
          <RowMeta title={a.name} sub={<span className="capitalize">{a.institution || a.type}</span>} />
          <Money v={accountBalance(state, a)} className="text-body font-medium" />
        </Row>
      ))}
      {tab === 'cards' && state.cards.map((c) => {
        const s = cardStats(state, c);
        return (
          <Row key={c.id} onClick={() => onOpen('card', c.id)}>
            <Icon as={CreditCard} size="sm" />
            <RowMeta title={<>{c.name} {c.last4 && <span className="text-foreground-subtle">•• {c.last4}</span>}</>} sub={c.kind === 'credit' ? `${Math.round(s.utilization * 100)}% used · due ${fmtDate(s.dueDate)}` : 'Debit'} />
            <Money v={s.spent} className="text-body font-medium" />
          </Row>
        );
      })}
      {tab === 'loans' && loans.map((l) => {
        const s = loanStats(l);
        return (
          <Row key={l.id} onClick={() => onOpen('loan', l.id)}>
            <Icon as={HandCoins} size="sm" />
            <RowMeta title={l.name} sub={`${inr(s.emi)}/mo · ${s.remainingMonths} months left`} />
            <Money v={s.balance} compact className="text-body font-medium" />
          </Row>
        );
      })}
    </Card>
  );
}

/* ---------- Empty home ---------- */
function EmptyHome({ world, openAdd, openPalette, go }: { world: World; openAdd: (t?: string) => void; openPalette: () => void; go: (p: string) => void }) {
  const biz = world === 'business';
  const sections = [
    { icon: Landmark, title: 'Accounts & money', empty: 'No accounts yet', d: 'Add cash, bank, savings, or wallet tracking later.', cta: 'Add account', on: () => openAdd('account') },
    { icon: ReceiptText, title: 'Activity', empty: 'No activity yet', d: 'Add your first income or expense.', cta: 'Add transaction', on: () => openAdd('expense') },
    ...(biz ? [] : [{ icon: Target, title: 'Goals', empty: 'No goals yet', d: 'Create a goal and Fyza will track the path.', cta: 'Create goal', on: () => openAdd('goal') }]),
    { icon: Compass, title: 'Plans', empty: 'No forecast yet', d: 'Add income and spending and Fyza will project your future.', cta: 'Add recurring income', on: () => openAdd('recurring'), secondary: { label: 'Open Plans', on: () => go('plans') } },
  ];
  return (
    <div className="flex flex-col gap-5 stagger">
      <Card className="relative overflow-hidden px-8 py-10 max-md:px-5 max-md:py-8">
        <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-accent-soft blur-3xl" aria-hidden />
        <div className="relative max-w-[520px]">
          <div className="mb-5 grid size-11 place-items-center rounded-xl border border-border bg-surface-muted shadow-card"><Wallet className="size-5 text-foreground-muted" strokeWidth={1.5} /></div>
          <h2 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em] max-md:text-[24px]">Start with what you know.</h2>
          <p className="mt-3 text-[14.5px] leading-6 text-foreground-muted">Add income, spending, savings, or anything else manually. Fyza will build your financial picture as you go.</p>
          <div className="mt-7 flex flex-wrap items-center gap-2">
            <Button variant="primary" size="lg" onClick={() => openAdd('income')}><Plus />Add income</Button>
            <Button variant="primary" size="lg" onClick={() => openAdd('expense')}><Plus />Add expense</Button>
            <Button variant="ghost" size="lg" onClick={openPalette}><AIMark className="size-4" />Ask Fyza</Button>
          </div>
          <div className="mt-5">
            <Button variant="ghost" size="sm" onClick={() => openAdd('account')}>Add an account (optional)</Button>
          </div>
        </div>
      </Card>
      <div className={cn('grid gap-5 md:grid-cols-2', !biz && 'xl:grid-cols-4')}>
        {sections.map((s) => (
          <Card key={s.title} className="flex flex-col p-5">
            <div className="flex items-center gap-2 text-meta font-medium text-foreground-subtle"><s.icon className="size-3.5" strokeWidth={1.75} />{s.title}</div>
            <div className="mt-6 text-title font-semibold">{s.empty}</div>
            <p className="mt-1.5 flex-1 text-[13px] leading-5 text-foreground-subtle">{s.d}</p>
            <div className="mt-5 flex items-center gap-3">
              <LinkButton onClick={s.on} className="text-foreground"><Plus />{s.cta}</LinkButton>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ go, openAdd, openPalette, openItem }: { go: (p: string) => void; openAdd: (t?: string) => void; openPalette: () => void; openItem: OpenItem }) {
  const { state } = useStore();
  const world = state.world;
  const student = state.profiles.includes('student') && !state.profiles.includes('personal');
  const recent = state.transactions.filter((t) => (t.world || 'personal') === world).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const [hour] = useState(() => new Date().getHours());
  const isEmpty = !state.accounts.some(inWorld(world)) && !state.transactions.some(inWorld(world)) && !state.recurring.some(inWorld(world));
  const first = state.user.name ? `, ${state.user.name.split(' ')[0]}` : '';

  return (
    <div className="animate-fade-in">
      <header className="mb-8 max-md:mb-6">
        <div className="mb-1.5 text-meta text-foreground-subtle">{fmtDate(today(), true)}</div>
        <h1 className="font-display text-page font-semibold max-md:text-[26px] max-md:leading-8">Good {hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'}{first}</h1>
      </header>

      {isEmpty ? <EmptyHome world={world} openAdd={openAdd} openPalette={openPalette} go={go} /> : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] stagger">
          <div className="flex min-w-0 flex-col gap-5">
            {world === 'business' ? <BusinessHero state={state} /> : student ? <StudentHero state={state} /> : <PersonalHero state={state} />}
            <FlowCard state={state} world={world} />
            <div className="grid gap-5 md:grid-cols-2">
              <UpcomingCard state={state} world={world} />
              <Card className="p-5">
                <SectionHeader title="Recent" action={recent.length > 0 && <LinkButton onClick={() => go('activity')}>All activity <ArrowRight /></LinkButton>} />
                {recent.length === 0
                  ? <EmptyState size="sm" icon={ReceiptText} title="No activity yet" description="Your transactions will appear here." primaryAction={{ label: 'Add transaction', onClick: () => openAdd('expense') }} />
                  : recent.map((t) => <TxRow key={t.id} t={t} compact />)}
              </Card>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <Insight items={insights(state, world)} onAsk={openPalette} />
            {world === 'personal' && <TripCard state={state} onOpen={openItem} />}
            {world === 'personal' && <GoalsCard state={state} onOpen={openItem} onAdd={() => openAdd('goal')} />}
            <MoneyCard state={state} world={world} onOpen={openItem} onAdd={openAdd} />
          </div>
        </div>
      )}
    </div>
  );
}
