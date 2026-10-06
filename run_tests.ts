import { validateItem } from './src/engine/store.tsx';
import { forecast, emi, loanStats, accountBalance } from './src/engine/finance.ts';
import { parseDate } from './src/engine/format.ts';

// We can just manually construct the states and call the pure functions.
const now = new Date('2026-10-06T00:00:00');

console.log('--- TEST A ---');
// Income 50000, Expenses 30000
const stA = {
  transactions: [
    { type: 'income', amount: 50000, date: '2026-10-01', world: 'personal' },
    { type: 'expense', amount: 30000, date: '2026-10-05', world: 'personal' }
  ],
  recurring: [], goals: [], trips: [], loans: [], cards: [], accounts: []
};
const fcA = forecast(stA as any, 'personal', 1);
console.log('Test A (Net 20000):', fcA[0].balance === 20000 ? 'PASS' : 'FAIL ' + fcA[0].balance);

console.log('--- TEST D ---');
// Loan with principal 100000, interest 10%, tenure 12mo
const loan = { principal: 100000, rate: 10, tenureMonths: 12, startDate: '2026-01-01' };
const stats = loanStats(loan as any, new Date('2026-06-01'));
console.log('Test D (EMI):', Math.round(stats.emi) === 8792 ? 'PASS' : 'FAIL ' + stats.emi);
console.log('Test D (Remaining):', stats.remainingMonths === 7 ? 'PASS' : 'FAIL ' + stats.remainingMonths);

