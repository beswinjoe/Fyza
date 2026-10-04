// AI layer — local natural-language understanding over the financial engine.
import { today, ymd, mkey, addMonths, monthLabel, MONTHS_LONG, inr, uid, daysInMonth, addDays } from './format';
import { emi, forecast, available, monthSummary, studentCycle, baselineVariable, businessMetrics, W } from './finance';
import { AppState } from '../types/app';
import { AIResult } from '../types/ai';
import { AIAction } from '../types/store';
import { TransactionType } from '../types/finance';

const UNITS: Record<string, number> = { k: 1e3, thousand: 1e3, l: 1e5, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, cr: 1e7, crore: 1e7, crores: 1e7 };
export function amounts(text: string): number[] {
  const re = /(₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|thousand|cr|k|l)?\b(\s*(%|percent|days?|years?|yrs?|months?|st|nd|rd|th|am|pm))?/gi;
  const out = [];
  let m;
  while ((m = re.exec(text))) {
    if (m[5]) continue;
    const v = parseFloat(m[2].replace(/,/g, '')) * (m[3] ? (UNITS[m[3].toLowerCase()] || 1) : 1);
    out.push({ v, strong: !!(m[1] || m[3]) || v >= 100 });
  }
  return out.filter((x) => x.strong).map((x) => x.v);
}

const CATS: [string, RegExp][] = [
  ['Food', /dinner|lunch|breakfast|food|restaurant|swiggy|zomato|coffee|cafe|pizza|snack|chai|meal|canteen/],
  ['Groceries', /grocer|bigbasket|zepto|blinkit|vegetable|supermarket/],
  ['Transport', /uber|ola|cab|metro|fuel|petrol|diesel|auto|bus|train|rapido|parking/],
  ['Rent', /rent/],
  ['Subscriptions', /netflix|spotify|prime|subscription|youtube|hotstar|icloud|chatgpt/],
  ['Bills', /bill|electricity|internet|wifi|fiber|recharge|insurance|water|gas/],
  ['Shopping', /amazon|flipkart|myntra|cloth|shoes|shopping|bought/],
  ['Entertainment', /movie|concert|game|party|pvr|netflix/],
  ['Health', /doctor|medicine|pharmacy|hospital|gym|health/],
  ['Education', /book|course|college|fees|tuition|exam/],
  ['Travel', /flight|hotel|trip|travel/],
];
const catOf = (t: string) => (CATS.find(([, re]) => re.test(t)) || ['Other'])[0];
const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function monthFrom(text: string, now: Date) {
  const t = text.toLowerCase();
  const i = MONTHS_LONG.findIndex((m) => new RegExp(`\\b(${m.toLowerCase()}|${m.slice(0, 3).toLowerCase()})\\b`).test(t));
  if (i >= 0) {
    const y = i < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
    return new Date(y, i, 1);
  }
  if (/next year/.test(t)) return new Date(now.getFullYear() + 1, now.getMonth(), 1);
  const n = t.match(/in (\d+) months?/);
  if (n) return addMonths(now, +n[1]);
  if (/next month/.test(t)) return addMonths(now, 1);
  return null;
}
const WORDNUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, twelve: 12, nine: 9 };

const INTL = /germany|europe|paris|france|london|uk|dubai|thailand|bali|japan|usa|america|singapore|switzerland|italy|spain|vietnam|maldives|australia/i;
export function estimateTrip(dest: string, days: number): Record<string, number> {
  const intl = INTL.test(dest);
  const perDay = intl ? 14000 : 3800;
  const travel = intl ? 75000 : Math.round(days * 1700);
  const base = perDay * days;
  const r = (x: number) => Math.round(x / 100) * 100;
  return { travel: r(travel), stay: r(base * 0.42), food: r(base * 0.26), activities: r(base * 0.16), shopping: r(base * 0.1), other: r(base * 0.06) };
}

const add = (col: keyof AppState, item: Record<string, unknown>): AIAction => ({ type: 'add', col, item: { id: uid(), ...item } });

export function interpret(text: string, state: AppState): AIResult {
  const now = today();
  const t = text.toLowerCase().trim();
  const world = state.world;
  const nums = amounts(text);
  const amt = nums[0];
  const fc = forecast(state, world, 12);
  const avail = available(state, world);
  const resp = (o: Omit<AIResult, 'id' | 'q' | 'at'>): AIResult => ({ id: uid(), q: text, at: Date.now(), ...o });
  const monthlyIncome = state.recurring.filter((r) => W(r) === world && r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const monthlyExp = fc[1]?.expense || 0;
  const chartOf = (rows: any[], alt?: any[]) => ({ labels: rows.map((r) => r.label), base: rows.map((r) => r.balance), alt: alt?.map((r) => r.balance) });

  /* ---------- What-if ---------- */
  if (/^(what if|what happens if|if )/.test(t)) {
    const sc: Record<string, number> = {}; const desc: string[] = [];
    const to = t.match(/(salary|income|revenue)\s+(?:increases?|goes up|becomes|rises?|is)\s+(?:to\s+)?/);
    if (to && amt && /to|becomes|is/.test(t)) { sc.incomeDelta = amt - monthlyIncome; desc.push(`Income becomes ${inr(amt)}/mo`); }
    else if (/(salary|income).*(increase|rise|hike).*by/.test(t) && amt) { sc.incomeDelta = amt; desc.push(`Income +${inr(amt)}/mo`); }
    const fall = t.match(/(revenue|income|sales).*(falls?|drops?|decreases?)\s+(?:by\s+)?(\d+)\s*%/);
    if (fall) { sc.revenuePct = -Number(fall[3]) / 100; desc.push(`${cap(fall[1])} −${fall[3]}%`); }
    const lose = t.match(/lose (?:my )?(?:income|job|salary).*?(\d+|one|two|three|four|five|six)\s*months?/);
    if (lose) { sc.incomeLoss = +lose[1] || WORDNUM[lose[1]]; desc.push(`No income for ${sc.incomeLoss} months`); }
    if (/(rent|expenses?|cost).*(increase|rise|goes up).*by/.test(t) && amt) { sc.expenseDelta = amt; desc.push(`Expenses +${inr(amt)}/mo`); }
    if (/hire|employee|salary of/.test(t) && amt && !to) { sc.expenseDelta = amt; desc.push(`New hire at ${inr(amt)}/mo`); }
    if (/buy|purchase|spend/.test(t) && amt) { sc.oneTime = amt; desc.push(`One-time purchase ${inr(amt)}`); }
    if (/save.*(every|per|a) month/.test(t) && amt) { sc.monthlySave = amt; sc.expenseDelta = (sc.expenseDelta || 0) + amt; desc.push(`Set aside ${inr(amt)}/mo`); }
    if (!desc.length) return resp({ kind: 'answer', title: 'Try a more specific scenario', summary: 'For example: “What if my salary becomes ₹1 lakh?” or “What if my rent increases by ₹5,000?”' });
    const base = forecast(state, world, 6), alt = forecast(state, world, 6, sc);
    const d = alt[5].balance - base[5].balance;
    const minAlt = Math.min(...alt.map((r) => r.balance));
    return resp({
      kind: 'scenario', title: desc.join(' · '),
      summary: sc.monthlySave
        ? `You'd have ${inr(sc.monthlySave * 5)} set aside by ${alt[5].label}, while your spending balance ends at ${inr(alt[5].balance, { compact: true })}.`
        : `In 6 months you'd have ${inr(alt[5].balance, { compact: true })} instead of ${inr(base[5].balance, { compact: true })} — ${d >= 0 ? 'up' : 'down'} ${inr(Math.abs(d), { compact: true })}.${minAlt < 0 ? ' Your balance would dip below zero at some point.' : ''}`,
      metrics: [
        { label: 'Today’s plan', value: inr(base[5].balance, { compact: true }) },
        { label: 'Scenario', value: inr(alt[5].balance, { compact: true }), tone: d >= 0 ? 'pos' : 'neg' },
        { label: 'Lowest point', value: inr(minAlt, { compact: true }), tone: minAlt < 0 ? 'neg' : undefined },
      ],
      chart: chartOf(base, alt), scenario: { name: desc.join(' · '), sc },
      actions: [{ label: 'Save scenario', ops: [add('scenarios', { name: desc.join(' · '), sc, world, created: ymd(now) })] }],
    });
  }

  /* ---------- Affordability ---------- */
  if (/can i afford|should i buy|afford to/.test(t)) {
    if (/hire|per month|\/month|a month|monthly/.test(t) && amt) {
      const alt = forecast(state, world, 6, { expenseDelta: amt });
      const ok = alt.every((r) => r.balance > 0);
      const runway = world === 'business' ? businessMetrics(state) : null;
      return resp({
        kind: 'answer', title: ok ? 'Yes, with care' : 'Not yet', tone: ok ? 'pos' : 'neg',
        summary: ok ? `Adding ${inr(amt)}/month keeps your balance positive for the next 6 months, ending around ${inr(alt[5].balance, { compact: true })}.` : `A ${inr(amt)}/month commitment would push your balance negative by ${alt.find((r) => r.balance < 0)?.label}.`,
        metrics: [{ label: 'New monthly cost', value: inr(amt) }, { label: 'Balance in 6 mo', value: inr(alt[5].balance, { compact: true }), tone: ok ? 'pos' : 'neg' },
          runway ? { label: 'Runway after', value: `${(runway.cash / (runway.avgExp + amt)).toFixed(1)} mo` } : { label: 'Monthly income', value: inr(monthlyIncome) }],
        chart: chartOf(forecast(state, world, 6), alt),
      });
    }
    if (!amt) return resp({ kind: 'answer', title: 'How much does it cost?', summary: 'Tell me the price — e.g. “Can I afford a ₹70,000 laptop?”' });
    const buffer = Math.max(monthlyExp, 1);
    const item = (t.match(/afford (?:a |an |the )?(?:₹?[\d,.]+\s*(?:k|l|lakhs?)?\s*)?([a-z ]+?)(?:\?|$| for| in| now)/) || [])[1]?.trim() || 'this';
    if (avail - amt >= buffer) {
      return resp({
        kind: 'answer', title: `Yes — you can afford the ${item}`, tone: 'pos',
        summary: `After paying ${inr(amt)}, you'd still have ${inr(avail - amt)} — more than a month of expenses (${inr(buffer)}) as a cushion.`,
        metrics: [{ label: 'Available now', value: inr(avail, { compact: true }) }, { label: 'After purchase', value: inr(avail - amt, { compact: true }), tone: 'pos' }, { label: 'Safety cushion', value: inr(buffer, { compact: true }) }],
        chart: chartOf(fc.slice(0, 6), forecast(state, world, 6, { oneTime: amt })),
      });
    }
    const when = fc.find((r) => r.balance - amt >= buffer);
    const monthsAway = when ? fc.indexOf(when) : null;
    const g = { name: cap(item === 'this' ? 'Planned purchase' : item), kind: 'custom', target: amt, current: 0, monthly: Math.ceil(amt / Math.max(1, monthsAway || 6) / 500) * 500, targetDate: ymd(when ? new Date(when.key + '-01') : addMonths(now, 6)) };
    return resp({
      kind: 'answer', title: when ? `Not today — comfortably by ${monthLabel(when.key, true)}` : 'Not in the next 12 months', tone: 'neg',
      summary: when ? `Buying now would leave ${inr(avail - amt)}, below your one-month cushion of ${inr(buffer)}. Saving ${inr(g.monthly)}/month gets you there in ${monthsAway} month${(monthsAway || 0) > 1 ? 's' : ''}.` : `Your projected surplus isn't large enough yet. Consider a smaller budget or a longer savings plan.`,
      metrics: [{ label: 'Available now', value: inr(avail, { compact: true }) }, { label: 'Price', value: inr(amt, { compact: true }) }, { label: 'Save monthly', value: inr(g.monthly) }],
      chart: chartOf(fc.slice(0, 6), forecast(state, world, 6, { oneTime: amt })),
      actions: [{ label: `Create “${g.name}” goal`, ops: [add('goals', g)] }],
    });
  }

  /* ---------- Savings by date / balance in N months ---------- */
  if (/how much (can|will) i (save|have)/.test(t)) {
    let target = monthFrom(t, now);
    const n = t.match(/in (\d+|six|three|twelve|one|two|four|five|nine) months?/);
    if (n) target = addMonths(now, +n[1] || WORDNUM[n[1]]);
    if (!target) target = addMonths(now, 6);
    const idx = Math.min(11, Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth()));
    const rows = fc.slice(0, idx + 1);
    const saved = rows.reduce((s, r) => s + (r.income - r.expense), 0) - (fc[0].income - fc[0].expense) + (fc[0].balance - avail);
    const end = fc[idx].balance;
    return resp({
      kind: 'answer', title: /save/.test(t) ? `About ${inr(Math.max(0, saved), { compact: true })} by ${monthLabel(fc[idx].key, true)}` : `${inr(end, { compact: true })} by ${monthLabel(fc[idx].key, true)}`,
      summary: `Based on your recurring income, bills${state.loans.length ? ', EMIs' : ''}, planned trips and typical spending of ${inr(baselineVariable(state, world))}/month.${rows.some((r) => r.trips) ? ' Includes upcoming trip costs.' : ''}`,
      metrics: [{ label: 'Today', value: inr(avail, { compact: true }) }, { label: 'Projected', value: inr(end, { compact: true }), tone: end >= avail ? 'pos' : 'neg' }, { label: 'Avg. monthly surplus', value: inr(saved / Math.max(1, idx + 1), { compact: true }) }],
      chart: chartOf(rows.length > 1 ? rows : fc.slice(0, 6)),
    });
  }

  /* ---------- Spend allowance ---------- */
  if (/how much can i spend/.test(t)) {
    const cyc = studentCycle(state);
    const dim = daysInMonth(now.getFullYear(), now.getMonth());
    const daysLeft = cyc ? cyc.daysLeft : dim - now.getDate() + 1;
    const free = cyc ? cyc.remaining : Math.max(0, fc[0].balance - avail + (fc[0].variable || 0));
    const daily = free / daysLeft;
    const span = /week/.test(t) ? 7 : /today/.test(t) ? 1 : daysLeft;
    return resp({
      kind: 'answer', title: `${inr(daily * span)} ${span === 7 ? 'this week' : span === 1 ? 'today' : 'until month end'}`, tone: 'pos',
      summary: `That's ${inr(daily)}/day for the next ${daysLeft} days, after setting aside upcoming bills${cyc ? ' until your next pocket money' : ''}.`,
      metrics: [{ label: 'Free to spend', value: inr(free) }, { label: 'Per day', value: inr(daily) }, { label: 'Days left', value: String(daysLeft) }],
    });
  }

  /* ---------- Explain changes ---------- */
  if (/why (did|is|has)|what changed|explain/.test(t)) {
    const a = monthSummary(state, mkey(addMonths(now, -1)), world), b = monthSummary(state, mkey(addMonths(now, -2)), world);
    const cats = [...new Set([...Object.keys(a.byCategory), ...Object.keys(b.byCategory)])]
      .map((c) => ({ c, d: (a.byCategory[c] || 0) - (b.byCategory[c] || 0) })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 4);
    const isProfit = /profit|revenue/.test(t);
    const dNet = a.net - b.net, dExp = a.expense - b.expense, dInc = a.income - b.income;
    return resp({
      kind: 'answer', title: isProfit ? `Profit ${dNet >= 0 ? 'rose' : 'fell'} ${inr(Math.abs(dNet), { compact: true })} in ${monthLabel(mkey(addMonths(now, -1)))}` : `Spending ${dExp >= 0 ? 'rose' : 'fell'} ${inr(Math.abs(dExp), { compact: true })} in ${monthLabel(mkey(addMonths(now, -1)))}`,
      summary: isProfit ? `Revenue ${dInc >= 0 ? 'grew' : 'dropped'} by ${inr(Math.abs(dInc), { compact: true })} while expenses ${dExp >= 0 ? 'grew' : 'fell'} by ${inr(Math.abs(dExp), { compact: true })}.` : `Compared with the month before. The biggest movers:`,
      bullets: cats.map((x) => `${x.c}: ${x.d >= 0 ? '+' : '−'}${inr(Math.abs(x.d)).replace('−', '')}`),
      metrics: [{ label: monthLabel(mkey(addMonths(now, -2))), value: inr(isProfit ? b.net : b.expense, { compact: true }) }, { label: monthLabel(mkey(addMonths(now, -1))), value: inr(isProfit ? a.net : a.expense, { compact: true }), tone: (isProfit ? dNet >= 0 : dExp <= 0) ? 'pos' : 'neg' }],
    });
  }

  /* ---------- When can I afford ---------- */
  if (/when can i (afford|buy)/.test(t)) {
    const guess: Record<string, number> = { car: 800000, bike: 150000, house: 6000000, iphone: 120000, phone: 60000, laptop: 90000 };
    const k = Object.keys(guess).find((x) => t.includes(x));
    const price = amt || (k ? guess[k] : 100000);
    const when = fc.find((r) => r.balance - price >= monthlyExp);
    const surplus = Math.max(1, (fc[11].balance - fc[0].balance) / 11);
    const monthsNeeded = when ? fc.indexOf(when) : Math.ceil((price + monthlyExp - avail) / surplus);
    return resp({
      kind: 'answer', title: `Around ${monthLabel(mkey(addMonths(now, monthsNeeded)), true)}`,
      summary: `${amt ? '' : `Assuming ~${inr(price, { compact: true })} for a ${k || 'purchase'}. `}At your current surplus of ~${inr(surplus, { compact: true })}/month, you'd reach the price plus a one-month cushion in ${monthsNeeded} months.`,
      metrics: [{ label: 'Target', value: inr(price, { compact: true }) }, { label: 'Monthly surplus', value: inr(surplus, { compact: true }) }, { label: 'Months', value: String(monthsNeeded) }],
      actions: [{ label: 'Turn into a goal', ops: [add('goals', { name: cap(k || 'Big purchase'), kind: k || 'custom', target: price, current: 0, monthly: Math.round(surplus / 500) * 500, targetDate: ymd(addMonths(now, monthsNeeded)) })] }],
    });
  }

  /* ---------- Budget ---------- */
  if (/budget/.test(t) && /create|make|plan|build|suggest/.test(t)) {
    const inc = monthlyIncome || monthSummary(state, mkey(addMonths(now, -1)), world).income;
    const last = monthSummary(state, mkey(addMonths(now, -1)), world).byCategory;
    const top = Object.entries(last).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return resp({
      kind: 'answer', title: `A ${inr(inc, { compact: true })} monthly plan`,
      summary: 'Built on a 50 / 30 / 20 split, tuned to how you actually spent last month.',
      metrics: [{ label: 'Needs · 50%', value: inr(inc * 0.5) }, { label: 'Wants · 30%', value: inr(inc * 0.3) }, { label: 'Save · 20%', value: inr(inc * 0.2), tone: 'pos' }],
      bullets: top.map(([c, v]) => `${c}: spent ${inr(v)} → suggest ${inr(Math.round((v * 0.9) / 100) * 100)}`),
    });
  }

  /* ---------- Plan savings for a trip/goal ---------- */
  const planFor = t.match(/plan (?:my )?savings? for (?:a |an |my )?(.+?)(?: trip)?$/);
  if (planFor) {
    const dest = cap(planFor[1].replace(/trip|\?/g, '').trim());
    const when = monthFrom(t, now) || addMonths(now, 10);
    const target = amt || Object.values(estimateTrip(dest, 10)).reduce((a, b) => a + b, 0);
    const months = Math.max(1, (when.getFullYear() - now.getFullYear()) * 12 + when.getMonth() - now.getMonth());
    const monthly = Math.ceil(target / months / 500) * 500;
    return resp({
      kind: 'action', title: `${dest} trip savings plan`,
      summary: `A ${10}-day ${dest} trip costs roughly ${inr(target, { compact: true })}. Saving ${inr(monthly)}/month gets you there by ${monthLabel(mkey(when), true)}.`,
      metrics: [{ label: 'Estimated cost', value: inr(target, { compact: true }) }, { label: 'Monthly', value: inr(monthly) }, { label: 'Months', value: String(months) }],
      actions: [{ label: 'Create goal', ops: [add('goals', { name: `${dest} trip`, kind: 'trip', target, current: 0, monthly, targetDate: ymd(when) })] }],
    });
  }

  /* ---------- Loan ---------- */
  if (/loan|borrow/.test(t) && amt) {
    const rate = +(t.match(/(\d+(?:\.\d+)?)\s*%/) || [, 10])[1];
    const ten = t.match(/(\d+)\s*(years?|yrs?|months?)/);
    const n = ten ? (/month/.test(ten[2]) ? +ten[1] : +ten[1] * 12) : 36;
    const type = (t.match(/(home|car|vehicle|education|personal|business|bike)/) || [, 'personal'])[1].replace('car', 'vehicle').replace('bike', 'vehicle');
    const e = emi(amt, rate, n);
    const interest = e * n - amt;
    return resp({
      kind: 'action', title: `${cap(type)} loan · ${inr(amt, { compact: true })}`,
      summary: `At ${rate}% for ${n} months, your EMI is ${inr(e)}. You'll pay ${inr(interest, { compact: true })} in interest overall. I'll add it to your monthly forecast from next month.`,
      metrics: [{ label: 'Monthly EMI', value: inr(e) }, { label: 'Total interest', value: inr(interest, { compact: true }), tone: 'neg' }, { label: 'Total payable', value: inr(e * n, { compact: true }) }],
      actions: [{ label: 'Add loan', ops: [add('loans', { name: `${cap(type)} loan`, type, principal: amt, rate, tenureMonths: n, startDate: ymd(now), world })] }],
    });
  }

  /* ---------- Trip ---------- */
  const trip = text.match(/(?:going|trip|travel(?:ling)?|visit(?:ing)?|heading|flying)\s+(?:to\s+)?([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/i);
  if (trip && !/spent|paid/.test(t)) {
    const dest = cap(trip[1].replace(/\b(for|in|on|next|this)\b.*$/i, '').trim());
    const days = +(t.match(/(\d+)\s*days?/) || [, 4])[1];
    const m = monthFrom(t, now) || addMonths(now, 1);
    const start = new Date(m.getFullYear(), m.getMonth(), m.getMonth() === now.getMonth() ? Math.min(now.getDate() + 7, 20) : 18);
    const budgetRaw = estimateTrip(dest, days);
    const budget = amt ? Object.fromEntries(Object.entries(budgetRaw).map(([k, v], _, arr) => [k, Math.round((v / arr.reduce((s, [, x]) => s + Number(x), 0)) * amt)])) : budgetRaw;
    const total = Object.values(budget).reduce((a, b) => a + b, 0);
    const key = mkey(start);
    const row = fc.find((r) => r.key === key);
    const normal = row ? row.expense - row.trips : monthlyExp;
    return resp({
      kind: 'action', title: `${dest} · ${days} days in ${monthLabel(key, true)}`,
      summary: `Estimated ${inr(total)}. Your ${monthLabel(key, true).split(' ')[0]} spending becomes ${inr(normal + total)} — normally ${inr(normal)} plus ${dest} ${inr(total)}.`,
      metrics: [{ label: 'Normal month', value: inr(normal, { compact: true }) }, { label: `${dest} trip`, value: `+${inr(total, { compact: true })}` }, { label: `${monthLabel(key)} total`, value: inr(normal + total, { compact: true }), tone: 'neg' }],
      breakdown: budget,
      actions: [{ label: 'Create trip', ops: [add('trips', { destination: dest, start: ymd(start), end: ymd(addDays(start, days - 1)), budget, world })] }],
    });
  }

  /* ---------- Goal ---------- */
  if (/(want to|need to|plan to|goal to|i'd like to) save|save .* by|saving for|goal/.test(t) && amt) {
    const when = monthFrom(t, now) || addMonths(now, 12);
    const months = Math.max(1, (when.getFullYear() - now.getFullYear()) * 12 + when.getMonth() - now.getMonth());
    const monthly = Math.ceil(amt / months / 100) * 100;
    const forWhat = (t.match(/for (?:a |an |my )?([a-z ]+?)(?: by| in|$)/) || [])[1];
    const surplus = (fc[11].balance - fc[0].balance) / 11;
    return resp({
      kind: 'action', title: `Save ${inr(amt, { compact: true })} by ${monthLabel(mkey(when), true)}`,
      summary: `That's ${inr(monthly)}/month for ${months} months. ${surplus >= monthly ? `Your projected surplus of ~${inr(surplus, { compact: true })}/month covers it.` : `That's more than your current surplus (~${inr(Math.max(0, surplus), { compact: true })}/mo) — you may need to trim spending.`}`,
      tone: surplus >= monthly ? 'pos' : 'neg',
      metrics: [{ label: 'Monthly', value: inr(monthly) }, { label: 'Months', value: String(months) }, { label: 'Your surplus', value: inr(surplus, { compact: true }), tone: surplus >= monthly ? 'pos' : 'neg' }],
      actions: [{ label: 'Create goal', ops: [add('goals', { name: cap(forWhat || 'Savings goal'), kind: 'custom', target: amt, current: 0, monthly, targetDate: ymd(when) })] }],
    });
  }

  /* ---------- Transfer between worlds ---------- */
  if (/transfer|move|withdraw|draw/.test(t) && amt && /(personal|business)/.test(t)) {
    const toPersonal = /to personal|from business/.test(t) || (world === 'business' && !/to business/.test(t));
    const from = state.accounts.find((a) => W(a) === (toPersonal ? 'business' : 'personal'));
    const to = state.accounts.find((a) => W(a) === (toPersonal ? 'personal' : 'business'));
    if (from && to) return resp({
      kind: 'action', title: `Transfer ${inr(amt)} ${toPersonal ? 'Business → Personal' : 'Personal → Business'}`,
      summary: `This moves money between your worlds. It won't count as new income or as an expense — it only changes which side holds the cash.`,
      metrics: [{ label: 'From', value: from.name }, { label: 'To', value: to.name }],
      actions: [{ label: 'Record transfer', ops: [add('transactions', { type: 'transfer', amount: amt, fromAccountId: from.id, toAccountId: to.id, fromWorld: W(from), toWorld: W(to), date: ymd(now), note: toPersonal ? 'Owner draw → Personal' : 'Capital → Business', world: W(from), tags: [] })] }],
    });
  }

  /* ---------- Recurring ---------- */
  const recurring = /every month|monthly|per month|a month|each month|every week|weekly|on the \d+/.test(t);
  if (recurring && amt) {
    const isIncome = /\b(get|earn|receive|salary|pocket money|stipend|allowance|paid to me|revenue|retainer)\b/.test(t) && !/\bpay\b/.test(t);
    const day = +(t.match(/on the (\d+)/) || [, isIncome ? 1 : now.getDate()])[1];
    const name = isIncome
      ? (t.match(/pocket money|salary|stipend|allowance|retainer|rent income|freelance/) || ['Income'])[0]
      : (t.match(/pay (?:₹?[\d,.]+\s*(?:k|l)?\s*)?(?:for )?([a-z ]+?)(?: on| every| monthly| each|$)/) || t.match(/for ([a-z ]+?)(?: on| every|$)/) || [, catOf(t)])[1];
    const weekly = /week/.test(t);
    const amount = weekly ? Math.round(amt * 52 / 12) : amt;
    const acc = state.accounts.find((a) => W(a) === world);
    const item = { name: cap(name.trim()), type: isIncome ? 'income' : 'expense', amount, day, category: isIncome ? cap(name.trim()) : catOf(t + ' ' + name), accountId: acc?.id, world };
    return resp({
      kind: 'action', title: `${isIncome ? 'Recurring income' : 'Recurring payment'} · ${item.name}`,
      summary: `${inr(amount)} ${isIncome ? 'arriving' : 'due'} on the ${day}${['th', 'st', 'nd', 'rd'][(day % 10 > 3 || ~~(day / 10) === 1) ? 0 : day % 10]} of every month${weekly ? ` (${inr(amt)}/week)` : ''}. This will appear in every future forecast.`,
      metrics: [{ label: 'Monthly', value: inr(amount), tone: isIncome ? 'pos' : undefined }, { label: 'Yearly', value: inr(amount * 12, { compact: true }) }, { label: 'Category', value: item.category }],
      actions: [{ label: `Add ${isIncome ? 'income' : 'payment'}`, ops: [add('recurring', item)] }],
    });
  }

  /* ---------- One-off expense / income ---------- */
  const isExp = /spent|spend|paid|bought|cost|purchased|gave/.test(t);
  const isInc = /earned|received|got paid|got|made|income|refund|sold/.test(t);
  if ((isExp || isInc) && amt) {
    const type: TransactionType = isExp ? 'expense' : 'income';
    const what = (t.match(/(?:on|for|at|from) (?:a |an |the |my )?([a-z' ]+?)(?:\s+(?:today|yesterday|with|using|via|at|on)\b|[.!?]|$)/) || [])[1] || (isExp ? catOf(t) : 'Income');
    const date = /yesterday/.test(t) ? ymd(addDays(now, -1)) : ymd(now);
    const card = state.cards.find((c) => t.includes(c.name.toLowerCase()) || (c.kind === 'credit' && /credit card/.test(t)));
    const acc = state.accounts.find((a) => W(a) === world && (/cash/.test(t) ? a.type === 'cash' : a.type !== 'cash')) || state.accounts.find((a) => W(a) === world);
    const tripMatch = state.trips.find((tr) => t.includes(tr.destination.toLowerCase()));
    const category = isExp ? catOf(t) : /freelance|client/.test(t) ? 'Freelance' : world === 'business' ? 'Revenue' : 'Other income';
    const item = { type, amount: amt, category, date, accountId: acc?.id, cardId: card?.id, note: cap(what.trim()), world, tags: [], tripId: tripMatch?.id };
    const cm = monthSummary(state, mkey(now), world);
    return resp({
      kind: 'action', title: `${type === 'expense' ? '−' : '+'}${inr(amt)} · ${item.note}`,
      summary: type === 'expense'
        ? `Logged under ${category}${card ? ` on ${card.name}` : acc ? ` from ${acc.name}` : ''}${tripMatch ? `, part of your ${tripMatch.destination} trip` : ''}. ${category} this month: ${inr((cm.byCategory[category] || 0) + amt)}.`
        : `Added to ${acc?.name || 'your account'}. Income this month: ${inr(cm.income + amt)}.`,
      metrics: [{ label: 'Category', value: category }, { label: 'Date', value: date === ymd(now) ? 'Today' : 'Yesterday' }, { label: 'Account', value: card?.name || acc?.name || '—' }],
      actions: [{ label: type === 'expense' ? 'Add expense' : 'Add income', ops: [add('transactions', item)] }],
      autoApply: true,
    });
  }

  return resp({
    kind: 'answer', title: 'I can help with that soon',
    summary: 'Try logging money (“I spent ₹850 on dinner”), setting up recurring items, creating trips or goals, or asking “Can I afford…”, “How much can I save by June?”, or “What if…”.',
  });
}

export const SUGGESTIONS = {
  student: ['I spent ₹180 on lunch', 'How much can I spend this week?', 'I get ₹8,000 pocket money every month', 'Can I afford a ₹70,000 laptop?', 'I\'m going to Goa for 5 days in December'],
  personal: ['I spent ₹850 on dinner', 'Can I afford a ₹70,000 laptop?', 'How much can I save by June?', 'What if my salary becomes ₹1 lakh?', 'I took a ₹5 lakh loan at 9% for 3 years', 'I want to save ₹3 lakh by next year', 'Why did I spend more this month?'],
  business: ['Why did my profit drop?', 'Can I afford to hire someone for ₹40k/month?', 'What if revenue falls 20%?', 'Transfer ₹40,000 to personal', 'How much will I have in 6 months?'],
};
