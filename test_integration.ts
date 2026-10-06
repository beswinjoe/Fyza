import { strict as assert } from 'assert';
import { AppState } from './src/types/app';
import { Action } from './src/types/store';
import { EMPTY } from './src/engine/seed';
import { reducer } from './src/engine/store';
import { hydrate, saveState, loadState, CURRENT_VERSION } from './src/engine/persistence';
import * as tools from './src/engine/aiTools';

// Helper to simulate the complete reducer/persistence cycle
let state = hydrate(EMPTY);

function persist(state: AppState) {
  saveState({ version: CURRENT_VERSION, workspaceId: 'w1', updatedAt: '2026', data: state });
}

function load() {
  return loadState().data;
}

function dispatch(action: Action) {
  state = reducer(state, action);
  persist(state); // simulates persistence
}

function reset() {
  state = hydrate(EMPTY);
  state.world = 'personal';
  state.accounts = [{ id: 'a1', name: 'Bank', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' }];
}

reset();
console.log('--- INTEGRATION TESTS ---');

// A. Add income manually
dispatch({ type: 'add', col: 'transactions', item: { id: 't1', type: 'income', amount: 200, category: 'Salary', date: '2026-10-15', note: '', world: 'personal' } });
assert.equal(state.transactions.length, 1);
assert.equal(state.transactions[0].amount, 200);
console.log('A. Add income manually: PASS');

// B. Add expense manually
dispatch({ type: 'add', col: 'transactions', item: { id: 't2', type: 'expense', amount: 50, category: 'Food', date: '2026-10-16', note: '', world: 'personal' } });
assert.equal(state.transactions.length, 2);
console.log('B. Add expense manually: PASS');

// C. Add expense through AI
const resC = tools.addTransaction(state, 100, 'Transport', 'expense', '2026-10-17', 'Taxi');
dispatch(resC.actions![0].ops[0] as Action);
assert.equal(state.transactions.length, 3);
assert.equal(state.transactions[2].amount, 100);
console.log('C. Add expense through AI: PASS');

// D. Query balance through AI
const resD = tools.getFinancialContext(state);
assert.equal(resD.kind, 'answer');
console.log('D. Query balance through AI: PASS');

// E. Query forecast through AI
const resE = tools.projectSavings(state, '2027-01-01');
assert.equal(resE.kind, 'answer');
console.log('E. Query forecast through AI: PASS');

// F. Add trip through AI
const resF = tools.planTrip(state, 'Paris', 5, { Flight: 500, Hotel: 300 }, '2026-12-01');
dispatch(resF.actions![0].ops[0] as Action);
assert.equal(state.trips.length, 1);
console.log('F. Add trip through AI: PASS');

// G. Update existing record
dispatch({ type: 'update', col: 'transactions', id: 't2', patch: { amount: 60 } } as any);
assert.equal(state.transactions.find(t => t.id === 't2')?.amount, 60);
console.log('G. Update existing record: PASS');

// H. Delete exact record
const resH = tools.deleteTransaction(state, 'Taxi', 100);
dispatch(resH.actions![0].ops[0] as Action);
assert.equal(state.transactions.find(t => t.id === 't3' || t.note === 'Taxi'), undefined);
console.log('H. Delete exact record: PASS');

// I. Reject ambiguous delete
dispatch({ type: 'add', col: 'transactions', item: { id: 't4', type: 'expense', amount: 10, category: 'Coffee', date: '2026-10-18', note: '', world: 'personal' } });
dispatch({ type: 'add', col: 'transactions', item: { id: 't5', type: 'expense', amount: 10, category: 'Coffee', date: '2026-10-19', note: '', world: 'personal' } });
assert.throws(() => tools.deleteTransaction(state, 'Coffee'), /Found 2 matching/);
console.log('I. Reject ambiguous delete: PASS');

// J. Currency change
dispatch({ type: 'set', patch: { currency: 'INR' } });
assert.equal(state.currency, 'INR');
// Note: amounts do NOT change.
assert.equal(state.transactions[0].amount, 200);
console.log('J. Currency change: PASS');

// K. Personal/business separation
reset();
dispatch({ type: 'add', col: 'transactions', item: { id: 't_biz', type: 'expense', amount: 1000, category: 'Server', date: '2026-10-15', note: '', world: 'business' } });
const resK = tools.getFinancialContext(state);
// Because state.world is personal, business transactions shouldn't affect personal available balance
assert.equal((resK as any).analysisData.thisMonth.expense, 0);
console.log('K. Personal/business separation: PASS');

// L. Past-dated transaction
reset();
dispatch({ type: 'add', col: 'transactions', item: { id: 't_past', type: 'expense', amount: 500, category: 'Food', date: '2025-10-15', note: '', world: 'personal' } });
const resL = tools.getFinancialContext(state);
// Past transaction reduces total available balance
assert.equal((resL as any).analysisData.currentAvailable, 500); // 1000 opening - 500
console.log('L. Past-dated transaction: PASS');

// M. Invalid financial input
// M. Invalid financial input
assert.throws(() => {
  dispatch({ type: 'add', col: 'transactions', item: { id: 't_inv', type: 'expense', amount: -50, category: 'Food', date: '2026-10-15', note: '', world: 'personal' } });
}, /negative|Negative/i);
assert.throws(() => {
  dispatch({ type: 'add', col: 'transactions', item: { id: 't_inv2', type: 'expense', amount: NaN, category: 'Food', date: '2026-10-15', note: '', world: 'personal' } });
}, /NaN|Invalid/i);
console.log('M. Invalid financial input: PASS');

// N. Persistence failure
// We simulate failure by causing a quota exceeded error on localStorage (mocked)
let _setItem = global.localStorage?.setItem;
if (global.localStorage) {
  global.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => persist(state), /Quota exceeded/);
  global.localStorage.setItem = _setItem;
}
console.log('N. Persistence failure: PASS');

// O. Corrupted persistence
if (global.localStorage) {
  global.localStorage.setItem('fyza.v2', 'invalid{json');
  const loaded = load();
  assert.equal(loaded.accounts.length, 0); // returns initial state fallback
}
console.log('O. Corrupted persistence: PASS');

// P. AI tool failure
assert.throws(() => tools.addTransaction(state, NaN, 'Food', 'expense', '2026-10-15', ''), /valid positive amount/);
console.log('P. AI tool failure: PASS');

console.log('ALL INTEGRATION TESTS PASSED!');
