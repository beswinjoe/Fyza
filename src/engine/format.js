// Formatting + date helpers (pure, UI-agnostic)
export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const mkey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const parseDate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const daysBetween = (a, b) => Math.round((b - a) / 86400000);
export const monthsBetween = (a, b) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) - (b.getDate() < a.getDate() ? 1 : 0);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = (key, long = false) => {
  const [y, m] = key.split('-').map(Number);
  return (long ? MONL : MON)[m - 1] + (long ? ` ${y}` : '');
};
export const MONTHS_LONG = MONL;
export const fmtDate = (s, withYear = false) => {
  const d = typeof s === 'string' ? parseDate(s) : s;
  return `${d.getDate()} ${MON[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`;
};
export const relDay = (s) => {
  const n = daysBetween(today(), parseDate(s));
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return `In ${n} days`;
  return fmtDate(s);
};

const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
export const inr = (n, { compact = false, sign = false } = {}) => {
  const v = Math.round(Number(n) || 0);
  const a = Math.abs(v);
  let body;
  if (compact && a >= 1e7) body = `${+(a / 1e7).toFixed(2)}Cr`;
  else if (compact && a >= 1e5) body = `${+(a / 1e5).toFixed(2)}L`;
  else if (compact && a >= 1e4) body = `${+(a / 1e3).toFixed(1)}k`;
  else body = nf.format(a);
  const s = v < 0 ? '−' : sign && v > 0 ? '+' : '';
  return `${s}₹${body}`;
};
export const pct = (n, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const uid = () => Math.random().toString(36).slice(2, 10);
