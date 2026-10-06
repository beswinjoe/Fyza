import { cur, activeCurrency } from './currency';
// AI layer — local natural-language understanding over the financial engine.
import { today, ymd, mkey, addMonths, monthLabel, MONTHS_LONG, money, uid, daysInMonth, addDays, parseDate } from './format';
import { emi, forecast, available, monthSummary, studentCycle, baselineVariable, businessMetrics, W } from './finance';
import { AppState } from '../types/app';
import { AIResult } from '../types/ai';
import { AIAction } from '../types/store';
import { TransactionType } from '../types/finance';
import { getGroq } from './groq';
import * as tools from './aiTools';

const UNITS: Record<string, number> = { k: 1e3, thousand: 1e3, l: 1e5, lakh: 1e5, lakhs: 1e5, lac: 1e5, lacs: 1e5, cr: 1e7, crore: 1e7, crores: 1e7 };
export function amounts(text: string): number[] {
  const re = /([₹$€£¥]|rs\.?|money|usd|eur|gbp|aed|cad|aud|sgd)?\s*(\d[\d,]*(?:\.\d+)?)\s*(lakhs?|lacs?|crores?|thousand|cr|k|l)?\b(\s*(%|percent|days?|years?|yrs?|months?|st|nd|rd|th|am|pm))?/gi;
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

export function localInterpret(text: string, state: AppState): AIResult {
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
  const chartOf = (rows: { label: string, balance: number }[], alt?: { balance: number }[]) => ({ labels: rows.map((r) => r.label), base: rows.map((r) => r.balance), alt: alt?.map((r) => r.balance) });

  /* ---------- What-if ---------- */
  if (/^(what if|what happens if|if )/.test(t)) {
    const sc: Record<string, number> = {}; const desc: string[] = [];
    const to = t.match(/(salary|income|revenue)\s+(?:increases?|goes up|becomes|rises?|is)\s+(?:to\s+)?/);
    if (to && amt && /to|becomes|is/.test(t)) { sc.incomeDelta = amt - monthlyIncome; desc.push(`Income becomes ${money(amt)}/mo`); }
    else if (/(salary|income).*(increase|rise|hike).*by/.test(t) && amt) { sc.incomeDelta = amt; desc.push(`Income +${money(amt)}/mo`); }
    const fall = t.match(/(revenue|income|sales).*(falls?|drops?|decreases?)\s+(?:by\s+)?(\d+)\s*%/);
    if (fall) { sc.revenuePct = -Number(fall[3]) / 100; desc.push(`${cap(fall[1])} −${fall[3]}%`); }
    const lose = t.match(/lose (?:my )?(?:income|job|salary).*?(\d+|one|two|three|four|five|six)\s*months?/);
    if (lose) { sc.incomeLoss = +lose[1] || WORDNUM[lose[1]]; desc.push(`No income for ${sc.incomeLoss} months`); }
    if (/(rent|expenses?|cost).*(increase|rise|goes up).*by/.test(t) && amt) { sc.expenseDelta = amt; desc.push(`Expenses +${money(amt)}/mo`); }
    if (/hire|employee|salary of/.test(t) && amt && !to) { sc.expenseDelta = amt; desc.push(`New hire at ${money(amt)}/mo`); }
    if (/buy|purchase|spend/.test(t) && amt) { sc.oneTime = amt; desc.push(`One-time purchase ${money(amt)}`); }
    if (/save.*(every|per|a) month/.test(t) && amt) { sc.monthlySave = amt; sc.expenseDelta = (sc.expenseDelta || 0) + amt; desc.push(`Set aside ${money(amt)}/mo`); }
    if (!desc.length) return resp({ kind: 'answer', title: 'Try a more specific scenario', summary: `For example: “What if my salary becomes ${cur()}100,000?” or “What if my rent increases by ${cur()}5,000?”` });
    const base = forecast(state, world, 6), alt = forecast(state, world, 6, sc);
    const d = alt[5].balance - base[5].balance;
    const minAlt = Math.min(...alt.map((r) => r.balance));
    return resp({
      kind: 'scenario', title: desc.join(' · '),
      summary: sc.monthlySave
        ? `You'd have ${money(sc.monthlySave * 5)} set aside by ${alt[5].label}, while your spending balance ends at ${money(alt[5].balance, { compact: true })}.`
        : `In 6 months you'd have ${money(alt[5].balance, { compact: true })} instead of ${money(base[5].balance, { compact: true })} — ${d >= 0 ? 'up' : 'down'} ${money(Math.abs(d), { compact: true })}.${minAlt < 0 ? ' Your balance would dip below zero at some point.' : ''}`,
      metrics: [
        { label: 'Today’s plan', value: money(base[5].balance, { compact: true }) },
        { label: 'Scenario', value: money(alt[5].balance, { compact: true }), tone: d >= 0 ? 'pos' : 'neg' },
        { label: 'Lowest point', value: money(minAlt, { compact: true }), tone: minAlt < 0 ? 'neg' : undefined },
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
        summary: ok ? `Adding ${money(amt)}/month keeps your balance positive for the next 6 months, ending around ${money(alt[5].balance, { compact: true })}.` : `A ${money(amt)}/month commitment would push your balance negative by ${alt.find((r) => r.balance < 0)?.label}.`,
        metrics: [{ label: 'New monthly cost', value: money(amt) }, { label: 'Balance in 6 mo', value: money(alt[5].balance, { compact: true }), tone: ok ? 'pos' : 'neg' },
          runway ? { label: 'Runway after', value: `${(runway.cash / (runway.avgExp + amt)).toFixed(1)} mo` } : { label: 'Monthly income', value: money(monthlyIncome) }],
        chart: chartOf(forecast(state, world, 6), alt),
      });
    }
    if (!amt) return resp({ kind: 'answer', title: 'How much does it cost?', summary: `Tell me the price — e.g. “Can I afford a ${cur()}70,000 laptop?”` });
    const buffer = Math.max(monthlyExp, 1);
    const item = (t.match(/afford (?:a |an |the )?(?:[₹$€£¥]?[\d,.]+\s*(?:k|l|lakhs?)?\s*)?([a-z ]+?)(?:\?|$| for| in| now)/) || [])[1]?.trim() || 'this';
    if (avail - amt >= buffer) {
      return resp({
        kind: 'answer', title: `Yes — you can afford the ${item}`, tone: 'pos',
        summary: `After paying ${money(amt)}, you'd still have ${money(avail - amt)} — more than a month of expenses (${money(buffer)}) as a cushion.`,
        metrics: [{ label: 'Available now', value: money(avail, { compact: true }) }, { label: 'After purchase', value: money(avail - amt, { compact: true }), tone: 'pos' }, { label: 'Safety cushion', value: money(buffer, { compact: true }) }],
        chart: chartOf(fc.slice(0, 6), forecast(state, world, 6, { oneTime: amt })),
      });
    }
    const when = fc.find((r) => r.balance - amt >= buffer);
    const monthsAway = when ? fc.indexOf(when) : null;
    const g = { name: cap(item === 'this' ? 'Planned purchase' : item), kind: 'custom', target: amt, current: 0, monthly: Math.ceil(amt / Math.max(1, monthsAway || 6) / 500) * 500, targetDate: ymd(when ? parseDate(when.key + '-01') : addMonths(now, 6)) };
    return resp({
      kind: 'answer', title: when ? `Not today — comfortably by ${monthLabel(when.key, true)}` : 'Not in the next 12 months', tone: 'neg',
      summary: when ? `Buying now would leave ${money(avail - amt)}, below your one-month cushion of ${money(buffer)}. Saving ${money(g.monthly)}/month gets you there in ${monthsAway} month${(monthsAway || 0) > 1 ? 's' : ''}.` : `Your projected surplus isn't large enough yet. Consider a smaller budget or a longer savings plan.`,
      metrics: [{ label: 'Available now', value: money(avail, { compact: true }) }, { label: 'Price', value: money(amt, { compact: true }) }, { label: 'Save monthly', value: money(g.monthly) }],
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
      kind: 'answer', title: /save/.test(t) ? `About ${money(Math.max(0, saved), { compact: true })} by ${monthLabel(fc[idx].key, true)}` : `${money(end, { compact: true })} by ${monthLabel(fc[idx].key, true)}`,
      summary: `Based on your recurring income, bills${state.loans.length ? ', EMIs' : ''}, planned trips and typical spending of ${money(baselineVariable(state, world))}/month.${rows.some((r) => r.trips) ? ' Includes upcoming trip costs.' : ''}`,
      metrics: [{ label: 'Today', value: money(avail, { compact: true }) }, { label: 'Projected', value: money(end, { compact: true }), tone: end >= avail ? 'pos' : 'neg' }, { label: 'Avg. monthly surplus', value: money(saved / Math.max(1, idx + 1), { compact: true }) }],
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
      kind: 'answer', title: `${money(daily * span)} ${span === 7 ? 'this week' : span === 1 ? 'today' : 'until month end'}`, tone: 'pos',
      summary: `That's ${money(daily)}/day for the next ${daysLeft} days, after setting aside upcoming bills${cyc ? ' until your next pocket money' : ''}.`,
      metrics: [{ label: 'Free to spend', value: money(free) }, { label: 'Per day', value: money(daily) }, { label: 'Days left', value: String(daysLeft) }],
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
      kind: 'answer', title: isProfit ? `Profit ${dNet >= 0 ? 'rose' : 'fell'} ${money(Math.abs(dNet), { compact: true })} in ${monthLabel(mkey(addMonths(now, -1)))}` : `Spending ${dExp >= 0 ? 'rose' : 'fell'} ${money(Math.abs(dExp), { compact: true })} in ${monthLabel(mkey(addMonths(now, -1)))}`,
      summary: isProfit ? `Revenue ${dInc >= 0 ? 'grew' : 'dropped'} by ${money(Math.abs(dInc), { compact: true })} while expenses ${dExp >= 0 ? 'grew' : 'fell'} by ${money(Math.abs(dExp), { compact: true })}.` : `Compared with the month before. The biggest movers:`,
      bullets: cats.map((x) => `${x.c}: ${x.d >= 0 ? '+' : '−'}${money(Math.abs(x.d)).replace('−', '')}`),
      metrics: [{ label: monthLabel(mkey(addMonths(now, -2))), value: money(isProfit ? b.net : b.expense, { compact: true }) }, { label: monthLabel(mkey(addMonths(now, -1))), value: money(isProfit ? a.net : a.expense, { compact: true }), tone: (isProfit ? dNet >= 0 : dExp <= 0) ? 'pos' : 'neg' }],
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
      summary: `${amt ? '' : `Assuming ~${money(price, { compact: true })} for a ${k || 'purchase'}. `}At your current surplus of ~${money(surplus, { compact: true })}/month, you'd reach the price plus a one-month cushion in ${monthsNeeded} months.`,
      metrics: [{ label: 'Target', value: money(price, { compact: true }) }, { label: 'Monthly surplus', value: money(surplus, { compact: true }) }, { label: 'Months', value: String(monthsNeeded) }],
      actions: [{ label: 'Turn into a goal', ops: [add('goals', { name: cap(k || 'Big purchase'), kind: k || 'custom', target: price, current: 0, monthly: Math.round(surplus / 500) * 500, targetDate: ymd(addMonths(now, monthsNeeded)) })] }],
    });
  }

  /* ---------- Budget ---------- */
  if (/budget/.test(t) && /create|make|plan|build|suggest/.test(t)) {
    const inc = monthlyIncome || monthSummary(state, mkey(addMonths(now, -1)), world).income;
    const last = monthSummary(state, mkey(addMonths(now, -1)), world).byCategory;
    const top = Object.entries(last).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return resp({
      kind: 'answer', title: `A ${money(inc, { compact: true })} monthly plan`,
      summary: 'Built on a 50 / 30 / 20 split, tuned to how you actually spent last month.',
      metrics: [{ label: 'Needs · 50%', value: money(inc * 0.5) }, { label: 'Wants · 30%', value: money(inc * 0.3) }, { label: 'Save · 20%', value: money(inc * 0.2), tone: 'pos' }],
      bullets: top.map(([c, v]) => `${c}: spent ${money(v)} → suggest ${money(Math.round((v * 0.9) / 100) * 100)}`),
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
      summary: `A ${10}-day ${dest} trip costs roughly ${money(target, { compact: true })}. Saving ${money(monthly)}/month gets you there by ${monthLabel(mkey(when), true)}.`,
      metrics: [{ label: 'Estimated cost', value: money(target, { compact: true }) }, { label: 'Monthly', value: money(monthly) }, { label: 'Months', value: String(months) }],
      actions: [{ label: 'Create goal', ops: [add('goals', { name: `${dest} trip`, kind: 'trip', target, current: 0, monthly, targetDate: ymd(when) })] }],
    });
  }

  /* ---------- Loan ---------- */
  if (/loan|borrow/.test(t) && amt) {
    const rate = +(t.match(/(\d+(?:\.\d+)?)\s*%/) || [, 10])[1];
    const ten = t.match(/(\d+)\s*(years?|yrs?|months?)/);
    const n = ten ? (/month/.test(ten[2]) ? +ten[1] : +ten[1] * 12) : 36;
    const type = (t.match(/(home|car|vehicle|education|personal|business|bike)/) || [undefined, 'personal'])[1].replace('car', 'vehicle').replace('bike', 'vehicle');
    const e = emi(amt, rate, n);
    const interest = e * n - amt;
    return resp({
      kind: 'action', title: `${cap(type)} loan · ${money(amt, { compact: true })}`,
      summary: `At ${rate}% for ${n} months, your EMI is ${money(e)}. You'll pay ${money(interest, { compact: true })} in interest overall. I'll add it to your monthly forecast from next month.`,
      metrics: [{ label: 'Monthly EMI', value: money(e) }, { label: 'Total interest', value: money(interest, { compact: true }), tone: 'neg' }, { label: 'Total payable', value: money(e * n, { compact: true }) }],
      actions: [{ label: 'Add loan', ops: [add('loans', { name: `${cap(type)} loan`, type, principal: amt, rate, tenureMonths: n, startDate: ymd(now), world })] }],
    });
  }

  /* ---------- Trip ---------- */
  const trip = text.match(/(?:going|trip|travel(?:ling)?|visit(?:ing)?|heading|flying)\s+(?:to\s+)?([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/i);
  if (trip && !/spent|paid/.test(t)) {
    const dest = cap(trip[1].replace(/\b(for|in|on|next|this)\b.*$/i, '').trim());
    const days = +(t.match(/(\d+)\s*days?/) || [undefined, 4])[1];
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
      summary: `Estimated ${money(total)}. Your ${monthLabel(key, true).split(' ')[0]} spending becomes ${money(normal + total)} — normally ${money(normal)} plus ${dest} ${money(total)}.`,
      metrics: [{ label: 'Normal month', value: money(normal, { compact: true }) }, { label: `${dest} trip`, value: `+${money(total, { compact: true })}` }, { label: `${monthLabel(key)} total`, value: money(normal + total, { compact: true }), tone: 'neg' }],
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
      kind: 'action', title: `Save ${money(amt, { compact: true })} by ${monthLabel(mkey(when), true)}`,
      summary: `That's ${money(monthly)}/month for ${months} months. ${surplus >= monthly ? `Your projected surplus of ~${money(surplus, { compact: true })}/month covers it.` : `That's more than your current surplus (~${money(Math.max(0, surplus), { compact: true })}/mo) — you may need to trim spending.`}`,
      tone: surplus >= monthly ? 'pos' : 'neg',
      metrics: [{ label: 'Monthly', value: money(monthly) }, { label: 'Months', value: String(months) }, { label: 'Your surplus', value: money(surplus, { compact: true }), tone: surplus >= monthly ? 'pos' : 'neg' }],
      actions: [{ label: 'Create goal', ops: [add('goals', { name: cap(forWhat || 'Savings goal'), kind: 'custom', target: amt, current: 0, monthly, targetDate: ymd(when) })] }],
    });
  }

  /* ---------- Transfer between worlds ---------- */
  if (/transfer|move|withdraw|draw/.test(t) && amt && /(personal|business)/.test(t)) {
    const toPersonal = /to personal|from business/.test(t) || (world === 'business' && !/to business/.test(t));
    const from = state.accounts.find((a) => W(a) === (toPersonal ? 'business' : 'personal'));
    const to = state.accounts.find((a) => W(a) === (toPersonal ? 'personal' : 'business'));
    if (from && to) return resp({
      kind: 'action', title: `Transfer ${money(amt)} ${toPersonal ? 'Business → Personal' : 'Personal → Business'}`,
      summary: `This moves money between your worlds. It won't count as new income or as an expense — it only changes which side holds the cash.`,
      metrics: [{ label: 'From', value: from.name }, { label: 'To', value: to.name }],
      actions: [{ label: 'Record transfer', ops: [add('transactions', { type: 'transfer', amount: amt, fromAccountId: from.id, toAccountId: to.id, fromWorld: W(from), toWorld: W(to), date: ymd(now), note: toPersonal ? 'Owner draw → Personal' : 'Capital → Business', world: W(from), tags: [] })] }],
    });
  }

  /* ---------- Recurring ---------- */
  const recurring = /every month|monthly|per month|a month|each month|every week|weekly|on the \d+/.test(t);
  if (recurring && amt) {
    const isIncome = /\b(get|earn|receive|salary|pocket money|stipend|allowance|paid to me|revenue|retainer)\b/.test(t) && !/\bpay\b/.test(t);
    const day = +(t.match(/on the (\d+)/) || [undefined, isIncome ? 1 : now.getDate()])[1];
    const name = isIncome
      ? (t.match(/pocket money|salary|stipend|allowance|retainer|rent income|freelance/) || ['Income'])[0]
      : (t.match(/pay (?:[₹$€£¥]?[\d,.]+\s*(?:k|l)?\s*)?(?:for )?([a-z ]+?)(?: on| every| monthly| each|$)/) || t.match(/for ([a-z ]+?)(?: on| every|$)/) || [undefined, catOf(t)])[1];
    const weekly = /week/.test(t);
    const amount = weekly ? Math.round(amt * 52 / 12) : amt;
    const acc = state.accounts.find((a) => W(a) === world);
    const item = { name: cap(name.trim()), type: isIncome ? 'income' : 'expense', amount, day, category: isIncome ? cap(name.trim()) : catOf(t + ' ' + name), accountId: acc?.id, world };
    return resp({
      kind: 'action', title: `${isIncome ? 'Recurring income' : 'Recurring payment'} · ${item.name}`,
      summary: `${money(amount)} ${isIncome ? 'arriving' : 'due'} on the ${day}${['th', 'st', 'nd', 'rd'][(day % 10 > 3 || ~~(day / 10) === 1) ? 0 : day % 10]} of every month${weekly ? ` (${money(amt)}/week)` : ''}. This will appear in every future forecast.`,
      metrics: [{ label: 'Monthly', value: money(amount), tone: isIncome ? 'pos' : undefined }, { label: 'Yearly', value: money(amount * 12, { compact: true }) }, { label: 'Category', value: item.category }],
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
      kind: 'action', title: `${type === 'expense' ? '−' : '+'}${money(amt)} · ${item.note}`,
      summary: type === 'expense'
        ? `Logged under ${category}${card ? ` on ${card.name}` : acc ? ` from ${acc.name}` : ''}${tripMatch ? `, part of your ${tripMatch.destination} trip` : ''}. ${category} this month: ${money((cm.byCategory[category] || 0) + amt)}.`
        : `Added to ${acc?.name || 'your account'}. Income this month: ${money(cm.income + amt)}.`,
      metrics: [{ label: 'Category', value: category }, { label: 'Date', value: date === ymd(now) ? 'Today' : 'Yesterday' }, { label: 'Account', value: card?.name || acc?.name || '—' }],
      actions: [{ label: type === 'expense' ? 'Add expense' : 'Add income', ops: [add('transactions', item)] }],
      autoApply: true,
    });
  }

  return resp({
    kind: 'answer', title: 'I can help with that soon',
    summary: `Try logging money (“I spent ${cur()}850 on dinner”), setting up recurring items, creating trips or goals, or asking “Can I afford…”, “How much can I save by June?”, or “What if…”.`,
  });
}

export const SUGGESTIONS = {
  get student() { return [`I spent ${cur()}180 on lunch`, 'How much can I spend this week?', `I get ${cur()}8,000 pocket money every month`, `Can I afford a ${cur()}70,000 laptop?`, 'I\'m going to Goa for 5 days in December']; },
  get personal() { return [`I spent ${cur()}850 on dinner`, `Can I afford a ${cur()}70,000 laptop?`, 'How much can I save by June?', `What if my salary becomes ${cur()}100,000?`, `I took a ${cur()}500,000 loan at 9% for 3 years`, `I want to save ${cur()}300,000 by next year`, 'Why did I spend more this month?']; },
  get business() { return ['Why did my profit drop?', `Can I afford to hire someone for ${cur()}40k/month?`, 'What if revenue falls 20%?', `Transfer ${cur()}40,000 to personal`, 'How much will I have in 6 months?']; },
};

export async function interpret(text: string, state: AppState): Promise<AIResult> {
  const ai = getGroq();
  if (!ai) return localInterpret(text, state);

  try {
    const history = state.aiHistory.slice(-10).map((r) => [
      { role: 'user' as const, content: r.q },
      { role: 'assistant' as const, content: r.summary }
    ]).flat();

    const response = await ai.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: `You are Fyza, a smart, premium AI financial assistant (inspired by Apple, Notion, Linear). Your job is to understand the user's intent and use the provided tools to fetch financial data or perform actions.
- NEVER invent numbers. ALWAYS call a tool when financial calculations, adding transactions, forecasting, or checking affordability is required.
- If a user provides incomplete information (e.g. "Can I afford a MacBook?"), DO NOT call a tool with placeholder values. Instead, ask for clarification ("What price are you considering?").
- If the user asks a general question about their money, call getFinancialContext().
- If the user asks about specific past spending (e.g. "how much did I spend on food?"), call searchTransactions().
- Keep your tone concise, calm, precise, and expensive.
- The current date is ${today().toISOString().split('T')[0]}.
- The workspace currency is ${activeCurrency().name} (${activeCurrency().code}, symbol ${cur()}). All amounts are in this currency. Never convert currencies or assume exchange rates.` },
        ...history,
        { role: 'user', content: text }
      ],
      tools: (await import('./groqTools')).groqTools as unknown as import('groq-sdk/resources/chat/completions').ChatCompletionTool[],
      tool_choice: 'auto'
    });

    const msg = response.choices[0]?.message;
    const call = msg?.tool_calls?.[0];
    
    if (!call) {
      return { id: uid(), q: text, at: Date.now(), kind: 'answer', title: 'Fyza', summary: msg?.content || 'I need more information.' };
    }

    let toolResult: Partial<AIResult> = {};
    const args = JSON.parse(call.function.arguments);
    
    try {
      switch (call.function.name) {
        case 'addTransaction': toolResult = tools.addTransaction(state, args.amount, args.category, args.type, args.date_str, args.note); break;
        case 'addRecurring': toolResult = tools.addRecurring(state, args.amount, args.category, args.type, args.name, args.day, args.weekly); break;
        case 'runWhatIf': toolResult = tools.runWhatIf(state, args.sc, args.desc); break;
        case 'checkAffordability': toolResult = tools.checkAffordability(state, args.price, args.item, args.isMonthly); break;
        case 'whenCanIAfford': toolResult = tools.whenCanIAfford(state, args.price, args.item); break;
        case 'projectSavings': toolResult = tools.projectSavings(state, args.targetDateYMD); break;
        case 'getSpendAllowance': toolResult = tools.getSpendAllowance(state, args.days); break;
        case 'explainChanges': toolResult = tools.explainChanges(state); break;
        case 'suggestBudget': toolResult = tools.suggestBudget(state); break;
        case 'planTrip': toolResult = tools.planTrip(state, args.destination, args.days, undefined, args.targetDateYMD); break;
        case 'addLoan': toolResult = tools.addLoan(state, args.amount, args.rate, args.tenureMonths, args.type); break;
        case 'createGoal': toolResult = tools.createGoal(state, args.name, args.target, args.targetDateYMD); break;
        case 'transferMoney': toolResult = tools.transferMoney(state, args.amount, args.toPersonal); break;
        case 'getFinancialContext': toolResult = tools.getFinancialContext(state); break;
        case 'searchTransactions': toolResult = tools.searchTransactions(state, args.keyword, args.category, args.type); break;
        case 'deleteTransaction': toolResult = tools.deleteTransaction(state, args.keyword, args.amount); break;
        default: throw new tools.ToolError('RECORD_NOT_FOUND', 'Unknown tool requested.');
      }
    } catch (e: any) {
      if (e instanceof tools.ToolError) {
        return { id: uid(), q: text, at: Date.now(), kind: 'answer', title: 'Need more details', summary: e.message, tone: 'neg' };
      }
      throw e;
    }

    const synthesisResponse = await ai.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: `Summarize the financial tool response. Be concise, premium, and calm. Keep the tone like Apple × Linear. Return the response in JSON format. Format money in ${activeCurrency().code} using the symbol ${cur()}; use only numbers present in the tool response. Never invent financial facts or say an action was completed if it wasn't.` },
        ...history, 
        { role: 'user', content: text },
        msg,
        { role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult) }
      ],
      response_format: { type: 'json_object' }
    });

    let parsed: Partial<AIResult> = {};
    try {
      parsed = JSON.parse(synthesisResponse.choices[0]?.message?.content || '{}');
    } catch(e) {}

    return {
      id: uid(), q: text, at: Date.now(),
      kind: toolResult.kind || 'answer',
      title: parsed.title || toolResult.title || '',
      summary: parsed.summary || toolResult.summary || '',
      tone: parsed.tone || toolResult.tone,
      metrics: toolResult.metrics,
      chart: toolResult.chart,
      actions: toolResult.actions,
      breakdown: toolResult.breakdown,
      scenario: toolResult.scenario,
      autoApply: toolResult.autoApply
    };

  } catch (error) {
    console.error('Groq error:', error);
    return localInterpret(text, state);
  }
}
