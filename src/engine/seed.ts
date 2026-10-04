// Initial workspace state. Fyza ships with NO demo financial data —
// every collection starts empty and is populated by the user (and later, the database).
import { AppState } from '../types/app';
import { Profile } from '../types/finance';

export const DEFAULT_CATEGORIES = ['Food', 'Groceries', 'Transport', 'Rent', 'Bills', 'Subscriptions', 'Shopping', 'Entertainment', 'Health', 'Education', 'Travel', 'EMI', 'Other'];

export const EMPTY: AppState = {
  onboarded: false, user: { name: '' }, profiles: [], world: 'personal',
  accounts: [], cards: [], loans: [], transactions: [], recurring: [], goals: [], trips: [], invoices: [], scenarios: [], aiHistory: [],
  categories: DEFAULT_CATEGORIES,
};

/** Creates a fresh, empty workspace for a newly onboarded user. */
export function buildSeed({ name, profiles }: { name: string; profiles: string[] }): AppState {
  const s = structuredClone(EMPTY) as AppState;
  s.user.name = name.trim();
  s.profiles = profiles as Profile[];
  s.onboarded = true;
  return s;
}
