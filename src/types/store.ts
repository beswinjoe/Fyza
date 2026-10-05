import { AppState } from './app';

export type AIAction = 
  | { type: 'add'; col: keyof AppState; item: Record<string, unknown> }
  | { type: 'update'; col: keyof AppState; id: string; patch: Record<string, unknown> }
  | { type: 'remove'; col: keyof AppState; id: string };

export type Action =
  | AIAction
  | { type: 'set'; patch: Partial<AppState> }
  | { type: 'batch'; ops: Action[] }
  | { type: 'seed'; opts: { name: string; profiles: string[]; currency?: string } }
  | { type: 'reset' };
