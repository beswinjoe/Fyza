import { Account, Card, Loan, Transaction, RecurringItem, Goal, Trip, Invoice, Scenario, Profile, World } from './finance';
import { AIResult } from './ai';

export interface AppState {
  onboarded: boolean;
  user: { name: string };
  profiles: Profile[];
  world: World;
  accounts: Account[];
  cards: Card[];
  loans: Loan[];
  transactions: Transaction[];
  recurring: RecurringItem[];
  goals: Goal[];
  trips: Trip[];
  invoices: Invoice[];
  scenarios: Scenario[];
  aiHistory: AIResult[];
  categories: string[];
}
