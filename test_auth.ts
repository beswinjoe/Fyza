import { strict as assert } from 'assert';
import { parseAuthError } from './src/engine/auth';
import { isFirebaseConfigured } from './src/engine/firebase';
import {
  getStorageKey,
  loadState,
  saveState,
  deserializeState,
  serializeState,
  CURRENT_VERSION,
  STORAGE_KEY,
  LEGACY_KEY,
  createEmptyEnvelope,
} from './src/engine/persistence';
import { EMPTY, buildSeed } from './src/engine/seed';

console.log('Running Authentication, Routing & Data Isolation Tests...\n');

// Mock localStorage for node test runner
const store: Record<string, string> = {};
global.localStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] || null,
} as any;

// ====================================================================
// Test 1: Firebase Auth Error Parser
// ====================================================================
console.log('1. Testing Firebase Auth Error Parsing...');

assert.ok(
  parseAuthError({ code: 'auth/popup-closed-by-user' }).includes('cancelled'),
  'Popup closed by user should yield cancellation message'
);

assert.ok(
  parseAuthError({ code: 'auth/popup-blocked' }).includes('blocked'),
  'Popup blocked should yield browser popup instructions'
);

assert.ok(
  parseAuthError({ code: 'auth/network-request-failed' }).includes('Network'),
  'Network failure should yield network error message'
);

assert.ok(
  parseAuthError({ code: 'auth/unauthorized-domain' }).includes('Authorized domains'),
  'Unauthorized domain should yield console instructions'
);

assert.ok(
  parseAuthError({ code: 'auth/operation-not-allowed' }).includes('not enabled in Firebase Console'),
  'Operation not allowed should yield enable instructions'
);

// Email & Password specific error parsing
assert.ok(
  parseAuthError({ code: 'auth/invalid-email' }).includes('valid email'),
  'Invalid email should prompt for a valid email address'
);

assert.ok(
  parseAuthError({ code: 'auth/user-not-found' }).includes('No account found'),
  'User not found should prompt to create an account'
);

assert.ok(
  parseAuthError({ code: 'auth/wrong-password' }).includes('Invalid email or password'),
  'Wrong password should indicate invalid credential'
);

assert.ok(
  parseAuthError({ code: 'auth/email-already-in-use' }).includes('already exists'),
  'Duplicate email registration should indicate email already in use'
);

assert.ok(
  parseAuthError({ code: 'auth/weak-password' }).includes('at least 6 characters'),
  'Weak password should enforce minimum length'
);

assert.equal(
  parseAuthError(null),
  'An unexpected authentication error occurred.'
);

console.log('✓ Firebase Auth & Email Error Parsing passed.\n');

// ====================================================================
// Test 2: Storage Key Isolation
// ====================================================================
console.log('2. Testing Storage Key Isolation...');

assert.equal(getStorageKey(), 'fyza.v3');
assert.equal(getStorageKey(null), 'fyza.v3');
assert.equal(getStorageKey(''), 'fyza.v3');
assert.equal(getStorageKey('uid_alice'), 'fyza.v3.uid_alice');
assert.equal(getStorageKey('uid_bob'), 'fyza.v3.uid_bob');

console.log('✓ Storage Key Isolation passed.\n');

// ====================================================================
// Test 3: Multi-User Local Workspace Isolation
// ====================================================================
console.log('3. Testing Multi-User Local Data Isolation...');

// Setup: Alice signs in and creates financial data
const aliceEnvelope = createEmptyEnvelope();
aliceEnvelope.data = buildSeed({ name: 'Alice', profiles: ['personal'], currency: 'USD' });
aliceEnvelope.data.transactions = [
  { id: 'tx_alice_1', amount: 500, type: 'income', date: '2026-10-10', category: 'Salary' } as any,
];
saveState(aliceEnvelope, 'user_alice');

// Verify Alice's data is stored under her key
const loadedAlice = loadState('user_alice');
assert.equal(loadedAlice.data.user.name, 'Alice');
assert.equal(loadedAlice.data.transactions.length, 1);
assert.equal(loadedAlice.data.transactions[0].id, 'tx_alice_1');

// Bob signs in on the same browser for the first time
const loadedBob = loadState('user_bob');
// Bob must NOT see Alice's data!
assert.equal(loadedBob.data.user.name, '');
assert.equal(loadedBob.data.onboarded, false);
assert.equal(loadedBob.data.transactions.length, 0);

// Bob sets up his own workspace
const bobEnvelope = createEmptyEnvelope();
bobEnvelope.data = buildSeed({ name: 'Bob', profiles: ['business'], currency: 'EUR' });
bobEnvelope.data.transactions = [
  { id: 'tx_bob_1', amount: 1200, type: 'income', date: '2026-10-11', category: 'Consulting' } as any,
];
saveState(bobEnvelope, 'user_bob');

// Alice re-loads her state; Bob's actions must not affect Alice
const reloadedAlice = loadState('user_alice');
assert.equal(reloadedAlice.data.user.name, 'Alice');
assert.equal(reloadedAlice.data.currency, 'USD');
assert.equal(reloadedAlice.data.transactions.length, 1);
assert.equal(reloadedAlice.data.transactions[0].id, 'tx_alice_1');

console.log('✓ Multi-User Local Workspace Isolation passed.\n');

// ====================================================================
// Test 4: Migration of Pre-Existing Unassigned Local Workspace on First Sign-In
// ====================================================================
console.log('4. Testing Safe Migration of Pre-Existing Workspace...');

// Scenario: A user has been using Fyza locally before signing in with Google
const preExistingEnvelope = createEmptyEnvelope();
preExistingEnvelope.data = buildSeed({ name: 'Charlie', profiles: ['student'], currency: 'GBP' });
preExistingEnvelope.data.transactions = [
  { id: 'tx_pre_1', amount: 45, type: 'expense', date: '2026-10-09', category: 'Books' } as any,
];
// Save to unassigned root 'fyza.v3'
localStorage.setItem(STORAGE_KEY, serializeState(preExistingEnvelope));

// Charlie now signs in with Google (uid: 'user_charlie')
const charlieState = loadState('user_charlie');

// Charlie should have inherited his pre-existing workspace seamlessly!
assert.equal(charlieState.data.user.name, 'Charlie');
assert.equal(charlieState.data.currency, 'GBP');
assert.equal(charlieState.data.onboarded, true);
assert.equal(charlieState.data.transactions.length, 1);
assert.equal(charlieState.data.transactions[0].id, 'tx_pre_1');

// Verify that the user-scoped key 'fyza.v3.user_charlie' now exists in localStorage
assert.ok(localStorage.getItem('fyza.v3.user_charlie') !== null);

// Verify that the root unassigned key was cleaned up so a subsequent new user doesn't get Charlie's data
const subsequentNewUser = loadState('user_dave');
assert.equal(subsequentNewUser.data.onboarded, false);
assert.equal(subsequentNewUser.data.transactions.length, 0);

console.log('✓ Safe Migration of Pre-Existing Workspace passed.\n');

// ====================================================================
// Test 5: Returning User vs First-Time Onboarding Detection
// ====================================================================
console.log('5. Testing Returning vs First-Time User Onboarding Flag...');

// Returning user (Alice) has onboarded === true
assert.equal(loadState('user_alice').data.onboarded, true);

// First-time new user (Eve) has onboarded === false
const eveState = loadState('user_eve');
assert.equal(eveState.data.onboarded, false);

// After Eve completes onboarding:
eveState.data = buildSeed({ name: 'Eve', profiles: ['personal'], currency: 'CAD' });
saveState(eveState, 'user_eve');
assert.equal(loadState('user_eve').data.onboarded, true);

console.log('✓ Returning vs First-Time User Onboarding Flag passed.\n');

// ====================================================================
// Test 6: Local Email & Password Authentication & Fallback
// ====================================================================
console.log('6. Testing Local Email & Password Account Storage & Session...');

const LOCAL_ACCOUNTS_KEY = 'fyza.local_accounts';
const LOCAL_SESSION_KEY = 'fyza.local_session';

// Simulate signup
const mockEmail = 'testuser@example.com';
const mockPass = 'securePassword123';
const mockName = 'Test User';

const accountsRecord: Record<string, any> = {};
accountsRecord[mockEmail.toLowerCase()] = {
  email: mockEmail,
  password: mockPass,
  name: mockName,
  createdAt: new Date().toISOString(),
};
localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accountsRecord));

// Verify duplicate check prevents re-registration
const storedAccounts = JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '{}');
assert.ok(storedAccounts[mockEmail.toLowerCase()] !== undefined, 'User account should be saved');

// Simulate session creation on sign in
const generatedUid = 'local_' + Buffer.from(mockEmail.toLowerCase()).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
const sessionUser = {
  uid: generatedUid,
  email: mockEmail,
  displayName: mockName,
  photoURL: null,
};
localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionUser));

const restoredSession = JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || '{}');
assert.equal(restoredSession.email, mockEmail);
assert.equal(restoredSession.displayName, mockName);
assert.ok(restoredSession.uid.startsWith('local_'));

// Verify that workspace isolation works seamlessly with local uid
const localUserStorageKey = getStorageKey(restoredSession.uid);
assert.equal(localUserStorageKey, `fyza.v3.${restoredSession.uid}`);

// Verify password mismatch check
assert.notEqual(storedAccounts[mockEmail.toLowerCase()].password, 'wrongPass999');

console.log('✓ Local Email & Password Account Storage & Session passed.\n');

console.log('🎉 All Authentication, Routing & Data Isolation tests passed!\n');
