// App state store — generic CRUD over collections, persisted to localStorage.
import { createContext, useContext, useEffect, useReducer } from 'react';
import { EMPTY, buildSeed } from './seed';
import { uid } from './format';

const KEY = 'fyza.v1';
const Ctx = createContext(null);

function reducer(state, a) {
  switch (a.type) {
    case 'add': return { ...state, [a.col]: [...state[a.col], { id: uid(), ...a.item }] };
    case 'update': return { ...state, [a.col]: state[a.col].map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) };
    case 'remove': return { ...state, [a.col]: state[a.col].filter((x) => x.id !== a.id) };
    case 'set': return { ...state, ...a.patch };
    case 'batch': return a.ops.reduce(reducer, state);
    case 'seed': return { ...buildSeed(a.opts), theme: state.theme };
    case 'reset': return { ...structuredClone(EMPTY), theme: state.theme };
    default: return state;
  }
}

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return { ...structuredClone(EMPTY), ...s }; } catch { /* ignore */ }
  return structuredClone(EMPTY);
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => { document.documentElement.dataset.theme = state.theme; }, [state.theme]);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
