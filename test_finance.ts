import { strict as assert } from 'assert';
import { 
  accountBalance, available, monthSummary, forecast, 
  loanStats, emi, goalStats, tripTotal, tripSpent, cardStats, 
  studentCycle, upcoming 
} from './src/engine/finance';
import { monthLabel } from './src/engine/format';
import { AppState } from './src/types/app';

// Helper to assert roughly equal for floating points
function assertClose(actual: number, expected: number, tolerance = 0.01, msg?: string) {
  if (Math.abs(actual - expected) > tolerance) {
    assert.fail(`${msg || 'Value'} expected ${expected} but got ${actual}`);
  }
}

// Ensure tests are deterministic
const NOW = new Date('2026-10-15T12:00:00Z');

// Baseline state for all tests
const getEmptyState = (): AppState => ({
  onboarded: true,
  user: { name: 'Test' },
  currency: 'USD',
  profiles: [],
  world: 'personal',
  accounts: [],
  cards: [],
  loans: [],
  transactions: [],
  recurring: [],
  goals: [],
  trips: [],
  invoices: [],
  scenarios: [],
  aiHistory: [],
  categories: [],
});

console.log('Running finance engine tests...');

// 1. Income / expense
const s1 = getEmptyState();
s1.accounts.push({ id: 'a1', name: 'Bank', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' });
s1.transactions.push({ id: 't1', type: 'income', amount: 500, date: '2026-10-01', accountId: 'a1', world: 'personal' });
s1.transactions.push({ id: 't2', type: 'expense', amount: 200, date: '2026-10-10', accountId: 'a1', world: 'personal' });
s1.transactions.push({ id: 't3', type: 'expense', amount: 50.75, date: '2026-10-11', world: 'personal' }); // Cash expense

assertClose(accountBalance(s1, s1.accounts[0]), 1000 + 500 - 200); // 1300
assertClose(available(s1, 'personal'), 1300 - 50.75); // 1249.25

const sum1 = monthSummary(s1, '2026-10', 'personal');
assertClose(sum1.income, 500);
assertClose(sum1.expense, 250.75);
assertClose(sum1.net, 249.25);

// 2. Transfers without double counting
const s2 = getEmptyState();
s2.accounts.push({ id: 'a1', name: 'Bank 1', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' });
s2.accounts.push({ id: 'a2', name: 'Bank 2', opening: 500, type: 'bank', currency: 'USD', world: 'personal' });
s2.transactions.push({ id: 't1', type: 'transfer', amount: 300, date: '2026-10-01', fromAccountId: 'a1', toAccountId: 'a2', fromWorld: 'personal', toWorld: 'personal', world: 'personal' });
assertClose(accountBalance(s2, s2.accounts[0]), 700);
assertClose(accountBalance(s2, s2.accounts[1]), 800);
assertClose(available(s2, 'personal'), 1500); // Unchanged

const sum2 = monthSummary(s2, '2026-10', 'personal');
assertClose(sum2.income, 0); // Transfers are not income
assertClose(sum2.expense, 0); // Transfers are not expense
assertClose(sum2.net, 0);
assertClose(sum2.transferIn, 0); // Internal personal transfer is not "In" to world
assertClose(sum2.transferOut, 0);

// 3. Personal/business separation
const s3 = getEmptyState();
s3.accounts.push({ id: 'a1', name: 'Personal', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' });
s3.accounts.push({ id: 'a2', name: 'Business', opening: 5000, type: 'bank', currency: 'USD', world: 'business' });
s3.transactions.push({ id: 't1', type: 'income', amount: 100, date: '2026-10-01', accountId: 'a1', world: 'personal' });
s3.transactions.push({ id: 't2', type: 'income', amount: 900, date: '2026-10-01', accountId: 'a2', world: 'business' });
assertClose(available(s3, 'personal'), 1100);
assertClose(available(s3, 'business'), 5900);

// 4. Recurring expenses
const s4 = getEmptyState();
s4.accounts.push({ id: 'a1', name: 'Bank', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' });
s4.recurring.push({ id: 'r1', name: 'Netflix', type: 'expense', category: 'Entertainment', amount: 15, day: 5, world: 'personal' });
s4.recurring.push({ id: 'r2', name: 'Salary', type: 'income', category: 'Salary', amount: 2000, day: 1, world: 'personal' });
// recurring do not affect available immediately, only via forecast or when added as a transaction
assertClose(available(s4, 'personal'), 1000);

const f4 = forecast(s4, 'personal', 1, {}, NOW);
// In Oct 15: Salary (day 1) and Netflix (day 5) already passed this month (Oct 1-15), 
// so they should NOT be added to the current month's forecast if we only count remaining.
// Wait! `forecast` checks: `if (i === 0 && (+(r.day || 1)) <= now.getDate()) continue;`
assertClose(f4[0].recurring, 0); 
assertClose(f4[0].income, 0);

// 5. Forecast cross-month
const f4_next = forecast(s4, 'personal', 2, {}, NOW);
// Month 2 (Nov): 
assertClose(f4_next[1].recurring, 15);
assertClose(f4_next[1].income, 2000);

// 6. Goals
const s6 = getEmptyState();
s6.accounts.push({ id: 'a1', name: 'Bank', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' });
s6.goals.push({ id: 'g1', name: 'Car', kind: 'savings', target: 5000, current: 1000, monthly: 500, targetDate: '2026-12-01', world: 'personal' });
const g6Stats = goalStats(s6.goals[0], NOW);
assertClose(g6Stats.left, 4000);
assertClose(g6Stats.progress, 0.2);
assertClose(g6Stats.monthsNeeded, 8);
const f6 = forecast(s6, 'personal', 1, {}, NOW);
assertClose(f6[0].goals, 500);

// 7. Trips
const s7 = getEmptyState();
s7.trips.push({ id: 'tr1', destination: 'Paris', start: '2026-11-10', end: '2026-11-15', budget: { travel: 500, stay: 500 }, world: 'personal' });
s7.transactions.push({ id: 't1', type: 'expense', amount: 200, date: '2026-10-01', tripId: 'tr1', world: 'personal' }); // pre-booked flight
assertClose(tripTotal(s7.trips[0]), 1000);
assertClose(tripSpent(s7, s7.trips[0]), 200);
const f7 = forecast(s7, 'personal', 2, {}, NOW);
assertClose(f7[0].trips, 0); // Trip is in Nov
assertClose(f7[1].trips, 800); // 1000 - 200 spent

// 8. Loans / EMI
assertClose(emi(10000, 0, 10), 1000); // 0% interest
assertClose(emi(100000, 10, 12), 8791.58, 0.01); // Standard amortized
const l1 = { id: 'l1', name: 'Car', type: 'vehicle', lender: 'Bank', principal: 10000, rate: 0, tenureMonths: 10, startDate: '2026-05-01', world: 'personal' } as any;
const ls1 = loanStats(l1, NOW); // May to Oct = 5 months paid
assert.equal(ls1.paid, 5);
assertClose(ls1.balance, 5000);
assertClose(ls1.progress, 0.5);

// 9. Credit cards
const s9 = getEmptyState();
s9.accounts.push({ id: 'a1', name: 'Bank', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' });
s9.cards.push({ id: 'c1', name: 'Visa', kind: 'credit', limit: 5000, statementDay: 5, dueDay: 20, world: 'personal' } as any);
s9.transactions.push({ id: 't1', type: 'expense', amount: 150, date: '2026-10-10', cardId: 'c1', world: 'personal' }); // this cycle
s9.transactions.push({ id: 't2', type: 'expense', amount: 200, date: '2026-09-10', cardId: 'c1', world: 'personal' }); // last cycle
s9.transactions.push({ id: 't3', type: 'card_payment', amount: 200, date: '2026-10-14', cardId: 'c1', accountId: 'a1', world: 'personal' }); // payment
assertClose(available(s9, 'personal'), 800); // 1000 - 200 payment. Card expenses do not deduct from available directly!
const cs9 = cardStats(s9, s9.cards[0], NOW); // cycle start Oct 6.
assertClose(cs9.spent, 150); // Oct 10 tx
assertClose(cs9.availableLimit, 4850);

// 10. Date boundaries
assert.equal(monthLabel('2026-01'), 'Jan');

// 11. Fractional money
assertClose(emi(100.55, 10.1, 3), 34.08, 0.01);

// 12. Invalid values
const l2 = { id: 'l2', principal: NaN, rate: Infinity, tenureMonths: -1, startDate: 'invalid', world: 'personal' } as any;
assert.throws(() => loanStats(l2, NOW), /Invalid/);

// 13. Zero values
assert.equal(emi(0, 10, 12), 0);
assert.equal(emi(100, 0, 0), 0);

// 14. Completed goals
const s14 = getEmptyState();
s14.goals.push({ id: 'g2', name: 'House', kind: 'savings', target: 50000, current: 50000, monthly: 500, targetDate: '2027-01-01', world: 'personal' });
const g14Stats = goalStats(s14.goals[0], NOW);
assertClose(g14Stats.progress, 1);
assertClose(g14Stats.left, 0);
assert.equal(g14Stats.monthsNeeded, 0);

// 15. Cross-month transactions
const s15 = getEmptyState();
s15.transactions.push({ id: 't1', type: 'expense', amount: 100, date: '2026-09-30', world: 'personal' });
s15.transactions.push({ id: 't2', type: 'expense', amount: 200, date: '2026-10-01', world: 'personal' });
const sepSummary = monthSummary(s15, '2026-09', 'personal');
const octSummary = monthSummary(s15, '2026-10', 'personal');
assertClose(sepSummary.expense, 100);
assertClose(octSummary.expense, 200);

// 16. Combined realistic scenario
const s16 = getEmptyState();
s16.accounts.push({ id: 'a1', name: 'Bank', opening: 1000, type: 'bank', currency: 'USD', world: 'personal' });
s16.cards.push({ id: 'c1', name: 'Visa', kind: 'credit', limit: 2000, statementDay: 1, dueDay: 15, world: 'personal' } as any);
s16.recurring.push({ id: 'r1', name: 'Salary', type: 'income', category: 'Salary', amount: 5000, day: 1, world: 'personal' });
s16.recurring.push({ id: 'r2', name: 'Rent', type: 'expense', category: 'Housing', amount: 1500, day: 5, world: 'personal' });
s16.transactions.push({ id: 't1', type: 'expense', amount: 300, date: '2026-10-10', cardId: 'c1', world: 'personal' });
s16.goals.push({ id: 'g1', name: 'Vacation', kind: 'savings', target: 2000, current: 0, monthly: 400, targetDate: '2026-12-01', world: 'personal' });

const f16 = forecast(s16, 'personal', 3, {}, NOW);
// Month 1 (Oct 15 - Oct 31): Salary (day 1) and Rent (day 5) already passed, so remaining forecast for Oct:
assertClose(f16[0].income, 0); 
assertClose(f16[0].recurring, 0); 
assertClose(f16[0].goals, 400); // goals are fully evaluated for the month

// Month 2 (Nov):
assertClose(f16[1].income, 5000);
assertClose(f16[1].recurring, 1500);
assertClose(f16[1].goals, 400);

console.log('All finance tests passed!');
