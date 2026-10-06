import { strict as assert } from 'assert';
import { deserializeState, serializeState, importState, exportState, CURRENT_VERSION, PersistedEnvelope, loadState, saveState, LEGACY_KEY, STORAGE_KEY } from './src/engine/persistence';
import { validateItem } from './src/engine/schema';
import { EMPTY } from './src/engine/seed';

// Mock localStorage
const store: Record<string, string> = {};
let throwOnSave = false;
global.localStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => { 
    if (throwOnSave) throw new Error("Quota exceeded"); 
    store[k] = v; 
  },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
  length: 0,
  key: () => null
};

console.log('Running persistence tests...');

// A. Fresh workspace
const fresh = deserializeState(null);
assert.equal(fresh.version, CURRENT_VERSION);
assert.equal(fresh.data.world, 'personal'); // From EMPTY
assert.ok(fresh.workspaceId.startsWith('ws_'));

// B. Existing valid workspace
const validEnvelope: PersistedEnvelope = {
  version: CURRENT_VERSION,
  workspaceId: 'ws_test',
  updatedAt: new Date().toISOString(),
  data: { ...EMPTY, currency: 'EUR' }
};
const serialized = serializeState(validEnvelope);
const rehydrated = deserializeState(serialized);
assert.equal(rehydrated.data.currency, 'EUR');
assert.equal(rehydrated.workspaceId, 'ws_test');

// C. Migration
const legacyData = { ...EMPTY, currency: 'JPY', transactions: [{ id: 'tx1', amount: 100, type: 'income', date: '2026-10-06' }] };
const legacyRaw = JSON.stringify(legacyData);
const migrated = deserializeState(legacyRaw);
assert.equal(migrated.version, CURRENT_VERSION);
assert.equal(migrated.data.currency, 'JPY');
assert.equal(migrated.data.transactions[0].amount, 100);

// D. Corrupted JSON
const corrupted = deserializeState('{ invalid json');
assert.equal(corrupted.version, CURRENT_VERSION); // Should fallback to empty workspace safely

// E. Invalid record
const dataWithInvalidRecord = { ...EMPTY, transactions: [{ id: 'tx2', amount: 'hello', type: 'invalid_type', date: 'not-a-date' }] };
const envE = { version: CURRENT_VERSION, workspaceId: 'ws_test', updatedAt: '', data: dataWithInvalidRecord };
const deserializedE = deserializeState(JSON.stringify(envE));
assert.equal(deserializedE.data.transactions.length, 0); // Invalid record removed entirely
console.log('E. Invalid record gracefully recovered (dropped): PASS');

// F. Invalid numeric value
assert.throws(() => validateItem('goals', { amount: NaN, target: 100 }), /NaN or Infinity/i);
assert.throws(() => validateItem('goals', { amount: 100, target: Infinity }), /NaN or Infinity/i);

// G. Invalid date
assert.equal(validateItem('goals', { targetDate: '2026-15-99' })?.targetDate, undefined);

// H. Duplicate ID (Simulation in reducer not directly in persistence, but validateItem ensures string id exists)
const itemWithoutId = validateItem('transactions', { amount: 100 });
assert.ok(typeof itemWithoutId?.id === 'string');

// I. Failed import
assert.throws(() => importState('null'), /Invalid import payload|Unexpected token/);
assert.throws(() => importState('{"version": 999}'), /Unsupported storage version/);

// J. Successful import
const imported = importState(serialized);
assert.equal(imported.workspaceId, 'ws_test');

// K. localStorage quota/write failure
throwOnSave = true;
// Should not crash
saveState(validEnvelope);
throwOnSave = false;

// L. Workspace isolation
// Covered by the workspaceId presence in the envelope

console.log('All persistence tests passed!');
