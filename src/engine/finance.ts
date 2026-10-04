// Financial engine — pure functions over the state model. No UI code here.
import { today, mkey, parseDate, addMonths, daysInMonth, daysBetween, monthsBetween, monthLabel, ymd, addDays } from './format';
import { AppState } from '../types/app';
import { World, Account, Card, Loan, Transaction, Trip, Goal, ScenarioDef } from '../types/finance';

export const W = (x: { world?: World }): World => x.world || 'personal';
export const inWorld = (world: World) => (x: { world?: World }) => W(x) === world;

/* ---------- Loans ---------- */
export function emi(P: number, rate: number, n: number): number {
  const r = rate / 1200;
  if (!n) return 0;
  if (!r) return P / n;
  const f = Math.pow(1 + r, n);
  return (P * r * f) / (f - 1);
}

export function loanStats(loan: Loan, now = today()) {
  const P = +loan.principal, n = +loan.tenureMonths, r = +loan.rate / 1200;
  const e = emi(P, +loan.rate, n);
  const start = parseDate(loan.startDate);
  const paid = Math.max(0, Math.min(n, monthsBetween(start, now)));
  let bal = P, interestPaid = 0, totalInterest = 0;
  const schedule = [];
  for (let i = 1; i <= n; i++) {
    const int = bal * r, prin = e - int;
    bal = Math.max(0, bal - prin);
    totalInterest += int;
    if (i <= paid) interestPaid += int;
    schedule.push({ i, interest: int, principal: prin, balance: bal });
  }
  const balance = paid === 0 ? P : schedule[paid - 1].balance;
  const nextDue = new Date(start.getFullYear(), start.getMonth() + paid + 1, start.getDate());
  const endDate = new Date(start.getFullYear(), start.getMonth() + n, start.getDate());
  return {
    emi: e, paid, remainingMonths: n - paid, balance, interestPaid,
    interestRemaining: totalInterest - interestPaid, totalInterest,
    totalPayable: P + totalInterest, progress: (P - balance) / P,
    nextDue: ymd(nextDue), endDate: ymd(endDate), schedule, active: paid < n,
  };
}

/* ---------- Accounts & cards ---------- */
export const isCredit = (state: AppState, cardId: string) => state.cards.find((c) => c.id === cardId)?.kind === 'credit';

export function accountBalance(state: AppState, acc: Account) {
  let b = +acc.opening || 0;
  for (const t of state.transactions) {
    if (t.type === 'transfer') {
      if (t.fromAccountId === acc.id) b -= t.amount;
      if (t.toAccountId === acc.id) b += t.amount;
    } else if (t.accountId === acc.id && !(t.cardId && isCredit(state, t.cardId))) {
      b += t.type === 'income' ? t.amount : -t.amount;
    }
  }
  return b;
}

export const available = (state: AppState, world: World) =>
  state.accounts.filter(inWorld(world)).reduce((s, a) => s + accountBalance(state, a), 0);

export function cardStats(state: AppState, card: Card, now = today()) {
  const sd = +(card.statementDay || 1);
  let cycleStart = new Date(now.getFullYear(), now.getMonth(), sd + 1);
  if (cycleStart > now) cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, sd + 1);
  const txns = state.transactions.filter((t) => t.cardId === card.id);
  const cycle = txns.filter((t) => parseDate(t.date) >= cycleStart);
  const spent = cycle.reduce((s, t) => s + t.amount, 0);
  const statement = new Date(cycleStart.getFullYear(), cycleStart.getMonth() + 1, sd);
  const due = new Date(statement.getFullYear(), statement.getMonth() + (+(card.dueDay || 0) < sd ? 1 : 0), +(card.dueDay || 0) || sd + 18);
  return {
    spent, txns, limit: +(card.limit || 0) || 0, availableLimit: Math.max(0, (+(card.limit || 0) || 0) - spent),
    utilization: card.limit ? spent / card.limit : 0, statementDate: ymd(statement), dueDate: ymd(due),
  };
}

/* ---------- Monthly summaries ---------- */
export function monthTx(state: AppState, key: string, world: World): Transaction[] {
  return state.transactions.filter((t) => (W(t) === world || (t.type === 'transfer' && (t.fromWorld === world || t.toWorld === world))) && t.date.startsWith(key));
}

export function monthSummary(state: AppState, key: string, world: World, uptoDay = 31) {
  const tx = monthTx(state, key, world).filter((t) => +t.date.slice(8, 10) <= uptoDay);
  let income = 0, expense = 0, transferIn = 0, transferOut = 0;
  const byCategory: Record<string, number> = {};
  for (const t of tx) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') { expense += t.amount; if (t.category) { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; } }
    else if (t.type === 'transfer' && t.fromWorld !== t.toWorld) {
      if (t.toWorld === world) transferIn += t.amount; else transferOut += t.amount;
    }
  }
  return { income, expense, net: income - expense, transferIn, transferOut, byCategory, count: tx.length };
}

export function baselineVariable(state: AppState, world: World, now = today()) {
  const months = [1, 2, 3].map((i) => mkey(addMonths(now, -i)));
  const sums = months.map((k) =>
    monthTx(state, k, world).filter((t) => t.type === 'expense' && !t.recurringId && !t.loanId && !t.tripId)
      .reduce((s, t) => s + t.amount, 0));
  const valid = sums.filter((x) => x > 0);
  if (valid.length) return valid.reduce((a, b) => a + b, 0) / valid.length;
  const cur = monthTx(state, mkey(now), world).filter((t) => t.type === 'expense' && !t.recurringId && !t.loanId && !t.tripId)
    .reduce((s, t) => s + t.amount, 0);
  return (cur / Math.max(1, now.getDate())) * 30;
}

/* ---------- Trips ---------- */
export const TRIP_PARTS = ['travel', 'stay', 'food', 'activities', 'shopping', 'other'];
export const tripTotal = (trip: Trip) => TRIP_PARTS.reduce((s, k) => s + (+(trip.budget?.[k] || 0) || 0), 0);
export const tripSpent = (state: AppState, trip: Trip) =>
  state.transactions.filter((t) => t.tripId === trip.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
export const tripDays = (trip: Trip) => Math.max(1, daysBetween(parseDate(trip.start), parseDate(trip.end)) + 1);

/* ---------- Goals ---------- */
export function goalStats(goal: Goal, now = today()) {
  const left = Math.max(0, goal.target - goal.current);
  const monthly = +goal.monthly || 0;
  const monthsNeeded = monthly > 0 ? Math.ceil(left / monthly) : Infinity;
  const eta = isFinite(monthsNeeded) ? addMonths(now, monthsNeeded) : null;
  const monthsToTarget = goal.targetDate ? Math.max(1, monthsBetween(now, parseDate(goal.targetDate)) + 1) : null;
  const required = monthsToTarget ? left / monthsToTarget : null;
  const onTrack = goal.targetDate ? eta && eta <= parseDate(goal.targetDate) : true;
  return { left, progress: goal.target ? Math.min(1, goal.current / goal.target) : 0, monthsNeeded, eta: eta && mkey(eta), required, onTrack: left === 0 || onTrack };
}

/* ---------- Upcoming payments ---------- */
export function upcoming(state: AppState, world: World, days = 30, now = today()) {
  const end = addDays(now, days);
  const out = [];
  for (const r of state.recurring.filter(inWorld(world))) {
    for (let i = 0; i < 2; i++) {
      const m = addMonths(now, i);
      const d = new Date(m.getFullYear(), m.getMonth(), Math.min(+(r.day || 1), daysInMonth(m.getFullYear(), m.getMonth())));
      if (d >= now && d <= end) out.push({ id: r.id + i, name: r.name, amount: r.amount, date: ymd(d), type: r.type, kind: 'recurring', category: r.category });
    }
  }
  for (const l of state.loans.filter(inWorld(world))) {
    const s = loanStats(l, now);
    if (s.active && parseDate(s.nextDue) <= end) out.push({ id: l.id, name: `${l.name} EMI`, amount: s.emi, date: s.nextDue, type: 'expense', kind: 'loan', category: 'EMI' });
  }
  if (world === 'personal') for (const c of state.cards.filter((c) => c.kind === 'credit')) {
    const s = cardStats(state, c, now);
    if (s.spent > 0 && parseDate(s.dueDate) <= end) out.push({ id: c.id, name: `${c.name} bill`, amount: s.spent, date: s.dueDate, type: 'expense', kind: 'card', category: 'Card' });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/* ---------- Forecast ---------- */
export function forecast(state: AppState, world: World, months = 6, sc: ScenarioDef = {}, now = today()) {
  let bal = available(state, world);
  const variableBase = baselineVariable(state, world, now);
  const rows = [];
  const baseIncome = state.recurring.filter(inWorld(world)).filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  for (let i = 0; i < months; i++) {
    const m = addMonths(now, i), key = mkey(m);
    const dim = daysInMonth(m.getFullYear(), m.getMonth());
    const remFrac = i === 0 ? (dim - now.getDate()) / dim : 1;
    let income = 0, recurringExp = 0, emis = 0, trips = 0, oneTime = 0;
    const tripList = [];
    for (const r of state.recurring.filter(inWorld(world))) {
      if (i === 0 && (+(r.day || 1)) <= now.getDate()) continue;
      if (r.type === 'income') income += r.amount; else recurringExp += r.amount;
    }
    for (const l of state.loans.filter(inWorld(world))) {
      const st = parseDate(l.startDate);
      const idx = (m.getFullYear() - st.getFullYear()) * 12 + m.getMonth() - st.getMonth();
      if (idx >= 1 && idx <= +l.tenureMonths && (i > 0 || st.getDate() > now.getDate())) emis += emi(+l.principal, +l.rate, +l.tenureMonths);
    }
    for (const t of state.trips.filter(inWorld(world))) {
      if (t.start.startsWith(key)) {
        const left = Math.max(0, tripTotal(t) - tripSpent(state, t));
        trips += left; tripList.push({ name: t.destination, amount: tripTotal(t) });
      }
    }
    let variable = variableBase * remFrac;
    
    if (i >= 1 || remFrac > 0) {
      if (sc.incomeDelta) income += sc.incomeDelta * (i === 0 ? 0 : 1);
      if (sc.revenuePct) income += (baseIncome * sc.revenuePct) * (i === 0 ? 0 : 1);
      if (sc.expenseDelta) recurringExp += sc.expenseDelta * (i === 0 ? 0 : 1);
      if (sc.incomeLoss && i >= 1 && i <= sc.incomeLoss) income = 0;
      if (sc.oneTime && i === (sc.oneTimeMonth || 0)) oneTime += sc.oneTime;
      variable *= sc.variablePct ? 1 + sc.variablePct : 1;
    }
    const saved = sc.monthlySave && i >= 1 ? sc.monthlySave : 0;
    const expense = recurringExp + emis + trips + variable + oneTime;
    const net = income - expense;
    bal += net;
    let actualIncome = 0, actualExpense = 0;
    if (i === 0) { const s = monthSummary(state, key, world); actualIncome = s.income; actualExpense = s.expense; }
    const normal = recurringExp + emis + variable + (i === 0 ? actualExpense : 0);
    rows.push({
      key, label: monthLabel(key), income: income + actualIncome, expense: expense + actualExpense,
      recurring: recurringExp, emis, trips, tripList, variable, oneTime, saved, net: income + actualIncome - (expense + actualExpense),
      balance: bal, normal, pressure: expense + actualExpense > (income + actualIncome) * 0.95,
    });
  }
  return rows;
}

/* ---------- History (for charts) ---------- */
export function history(state: AppState, world: World, months = 6, now = today()) {
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const key = mkey(addMonths(now, -i));
    const s = monthSummary(state, key, world);
    out.push({ key, label: monthLabel(key), ...s });
  }
  return out;
}

/* ---------- Student cycle ---------- */
export function studentCycle(state: AppState, now = today()) {
  const pm = state.recurring.find((r) => r.type === 'income' && W(r) === 'personal' && /pocket|allowance|stipend/i.test(r.name))
    || state.recurring.find((r) => r.type === 'income' && W(r) === 'personal');
  if (!pm) return null;
  const day = +(pm.day || 1);
  let last = new Date(now.getFullYear(), now.getMonth(), day);
  if (last > now) last = new Date(now.getFullYear(), now.getMonth() - 1, day);
  const next = new Date(last.getFullYear(), last.getMonth() + 1, day);
  const spent = state.transactions.filter((t) => W(t) === 'personal' && t.type === 'expense' && parseDate(t.date) >= last && parseDate(t.date) <= now)
    .reduce((s, t) => s + t.amount, 0);
  const elapsed = Math.max(1, daysBetween(last, now) + 1);
  const daysLeft = Math.max(1, daysBetween(now, next));
  const remaining = pm.amount - spent;
  const rate = spent / elapsed;
  return { amount: pm.amount, spent, remaining, daysLeft, rate, projected: remaining - rate * daysLeft, safeDaily: remaining / daysLeft, next: ymd(next), progress: Math.min(1, spent / pm.amount) };
}

/* ---------- Business ---------- */
export function businessMetrics(state: AppState, now = today()) {
  const key = mkey(now), lastKey = mkey(addMonths(now, -1));
  const cur = monthSummary(state, lastKey, 'business');
  const prev = monthSummary(state, mkey(addMonths(now, -2)), 'business');
  const mtd = monthSummary(state, key, 'business');
  const cash = available(state, 'business');
  const avgExp = [1, 2, 3].map((i) => monthSummary(state, mkey(addMonths(now, -i)), 'business').expense).reduce((a, b) => a + b, 0) / 3;
  const avgRev = [1, 2, 3].map((i) => monthSummary(state, mkey(addMonths(now, -i)), 'business').income).reduce((a, b) => a + b, 0) / 3;
  const receivable = (state.invoices || []).filter((i) => i.status !== 'paid' && i.kind !== 'payable').reduce((s, i) => s + i.amount, 0);
  const payable = (state.invoices || []).filter((i) => i.status !== 'paid' && i.kind === 'payable').reduce((s, i) => s + i.amount, 0);
  return {
    revenue: cur.income, expenses: cur.expense, profit: cur.net, margin: cur.income ? cur.net / cur.income : 0,
    prev, cur, mtd, cash, avgExp, avgRev, runway: avgExp ? cash / avgExp : Infinity,
    netBurn: avgExp - avgRev, receivable, payable, period: lastKey,
  };
}

/* ---------- Insights ---------- */
export function insights(state: AppState, world: World, now = today()) {
  const out = [];
  const key = mkey(now), lastKey = mkey(addMonths(now, -1));
  const day = now.getDate();
  const cur = monthSummary(state, key, world, day);
  const prev = monthSummary(state, lastKey, world, day);
  if (prev.expense > 0) {
    const d = (cur.expense - prev.expense) / prev.expense;
    out.push({ tone: d <= 0 ? 'pos' : 'neg', text: `Spending is ${Math.abs(Math.round(d * 100))}% ${d <= 0 ? 'lower' : 'higher'} than this point last month.` });
  }
  const full = monthSummary(state, lastKey, world), full2 = monthSummary(state, mkey(addMonths(now, -2)), world);
  let top: { c: string; dlt: number; v: number } | null = null;
  for (const [c, v] of Object.entries(full.byCategory)) {
    const dlt = v - (full2.byCategory[c] || 0);
    if (!top || dlt > top.dlt) top = { c, dlt, v };
  }
  if (top && top.dlt > 500) out.push({ tone: 'neutral', text: `${top.c} rose by ₹${Math.round(top.dlt).toLocaleString('en-IN')} in ${monthLabel(lastKey, true).split(' ')[0]}.` });
  const fc = forecast(state, world, 4, {}, now);
  const tripMonth = fc.find((r) => r.trips > 0 || r.tripList.length);
  if (tripMonth) out.push({ tone: 'neutral', text: `${tripMonth.tripList.map((t) => t.name).join(', ')} pushes ${monthLabel(tripMonth.key, true).split(' ')[0]} spending to ₹${Math.round(tripMonth.expense).toLocaleString('en-IN')}.` });
  const low = fc.find((r) => r.balance < 0);
  if (low) out.push({ tone: 'neg', text: `Balance may go negative in ${monthLabel(low.key, true)}.` });
  return out;
}

export function netWorth(state: AppState) {
  const assets = state.accounts.reduce((s, a) => s + accountBalance(state, a), 0) + (state.goals || []).reduce((s, g) => s + (+g.current || 0), 0);
  const cardDebt = state.cards.filter((c) => c.kind === 'credit').reduce((s, c) => s + cardStats(state, c).spent, 0);
  const loanDebt = state.loans.reduce((s, l) => s + loanStats(l).balance, 0);
  return { assets, liabilities: cardDebt + loanDebt, net: assets - cardDebt - loanDebt, cardDebt, loanDebt };
}
