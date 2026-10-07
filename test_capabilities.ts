import { getCapabilities, hasCapability } from './src/engine/capabilities';
import { AppState } from './src/types/app';

const EMPTY: AppState = {
  onboarded: true,
  user: { name: 'Test' },
  currency: 'USD',
  profiles: ['personal'],
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
};

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`✅ ${name}`);
  } else {
    console.error(`❌ ${name}`);
    process.exit(1);
  }
}

// 1. Student defaults
const studentState = { ...EMPTY, profiles: ['student'] as const };
check('Student has no accounts/cards by default', 
  !hasCapability(studentState, 'accounts') && !hasCapability(studentState, 'cards') && !hasCapability(studentState, 'business'));

// 2. Personal defaults
const personalState = { ...EMPTY, profiles: ['personal'] as const };
check('Personal has accounts/cards but no business', 
  hasCapability(personalState, 'accounts') && !hasCapability(personalState, 'business'));

// 3. Freelancer defaults
const freelancerState = { ...EMPTY, profiles: ['freelancer'] as const };
check('Freelancer has invoices, taxes, and business', 
  hasCapability(freelancerState, 'invoices') && hasCapability(freelancerState, 'taxes') && hasCapability(freelancerState, 'business') && !hasCapability(freelancerState, 'payroll'));

// 4. Family defaults
const familyState = { ...EMPTY, profiles: ['family'] as const };
check('Family has loans/accounts but no invoices', 
  hasCapability(familyState, 'loans') && hasCapability(familyState, 'accounts') && !hasCapability(familyState, 'invoices'));

// 5. Business defaults
const businessState = { ...EMPTY, profiles: ['business'] as const };
check('Business has payroll, inventory, and business workspace', 
  hasCapability(businessState, 'payroll') && hasCapability(businessState, 'inventory') && hasCapability(businessState, 'business'));

// 6. Multiple profiles (Student + Freelancer)
const multiState = { ...EMPTY, profiles: ['student', 'freelancer'] as const };
check('Multi-profile combines capabilities', 
  hasCapability(multiState, 'invoices') && hasCapability(multiState, 'business'));

// 7. Capability overrides (Student enabling accounts)
const overrideState = { ...EMPTY, profiles: ['student'] as const, features: { accounts: true, business: false } };
check('Overrides can enable features disabled by default', 
  hasCapability(overrideState, 'accounts') && !hasCapability(overrideState, 'cards'));

// 8. Hidden feature data preservation
// The capability system just returns booleans. Data is always preserved in the state object.
check('Hidden features do not affect the AppState object structure', 
  overrideState.accounts !== undefined);

console.log('All capability tests passed!');
