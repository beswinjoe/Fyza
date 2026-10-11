import { strict as assert } from 'assert';
import { forecast, tripTotal, tripSpent, tripDays } from './src/engine/finance';
import { AppState } from './src/types/app';
import { mkey, today, parseDate, addMonths } from './src/engine/format';

const now = today(); // Real today
const getEmptyState = (): AppState => ({
  onboarded: true, user: { name: 'Test' }, currency: 'USD', profiles: [], world: 'personal',
  accounts: [], cards: [], loans: [], transactions: [], recurring: [], goals: [], trips: [], invoices: [], scenarios: [], aiHistory: [], categories: [],
});

let s1 = getEmptyState();
// Create a trip that spans from 2 days from now to 9 days from now (8 days total)
const start = new Date(now);
start.setDate(start.getDate() + 2);
const end = new Date(now);
end.setDate(end.getDate() + 9);

s1.trips.push({ 
  id: 't1', destination: 'Test', 
  start: `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`,
  end: `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
  budget: { travel: 800 }, world: 'personal' 
} as any);

const fc = forecast(s1, 'personal', 3);
// This trip is entirely in the future.
// Does it span multiple months? It might, depending on when "now" is.
// To reliably test multi-month, let's force a trip that crosses the month boundary from today.
const start2 = new Date(now.getFullYear(), now.getMonth(), 28);
const end2 = new Date(now.getFullYear(), now.getMonth() + 1, 4); // 8 days total
// Wait, if today is > 28, start2 is in the past.
const mStart = new Date(now.getFullYear(), now.getMonth() + 1, 28);
const mEnd = new Date(now.getFullYear(), now.getMonth() + 2, 4);
s1.trips = [{ 
  id: 't2', destination: 'Multi-month', 
  start: `${mStart.getFullYear()}-${String(mStart.getMonth()+1).padStart(2, '0')}-${String(mStart.getDate()).padStart(2, '0')}`,
  end: `${mEnd.getFullYear()}-${String(mEnd.getMonth()+1).padStart(2, '0')}-${String(mEnd.getDate()).padStart(2, '0')}`,
  budget: { travel: 800 }, world: 'personal' 
} as any];

const fc2 = forecast(s1, 'personal', 3);
// Month 0: current month. Month 1: next month (mStart is here). Month 2: month after next (mEnd is here).
// Budget 800. 8 days total.
// Month 1 should get 4 days (28, 29, 30, 31 or 28, 29, 30).
const daysInM1 = new Date(mStart.getFullYear(), mStart.getMonth() + 1, 0).getDate();
const daysInM1Overlap = daysInM1 - 28 + 1;
const daysInM2Overlap = 4;
const totalD = daysInM1Overlap + daysInM2Overlap;

assert.equal(Math.round(fc2[1].trips), Math.round(800 * (daysInM1Overlap / totalD)), 'Proportional budget for month 1');
assert.equal(Math.round(fc2[2].trips), Math.round(800 * (daysInM2Overlap / totalD)), 'Proportional budget for month 2');

console.log('Trip regression tests passed!');
