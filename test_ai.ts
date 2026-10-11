import { strict as assert } from 'assert';
import { AppState } from './src/types/app';
import * as tools from './src/engine/aiTools';

import { EMPTY } from './src/engine/seed';

function getEmptyState(): AppState {
  const s = structuredClone(EMPTY);
  s.accounts = [{ id: 'a1', name: 'Bank', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' }];
  return s;
}

const s = getEmptyState();

// A. "Add $500 food expense"
const a = tools.addTransaction(s, 500, 'Food', 'expense', '2026-10-15', 'Dinner');
assert.equal(a.actions?.[0].ops[0].type, 'add');
assert.equal(a.actions?.[0].ops[0].col, 'transactions');
assert.equal(((a.actions?.[0].ops[0] as any).item as any).amount, 500);
assert.equal(a.autoApply, true);

// F. "Add 500" -> ambiguity
assert.throws(() => tools.addTransaction(s, 500, '', '' as any, '2026-10-15', ''), /What should I record this as/);

// G. invalid amount
assert.throws(() => tools.addTransaction(s, -500, 'Food', 'expense', '2026-10-15', ''), /valid positive amount/);
assert.throws(() => tools.addTransaction(s, NaN, 'Food', 'expense', '2026-10-15', ''), /valid positive amount/);

// H. invalid date
assert.throws(() => tools.addTransaction(s, 500, 'Food', 'expense', 'invalid-date', ''), /valid date/);
assert.throws(() => tools.addTransaction(s, 500, 'Food', 'expense', '2026-15-40', ''), /invalid/);

// I. delete ambiguous record
s.transactions.push({ id: 't1', type: 'expense', amount: 50, note: 'Coffee', date: '2026-10-10', world: 'personal' });
s.transactions.push({ id: 't2', type: 'expense', amount: 50, note: 'Coffee', date: '2026-10-11', world: 'personal' });
assert.throws(() => tools.deleteTransaction(s, 'Coffee'), /Found 2 matching transactions/);

// J. successful delete with confirmation
s.transactions[1].amount = 60; // Make it unambiguous
const d2 = tools.deleteTransaction(s, 'Coffee', 50);
assert.equal(d2.autoApply, false); // MUST confirm
assert.equal(d2.actions?.[0].ops[0].type, 'remove');

// O. repeated tool call / duplicate protection
const dupState = getEmptyState();
const r1 = tools.addTransaction(dupState, 500, 'Food', 'expense', '2026-10-15', 'Dinner');
dupState.transactions.push((r1.actions![0].ops[0] as any).item as any);
// Call exactly the same again
const r2 = tools.addTransaction(dupState, 500, 'Food', 'expense', '2026-10-15', 'Dinner');
assert.equal(r2.autoApply, false); // autoApply is blocked on duplicate
assert.match(r2.summary, /similar transaction was recently added/);

// P. localInterpret safety: high-value threshold
import { localInterpret } from './src/engine/ai';
const sHigh = getEmptyState();
const rHigh = localInterpret('I spent 150000 on a luxury watch', sHigh);
assert.equal(rHigh.autoApply, false, 'High value transaction >= 100k must not autoApply');
assert.match(rHigh.summary, /High-value transaction requires confirmation/);

// Q. localInterpret safety: duplicate detection
const sDupLocal = getEmptyState();
const rLocal1 = localInterpret('I spent 850 on dinner', sDupLocal);
assert.equal(rLocal1.autoApply, true);
sDupLocal.transactions.push((rLocal1.actions![0].ops[0] as any).item as any);
const rLocal2 = localInterpret('I spent 850 on dinner', sDupLocal);
assert.equal(rLocal2.autoApply, false, 'Duplicate localInterpret must require confirmation');
assert.match(rLocal2.summary, /Possible duplicate/);

// R. localInterpret safety: ambiguous multiple amounts
const sAmb = getEmptyState();
const rAmb = localInterpret('I spent 500 on dinner and 200 on taxi', sAmb);
assert.equal(rAmb.autoApply, false, 'Multiple amounts must require confirmation');

console.log('AI tooling tests passed!');
