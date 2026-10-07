import { AppState } from '../types/app';
import { Profile } from '../types/finance';

export type Feature = 
  | 'accounts'
  | 'cards'
  | 'loans'
  | 'invoices'
  | 'business' // represents the business workspace / dashboard
  | 'payroll'
  | 'inventory'
  | 'taxes'
  | 'investments';

export const PROFILE_DEFAULTS: Record<Profile, Feature[]> = {
  student: [], // Hides accounts, cards, loans, business, etc. Focuses on pure income/expense/goals/trips.
  personal: ['accounts', 'cards', 'loans'], // Shows basic banking but no business
  freelancer: ['accounts', 'cards', 'invoices', 'taxes', 'business'],
  family: ['accounts', 'cards', 'loans'],
  business: ['accounts', 'cards', 'loans', 'invoices', 'payroll', 'inventory', 'taxes', 'business'],
};

export function getCapabilities(state: AppState): Set<Feature> {
  const caps = new Set<Feature>();
  
  // 1. Fallback to 'personal' if no profiles are selected
  const profiles = state.profiles?.length > 0 ? state.profiles : ['personal'];
  
  // 2. Gather all defaults from selected profiles
  for (const p of profiles) {
    const defaults = PROFILE_DEFAULTS[p as Profile];
    if (defaults) {
      defaults.forEach((f: Feature) => caps.add(f));
    }
  }
  
  // 3. Apply user overrides (enabled/disabled)
  if (state.features) {
    for (const [feat, enabled] of Object.entries(state.features)) {
      if (enabled) {
        caps.add(feat as Feature);
      } else {
        caps.delete(feat as Feature);
      }
    }
  }
  
  return caps;
}

export function hasCapability(state: AppState, feature: Feature): boolean {
  return getCapabilities(state).has(feature);
}
