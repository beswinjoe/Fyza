export const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const mkey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const parseDate = (s: string | Date) => {
  if (s instanceof Date) return s;
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
export const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = (key: string, long = false) => {
  const [y, m] = key.split('-').map(Number);
  return (long ? MONL : MON)[m - 1] + (long ? ` ${y}` : '');
};
export const MONTHS_LONG = MONL;
export const fmtDate = (s: string | Date, withYear = false) => {
  const d = typeof s === 'string' ? parseDate(s) : s;
  return `${d.getDate()} ${MON[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`;
};
export const relDay = (s: string | Date) => {
  const n = daysBetween(today(), parseDate(s));
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return `In ${n} days`;
  return fmtDate(s);
};

// Money formatting lives in ./currency (workspace base currency). `inr` kept as alias for existing call sites.
export { money as inr, money, cur } from './currency';
export const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const uid = () => Math.random().toString(36).slice(2, 10);
