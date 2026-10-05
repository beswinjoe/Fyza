// App state store — generic CRUD over collections, persisted to localStorage.
import { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { EMPTY, buildSeed } from './seed';
import { uid } from './format';
import { setActiveCurrency } from './currency';
import { AppState } from '../types/app';
import { Action } from '../types/store';

// v2: workspaces start empty. v1 contained generated demo data and is discarded.
const KEY = 'fyza.v2';
try { localStorage.removeItem('fyza.v1'); } catch { /* ignore */ }

export const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'add': return { ...state, [a.col]: [...(state[a.col] as any[]), { id: uid(), ...a.item }] };
    case 'update': return { ...state, [a.col]: (state[a.col] as any[]).map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) };
    case 'remove': return { ...state, [a.col]: (state[a.col] as any[]).filter((x) => x.id !== a.id) };
    case 'set': return { ...state, ...a.patch };
    case 'batch': return a.ops.reduce(reducer, state);
    case 'seed': return buildSeed(a.opts);
    case 'reset': return structuredClone(EMPTY);
    default: return state;
  }
}

function load(): AppState {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return { ...structuredClone(EMPTY), ...s }; } catch { /* ignore */ }
  return structuredClone(EMPTY);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  // Keep the formatter in sync before children render so every amount uses the workspace currency.
  setActiveCurrency(state.currency);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export const useStore = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
};
