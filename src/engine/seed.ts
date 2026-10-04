// Demo data generator — builds realistic history relative to today.
import { ymd, today, uid, addDays } from './format';
import { AppState } from '../types/app';
import { TransactionType, Account, Transaction, RecurringItem, Card, Loan } from '../types/finance';

function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const EMPTY: AppState = {
  onboarded: false, user: { name: '' }, profiles: [], world: 'personal', theme: 'dark',
  accounts: [], cards: [], loans: [], transactions: [], recurring: [], goals: [], trips: [], invoices: [], scenarios: [], aiHistory: [],
  categories: ['Food', 'Groceries', 'Transport', 'Rent', 'Bills', 'Subscriptions', 'Shopping', 'Entertainment', 'Health', 'Education', 'Travel', 'EMI', 'Other'],
};

export function buildSeed({ name, profiles }: { name: string; profiles: string[] }): AppState {
  const s = structuredClone(EMPTY) as AppState;
  s.user.name = name; s.profiles = profiles as any[]; s.onboarded = true;
  const r = rng(42), now = today();
  
  const tx = (o: Partial<Transaction> & { type: TransactionType, amount: number }) => s.transactions.push({ id: uid(), tags: [], world: 'personal', date: ymd(now), ...o } as Transaction);
  const student = profiles.includes('student') && !profiles.includes('personal');
  const biz = profiles.includes('business') || profiles.includes('freelancer');

  const forDays = (fn: (d: Date, i: number) => void) => { for (let i = 120; i >= 0; i--) fn(addDays(now, -i), i); };

  if (student) {
    const acc: Account = { id: uid(), name: 'SBI Student', institution: 'SBI', type: 'bank', opening: 2400, currency: 'INR', world: 'personal' };
    const cash: Account = { id: uid(), name: 'Cash', type: 'cash', opening: 600, currency: 'INR', world: 'personal' };
    const upi: Account = { id: uid(), name: 'Paytm Wallet', type: 'wallet', opening: 0, currency: 'INR', world: 'personal' };
    s.accounts.push(acc, cash, upi);
    const pm: RecurringItem = { id: uid(), name: 'Pocket money', type: 'income', amount: 8000, day: 1, category: 'Pocket money', accountId: acc.id, world: 'personal' };
    const spot: RecurringItem = { id: uid(), name: 'Spotify Student', type: 'expense', amount: 59, day: 14, category: 'Subscriptions', accountId: acc.id, world: 'personal' };
    const ph: RecurringItem = { id: uid(), name: 'Mobile recharge', type: 'expense', amount: 299, day: 20, category: 'Bills', accountId: acc.id, world: 'personal' };
    s.recurring.push(pm, spot, ph);
    forDays((d) => {
      const day = d.getDate(), date = ymd(d);
      for (const rc of s.recurring) if (rc.day === day) tx({ type: rc.type, amount: rc.amount, category: rc.category, date, accountId: rc.accountId, note: rc.name, recurringId: rc.id });
      if (r() < 0.55) tx({ type: 'expense', amount: Math.round(40 + r() * 180), category: 'Food', date, accountId: upi.id, note: ['Canteen', 'Chai & samosa', 'Zomato', 'Maggi point'][Math.floor(r() * 4)] });
      if (r() < 0.3) tx({ type: 'expense', amount: Math.round(20 + r() * 60), category: 'Transport', date, accountId: cash.id, note: ['Metro', 'Auto', 'Bus pass top-up'][Math.floor(r() * 3)] });
      if (r() < 0.05) tx({ type: 'expense', amount: Math.round(250 + r() * 600), category: 'Entertainment', date, accountId: upi.id, note: 'Movie with friends' });
      if (r() < 0.04) tx({ type: 'expense', amount: Math.round(150 + r() * 400), category: 'Education', date, accountId: acc.id, note: 'Books & xerox' });
      if (day === 3 || day === 18) tx({ type: 'transfer', amount: 1500, fromAccountId: acc.id, toAccountId: upi.id, fromWorld: 'personal', toWorld: 'personal', date, note: 'Wallet top-up' });
    });
    s.goals.push(
      { id: uid(), name: 'New laptop', kind: 'laptop', target: 70000, current: 18500, monthly: 2500, targetDate: ymd(new Date(now.getFullYear() + 1, 5, 1)) },
      { id: uid(), name: 'Emergency cushion', kind: 'emergency', target: 10000, current: 6200, monthly: 800, targetDate: ymd(new Date(now.getFullYear(), now.getMonth() + 5, 1)) },
    );
    s.trips.push({ id: uid(), destination: 'Goa', start: ymd(new Date(now.getFullYear(), 11, 20)), end: ymd(new Date(now.getFullYear(), 11, 24)), budget: { travel: 3200, stay: 3500, food: 2400, activities: 1500, shopping: 800, other: 600 }, world: 'personal', note: 'College gang trip' });
  } else {
    const hdfc: Account = { id: uid(), name: 'HDFC Salary', institution: 'HDFC Bank', type: 'bank', opening: 38000, currency: 'INR', world: 'personal' };
    const sav: Account = { id: uid(), name: 'High-yield Savings', institution: 'IDFC First', type: 'savings', opening: 185000, currency: 'INR', world: 'personal' };
    const cash: Account = { id: uid(), name: 'Cash', type: 'cash', opening: 3500, currency: 'INR', world: 'personal' };
    s.accounts.push(hdfc, sav, cash);
    const cc: Card = { id: uid(), name: 'HDFC Regalia', kind: 'credit', network: 'Visa', last4: '4821', limit: 250000, statementDay: 15, dueDay: 3, accountId: hdfc.id };
    const dc: Card = { id: uid(), name: 'HDFC Debit', kind: 'debit', network: 'RuPay', last4: '1190', accountId: hdfc.id };
    s.cards.push(cc, dc);
    s.recurring.push(
      { id: uid(), name: 'Salary', type: 'income', amount: 75000, day: 1, category: 'Salary', accountId: hdfc.id, world: 'personal' },
      { id: uid(), name: 'Rent', type: 'expense', amount: 12000, day: 5, category: 'Rent', accountId: hdfc.id, world: 'personal' },
      { id: uid(), name: 'Netflix', type: 'expense', amount: 649, day: 12, category: 'Subscriptions', accountId: hdfc.id, world: 'personal' },
      { id: uid(), name: 'Airtel Fiber', type: 'expense', amount: 999, day: 8, category: 'Bills', accountId: hdfc.id, world: 'personal' },
      { id: uid(), name: 'Health insurance', type: 'expense', amount: 1850, day: 22, category: 'Bills', accountId: hdfc.id, world: 'personal' },
      { id: uid(), name: 'SIP — Nifty 50', type: 'expense', amount: 5000, day: 10, category: 'Investments', accountId: hdfc.id, world: 'personal' },
    );
    const loanStart = new Date(now.getFullYear() - 1, now.getMonth() - 2, 7);
    const loan: Loan = { id: uid(), name: 'Car loan', type: 'vehicle', principal: 500000, rate: 9, tenureMonths: 36, startDate: ymd(loanStart), lender: 'ICICI Bank', world: 'personal' };
    s.loans.push(loan);
    forDays((d) => {
      const day = d.getDate(), date = ymd(d);
      for (const rc of s.recurring) if (rc.day === day) tx({ type: rc.type, amount: rc.amount, category: rc.category, date, accountId: rc.accountId, note: rc.name, recurringId: rc.id });
      if (day === 7) tx({ type: 'expense', amount: 15900, category: 'EMI', date, accountId: hdfc.id, note: 'Car loan EMI', loanId: loan.id });
      if (r() < 0.45) tx({ type: 'expense', amount: Math.round(180 + r() * 700), category: 'Food', date, accountId: hdfc.id, cardId: r() < 0.6 ? cc.id : dc.id, note: ['Swiggy', 'Blue Tokai', 'Dinner', 'Lunch with team', 'Zomato'][Math.floor(r() * 5)] });
      if (r() < 0.14) tx({ type: 'expense', amount: Math.round(900 + r() * 1800), category: 'Groceries', date, accountId: hdfc.id, cardId: cc.id, note: ['BigBasket', 'Zepto', 'Nature’s Basket'][Math.floor(r() * 3)] });
      if (r() < 0.3) tx({ type: 'expense', amount: Math.round(90 + r() * 350), category: 'Transport', date, accountId: hdfc.id, note: ['Uber', 'Metro', 'Rapido', 'Fuel'][Math.floor(r() * 4)] });
      if (r() < 0.05) tx({ type: 'expense', amount: Math.round(1200 + r() * 4000), category: 'Shopping', date, accountId: hdfc.id, cardId: cc.id, note: ['Amazon', 'Myntra', 'Uniqlo', 'Croma'][Math.floor(r() * 4)] });
      if (r() < 0.04) tx({ type: 'expense', amount: Math.round(400 + r() * 1200), category: 'Entertainment', date, accountId: hdfc.id, cardId: cc.id, note: ['PVR', 'Concert', 'Bowling'][Math.floor(r() * 3)] });
      if (day === 4 && d < now) tx({ type: 'transfer', amount: 15000, fromAccountId: hdfc.id, toAccountId: sav.id, fromWorld: 'personal', toWorld: 'personal', date, note: 'Monthly savings' });
      if (!biz && day === 17 && r() < 0.6) tx({ type: 'income', amount: 5000 + Math.round(r() * 6) * 1000, category: 'Freelance', date, accountId: hdfc.id, note: 'Freelance design work' });
    });
    s.goals.push(
      { id: uid(), name: 'Emergency fund', kind: 'emergency', target: 300000, current: 185000, monthly: 15000, targetDate: ymd(new Date(now.getFullYear() + 1, 5, 1)) },
      { id: uid(), name: 'MacBook Pro', kind: 'laptop', target: 150000, current: 42000, monthly: 9000, targetDate: ymd(new Date(now.getFullYear() + 1, 2, 1)) },
      { id: uid(), name: 'Germany trip', kind: 'trip', target: 260000, current: 30000, monthly: 12000, targetDate: ymd(new Date(now.getFullYear() + 1, 8, 1)) },
    );
    s.trips.push({ id: uid(), destination: 'Goa', start: ymd(new Date(now.getFullYear(), 11, 20)), end: ymd(new Date(now.getFullYear(), 11, 24)), budget: { travel: 8500, stay: 9000, food: 5500, activities: 3000, shopping: 1500, other: 1000 }, world: 'personal', note: '5 days, beach shack + scooter' });
  }

  if (biz) {
    const bank: Account = { id: uid(), name: 'Current Account', institution: 'Kotak', type: 'bank', opening: 520000, currency: 'INR', world: 'business' };
    s.accounts.push(bank);
    s.recurring.push(
      { id: uid(), name: 'Payroll', type: 'expense', amount: 140000, day: 30, category: 'Payroll', accountId: bank.id, world: 'business' },
      { id: uid(), name: 'Office rent', type: 'expense', amount: 45000, day: 5, category: 'Rent', accountId: bank.id, world: 'business' },
      { id: uid(), name: 'Google Workspace', type: 'expense', amount: 3200, day: 2, category: 'Software', accountId: bank.id, world: 'business' },
      { id: uid(), name: 'AWS', type: 'expense', amount: 18500, day: 9, category: 'Software', accountId: bank.id, world: 'business' },
      { id: uid(), name: 'Retainer — Acme Corp', type: 'income', amount: 180000, day: 10, category: 'Revenue', accountId: bank.id, world: 'business' },
    );
    const clients = ['Northwind', 'Lumen Labs', 'Kite Studio', 'Orbit Retail', 'Fable & Co'];
    forDays((d, i) => {
      const day = d.getDate(), date = ymd(d);
      for (const rc of s.recurring.filter((x) => x.world === 'business')) if (rc.day === Math.min(day, 30) && (rc.day !== 30 || day === 30)) tx({ world: 'business', type: rc.type as TransactionType, amount: rc.amount, category: rc.category, date, accountId: bank.id, note: rc.name, recurringId: rc.id });
      if (r() < 0.12) tx({ world: 'business', type: 'income', amount: Math.round((40 + r() * 120) * (i < 35 ? 0.75 : 1)) * 500, category: 'Revenue', date, accountId: bank.id, note: `Invoice — ${clients[Math.floor(r() * 5)]}` });
      if (r() < 0.1) tx({ world: 'business', type: 'expense', amount: Math.round(4000 + r() * 16000), category: 'Marketing', date, accountId: bank.id, note: ['Meta ads', 'Google ads', 'LinkedIn campaign'][Math.floor(r() * 3)] });
      if (r() < 0.05) tx({ world: 'business', type: 'expense', amount: Math.round(2000 + r() * 9000), category: 'Operations', date, accountId: bank.id, note: ['Courier', 'Office supplies', 'Travel'][Math.floor(r() * 3)] });
      if (day === 28) {
        const p = s.accounts.find((a) => a.world === 'personal');
        if (p) tx({ world: 'business', type: 'transfer', amount: 40000, fromAccountId: bank.id, toAccountId: p.id, fromWorld: 'business', toWorld: 'personal', date, note: 'Owner draw → Personal' });
      }
    });
    s.invoices.push(
      { id: uid(), client: 'Lumen Labs', amount: 96000, due: ymd(addDays(now, 6)), status: 'sent' },
      { id: uid(), client: 'Orbit Retail', amount: 54000, due: ymd(addDays(now, -4)), status: 'overdue' },
      { id: uid(), client: 'Kite Studio', amount: 38500, due: ymd(addDays(now, 14)), status: 'draft' },
      { id: uid(), client: 'Figma (annual)', amount: 42000, due: ymd(addDays(now, 9)), status: 'sent', kind: 'payable' },
    );
    s.loans.push({ id: uid(), name: 'Working capital', type: 'business', principal: 800000, rate: 11.5, tenureMonths: 48, startDate: ymd(new Date(now.getFullYear() - 1, now.getMonth(), 12)), lender: 'Kotak', world: 'business' });
    s.categories.push('Revenue', 'Payroll', 'Software', 'Marketing', 'Operations', 'Taxes', 'Inventory');
  }
  return s;
}
