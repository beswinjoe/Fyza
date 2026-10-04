import { AppState } from '../types/app';
import { AIResult } from '../types/ai';
import { AIAction } from '../types/store';
import { today, ymd, mkey, addMonths, monthLabel, inr, uid, daysInMonth, addDays } from './format';
import { emi, forecast, available, monthSummary, studentCycle, baselineVariable, businessMetrics, W } from './finance';

const add = (col: keyof AppState, item: Record<string, unknown>): AIAction => ({ type: 'add', col, item: { id: uid(), ...item } });
const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const chartOf = (rows: any[], alt?: any[]) => ({ labels: rows.map((r) => r.label), base: rows.map((r) => r.balance), alt: alt?.map((r) => r.balance) });

export function runWhatIf(state: AppState, sc: any, desc: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const base = forecast(state, world, 6);
  const alt = forecast(state, world, 6, sc);
  const d = alt[5].balance - base[5].balance;
  const minAlt = Math.min(...alt.map((r) => r.balance));
  return {
    kind: 'scenario', title: desc,
    summary: sc.monthlySave
      ? `You'd have ${inr(sc.monthlySave * 5)} set aside by ${alt[5].label}, while your spending balance ends at ${inr(alt[5].balance, { compact: true })}.`
      : `In 6 months you'd have ${inr(alt[5].balance, { compact: true })} instead of ${inr(base[5].balance, { compact: true })} — ${d >= 0 ? 'up' : 'down'} ${inr(Math.abs(d), { compact: true })}.${minAlt < 0 ? ' Your balance would dip below zero at some point.' : ''}`,
    metrics: [
      { label: 'Today’s plan', value: inr(base[5].balance, { compact: true }) },
      { label: 'Scenario', value: inr(alt[5].balance, { compact: true }), tone: d >= 0 ? 'pos' : 'neg' },
      { label: 'Lowest point', value: inr(minAlt, { compact: true }), tone: minAlt < 0 ? 'neg' : undefined },
    ],
    chart: chartOf(base, alt), scenario: { name: desc, sc },
    actions: [{ label: 'Save scenario', ops: [add('scenarios', { name: desc, sc, world, created: ymd(now) })] }],
  };
}

export function checkAffordability(state: AppState, price: number, item: string, isMonthly = false): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const avail = available(state, world);
  const fc = forecast(state, world, 12);
  const monthlyExp = fc[1]?.expense || 0;
  const buffer = Math.max(monthlyExp, 1);
  const monthlyIncome = state.recurring.filter((r) => W(r) === world && r.type === 'income').reduce((s, r) => s + r.amount, 0);

  if (isMonthly) {
    const alt = forecast(state, world, 6, { expenseDelta: price });
    const ok = alt.every((r) => r.balance > 0);
    const runway = world === 'business' ? businessMetrics(state) : null;
    return {
      kind: 'answer', title: ok ? 'Yes, with care' : 'Not yet', tone: ok ? 'pos' : 'neg',
      summary: ok ? `Adding ${inr(price)}/month keeps your balance positive for the next 6 months, ending around ${inr(alt[5].balance, { compact: true })}.` : `A ${inr(price)}/month commitment would push your balance negative by ${alt.find((r) => r.balance < 0)?.label}.`,
      metrics: [{ label: 'New monthly cost', value: inr(price) }, { label: 'Balance in 6 mo', value: inr(alt[5].balance, { compact: true }), tone: ok ? 'pos' : 'neg' },
        runway ? { label: 'Runway after', value: `${(runway.cash / (runway.avgExp + price)).toFixed(1)} mo` } : { label: 'Monthly income', value: inr(monthlyIncome) }],
      chart: chartOf(forecast(state, world, 6), alt),
    };
  }

  if (avail - price >= buffer) {
    return {
      kind: 'answer', title: `Yes — you can afford the ${item}`, tone: 'pos',
      summary: `After paying ${inr(price)}, you'd still have ${inr(avail - price)} — more than a month of expenses (${inr(buffer)}) as a cushion.`,
      metrics: [{ label: 'Available now', value: inr(avail, { compact: true }) }, { label: 'After purchase', value: inr(avail - price, { compact: true }), tone: 'pos' }, { label: 'Safety cushion', value: inr(buffer, { compact: true }) }],
      chart: chartOf(fc.slice(0, 6), forecast(state, world, 6, { oneTime: price })),
    };
  }

  const when = fc.find((r) => r.balance - price >= buffer);
  const monthsAway = when ? fc.indexOf(when) : null;
  const g = { name: cap(item), kind: 'custom', target: price, current: 0, monthly: Math.ceil(price / Math.max(1, monthsAway || 6) / 500) * 500, targetDate: ymd(when ? new Date(when.key + '-01') : addMonths(now, 6)) };
  return {
    kind: 'answer', title: when ? `Not today — comfortably by ${monthLabel(when.key, true)}` : 'Not in the next 12 months', tone: 'neg',
    summary: when ? `Buying now would leave ${inr(avail - price)}, below your one-month cushion of ${inr(buffer)}. Saving ${inr(g.monthly)}/month gets you there in ${monthsAway} month${(monthsAway || 0) > 1 ? 's' : ''}.` : `Your projected surplus isn't large enough yet. Consider a smaller budget or a longer savings plan.`,
    metrics: [{ label: 'Available now', value: inr(avail, { compact: true }) }, { label: 'Price', value: inr(price, { compact: true }) }, { label: 'Save monthly', value: inr(g.monthly) }],
    chart: chartOf(fc.slice(0, 6), forecast(state, world, 6, { oneTime: price })),
    actions: [{ label: `Create “${g.name}” goal`, ops: [add('goals', g)] }],
  };
}

export function projectSavings(state: AppState, targetDateYMD: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const target = new Date(targetDateYMD);
  const avail = available(state, world);
  const fc = forecast(state, world, 12);
  const idx = Math.min(11, Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth()));
  const rows = fc.slice(0, idx + 1);
  const saved = rows.reduce((s, r) => s + (r.income - r.expense), 0) - (fc[0].income - fc[0].expense) + (fc[0].balance - avail);
  const end = fc[idx].balance;
  return {
    kind: 'answer', title: `${inr(end, { compact: true })} by ${monthLabel(fc[idx].key, true)}`,
    summary: `Based on your recurring income, bills${state.loans.length ? ', EMIs' : ''}, planned trips and typical spending of ${inr(baselineVariable(state, world))}/month.${rows.some((r) => r.trips) ? ' Includes upcoming trip costs.' : ''}`,
    metrics: [{ label: 'Today', value: inr(avail, { compact: true }) }, { label: 'Projected', value: inr(end, { compact: true }), tone: end >= avail ? 'pos' : 'neg' }, { label: 'Avg. monthly surplus', value: inr(saved / Math.max(1, idx + 1), { compact: true }) }],
    chart: chartOf(rows.length > 1 ? rows : fc.slice(0, 6)),
  };
}

export function getSpendAllowance(state: AppState, days: number): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const avail = available(state, world);
  const fc = forecast(state, world, 6);
  const cyc = studentCycle(state);
  const dim = daysInMonth(now.getFullYear(), now.getMonth());
  const daysLeft = cyc ? cyc.daysLeft : dim - now.getDate() + 1;
  const free = cyc ? cyc.remaining : Math.max(0, fc[0].balance - avail + (fc[0].variable || 0));
  const daily = free / daysLeft;
  const span = days;
  return {
    kind: 'answer', title: `${inr(daily * span)} ${span === 7 ? 'this week' : span === 1 ? 'today' : 'until month end'}`, tone: 'pos',
    summary: `That's ${inr(daily)}/day for the next ${daysLeft} days, after setting aside upcoming bills${cyc ? ' until your next pocket money' : ''}.`,
    metrics: [{ label: 'Free to spend', value: inr(free) }, { label: 'Per day', value: inr(daily) }, { label: 'Days left', value: String(daysLeft) }],
  };
}

export function explainChanges(state: AppState): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const a = monthSummary(state, mkey(addMonths(now, -1)), world), b = monthSummary(state, mkey(addMonths(now, -2)), world);
  const cats = [...new Set([...Object.keys(a.byCategory), ...Object.keys(b.byCategory)])]
    .map((c) => ({ c, d: (a.byCategory[c] || 0) - (b.byCategory[c] || 0) })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 4);
  const isProfit = world === 'business';
  const dNet = a.net - b.net, dExp = a.expense - b.expense, dInc = a.income - b.income;
  return {
    kind: 'answer', title: isProfit ? `Profit ${dNet >= 0 ? 'rose' : 'fell'} ${inr(Math.abs(dNet), { compact: true })} in ${monthLabel(mkey(addMonths(now, -1)))}` : `Spending ${dExp >= 0 ? 'rose' : 'fell'} ${inr(Math.abs(dExp), { compact: true })} in ${monthLabel(mkey(addMonths(now, -1)))}`,
    summary: isProfit ? `Revenue ${dInc >= 0 ? 'grew' : 'dropped'} by ${inr(Math.abs(dInc), { compact: true })} while expenses ${dExp >= 0 ? 'grew' : 'fell'} by ${inr(Math.abs(dExp), { compact: true })}.` : `Compared with the month before. The biggest movers:`,
    bullets: cats.map((x) => `${x.c}: ${x.d >= 0 ? '+' : '−'}${inr(Math.abs(x.d)).replace('−', '')}`),
    metrics: [{ label: monthLabel(mkey(addMonths(now, -2))), value: inr(isProfit ? b.net : b.expense, { compact: true }) }, { label: monthLabel(mkey(addMonths(now, -1))), value: inr(isProfit ? a.net : a.expense, { compact: true }), tone: (isProfit ? dNet >= 0 : dExp <= 0) ? 'pos' : 'neg' }],
  };
}

export function suggestBudget(state: AppState): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const monthlyIncome = state.recurring.filter((r) => W(r) === world && r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const inc = monthlyIncome || monthSummary(state, mkey(addMonths(now, -1)), world).income;
  const last = monthSummary(state, mkey(addMonths(now, -1)), world).byCategory;
  const top = Object.entries(last).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return {
    kind: 'answer', title: `A ${inr(inc, { compact: true })} monthly plan`,
    summary: 'Built on a 50 / 30 / 20 split, tuned to how you actually spent last month.',
    metrics: [{ label: 'Needs · 50%', value: inr(inc * 0.5) }, { label: 'Wants · 30%', value: inr(inc * 0.3) }, { label: 'Save · 20%', value: inr(inc * 0.2), tone: 'pos' }],
    bullets: top.map(([c, v]) => `${c}: spent ${inr(v)} → suggest ${inr(Math.round((v * 0.9) / 100) * 100)}`),
  };
}

export function planTrip(state: AppState, destination: string, days: number, budget?: Record<string, number>, targetDateYMD?: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const m = targetDateYMD ? new Date(targetDateYMD) : addMonths(now, 1);
  const start = new Date(m.getFullYear(), m.getMonth(), m.getMonth() === now.getMonth() ? Math.min(now.getDate() + 7, 20) : 18);
  const total = budget ? Object.values(budget).reduce((a, b) => a + b, 0) : 0;
  const key = mkey(start);
  const fc = forecast(state, world, 12);
  const row = fc.find((r) => r.key === key);
  const monthlyExp = fc[1]?.expense || 0;
  const normal = row ? row.expense - row.trips : monthlyExp;
  return {
    kind: 'action', title: `${destination} · ${days} days in ${monthLabel(key, true)}`,
    summary: `Estimated ${inr(total)}. Your ${monthLabel(key, true).split(' ')[0]} spending becomes ${inr(normal + total)} — normally ${inr(normal)} plus ${destination} ${inr(total)}.`,
    metrics: [{ label: 'Normal month', value: inr(normal, { compact: true }) }, { label: `${destination} trip`, value: `+${inr(total, { compact: true })}` }, { label: `${monthLabel(key)} total`, value: inr(normal + total, { compact: true }), tone: 'neg' }],
    breakdown: budget,
    actions: [{ label: 'Create trip', ops: [add('trips', { destination: cap(destination), start: ymd(start), end: ymd(addDays(start, days - 1)), budget, world })] }],
  };
}

export function addLoan(state: AppState, amount: number, rate: number, tenureMonths: number, type: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const e = emi(amount, rate, tenureMonths);
  const interest = e * tenureMonths - amount;
  return {
    kind: 'action', title: `${cap(type)} loan · ${inr(amount, { compact: true })}`,
    summary: `At ${rate}% for ${tenureMonths} months, your EMI is ${inr(e)}. You'll pay ${inr(interest, { compact: true })} in interest overall. I'll add it to your monthly forecast from next month.`,
    metrics: [{ label: 'Monthly EMI', value: inr(e) }, { label: 'Total interest', value: inr(interest, { compact: true }), tone: 'neg' }, { label: 'Total payable', value: inr(e * tenureMonths, { compact: true }) }],
    actions: [{ label: 'Add loan', ops: [add('loans', { name: `${cap(type)} loan`, type, principal: amount, rate, tenureMonths, startDate: ymd(now), world })] }],
  };
}

export function createGoal(state: AppState, name: string, target: number, targetDateYMD: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const now = today();
  const when = new Date(targetDateYMD);
  const months = Math.max(1, (when.getFullYear() - now.getFullYear()) * 12 + when.getMonth() - now.getMonth());
  const monthly = Math.ceil(target / months / 100) * 100;
  const fc = forecast(state, state.world, 12);
  const surplus = (fc[11].balance - fc[0].balance) / 11;
  return {
    kind: 'action', title: `Save ${inr(target, { compact: true })} by ${monthLabel(mkey(when), true)}`,
    summary: `That's ${inr(monthly)}/month for ${months} months. ${surplus >= monthly ? `Your projected surplus of ~${inr(surplus, { compact: true })}/month covers it.` : `That's more than your current surplus (~${inr(Math.max(0, surplus), { compact: true })}/mo) — you may need to trim spending.`}`,
    tone: surplus >= monthly ? 'pos' : 'neg',
    metrics: [{ label: 'Monthly', value: inr(monthly) }, { label: 'Months', value: String(months) }, { label: 'Your surplus', value: inr(surplus, { compact: true }), tone: surplus >= monthly ? 'pos' : 'neg' }],
    actions: [{ label: 'Create goal', ops: [add('goals', { name: cap(name), kind: 'custom', target, current: 0, monthly, targetDate: ymd(when) })] }],
  };
}

export function transferMoney(state: AppState, amount: number, toPersonal: boolean): Omit<AIResult, 'id' | 'q' | 'at'> {
  const from = state.accounts.find((a) => W(a) === (toPersonal ? 'business' : 'personal'));
  const to = state.accounts.find((a) => W(a) === (toPersonal ? 'personal' : 'business'));
  if (!from || !to) {
    return {
      kind: 'answer', title: 'Accounts missing', summary: `You need both a personal and business account to transfer money.`
    };
  }
  return {
    kind: 'action', title: `Transfer ${inr(amount)} ${toPersonal ? 'Business → Personal' : 'Personal → Business'}`,
    summary: `This moves money between your worlds. It won't count as new income or as an expense — it only changes which side holds the cash.`,
    metrics: [{ label: 'From', value: from.name }, { label: 'To', value: to.name }],
    actions: [{ label: 'Record transfer', ops: [add('transactions', { type: 'transfer', amount, fromAccountId: from.id, toAccountId: to.id, fromWorld: W(from), toWorld: W(to), date: ymd(today()), note: toPersonal ? 'Owner draw → Personal' : 'Capital → Business', world: W(from), tags: [] })] }],
  };
}

export function addRecurring(state: AppState, amount: number, category: string, type: 'income' | 'expense', name: string, day: number, weekly = false): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const isIncome = type === 'income';
  const acc = state.accounts.find((a) => W(a) === world);
  const item = { name: cap(name), type, amount, day, category: cap(category), accountId: acc?.id, world };
  return {
    kind: 'action', title: `${isIncome ? 'Recurring income' : 'Recurring payment'} · ${item.name}`,
    summary: `${inr(amount)} ${isIncome ? 'arriving' : 'due'} on the ${day}${['th', 'st', 'nd', 'rd'][(day % 10 > 3 || ~~(day / 10) === 1) ? 0 : day % 10]} of every month${weekly ? ` (${inr(Math.round(amount * 12 / 52))}/week)` : ''}. This will appear in every future forecast.`,
    metrics: [{ label: 'Monthly', value: inr(amount), tone: isIncome ? 'pos' : undefined }, { label: 'Yearly', value: inr(amount * 12, { compact: true }) }, { label: 'Category', value: item.category }],
    actions: [{ label: `Add ${isIncome ? 'income' : 'payment'}`, ops: [add('recurring', item)] }],
  };
}

export function addTransaction(state: AppState, amount: number, category: string, type: 'income' | 'expense', date_str: string, note: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const date = date_str;
  const isExp = type === 'expense';
  const acc = state.accounts.find((a) => W(a) === world);
  const item = { type, amount, category, date, accountId: acc?.id, note: cap(note), world, tags: [] };
  const cm = monthSummary(state, mkey(new Date(date)), world);
  return {
    kind: 'action', title: `${isExp ? '−' : '+'}${inr(amount)} · ${item.note}`,
    summary: isExp
      ? `Logged under ${category}${acc ? ` from ${acc.name}` : ''}. ${category} this month: ${inr((cm.byCategory[category] || 0) + amount)}.`
      : `Added to ${acc?.name || 'your account'}. Income this month: ${inr(cm.income + amount)}.`,
    metrics: [{ label: 'Category', value: category }, { label: 'Date', value: date === ymd(today()) ? 'Today' : date }, { label: 'Account', value: acc?.name || '—' }],
    actions: [{ label: isExp ? 'Add expense' : 'Add income', ops: [add('transactions', item)] }],
    autoApply: true,
  };
}

export function getFinancialContext(state: AppState): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const avail = available(state, world);
  const fc = forecast(state, world, 6);
  const cm = monthSummary(state, mkey(today()), world);
  
  return {
    kind: 'answer', title: 'Financial Context',
    summary: `Currently available: ${inr(avail, { compact: true })}. This month: ${inr(cm.income, { compact: true })} in, ${inr(cm.expense, { compact: true })} out. Projected 6 month balance: ${inr(fc[5].balance, { compact: true })}.`,
    metrics: [{ label: 'Available', value: inr(avail, { compact: true }) }, { label: 'Monthly Surplus', value: inr(cm.net, { compact: true }) }],
    chart: chartOf(fc),
  };
}

export function whenCanIAfford(state: AppState, price: number, item: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const fc = forecast(state, world, 12);
  const avail = available(state, world);
  const monthlyExp = fc[1]?.expense || 0;
  const when = fc.find((r) => r.balance - price >= monthlyExp);
  const surplus = Math.max(1, (fc[11].balance - fc[0].balance) / 11);
  const monthsNeeded = when ? fc.indexOf(when) : Math.ceil((price + monthlyExp - avail) / surplus);
  return {
    kind: 'answer', title: `Around ${monthLabel(mkey(addMonths(now, monthsNeeded)), true)}`,
    summary: `At your current surplus of ~${inr(surplus, { compact: true })}/month, you'd reach the price plus a one-month cushion in ${monthsNeeded} months.`,
    metrics: [{ label: 'Target', value: inr(price, { compact: true }) }, { label: 'Monthly surplus', value: inr(surplus, { compact: true }) }, { label: 'Months', value: String(monthsNeeded) }],
    actions: [{ label: 'Turn into a goal', ops: [add('goals', { name: cap(item), kind: 'custom', target: price, current: 0, monthly: Math.round(surplus / 500) * 500, targetDate: ymd(addMonths(now, monthsNeeded)) })] }],
  };
}

