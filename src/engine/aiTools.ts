import { AppState } from '../types/app';
import { AIResult } from '../types/ai';
import { AIAction } from '../types/store';
import { today, ymd, mkey, addMonths, monthLabel, money, uid, daysInMonth, addDays, parseDate } from './format';
import { emi, forecast, available, monthSummary, studentCycle, baselineVariable, businessMetrics, W } from './finance';

export class ToolError extends Error {
  constructor(public code: 'INVALID_AMOUNT' | 'INVALID_DATE' | 'INVALID_RECORD' | 'RECORD_NOT_FOUND' | 'AMBIGUOUS_REQUEST' | 'CONFIRMATION_REQUIRED' | 'CALCULATION_ERROR', message: string) {
    super(message);
    this.name = 'ToolError';
  }
}

export function validateAmount(val: unknown): number {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) throw new ToolError('INVALID_AMOUNT', 'Please provide a valid positive amount.');
  return n;
}

export function validateDateStr(val: unknown): string {
  if (typeof val !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val)) throw new ToolError('INVALID_DATE', 'Please provide a valid date in YYYY-MM-DD format.');
  const d = parseDate(val);
  if (isNaN(d.getTime()) || val !== ymd(d)) throw new ToolError('INVALID_DATE', 'The date provided is invalid.');
  return val;
}

const add = (col: keyof AppState, item: Record<string, unknown>): AIAction => ({ type: 'add', col, item: { id: uid(), ...item } });
const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
const chartOf = (rows: { label: string, balance: number }[], alt?: { balance: number }[]) => ({ labels: rows.map((r) => r.label), base: rows.map((r) => r.balance), alt: alt?.map((r) => r.balance) });

export function runWhatIf(state: AppState, sc: Record<string, number>, desc: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const world = state.world;
  const now = today();
  const base = forecast(state, world, 6);
  const alt = forecast(state, world, 6, sc);
  const d = alt[5].balance - base[5].balance;
  const minAlt = Math.min(...alt.map((r) => r.balance));
  return {
    kind: 'scenario', title: desc,
    summary: sc.monthlySave
      ? `You'd have ${money(sc.monthlySave * 5)} set aside by ${alt[5].label}, while your spending balance ends at ${money(alt[5].balance, { compact: true })}.`
      : `In 6 months you'd have ${money(alt[5].balance, { compact: true })} instead of ${money(base[5].balance, { compact: true })} — ${d >= 0 ? 'up' : 'down'} ${money(Math.abs(d), { compact: true })}.${minAlt < 0 ? ' Your balance would dip below zero at some point.' : ''}`,
    metrics: [
      { label: 'Today’s plan', value: money(base[5].balance, { compact: true }) },
      { label: 'Scenario', value: money(alt[5].balance, { compact: true }), tone: d >= 0 ? 'pos' : 'neg' },
      { label: 'Lowest point', value: money(minAlt, { compact: true }), tone: minAlt < 0 ? 'neg' : undefined },
    ],
    chart: chartOf(base, alt), scenario: { name: desc, sc },
    actions: [{ label: 'Save scenario', ops: [add('scenarios', { name: desc, sc, world, created: ymd(now) })] }],
  };
}

export function checkAffordability(state: AppState, priceRaw: unknown, item: string, isMonthly = false): Omit<AIResult, 'id' | 'q' | 'at'> {
  const price = validateAmount(priceRaw);
  if (!item) throw new ToolError('AMBIGUOUS_REQUEST', 'What item are you checking affordability for?');
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
      summary: ok ? `Adding ${money(price)}/month keeps your balance positive for the next 6 months, ending around ${money(alt[5].balance, { compact: true })}.` : `A ${money(price)}/month commitment would push your balance negative by ${alt.find((r) => r.balance < 0)?.label}.`,
      metrics: [{ label: 'New monthly cost', value: money(price) }, { label: 'Balance in 6 mo', value: money(alt[5].balance, { compact: true }), tone: ok ? 'pos' : 'neg' },
        runway ? { label: 'Runway after', value: `${(runway.cash / (runway.avgExp + price)).toFixed(1)} mo` } : { label: 'Monthly income', value: money(monthlyIncome) }],
      chart: chartOf(forecast(state, world, 6), alt),
    };
  }

  if (avail - price >= buffer) {
    return {
      kind: 'answer', title: `Yes — you can afford the ${item}`, tone: 'pos',
      summary: `After paying ${money(price)}, you'd still have ${money(avail - price)} — more than a month of expenses (${money(buffer)}) as a cushion.`,
      metrics: [{ label: 'Available now', value: money(avail, { compact: true }) }, { label: 'After purchase', value: money(avail - price, { compact: true }), tone: 'pos' }, { label: 'Safety cushion', value: money(buffer, { compact: true }) }],
      chart: chartOf(fc.slice(0, 6), forecast(state, world, 6, { oneTime: price })),
    };
  }

  const when = fc.find((r) => r.balance - price >= buffer);
  const monthsAway = when ? fc.indexOf(when) : null;
  const g = { name: cap(item), kind: 'custom', target: price, current: 0, monthly: Math.ceil(price / Math.max(1, monthsAway || 6) / 500) * 500, targetDate: ymd(when ? parseDate(when.key + '-01') : addMonths(now, 6)) };
  return {
    kind: 'answer', title: when ? `Not today — comfortably by ${monthLabel(when.key, true)}` : 'Not in the next 12 months', tone: 'neg',
    summary: when ? `Buying now would leave ${money(avail - price)}, below your one-month cushion of ${money(buffer)}. Saving ${money(g.monthly)}/month gets you there in ${monthsAway} month${(monthsAway || 0) > 1 ? 's' : ''}.` : `Your projected surplus isn't large enough yet. Consider a smaller budget or a longer savings plan.`,
    metrics: [{ label: 'Available now', value: money(avail, { compact: true }) }, { label: 'Price', value: money(price, { compact: true }) }, { label: 'Save monthly', value: money(g.monthly) }],
    chart: chartOf(fc.slice(0, 6), forecast(state, world, 6, { oneTime: price })),
    actions: [{ label: `Create “${g.name}” goal`, ops: [add('goals', g)] }],
  };
}

export function projectSavings(state: AppState, targetDateYMD: unknown): Omit<AIResult, 'id' | 'q' | 'at'> {
  const dateStr = validateDateStr(targetDateYMD);
  const world = state.world;
  const now = today();
  const target = parseDate(dateStr);
  const avail = available(state, world);
  const fc = forecast(state, world, 12);
  const idx = Math.min(11, Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth()));
  const rows = fc.slice(0, idx + 1);
  const saved = rows.reduce((s, r) => s + (r.income - r.expense), 0) - (fc[0].income - fc[0].expense) + (fc[0].balance - avail);
  const end = fc[idx].balance;
  return {
    kind: 'answer', title: `${money(end, { compact: true })} by ${monthLabel(fc[idx].key, true)}`,
    summary: `Based on your recurring income, bills${state.loans.length ? ', EMIs' : ''}, planned trips and typical spending of ${money(baselineVariable(state, world))}/month.${rows.some((r) => r.trips) ? ' Includes upcoming trip costs.' : ''}`,
    metrics: [{ label: 'Today', value: money(avail, { compact: true }) }, { label: 'Projected', value: money(end, { compact: true }), tone: end >= avail ? 'pos' : 'neg' }, { label: 'Avg. monthly surplus', value: money(saved / Math.max(1, idx + 1), { compact: true }) }],
    chart: chartOf(rows.length > 1 ? rows : fc.slice(0, 6)),
  };
}

export function getSpendAllowance(state: AppState, days: number): Omit<AIResult, 'id' | 'q' | 'at'> {
  if (!Number.isFinite(days) || days <= 0) throw new ToolError('INVALID_DATE', 'Please provide a valid number of days.');
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
    kind: 'answer', title: `${money(daily * span)} ${span === 7 ? 'this week' : span === 1 ? 'today' : 'until month end'}`, tone: 'pos',
    summary: `That's ${money(daily)}/day for the next ${daysLeft} days, after setting aside upcoming bills${cyc ? ' until your next pocket money' : ''}.`,
    metrics: [{ label: 'Free to spend', value: money(free) }, { label: 'Per day', value: money(daily) }, { label: 'Days left', value: String(daysLeft) }],
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
    kind: 'answer', title: isProfit ? `Profit ${dNet >= 0 ? 'rose' : 'fell'} ${money(Math.abs(dNet), { compact: true })} in ${monthLabel(mkey(addMonths(now, -1)))}` : `Spending ${dExp >= 0 ? 'rose' : 'fell'} ${money(Math.abs(dExp), { compact: true })} in ${monthLabel(mkey(addMonths(now, -1)))}`,
    summary: isProfit ? `Revenue ${dInc >= 0 ? 'grew' : 'dropped'} by ${money(Math.abs(dInc), { compact: true })} while expenses ${dExp >= 0 ? 'grew' : 'fell'} by ${money(Math.abs(dExp), { compact: true })}.` : `Compared with the month before. The biggest movers:`,
    bullets: cats.map((x) => `${x.c}: ${x.d >= 0 ? '+' : '−'}${money(Math.abs(x.d)).replace('−', '')}`),
    metrics: [{ label: monthLabel(mkey(addMonths(now, -2))), value: money(isProfit ? b.net : b.expense, { compact: true }) }, { label: monthLabel(mkey(addMonths(now, -1))), value: money(isProfit ? a.net : a.expense, { compact: true }), tone: (isProfit ? dNet >= 0 : dExp <= 0) ? 'pos' : 'neg' }],
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
    kind: 'answer', title: `A ${money(inc, { compact: true })} monthly plan`,
    summary: 'Built on a 50 / 30 / 20 split, tuned to how you actually spent last month.',
    metrics: [{ label: 'Needs · 50%', value: money(inc * 0.5) }, { label: 'Wants · 30%', value: money(inc * 0.3) }, { label: 'Save · 20%', value: money(inc * 0.2), tone: 'pos' }],
    bullets: top.map(([c, v]) => `${c}: spent ${money(v)} → suggest ${money(Math.round((v * 0.9) / 100) * 100)}`),
  };
}

export function planTrip(state: AppState, destination: string, days: number, budget?: Record<string, number>, targetDateYMD?: unknown): Omit<AIResult, 'id' | 'q' | 'at'> {
  if (!destination) throw new ToolError('AMBIGUOUS_REQUEST', 'Where are you planning to go?');
  if (!Number.isFinite(days) || days <= 0) throw new ToolError('AMBIGUOUS_REQUEST', 'How many days is the trip?');
  const world = state.world;
  const now = today();
  const m = targetDateYMD ? parseDate(validateDateStr(targetDateYMD)) : addMonths(now, 1);
  const start = new Date(m.getFullYear(), m.getMonth(), m.getMonth() === now.getMonth() ? Math.min(now.getDate() + 7, 20) : 18);
  const total = budget ? Object.values(budget).reduce((a, b) => a + b, 0) : 0;
  const key = mkey(start);
  const fc = forecast(state, world, 12);
  const row = fc.find((r) => r.key === key);
  const monthlyExp = fc[1]?.expense || 0;
  const normal = row ? row.expense - row.trips : monthlyExp;
  return {
    kind: 'action', title: `${destination} · ${days} days in ${monthLabel(key, true)}`,
    summary: `Estimated ${money(total)}. Your ${monthLabel(key, true).split(' ')[0]} spending becomes ${money(normal + total)} — normally ${money(normal)} plus ${destination} ${money(total)}.`,
    metrics: [{ label: 'Normal month', value: money(normal, { compact: true }) }, { label: `${destination} trip`, value: `+${money(total, { compact: true })}` }, { label: `${monthLabel(key)} total`, value: money(normal + total, { compact: true }), tone: 'neg' }],
    breakdown: budget,
    actions: [{ label: 'Create trip', ops: [add('trips', { destination: cap(destination), start: ymd(start), end: ymd(addDays(start, days - 1)), budget, world })] }],
  };
}

export function addLoan(state: AppState, amountRaw: unknown, rate: unknown, tenureMonths: number, type: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const amount = validateAmount(amountRaw);
  const r = validateAmount(rate);
  if (!Number.isFinite(tenureMonths) || tenureMonths <= 0) throw new ToolError('INVALID_DATE', 'Please provide a valid loan tenure in months.');
  const world = state.world;
  const now = today();
  const e = emi(amount, r, tenureMonths);
  const interest = e * tenureMonths - amount;
  return {
    kind: 'action', title: `${cap(type || 'Personal')} loan · ${money(amount, { compact: true })}`,
    summary: `At ${r}% for ${tenureMonths} months, your EMI is ${money(e)}. You'll pay ${money(interest, { compact: true })} in interest overall. I'll add it to your monthly forecast from next month.`,
    metrics: [{ label: 'Monthly EMI', value: money(e) }, { label: 'Total interest', value: money(interest, { compact: true }), tone: 'neg' }, { label: 'Total payable', value: money(e * tenureMonths, { compact: true }) }],
    actions: [{ label: 'Confirm & Add', ops: [add('loans', { name: `${cap(type || 'Personal')} loan`, type: type || 'personal', principal: amount, rate: r, tenureMonths, startDate: ymd(now), world })] }],
  };
}

export function createGoal(state: AppState, name: string, targetRaw: unknown, targetDateYMD: unknown): Omit<AIResult, 'id' | 'q' | 'at'> {
  const target = validateAmount(targetRaw);
  const dateStr = validateDateStr(targetDateYMD);
  if (!name) throw new ToolError('AMBIGUOUS_REQUEST', 'What are you saving for? Please provide a goal name.');
  const now = today();
  const when = parseDate(dateStr);
  const months = Math.max(1, (when.getFullYear() - now.getFullYear()) * 12 + when.getMonth() - now.getMonth());
  const monthly = Math.ceil(target / months / 100) * 100;
  const fc = forecast(state, state.world, 12);
  const surplus = (fc[11].balance - fc[0].balance) / 11;
  return {
    kind: 'action', title: `Save ${money(target, { compact: true })} by ${monthLabel(mkey(when), true)}`,
    summary: `That's ${money(monthly)}/month for ${months} months. ${surplus >= monthly ? `Your projected surplus of ~${money(surplus, { compact: true })}/month covers it.` : `That's more than your current surplus (~${money(Math.max(0, surplus), { compact: true })}/mo) — you may need to trim spending.`}`,
    tone: surplus >= monthly ? 'pos' : 'neg',
    metrics: [{ label: 'Monthly', value: money(monthly) }, { label: 'Months', value: String(months) }, { label: 'Your surplus', value: money(surplus, { compact: true }), tone: surplus >= monthly ? 'pos' : 'neg' }],
    actions: [{ label: 'Confirm & Create', ops: [add('goals', { name: cap(name), kind: 'custom', target, current: 0, monthly, targetDate: ymd(when), world: state.world })] }],
  };
}

export function transferMoney(state: AppState, amountRaw: unknown, toPersonal: boolean): Omit<AIResult, 'id' | 'q' | 'at'> {
  const amount = validateAmount(amountRaw);
  const from = state.accounts.find((a) => W(a) === (toPersonal ? 'business' : 'personal'));
  const to = state.accounts.find((a) => W(a) === (toPersonal ? 'personal' : 'business'));
  if (!from || !to) throw new ToolError('RECORD_NOT_FOUND', 'You need both a personal and business account to transfer money.');
  return {
    kind: 'action', title: `Transfer ${money(amount)} ${toPersonal ? 'Business → Personal' : 'Personal → Business'}`,
    summary: `This moves money between your worlds. It won't count as new income or as an expense — it only changes which side holds the cash.`,
    metrics: [{ label: 'From', value: from.name }, { label: 'To', value: to.name }],
    actions: [{ label: 'Confirm Transfer', ops: [add('transactions', { type: 'transfer', amount, fromAccountId: from.id, toAccountId: to.id, fromWorld: W(from), toWorld: W(to), date: ymd(today()), note: toPersonal ? 'Owner draw → Personal' : 'Capital → Business', world: W(from), tags: [] })] }],
  };
}

export function addRecurring(state: AppState, amountRaw: unknown, category: string, type: 'income' | 'expense', name: string, day: number, weekly = false): Omit<AIResult, 'id' | 'q' | 'at'> {
  const amount = validateAmount(amountRaw);
  if (!name) throw new ToolError('AMBIGUOUS_REQUEST', 'Please provide a name for this recurring item.');
  if (day < 1 || day > 31) throw new ToolError('INVALID_DATE', 'Day of month must be between 1 and 31.');
  const world = state.world;
  const isIncome = type === 'income';
  const acc = state.accounts.find((a) => W(a) === world);
  const item = { name: cap(name), type, amount, day, category: cap(category || 'Other'), accountId: acc?.id, world };
  return {
    kind: 'action', title: `${isIncome ? 'Recurring income' : 'Recurring payment'} · ${item.name}`,
    summary: `${money(amount)} ${isIncome ? 'arriving' : 'due'} on the ${day}${['th', 'st', 'nd', 'rd'][(day % 10 > 3 || ~~(day / 10) === 1) ? 0 : day % 10]} of every month${weekly ? ` (${money(Math.round(amount * 12 / 52))}/week)` : ''}. This will appear in every future forecast.`,
    metrics: [{ label: 'Monthly', value: money(amount), tone: isIncome ? 'pos' : undefined }, { label: 'Yearly', value: money(amount * 12, { compact: true }) }, { label: 'Category', value: item.category }],
    actions: [{ label: `Confirm & Add`, ops: [add('recurring', item)] }],
  };
}

export function addTransaction(state: AppState, amountRaw: unknown, category: string, type: 'income' | 'expense', date_str: unknown, note: string): Omit<AIResult, 'id' | 'q' | 'at'> {
  const amount = validateAmount(amountRaw);
  const date = validateDateStr(date_str);
  if (!type || (type !== 'expense' && type !== 'income')) throw new ToolError('AMBIGUOUS_REQUEST', 'What should I record this as — income or expense?');
  const world = state.world;
  const isExp = type === 'expense';
  const acc = state.accounts.find((a) => W(a) === world);
  
  // Duplicate protection (idempotency check by same amount, type, date, and world in the last 5 transactions)
  const isDup = state.transactions.slice(-5).some(t => t.amount === amount && t.type === type && t.date === date && t.world === world);
  
  const item = { type, amount, category: cap(category || (isExp ? 'Expense' : 'Income')), date, accountId: acc?.id, note: cap(note || ''), world, tags: [] };
  const cm = monthSummary(state, mkey(parseDate(date)), world);
  return {
    kind: 'action', title: `${isExp ? '−' : '+'}${money(amount)} · ${item.note || item.category}`,
    summary: isDup ? `Warning: A similar transaction was recently added. Are you sure?` : isExp
      ? `Logged under ${item.category}${acc ? ` from ${acc.name}` : ''}. ${item.category} this month: ${money((cm.byCategory[item.category] || 0) + amount)}.`
      : `Added to ${acc?.name || 'your account'}. Income this month: ${money(cm.income + amount)}.`,
    metrics: [{ label: 'Category', value: item.category }, { label: 'Date', value: date === ymd(today()) ? 'Today' : date }, { label: 'Account', value: acc?.name || '—' }],
    actions: [{ label: isExp ? 'Add expense' : 'Add income', ops: [add('transactions', item)] }],
    autoApply: !isDup && amount < 100000, // require confirmation for very large single transactions or duplicates
  };
}

export function deleteTransaction(state: AppState, keyword: string, amountStr?: unknown): Omit<AIResult, 'id' | 'q' | 'at'> {
  const amount = amountStr ? validateAmount(amountStr) : undefined;
  if (!keyword) throw new ToolError('AMBIGUOUS_REQUEST', 'Which transaction do you want to delete?');
  const k = keyword.toLowerCase();
  const matches = state.transactions.filter(t => t.world === state.world && ((t.note || '').toLowerCase().includes(k) || (t.category || '').toLowerCase().includes(k)) && (amount === undefined || t.amount === amount));
  
  if (matches.length === 0) throw new ToolError('RECORD_NOT_FOUND', `I couldn't find any transaction matching "${keyword}"${amount ? ` for ${money(amount)}` : ''}.`);
  if (matches.length > 1) throw new ToolError('AMBIGUOUS_REQUEST', `Found ${matches.length} matching transactions. Please be more specific (e.g. provide the exact amount or date).`);
  
  const t = matches[0];
  return {
    kind: 'action', title: `Delete Transaction`,
    summary: `Are you sure you want to delete the ${t.type} "${t.note || t.category}" for ${money(t.amount)} on ${t.date}?`,
    metrics: [{ label: 'Amount', value: money(t.amount) }, { label: 'Date', value: t.date }],
    actions: [{ label: 'Delete', ops: [{ type: 'remove', col: 'transactions', id: t.id }] }],
    autoApply: false, // NEVER silently delete
  };
}

export function getFinancialContext(state: AppState): Omit<AIResult, 'id' | 'q' | 'at'> & { analysisData?: Record<string, unknown> } {
  const world = state.world;
  const avail = available(state, world);
  const fc = forecast(state, world, 6);
  const cm = monthSummary(state, mkey(today()), world);
  
  return {
    kind: 'answer', title: 'Financial Context',
    summary: `Fetching detailed financial context...`,
    analysisData: {
      currentAvailable: avail,
      thisMonth: {
        income: cm.income,
        expense: cm.expense,
        net: cm.net,
        byCategory: cm.byCategory,
      },
      upcomingRecurring: state.recurring.filter((r) => W(r) === world).map(r => ({ name: r.name, amount: r.amount, type: r.type, day: r.day })),
      activeGoals: state.goals.filter((g) => W(g) === world).map(g => ({ name: g.name, target: g.target, current: g.current, monthly: g.monthly, targetDate: g.targetDate })),
      upcomingTrips: state.trips.filter((t) => W(t) === world).map(t => ({ destination: t.destination, start: t.start, totalBudget: Object.values(t.budget).reduce((a, b) => a + b, 0) })),
      forecast: fc.slice(0, 3).map(f => ({ month: f.label, income: f.income, expense: f.expense, balance: f.balance })),
    },
    metrics: [{ label: 'Available', value: money(avail, { compact: true }) }, { label: 'Monthly Surplus', value: money(cm.net, { compact: true }) }],
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
    summary: `At your current surplus of ~${money(surplus, { compact: true })}/month, you'd reach the price plus a one-month cushion in ${monthsNeeded} months.`,
    metrics: [{ label: 'Target', value: money(price, { compact: true }) }, { label: 'Monthly surplus', value: money(surplus, { compact: true }) }, { label: 'Months', value: String(monthsNeeded) }],
    actions: [{ label: 'Turn into a goal', ops: [add('goals', { name: cap(item), kind: 'custom', target: price, current: 0, monthly: Math.round(surplus / 500) * 500, targetDate: ymd(addMonths(now, monthsNeeded)) })] }],
  };
}

export function searchTransactions(state: AppState, keyword?: string, category?: string, type?: 'income' | 'expense'): Omit<AIResult, 'id' | 'q' | 'at'> & { analysisData?: Record<string, unknown> } {
  const world = state.world;
  let txs = state.transactions.filter(t => W(t) === world);
  if (type) txs = txs.filter(t => t.type === type);
  if (category) txs = txs.filter(t => (t.category || '').toLowerCase().includes(category.toLowerCase()));
  if (keyword) {
    const k = keyword.toLowerCase();
    txs = txs.filter(t => (t.note || '').toLowerCase().includes(k) || (t.category || '').toLowerCase().includes(k));
  }
  
  txs = txs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20); // Last 20 matching
  const total = txs.reduce((s, t) => s + (t.amount || 0), 0);
  
  return {
    kind: 'answer', title: 'Transaction Search',
    summary: `Found ${txs.length} transactions matching your query.`,
    analysisData: {
      transactions: txs.map(t => ({ date: t.date, note: t.note, category: t.category, amount: t.amount, type: t.type })),
      totalAmount: total,
    }
  };
}

