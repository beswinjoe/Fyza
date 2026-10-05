export type World = 'personal' | 'business';
export type TransactionType = 'income' | 'expense' | 'transfer' | 'card_payment' | 'loan_payment';
export type Profile = 'personal' | 'student' | 'freelancer' | 'business' | 'family';

export interface Account {
  id: string;
  name: string;
  institution?: string;
  type: 'bank' | 'savings' | 'cash' | 'wallet' | 'other';
  opening: number;
  currency: string;
  world: World;
}

export interface Card {
  id: string;
  name: string;
  kind: 'credit' | 'debit';
  network?: string;
  last4?: string;
  limit?: number;
  statementDay?: number;
  dueDay?: number;
  accountId?: string;
}

export interface Loan {
  id: string;
  name: string;
  type: string;
  principal: number;
  rate: number;
  tenureMonths: number;
  startDate: string;
  lender?: string;
  world: World;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category?: string;
  date: string;
  accountId?: string;
  cardId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  fromWorld?: World;
  toWorld?: World;
  note?: string;
  recurringId?: string;
  loanId?: string;
  tripId?: string;
  world?: World;
  tags?: string[];
}

export interface RecurringItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
  amount: number;
  day: number;
  category: string;
  accountId?: string;
  world: World;
}

export interface Goal {
  id: string;
  name: string;
  kind: 'laptop' | 'emergency' | 'trip' | 'custom' | string;
  target: number;
  current: number;
  monthly: number;
  targetDate: string;
  world?: World;
}

export interface Trip {
  id: string;
  destination: string;
  start: string;
  end: string;
  budget: Record<string, number>;
  world: World;
  note?: string;
}

export interface Invoice {
  id: string;
  client?: string;
  amount: number;
  due: string;
  status: 'draft' | 'sent' | 'overdue' | 'paid';
  kind?: 'payable' | 'receivable';
}

export interface ScenarioDef {
  incomeDelta?: number;
  expenseDelta?: number;
  oneTime?: number;
  oneTimeMonth?: number;
  incomeLoss?: number;
  monthlySave?: number;
  revenuePct?: number;
  variablePct?: number;
}

export interface Scenario {
  id: string;
  name: string;
  sc: ScenarioDef;
  world: World;
  created?: string;
}
