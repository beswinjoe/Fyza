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
    aiHistory: Array.isArray(s.aiHistory)
      ? s.aiHistory.filter((x: any) =>
          x && typeof x === 'object' &&
          typeof x.id === 'string' &&
          typeof x.title === 'string' &&
          typeof x.summary === 'string' &&
          typeof x.at === 'number' && Number.isFinite(x.at) &&
          ['answer', 'action', 'scenario'].includes(x.kind)
        )
      : [],
    categories: Array.isArray(s.categories)
      ? (() => {
          const cleaned = Array.from(new Set(s.categories.filter((c: any) => typeof c === 'string' && c.trim().length > 0).map((c: string) => c.trim())));
          return cleaned.length > 0 ? cleaned : base.categories;
        })()
      : base.categories,
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
    throw new Error(`Unsupported storage version: ${current.version}. Current supported version is ${CURRENT_VERSION}.`);
  }

  current.data = hydrate(current.data);
  return current as PersistedEnvelope;
}

export const CORRUPTED_BACKUP_PREFIX = 'fyza.corrupted_backup_';

export function listCorruptedBackups(): Array<{ key: string; date: string; raw: string }> {
  if (typeof localStorage === 'undefined') return [];
  const list: Array<{ key: string; date: string; raw: string }> = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CORRUPTED_BACKUP_PREFIX)) {
        const raw = localStorage.getItem(k) || '';
        const ts = parseInt(k.replace(CORRUPTED_BACKUP_PREFIX, ''), 10);
        list.push({
          key: k,
          date: isNaN(ts) ? 'Unknown date' : new Date(ts).toLocaleString(),
          raw,
        });
      }
    }
  } catch {}
  return list.sort((a, b) => b.key.localeCompare(a.key));
}

export function clearCorruptedBackup(key: string): void {
  if (typeof localStorage !== 'undefined' && key.startsWith(CORRUPTED_BACKUP_PREFIX)) {
    try { localStorage.removeItem(key); } catch {}
  }
}

export function deserializeState(raw: string | null): PersistedEnvelope {
  if (!raw) return createEmptyEnvelope();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return createEmptyEnvelope();
    return migrate(parsed);
  } catch (err: any) {
    console.error("Storage corrupted. Attempting recovery.", err);
    if (raw && typeof localStorage !== 'undefined') {
       try {
         const backupKey = CORRUPTED_BACKUP_PREFIX + Date.now();
         localStorage.setItem(backupKey, raw);
         if (typeof window !== 'undefined') {
           window.dispatchEvent(new CustomEvent('fyza:corrupted_backup_created', { detail: { key: backupKey, error: err?.message } }));
         }
       } catch {}
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

export function saveState(envelope: PersistedEnvelope): { success: boolean; error?: string } {
  try {
    const raw = serializeState(envelope);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, raw);
    }
    return { success: true };
  } catch (e: any) {
    console.error("Failed to save state to localStorage", e);
    const isQuota = e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014;
    const msg = isQuota ? 'Storage quota exceeded. Your changes cannot be saved locally.' : (e?.message || 'Storage write failed');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fyza:persistence_error', { detail: { error: msg, isQuota } }));
    }
    return { success: false, error: msg };
  }
}

export function exportState(envelope: PersistedEnvelope): string {
  return serializeState(envelope);
}

export function importState(raw: string): PersistedEnvelope {
  if (!raw || !raw.trim()) throw new Error("Import payload is empty");
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error("Invalid JSON: File is not valid JSON.");
  }
  if (!parsed || typeof parsed !== 'object') throw new Error("Invalid import payload format: expected object.");
  const env = migrate(parsed);
  if (!env || !env.workspaceId || !env.data || env.version !== CURRENT_VERSION) {
    throw new Error("Invalid import payload content.");
  }
  return env;
}
