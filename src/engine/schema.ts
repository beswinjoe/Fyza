import { uid } from './format';

export const safeNum = (v: unknown, allowNegative = false) => {
  if (v === null || v === undefined) return undefined;
  if (typeof v !== 'number' && typeof v !== 'string') throw new Error(`Invalid numeric input type`);
  if (typeof v === 'string' && !/^-?\d+(\.\d+)?$/.test(v)) throw new Error(`Malformed numeric string: ${v}`);
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`NaN or Infinity is not allowed`);
  if (n < 0 && !allowNegative) throw new Error(`Negative numbers not allowed here`);
  return n;
};

export const safeDate = (v: unknown) => {
  if (!v || typeof v !== 'string') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined; // strict YYYY-MM-DD
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
  return v;
};

export const safeEnum = (v: unknown, allowed: string[]) => (typeof v === 'string' && allowed.includes(v) ? v : allowed[0]);

export function validateItem(col: string, item: Record<string, unknown>) {
  if (!item || typeof item !== 'object') return null;
  const out = { ...item };
  
  if (typeof out.id !== 'string') out.id = uid();

  // Numbers
  ['amount', 'target', 'current', 'monthly', 'principal', 'rate', 'opening', 'limit', 'tenureMonths', 'day', 'statementDay', 'dueDay'].forEach(k => {
    if (k in out) out[k] = safeNum(out[k]) ?? 0;
  });

  // Dates
  ['date', 'startDate', 'targetDate', 'start', 'end', 'due'].forEach(k => {
    if (k in out) {
      const d = safeDate(out[k]);
      if (d) out[k] = d; else delete out[k];
    }
  });

  if (col === 'trips' && typeof out.start === 'string' && typeof out.end === 'string') {
    if (out.start > out.end) {
      const temp = out.start;
      out.start = out.end;
      out.end = temp;
    }
  }

  // Enums / strict strings
  if (col === 'transactions') out.type = safeEnum(out.type, ['income', 'expense', 'transfer', 'card_payment', 'loan_payment']);
  if (col === 'recurring') out.type = safeEnum(out.type, ['income', 'expense']);
  if (col === 'accounts') out.type = safeEnum(out.type, ['bank', 'savings', 'cash', 'wallet', 'other']);
  if (col === 'cards') out.kind = safeEnum(out.kind, ['credit', 'debit']);
  if (col === 'invoices') out.status = safeEnum(out.status, ['draft', 'sent', 'overdue', 'paid']);
  
  if (out.world) out.world = safeEnum(out.world, ['personal', 'business']);

  return out;
}
