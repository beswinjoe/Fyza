import { useState, useEffect } from 'react';
import { Plus, Plane, Sparkles, Trash2, AlertTriangle, Compass } from 'lucide-react';
import { useStore } from '../engine/store';
import { money, fmtDate, monthLabel } from '../engine/format';
import { forecast, goalStats, tripTotal, tripSpent, tripDays, TRIP_PARTS, inWorld } from '../engine/finance';
import { AreaChart, Seg, Ring, Bar, Card, Stat, Button, Badge, Input, Field, EmptyState, cn } from '../components/ui';
import { AppState } from '../types/app';
import { World } from '../types/finance';
import { Dispatch } from 'react';
import { Action } from '../types/store';

function ForecastView({ state, world }: { state: AppState; world: World }) {
  const fc = forecast(state, world, 6);
  const [sel, setSel] = useState(0);
  const empty = state.transactions.filter(inWorld(world)).length === 0 && state.recurring.filter(inWorld(world)).length === 0;
  
  if (empty) {
    return (
      <Card className="p-8">
        <EmptyState size="lg" icon={Compass} title="No forecast yet"
          description="Add income and spending and Fyza will project your future." />
      </Card>
    );
  }

  const r = fc[sel];
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card tone="primary" className="p-4 sm:p-6">
        <div className="mb-4">
          <div className="text-[16px] font-semibold tracking-[-0.015em] text-foreground">Projected balance</div>
          <div className="mt-0.5 text-[13px] text-foreground-subtle">Based on recurring income & bills, EMIs, trips and your typical spending</div>
        </div>
        <AreaChart height={240} labels={fc.map((x) => x.label)} series={[{ name: 'Balance', values: fc.map((x) => x.balance), color: 'var(--chart-1)' }]} />
        <div className="mt-6 flex snap-x gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
          {fc.map((x, i) => (
            <button key={x.key} onClick={() => setSel(i)} className={cn("shrink-0 snap-start w-28 rounded-xl border p-3 text-left transition-colors", i === sel ? "border-border-strong bg-surface shadow-sm ring-1 ring-border-strong" : "border-border bg-surface-muted/30 hover:bg-surface-muted")}>
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground-subtle">
                {x.label}
                {x.pressure && <AlertTriangle size={12} className="text-warning" />}
                {x.tripList.length > 0 && <Plane size={12} />}
              </div>
              <div className={cn("num mt-1.5 text-[15px] font-semibold", x.net >= 0 ? "text-positive" : "text-negative")}>{money(x.net, { compact: true, sign: true })}</div>
            </button>
          ))}
        </div>
      </Card>
      <Card tone="primary" className="p-4 sm:p-6">
        <div className="text-eyebrow font-medium uppercase text-foreground-subtle">{monthLabel(r.key, true)}</div>
        <div className="num my-1.5 text-[32px] font-semibold tracking-tight text-foreground">{money(r.balance)}</div>
        <div className="text-[13px] text-foreground-subtle">Expected balance at month end</div>
        <div className="my-5 h-px bg-border" />
        <div className="flex flex-col gap-3">
          {[
            ['Income', r.income, 'text-positive'] as const,
            ['Recurring bills', -r.recurring] as const,
            ['EMIs', -r.emis] as const,
            ['Everyday spending', -r.variable] as const,
            ...(sel === 0 ? [['Already spent', -(r.expense - r.recurring - r.emis - r.variable - r.trips - r.oneTime - r.goals)] as const] : []),
            ...r.tripList.map((t: { name: string, amount: number }) => [`✈ ${t.name}`, -t.amount, 'text-warning'] as const),
            ...r.goalList.map((g: { name: string, amount: number }) => [`🎯 ${g.name}`, -g.amount, 'text-accent'] as const),
          ].filter(([, v]) => Math.round(v) !== 0).map(([l, v, tone]) => (
            <div key={l} className="flex items-center justify-between text-[13.5px]"><span className="text-foreground-muted">{l}</span><span className={cn('num font-medium', tone)}>{money(v, { sign: true })}</span></div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-[14px] font-semibold"><span>Net</span><span className={cn('num', r.net >= 0 ? 'text-positive' : 'text-negative')}>{money(r.net, { sign: true })}</span></div>
        {r.tripList.length > 0 && (
          <div className="mt-6 flex gap-3 rounded-xl bg-surface-muted/60 p-4 text-[13px] leading-relaxed">
            <Sparkles className="size-4 shrink-0 text-accent" />
            <p className="text-foreground-subtle">Normal {r.label} expenses would be about <b className="text-foreground">{money(r.expense - r.tripList.reduce((s, t) => s + t.amount, 0))}</b>. With {r.tripList.map((t) => t.name).join(', ')} ({money(r.tripList.reduce((s, t) => s + t.amount, 0))}), the month totals <b className="text-foreground">{money(r.expense)}</b>.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function GoalsView({ state, dispatch, openAdd, openItem }: { state: AppState; dispatch: Dispatch<Action>; openAdd: (t: string) => void; openItem: (t: string, id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in">
      {state.goals.map((g) => {
        const s = goalStats(g);
        return (
          <Card key={g.id} className="cursor-pointer p-4 transition-colors hover:bg-surface-muted/50 sm:p-5" onClick={() => openItem('goal', g.id)}>
            <div className="flex items-start justify-between">
              <div className="text-eyebrow font-medium uppercase text-foreground-subtle">{g.kind}</div>
              <Badge tone={s.onTrack ? 'positive' : 'warning'}>{s.onTrack ? 'On track' : 'Behind'}</Badge>
            </div>
            <div className="my-5 flex items-center gap-4">
              <Ring value={s.progress} size={56} stroke={5} color={s.onTrack ? 'var(--accent)' : 'var(--warning)'} />
              <div><div className="text-[16px] font-semibold tracking-tight text-foreground">{g.name}</div><div className="num text-foreground-muted">{money(g.current)} <span className="text-[14px] text-foreground-subtle">/ {money(g.target, { compact: true })}</span></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Monthly" value={money(g.monthly)} size="sm" />
              <Stat label="Completes" value={s.eta ? monthLabel(s.eta, true) : '—'} size="sm" />
            </div>
            {!s.onTrack && s.required && <div className="mt-3 text-[12.5px] text-foreground-subtle">Needs {money(s.required)}/mo to hit {fmtDate(g.targetDate, true)}.</div>}
            <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" onClick={() => dispatch({ type: 'update', col: 'goals', id: g.id, patch: { current: Math.min(g.target, g.current + (+g.monthly || 1000)) } })}>+ {money(g.monthly || 1000, { compact: true })}</Button>
            </div>
          </Card>
        );
      })}
      <button className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-transparent text-foreground-muted transition-colors hover:border-foreground-subtle hover:bg-surface hover:text-foreground" onClick={() => openAdd('goal')}><Plus className="size-5" /><b className="font-medium">New goal</b></button>
    </div>
  );
}

function TripsView({ state, openAdd, openItem }: { state: AppState; openAdd: (t: string) => void; openItem: (t: string, id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-fade-in">
      {state.trips.map((t) => {
        const total = tripTotal(t), spent = tripSpent(state, t);
        return (
          <Card key={t.id} className="cursor-pointer p-4 transition-colors hover:bg-surface-muted/50 sm:p-5" onClick={() => openItem('trip', t.id)}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-[22px] font-semibold text-foreground">{t.destination}</div>
                <div className="text-meta text-foreground-subtle">{fmtDate(t.start)} – {fmtDate(t.end, true)} · {tripDays(t)} days</div>
              </div>
              <div className="text-right">
                <div className="num text-[20px] font-semibold text-foreground">{money(total)}</div>
                <div className="text-[12px] text-foreground-subtle">{money(total / tripDays(t))}/day</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {TRIP_PARTS.map((p) => <Stat key={p} label={<span className="capitalize">{p}</span>} value={money(t.budget[p] || 0)} size="sm" />)}
            </div>
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-[12.5px] text-foreground-subtle"><span>Spent so far</span><span className="num">{money(spent)} / {money(total)}</span></div>
              <Bar value={total ? spent / total : 0} tone="accent" />
            </div>
          </Card>
        );
      })}
      <button className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-transparent text-foreground-muted transition-colors hover:border-foreground-subtle hover:bg-surface hover:text-foreground" onClick={() => openAdd('trip')}><Plane className="size-5" /><b className="font-medium">Plan a trip</b></button>
    </div>
  );
}

// Labels are built at render time so they use the workspace currency.
const PRESETS: Record<string, () => [string, Record<string, number>][]> = {
  personal: () => [
    [`Buy ${money(150000, { compact: true })} laptop`, { oneTime: 150000, oneTimeMonth: 1 }], [`Save ${money(15000, { compact: true })} / month`, { monthlySave: 15000 }], [`Salary +${money(25000, { compact: true })}`, { incomeDelta: 25000 }],
    ['Lose income 3 months', { incomeLoss: 3 }], [`Rent +${money(5000)}`, { expenseDelta: 5000 }],
  ],
  business: () => [['Revenue −20%', { revenuePct: -0.2 }], [`Hire at ${money(40000, { compact: true })}/mo`, { expenseDelta: 40000 }], [`New ${money(200000, { compact: true })} campaign`, { oneTime: 200000, oneTimeMonth: 1 }], ['Revenue +30%', { revenuePct: 0.3 }]],
};

function ScenarioView({ state, dispatch, world }: { state: AppState; dispatch: Dispatch<Action>; world: World }) {
  const [sc, setSc] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const parsedSc = Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, Number(v) || 0]));
  const base = forecast(state, world, 12);
  const alt = forecast(state, world, 12, { ...parsedSc, expenseDelta: (parsedSc.expenseDelta || 0) + (parsedSc.monthlySave || 0) });
  const d = alt[11].balance - base[11].balance;
  const minAlt = Math.min(...alt.map((r) => r.balance));
  
  const num = (k: string, label: string, step = 1000, suffix = '') => (
    <Field label={label}>
      <Input type="number" step={step} value={sc[k] ?? ''} placeholder={'0' + suffix} allowNegative={k.includes('Delta')} onChange={(e) => setSc({ ...sc, [k]: e.target.value } as any)} />
    </Field>
  );
  
  const saved = (state.scenarios || []).filter(inWorld(world));
  
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[16px] font-semibold tracking-[-0.015em] text-foreground">Compare futures</div>
                <div className="mt-0.5 text-[13px] text-foreground-subtle">Nothing here touches your real data.</div>
              </div>
              <div className="flex items-center gap-4 text-[12.5px] font-medium text-foreground-subtle">
                <span className="flex items-center gap-2"><i className="h-0.5 w-3 rounded-full bg-border-strong" />Current path</span>
                <span className="flex items-center gap-2"><i className="h-0.5 w-3 rounded-full bg-chart-1" />Scenario</span>
              </div>
            </div>
            <AreaChart height={250} labels={base.map((r) => r.label)} series={[{ name: 'Current', values: base.map((r) => r.balance), color: 'var(--border-strong)', dashed: true, fill: false }, { name: 'Scenario', values: alt.map((r) => r.balance), color: 'var(--chart-1)' }]} />
          </div>
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
            {[
              { l: 'In 12 months', v: base[11].balance, t: '' },
              { l: 'With scenario', v: alt[11].balance, t: d >= 0 ? 'text-positive' : 'text-negative' },
              { l: 'Difference', v: d, t: d >= 0 ? 'text-positive' : 'text-negative', s: true },
              { l: 'Lowest point', v: minAlt, t: minAlt < 0 ? 'text-negative' : '' }
            ].map((m) => (
              <div key={m.l} className="bg-surface p-4">
                <div className="text-eyebrow mb-1 font-medium uppercase text-foreground-subtle">{m.l}</div>
                <div className={cn("num text-[15px] font-semibold", m.t)}>{money(m.v, { compact: true, sign: m.s })}</div>
              </div>
            ))}
          </div>
        </Card>
        {(sc.monthlySave || 0) > 0 && (
          <div className="flex gap-3 rounded-xl border border-border bg-surface-muted/50 p-4 text-[13.5px] leading-relaxed">
            <Sparkles className="size-4 shrink-0 text-accent" />
            <p className="text-foreground-subtle">Setting aside <b className="text-foreground">{money(sc.monthlySave)}</b> monthly builds <b className="text-foreground">{money(sc.monthlySave * 11, { compact: true })}</b> in savings over the year, while your spending balance stays {minAlt >= 0 ? 'positive' : <b className="text-negative">under pressure</b>}.</p>
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-6">
        <Card className="p-4 sm:p-5">
          <div className="mb-3 text-[14px] font-semibold text-foreground">Quick scenarios</div>
          <div className="mb-5 flex flex-wrap gap-2">
            {(PRESETS[world] || PRESETS.personal)().map(([l, s]) => (
              <button key={l} className={cn("rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors", JSON.stringify(sc) === JSON.stringify(s) ? "border-foreground bg-foreground text-inverse-foreground" : "border-border bg-surface text-foreground-subtle hover:border-foreground-muted hover:text-foreground")} onClick={() => setSc(s)}>{l}</button>
            ))}
          </div>
          <div className="my-5 h-px bg-border" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {num('incomeDelta', world === 'business' ? 'Revenue change / mo' : 'Income change / mo')}
            {num('expenseDelta', 'Expense change / mo')}
            {num('oneTime', 'One-time purchase', 5000)}
            {num('oneTimeMonth', 'In month #', 1)}
            {num('incomeLoss', 'No income for (months)', 1)}
            {num('monthlySave', 'Save monthly')}
          </div>
          <div className="mt-5 flex gap-2">
            <Input className="flex-1" placeholder="Name this scenario" value={name} onChange={(e) => setName(e.target.value)} />
            <Button variant="primary" disabled={!Object.values(sc).some(Boolean)} onClick={() => { dispatch({ type: 'add', col: 'scenarios', item: { name: name || 'Untitled scenario', sc, world } } as Action); setName(''); }}>Save</Button>
          </div>
          <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setSc({})}>Reset</Button>
        </Card>
        
        {saved.length > 0 && (
          <Card className="p-4 sm:p-5">
            <div className="mb-3 text-[14px] font-semibold text-foreground">Saved scenarios</div>
            <div className="flex flex-col gap-1">
              {saved.map((s) => (
                <button key={s.id} className="group flex items-center justify-between rounded-lg p-2 text-left hover:bg-surface-muted" onClick={() => setSc(s.sc as unknown as Record<string, number>)}>
                  <div>
                    <div className="text-[13px] font-medium text-foreground">{s.name}</div>
                    <div className="num text-[12px] text-foreground-subtle">{money(forecast(state, world, 12, s.sc)[11].balance, { compact: true })} in 12 mo</div>
                  </div>
                  <Button variant="ghost" size="sm" icon className="opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'remove', col: 'scenarios', id: s.id }); }}><Trash2 className="size-4 text-negative" /></Button>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function PlansPage({ openAdd, openItem, initialTab = 'forecast' }: { openAdd: (t: string) => void; openItem: (t: string, id: string) => void; initialTab?: string }) {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState(initialTab);
  const world = state.world;

  // Reset tab if world changes or initialTab changes
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, world]);

  return (
    <div className="mx-auto max-w-[1040px] px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 max-md:mb-6">
        <div className="min-w-0">
          <div className="mb-1.5 text-meta text-foreground-subtle">Future</div>
          <h1 className="font-display text-page font-semibold text-foreground max-md:text-[26px] max-md:leading-8">Plans</h1>
        </div>
        <Seg value={tab} onChange={setTab} options={[{ value: 'forecast', label: 'Forecast' }, ...(world === 'personal' ? [{ value: 'goals', label: 'Goals' }, { value: 'trips', label: 'Trips' }] : []), { value: 'whatif', label: 'What-if' }]} />
      </div>
      {tab === 'forecast' && <ForecastView state={state} world={world} />}
      {tab === 'goals' && <GoalsView state={state} dispatch={dispatch} openAdd={openAdd} openItem={openItem} />}
      {tab === 'trips' && <TripsView state={state} openAdd={openAdd} openItem={openItem} />}
      {tab === 'whatif' && <ScenarioView state={state} dispatch={dispatch} world={world} />}
    </div>
  );
}
