import { strict as assert } from 'assert';
import { accountBalance, available, monthSummary, forecast, 
  loanStats, emi, goalStats, tripTotal, tripSpent, cardStats, 
  studentCycle, upcoming, netWorth } from './src/engine/finance';
import { reducer } from './src/engine/store';
import { AppState } from './src/types/app';

const NOW = new Date('2026-10-15T12:00:00Z');
const getEmptyState = (): AppState => ({
  onboarded: true, user: { name: 'Test' }, currency: 'USD', profiles: [], world: 'personal',
  accounts: [], cards: [], loans: [], transactions: [], recurring: [], goals: [], trips: [], invoices: [], scenarios: [], aiHistory: [], categories: [],
});

// Test netWorth cardDebt fix
const s1 = getEmptyState();
s1.cards.push({ id: 'c1', name: 'Visa', kind: 'credit', limit: 2000, statementDay: 1, dueDay: 15, world: 'personal' } as any);
// Two transactions: one this cycle, one previous
s1.transactions.push({ id: 'tx1', type: 'expense', amount: 300, date: '2026-10-10', cardId: 'c1', world: 'personal' });
s1.transactions.push({ id: 'tx2', type: 'expense', amount: 200, date: '2026-09-10', cardId: 'c1', world: 'personal' });
const nw = netWorth(s1);
assert.equal(nw.cardDebt, 500, 'Card debt should sum all outstanding balance, not just current cycle');

// Test trip orphans fix
let s2 = getEmptyState();
s2.trips.push({ id: 'tr1', destination: 'Paris', start: '2026-11-10', end: '2026-11-15', budget: { travel: 500, stay: 500 }, world: 'personal' });
s2.transactions.push({ id: 'tx1', type: 'expense', amount: 300, date: '2026-10-10', tripId: 'tr1', world: 'personal' });
s2 = reducer(s2, { type: 'remove', col: 'trips', id: 'tr1' });
assert.equal(s2.trips.length, 0);
assert.equal(s2.transactions.length, 1);
assert.equal(s2.transactions[0].tripId, undefined, 'Orphaned transaction should have tripId cleared');

console.log('All regression tests passed!');
