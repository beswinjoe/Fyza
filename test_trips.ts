import { AppState } from './src/types/app';
import { Trip, Transaction } from './src/types/finance';
import { tripTotal, tripSpent, forecast, tripDays, available } from './src/engine/finance';
import { daysBetween, parseDate, today } from './src/engine/format';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error("Assertion failed: " + msg);
}

// Mock state
const now = today();
const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

const trip1: Trip = {
  id: 't1', world: 'personal',
  destination: 'Paris',
  start: nextMonth.toISOString().slice(0, 10),
  end: nextMonth.toISOString().slice(0, 10),
  budget: { travel: 1000, food: 500 },
  createdAt: now.toISOString()
};

const tx1: Transaction = {
  id: 'tx1', type: 'expense', amount: 300, date: now.toISOString().slice(0, 10),
  tripId: 't1', world: 'personal', category: 'Food'
};

const state: AppState = {
  activeWorld: 'personal',
  transactions: [tx1],
  recurring: [],
  goals: [],
  loans: [],
  accounts: [],
  cards: [],
  trips: [trip1],
  scenarios: []
};

// 1. Trip totals and remaining budget
const total = tripTotal(trip1);
assert(total === 1500, `Expected 1500, got ${total}`);

const spent = tripSpent(state, trip1);
assert(spent === 300, `Expected 300, got ${spent}`);

// 2. Countdown semantics & inclusive end dates
const tDays = tripDays(trip1);
assert(tDays === 1, `Expected 1, got ${tDays}`);

// Test DST boundaries (e.g. Nov 1st to Nov 2nd in US)
const nov1 = new Date('2026-11-01T00:00:00Z');
const nov2 = new Date('2026-11-02T00:00:00Z');
const daysDst = daysBetween(nov1, nov2);
assert(daysDst === 1, `Expected 1 day across DST, got ${daysDst}`);

// 3. Forecast semantics
const fc = forecast(state, 'personal', 3, {}, now);
// The trip is next month. Remaining budget is 1500 - 300 = 1200.
// We expect the forecast for next month to include exactly 1200.
const tripInNextMonth = fc[1].trips;
assert(Math.round(tripInNextMonth) === 1200, `Expected 1200 forecasted for next month, got ${tripInNextMonth}`);

// 4. Budget not subtracted from current cash
const cash = available(state, 'personal');
assert(cash === -300, `Expected -300 cash (only actual expense), got ${cash}`);

console.log("All Trip regression tests passed!");
