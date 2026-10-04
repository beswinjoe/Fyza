import { AIAction } from './store';

export interface AIResult {
  id: string;
  q: string;
  at: number;
  kind: 'answer' | 'action' | 'scenario';
  title: string;
  summary: string;
  tone?: 'pos' | 'neg' | 'neutral';
  bullets?: string[];
  metrics?: Array<{ label: string; value: string; tone?: 'pos' | 'neg' }>;
  chart?: { labels: string[]; base: number[]; alt?: number[] };
  breakdown?: Record<string, number>;
  actions?: Array<{ label: string; ops: AIAction[] }>;
  autoApply?: boolean;
  scenario?: { name: string; sc: Record<string, unknown> };
  applied?: number;
}
