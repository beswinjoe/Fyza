import { useState } from 'react';
import { ArrowRight, Plane, Plus, CalendarClock, TrendingDown, TrendingUp, AlertTriangle, Landmark, ReceiptText, Target, Compass, CreditCard, HandCoins } from 'lucide-react';
import { useStore } from '../engine/store';
import { today, mkey, inr, fmtDate, relDay, addMonths, monthLabel, daysBetween, parseDate } from '../engine/format';
import { available, monthSummary, insights, forecast, history, upcoming, goalStats, tripTotal, tripSpent, studentCycle, accountBalance, cardStats, loanStats, inWorld, netWorth } from '../engine/finance';
import { Money, Bar, Icon, AreaChart, BarsChart, Seg, Ring, catIcon, ACC_ICON, Card, SectionHeader, Button, LinkButton, Badge, Eyebrow, Stat, HeroAmount, Legend, AIMark, Row, RowMeta, Kbd, cn } from '../components/ui';
import { TxRow } from './Activity';
import { BusinessHero } from './Business';
import { AppState } from '../types/app';
import { World, Goal, Account, Card as CardType, Loan } from '../types/finance';
import welcomeImg from '../assets/welcome.jpg';

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
    <HeroShell eyebrow="Available trackable money" amount={Math.floor(avail)}
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
    <div className="flex flex-col gap-14 stagger max-md:gap-10">
      <section className="grid items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-14">
        <div className="flex flex-col justify-center py-2 lg:py-8">
          <div className="mb-6 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-subtle">Chapter one — Begin</div>
          <h2 className="font-display text-[clamp(44px,5.6vw,80px)] font-semibold leading-[0.95] tracking-[-0.05em]">
            Start with<br /><span className="text-foreground-subtle">what you know.</span>
          </h2>
          <p className="mt-7 max-w-[420px] text-[16px] leading-[1.6] text-foreground-muted">Add income, spending, savings, or anything else manually. Fyza will build your financial picture as you go.</p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button onClick={() => openAdd('income')} className="group inline-flex h-13 items-center gap-3 rounded-full bg-foreground py-3 pl-6 pr-2 text-[15px] font-medium text-background transition-all duration-300 hover:gap-4 active:scale-[0.98]">
              Add income
              <span className="grid size-8 place-items-center rounded-full bg-background/15"><ArrowRight className="size-4" /></span>
            </button>
            <button onClick={() => openAdd('expense')} className="inline-flex h-13 items-center gap-2 rounded-full border border-border-strong px-6 py-3 text-[15px] font-medium transition-colors hover:border-foreground">
              <Plus className="size-4" />Add expense
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-6 text-[13.5px] text-foreground-subtle">
            <button onClick={openPalette} className="inline-flex items-center gap-2 transition-colors hover:text-foreground"><AIMark className="size-3.5" />Ask Fyza</button>
            <button onClick={() => openAdd('account')} className="transition-colors hover:text-foreground">Add an account <span className="opacity-60">(optional)</span></button>
          </div>
        </div>
        <div aria-hidden className="relative h-[260px] overflow-hidden rounded-[28px] bg-[#0d1422] sm:h-[340px] lg:h-auto lg:min-h-[460px]">
          <img src={welcomeImg} alt="" className="absolute inset-0 size-full animate-[welcomeZoom_24s_ease-out_forwards] object-cover object-[50%_45%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute inset-x-6 bottom-6 text-white">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">Manual-first</div>
            <p className="max-w-[300px] font-display text-[19px] font-medium leading-[1.3] tracking-[-0.02em]">No bank connection required. Just the truth, as you know it.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-subtle">What comes next</div>
        <ol className="border-t border-border">
          {sections.map((s, i) => (
            <li key={s.title}>
              <button onClick={s.on} className="group grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-6 text-left md:grid-cols-[64px_220px_minmax(0,1fr)_auto]">
                <span className="num text-[13px] text-foreground-subtle">0{i + 1}</span>
                <span className="font-display text-[22px] font-semibold tracking-[-0.03em] transition-colors group-hover:text-foreground max-md:text-[19px]">{s.title}</span>
                <span className="hidden text-[14px] text-foreground-subtle md:block">{s.d}</span>
                <span className="inline-flex items-center gap-2 text-[13.5px] font-medium text-foreground-muted transition-all group-hover:gap-3 group-hover:text-foreground">
                  <span className="max-sm:hidden">{s.cta}</span><ArrowRight className="size-4" />
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/* ---------- Adaptive Sidebar ---------- */
function RightSidebar({ state, world, openItem, openAdd, openPalette }: any) {
  const t = [...state.trips].filter((x) => parseDate(x.end).getTime() >= today().getTime()).sort((a, b) => a.start.localeCompare(b.start))[0];
  const accs = state.accounts.filter(inWorld(world));
  const loans = state.loans.filter(inWorld(world));
  const cards = world === 'personal' ? state.cards : [];
  const holdingsEmpty = !accs.length && !loans.length && !cards.length;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <Insight items={insights(state, world)} onAsk={openPalette} />
      
      {world === 'personal' && (
        <div className="flex flex-col gap-3">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-foreground-subtle">Planning & Travel</h3>
          
          {/* Trips */}
          {!t ? (
            <Row className="!px-0" onClick={() => openAdd('trip')}>
              <div className="grid size-9 place-items-center rounded-lg bg-surface-muted"><Plane className="size-4 text-foreground-muted" /></div>
              <RowMeta title="Trips & Travel" sub="No upcoming trips" />
              <LinkButton>Plan <ArrowRight /></LinkButton>
            </Row>
          ) : (
            <div className="group cursor-pointer rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong" onClick={() => openItem('trip', t.id)}>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2 font-medium text-foreground"><Plane className="size-4 text-foreground-muted" /> {t.destination}</div><Badge>{daysBetween(today(), parseDate(t.start))} days</Badge></div>
              <div className="mt-3 flex items-center justify-between text-[13px]">
                <div className="text-foreground-subtle">Budget</div><div className="num font-medium">{inr(tripTotal(t), { compact: true })}</div>
              </div>
              <Bar value={tripSpent(state, t) / Math.max(1, tripTotal(t))} className="my-2" />
              <div className="flex items-center justify-between text-[13px]">
                <div className="text-foreground-subtle">Remaining</div><div className="num font-medium text-foreground">{inr(Math.max(0, tripTotal(t) - tripSpent(state, t)), { compact: true })}</div>
              </div>
            </div>
          )}

          {/* Goals */}
          {state.goals.length === 0 ? (
            <Row className="!px-0" onClick={() => openAdd('goal')}>
              <div className="grid size-9 place-items-center rounded-lg bg-surface-muted"><Target className="size-4 text-foreground-muted" /></div>
              <RowMeta title="Savings Goals" sub="No active goals" />
              <LinkButton>Plan <ArrowRight /></LinkButton>
            </Row>
          ) : (
            <div className="mt-2 flex flex-col gap-1">
              {state.goals.slice(0, 3).map((g: Goal) => {
                const st = goalStats(g);
                return (
                  <Row key={g.id} className="!px-0 group" onClick={() => openItem('goal', g.id)}>
                    <Ring value={st.progress} size={34} stroke={3.5} color={st.onTrack ? 'var(--accent)' : 'var(--warning)'} />
                    <RowMeta title={g.name} sub={<>{inr(g.current, { compact: true })} of {inr(g.target, { compact: true })}</>} />
                    <span className="num text-meta text-foreground-subtle transition-colors group-hover:text-foreground">{Math.round(st.progress * 100)}%</span>
                  </Row>
                );
              })}
              <Row className="!px-0 mt-1" onClick={() => openAdd('goal')}>
                <div className="grid size-9 place-items-center rounded-lg border border-dashed border-border bg-transparent"><Plus className="size-4 text-foreground-muted" /></div>
                <RowMeta title="Add another goal" />
              </Row>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-[12px] font-medium uppercase tracking-wider text-foreground-subtle">Holdings</h3>
        
        {holdingsEmpty ? (
          <div className="flex flex-col gap-1">
            <Row className="!px-0" onClick={() => openAdd('account')}>
              <div className="grid size-9 place-items-center rounded-lg bg-surface-muted"><Landmark className="size-4 text-foreground-muted" /></div>
              <RowMeta title="Accounts" sub="None connected" />
              <LinkButton>Add <ArrowRight /></LinkButton>
            </Row>
            {world === 'personal' && (
              <Row className="!px-0" onClick={() => openAdd('card')}>
                <div className="grid size-9 place-items-center rounded-lg bg-surface-muted"><CreditCard className="size-4 text-foreground-muted" /></div>
                <RowMeta title="Credit Cards" sub="Track utilization" />
                <LinkButton>Add <ArrowRight /></LinkButton>
              </Row>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {accs.map((a: Account) => (
              <Row key={a.id} className="!px-0" onClick={() => openItem('account', a.id)}>
                <Icon as={ACC_ICON[a.type] || ACC_ICON.other} size="sm" />
                <RowMeta title={a.name} sub={<span className="capitalize">{a.institution || a.type}</span>} />
                <Money v={accountBalance(state, a)} className="text-body font-medium" />
              </Row>
            ))}
            {cards.map((c: CardType) => {
              const s = cardStats(state, c);
              return (
                <Row key={c.id} className="!px-0" onClick={() => openItem('card', c.id)}>
                  <Icon as={CreditCard} size="sm" />
                  <RowMeta title={<>{c.name} {c.last4 && <span className="text-foreground-subtle">•• {c.last4}</span>}</>} sub={c.kind === 'credit' ? `${Math.round(s.utilization * 100)}% used` : 'Debit'} />
                  <Money v={s.spent} className="text-body font-medium" />
                </Row>
              );
            })}
            {loans.map((l: Loan) => {
              const s = loanStats(l);
              return (
                <Row key={l.id} className="!px-0" onClick={() => openItem('loan', l.id)}>
                  <Icon as={HandCoins} size="sm" />
                  <RowMeta title={l.name} sub={`${inr(s.emi)}/mo`} />
                  <Money v={s.balance} compact className="text-body font-medium" />
                </Row>
              );
            })}
            
            <div className="mt-2 flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => openAdd('account')}><Plus /> Account</Button>
              {world === 'personal' && <Button variant="ghost" size="sm" onClick={() => openAdd('card')}><Plus /> Card</Button>}
            </div>
          </div>
        )}
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
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_320px] stagger">
          <div className="flex min-w-0 flex-col gap-8">
            {world === 'business' ? <BusinessHero state={state} /> : student ? <StudentHero state={state} /> : <PersonalHero state={state} />}
            <FlowCard state={state} world={world} />
            <div className="grid gap-8 md:grid-cols-2">
              <UpcomingCard state={state} world={world} />
              <div>
                <SectionHeader title="Recent activity" action={recent.length > 0 && <LinkButton onClick={() => go('activity')}>All <ArrowRight /></LinkButton>} />
                {recent.length === 0
                  ? <p className="py-4 text-[13px] text-foreground-subtle">Your transactions will appear here.</p>
                  : <div className="mt-2 flex flex-col gap-1">{recent.map((t) => <TxRow key={t.id} t={t} compact />)}</div>}
              </div>
            </div>
          </div>
          <RightSidebar state={state} world={world} openItem={openItem} openAdd={openAdd} openPalette={openPalette} />
        </div>
      )}
    </div>
  );
}
