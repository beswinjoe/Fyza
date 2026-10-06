import { AppState } from '../types/app';
import { EMPTY } from './seed';
import { validateItem } from './schema';

export const CURRENT_VERSION = 3;
export const STORAGE_KEY = 'fyza.v3';
export const LEGACY_KEY = 'fyza.v2';

export interface PersistedEnvelope {
  version: number;
  workspaceId: string;
  updatedAt: string;
  data: AppState;
}

export function generateWorkspaceId() {
  return 'ws_' + Math.random().toString(36).substring(2, 15);
}

export function createEmptyEnvelope(): PersistedEnvelope {
  return {
    version: CURRENT_VERSION,
    workspaceId: generateWorkspaceId(),
    updatedAt: new Date().toISOString(),
    data: structuredClone(EMPTY)
  };
}

function safeMap(col: string, item: any) {
  try { return validateItem(col, item); } catch (e) { return null; }
}

export function hydrate(s: any): AppState {
  if (!s || typeof s !== 'object') return structuredClone(EMPTY);
  const base = structuredClone(EMPTY);
  return {
    ...base,
    ...s,
    // Safely parse arrays and filter out invalid/null elements.
    accounts: Array.isArray(s.accounts) ? s.accounts.map((x: any) => safeMap('accounts', x)).filter(Boolean) as any[] : [],
    cards: Array.isArray(s.cards) ? s.cards.map((x: any) => safeMap('cards', x)).filter(Boolean) as any[] : [],
    loans: Array.isArray(s.loans) ? s.loans.map((x: any) => safeMap('loans', x)).filter(Boolean) as any[] : [],
    transactions: Array.isArray(s.transactions) ? s.transactions.map((x: any) => safeMap('transactions', x)).filter(Boolean) as any[] : [],
    recurring: Array.isArray(s.recurring) ? s.recurring.map((x: any) => safeMap('recurring', x)).filter(Boolean) as any[] : [],
    goals: Array.isArray(s.goals) ? s.goals.map((x: any) => safeMap('goals', x)).filter(Boolean) as any[] : [],
    trips: Array.isArray(s.trips) ? s.trips.map((x: any) => safeMap('trips', x)).filter(Boolean) as any[] : [],
    invoices: Array.isArray(s.invoices) ? s.invoices.map((x: any) => safeMap('invoices', x)).filter(Boolean) as any[] : [],
    scenarios: Array.isArray(s.scenarios) ? s.scenarios.map((x: any) => safeMap('scenarios', x)).filter(Boolean) as any[] : [],
    aiHistory: Array.isArray(s.aiHistory) ? s.aiHistory : [],
    categories: Array.isArray(s.categories) ? s.categories : base.categories,
  };
}

export function migrate(parsed: any): PersistedEnvelope {
  // If it's a legacy fyza.v2 payload (no version, just AppState)
  if (typeof parsed === 'object' && parsed !== null && parsed.version === undefined) {
     return {
       version: CURRENT_VERSION,
       workspaceId: generateWorkspaceId(),
       updatedAt: new Date().toISOString(),
       data: hydrate(parsed)
     };
  }
  
  // Future schema changes go here.
  let current = parsed;
  // if (current.version === 3) { current = migrateV3toV4(current); }
  
  if (current.version !== CURRENT_VERSION) {
    throw new Error(`Unsupported storage version: ${current.version}`);
  }

  current.data = hydrate(current.data);
  return current as PersistedEnvelope;
}

export function deserializeState(raw: string | null): PersistedEnvelope {
  if (!raw) return createEmptyEnvelope();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createEmptyEnvelope();
    return migrate(parsed);
  } catch (err) {
    console.error("Storage corrupted. Attempting recovery.", err);
    if (raw) {
       try { localStorage.setItem('fyza.corrupted_backup_' + Date.now(), raw); } catch {}
    }
    return createEmptyEnvelope();
  }
}

export function serializeState(envelope: PersistedEnvelope): string {
  if (envelope.version !== CURRENT_VERSION) throw new Error("Invalid envelope version");
  if (!envelope.workspaceId) throw new Error("Missing workspaceId");
  
  const snap = structuredClone(envelope);
  snap.updatedAt = new Date().toISOString();
  snap.data = hydrate(snap.data);
  return JSON.stringify(snap);
}

export function loadState(): PersistedEnvelope {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_KEY);
      if (raw) {
        const migrated = deserializeState(raw);
        saveState(migrated);
        return migrated;
      }
    }
    return deserializeState(raw);
  } catch (e) {
    console.error("Failed to load state", e);
    return createEmptyEnvelope();
  }
}

export function saveState(envelope: PersistedEnvelope) {
  try {
    const raw = serializeState(envelope);
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, raw);
  } catch (e) {
    console.error("Failed to save state to localStorage", e);
  }
}

export function exportState(envelope: PersistedEnvelope): string {
  return serializeState(envelope);
}

export function importState(raw: string): PersistedEnvelope {
  if (!raw) throw new Error("Import payload is empty");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') throw new Error("Invalid import payload format");
  const env = migrate(parsed);
  if (!env || !env.workspaceId || !env.data || env.version !== CURRENT_VERSION) {
    throw new Error("Invalid import payload content");
  }
  return env;
}
