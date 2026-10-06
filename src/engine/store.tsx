// App state store — generic CRUD over collections, persisted to localStorage.
import { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { EMPTY, buildSeed } from './seed';
import { setActiveCurrency } from './currency';
import { AppState } from '../types/app';
import { Action } from '../types/store';
import { validateItem } from './schema';
import { loadState, saveState, PersistedEnvelope } from './persistence';
import { uid } from './format';

export const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

const VALID_COLLECTIONS = new Set(['accounts', 'cards', 'loans', 'transactions', 'recurring', 'goals', 'trips', 'invoices', 'scenarios', 'aiHistory']);

export function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'add': {
      if (!VALID_COLLECTIONS.has(String(a.col))) return state;
      const arr = state[a.col as keyof AppState];
      if (!Array.isArray(arr)) return state;
      const validated = validateItem(String(a.col), { id: uid(), ...a.item });
      if (!validated) return state;
      return { ...state, [a.col]: [...arr, validated] };
    }
    case 'update': {
      if (!VALID_COLLECTIONS.has(String(a.col))) return state;
      const arr = state[a.col as keyof AppState] as { id: string }[];
      if (!Array.isArray(arr)) return state;
      return { ...state, [a.col]: arr.map((x) => (x.id === a.id ? { ...x, ...validateItem(String(a.col), { ...x, ...a.patch, id: x.id }) } : x)) };
    }
    case 'remove': {
      if (!VALID_COLLECTIONS.has(String(a.col))) return state;
      const arr = state[a.col as keyof AppState] as { id: string }[];
      if (!Array.isArray(arr)) return state;
      return { ...state, [a.col]: arr.filter((x) => x.id !== a.id) };
    }
    case 'set': return { ...state, ...a.patch };
    case 'batch': return a.ops.reduce(reducer, state);
    case 'seed': return buildSeed(a.opts);
    case 'reset': return structuredClone(EMPTY);
    default: return state;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Store the full envelope, but only expose the data to the rest of the app.
  const [envelope, setEnvelope] = useReducer(
    (env: PersistedEnvelope, a: Action) => {
       const nextData = reducer(env.data, a);
       if (nextData === env.data) return env;
       return { ...env, data: nextData };
    },
    undefined,
    loadState
  );

  const state = envelope.data;
  
  // Keep the formatter in sync before children render so every amount uses the workspace currency.
  setActiveCurrency(state.currency);
  
  useEffect(() => { 
    saveState(envelope); 
  }, [envelope]);
  
  // Wrap dispatch to go through the envelope reducer
  return <Ctx.Provider value={{ state, dispatch: setEnvelope }}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
};
