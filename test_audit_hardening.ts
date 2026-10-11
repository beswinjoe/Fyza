import { strict as assert } from 'assert';
import { AppState } from './src/types/app';
import { Action } from './src/types/store';
import { EMPTY } from './src/engine/seed';
import { reducer } from './src/engine/store';
import { hydrate } from './src/engine/persistence';
import {
  accountBalance,
  available,
  cardStats,
  loanStats,
  netWorth,
  forecast
} from './src/engine/finance';
import { hasCapability } from './src/engine/capabilities';

console.log('--- AUDIT HARDENING TESTS ---');

// 1. Linked Debit Card Test:
// Ensure debit card transactions linked to an account deduct from the account balance
// even when transaction.accountId is not explicitly passed.
const baseState: AppState = hydrate({
  ...EMPTY,
  accounts: [{ id: 'acc-1', name: 'Checking', type: 'checking', opening: 1000, world: 'personal' }],
  cards: [{ id: 'card-1', name: 'Debit Card', kind: 'debit', accountId: 'acc-1', statementDay: 1, dueDay: 15 }],
  transactions: [
    { id: 'tx-1', type: 'expense', amount: 250, cardId: 'card-1', date: '2026-10-01', world: 'personal' } as any
  ]
});

const accBal = accountBalance(baseState, baseState.accounts[0]);
assert.equal(accBal, 750, 'Debit card transaction must deduct from linked account balance');

const avail = available(baseState, 'personal');
assert.equal(avail, 750, 'Available cash should equal 750 (not double deducted as untracked cash)');
console.log('1. Linked debit card deduction & available cash: PASS');

// 2. Credit Card Expense Separation:
// Credit card expenses should NOT reduce bank checking balance until card payment is made.
const ccState: AppState = hydrate({
  ...EMPTY,
  accounts: [{ id: 'acc-1', name: 'Checking', type: 'checking', opening: 1000, world: 'personal' }],
  cards: [{ id: 'cc-1', name: 'Credit Card', kind: 'credit', accountId: 'acc-1', limit: 2000, statementDay: 1, dueDay: 20 }],
  transactions: [
    { id: 'tx-2', type: 'expense', amount: 300, cardId: 'cc-1', accountId: 'acc-1', date: '2026-10-02', world: 'personal' } as any
  ]
});
assert.equal(accountBalance(ccState, ccState.accounts[0]), 1000, 'Credit card expense must not reduce bank account balance');
assert.equal(cardStats(ccState, ccState.cards[0]).totalBalance, 300, 'Credit card balance should be 300');
console.log('2. Credit card balance separation: PASS');

// 3. Card Stats Day Clamping (leap years / short months / out of bounds day values):
const clampedStats = cardStats(ccState, {
  id: 'c-clamp',
  name: 'Test',
  kind: 'credit',
  statementDay: 35, // invalid/overflow
  dueDay: 40
} as any, new Date('2026-02-15'));
assert.ok(clampedStats.statementDate, 'Statement date must be valid string');
assert.ok(clampedStats.dueDate, 'Due date must be valid string');
console.log('3. Card stats day clamping: PASS');

// 4. Loan Stats Zero-Principal Protection:
const zeroLoan = loanStats({
  id: 'loan-zero',
  name: 'Zero Loan',
  principal: 0,
  rate: 0,
  tenureMonths: 12,
  startDate: '2026-01-01',
  world: 'personal'
} as any, new Date('2026-02-01'));
assert.equal(Number.isFinite(zeroLoan.progress), true, 'Zero-principal loan progress must not be NaN');
console.log('4. Zero loan division-by-zero protection: PASS');

// 5. Net Worth Earmarked Goals Protection:
// Earmarked goals must not be double counted on top of available cash
const nwState: AppState = hydrate({
  ...EMPTY,
  accounts: [{ id: 'acc-1', name: 'Checking', type: 'checking', opening: 5000, world: 'personal' }],
  goals: [{ id: 'g-1', name: 'Vacation', target: 2000, current: 1500, world: 'personal' }],
  cards: [{ id: 'cc-1', name: 'Card', kind: 'credit', limit: 1000 }],
  transactions: [{ id: 'tx-cc', type: 'expense', amount: 200, cardId: 'cc-1', date: '2026-10-01', world: 'personal' } as any]
});
const nw = netWorth(nwState);
assert.equal(nw.assets, 5000, 'Assets should match cash balance (5000) without double-counting 1500 goal current');
assert.equal(nw.liabilities, 200, 'Liabilities should only be credit debt (200)');
assert.equal(nw.net, 4800, 'Net worth should be assets (5000) minus liabilities (200) = 4800');
console.log('5. Net worth earmarked goal consistency: PASS');

// 6. Capabilities Integrity:
assert.equal(hasCapability({ ...EMPTY, profiles: ['student'] }, 'accounts'), false);
assert.equal(hasCapability({ ...EMPTY, profiles: ['student'] }, 'cards'), false);
assert.equal(hasCapability({ ...EMPTY, profiles: ['student'] }, 'business'), false);
assert.equal(hasCapability({ ...EMPTY, profiles: ['personal'] }, 'accounts'), true);
console.log('6. Student profile capability checks: PASS');

// 7. Non-destructive Undo Snapshot Test:
let undoState: AppState = hydrate({
  ...EMPTY,
  trips: [{ id: 'trip-1', destination: 'Tokyo', budget: 3000, start: '2026-11-01', end: '2026-11-10', world: 'personal' } as any]
});

// Simulate updating a trip
const originalTrip = { ...undoState.trips[0] };
const updateAction: Action = { type: 'update', col: 'trips', id: 'trip-1', patch: { budget: 4500 } };
undoState = reducer(undoState, updateAction);
assert.equal(undoState.trips[0].budget, 4500, 'Trip budget updated to 4500');

// Snapshot undo operation restores originalTrip
const undoAction: Action = { type: 'update', col: 'trips', id: 'trip-1', patch: originalTrip };
undoState = reducer(undoState, undoAction);
assert.equal(undoState.trips[0].budget, 3000, 'Trip budget restored to 3000 via snapshot undo without deletion');
console.log('7. Non-destructive snapshot undo: PASS');

console.log('ALL AUDIT HARDENING TESTS PASSED!');
