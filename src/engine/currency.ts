// Central currency layer. The workspace has ONE base currency; every stored amount
// is a plain number in that currency. Records carry no per-item currency yet, so
// switching base currency never converts values (no fake FX rates). A future
// multi-currency version can add `currency` to records + a real rates provider here.

export interface CurrencyDef { code: string; name: string; locale: string }

export const CURRENCIES: CurrencyDef[] = [
  { code: 'INR', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'USD', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', locale: 'en-GB' },
  { code: 'AED', name: 'UAE Dirham', locale: 'en-AE' },
  { code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AUD', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
  { code: 'SGD', name: 'Singapore Dollar', locale: 'en-SG' },
  { code: 'JPY', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CNY', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'KRW', name: 'South Korean Won', locale: 'ko-KR' },
  { code: 'HKD', name: 'Hong Kong Dollar', locale: 'en-HK' },
  { code: 'NZD', name: 'New Zealand Dollar', locale: 'en-NZ' },
  { code: 'SAR', name: 'Saudi Riyal', locale: 'en-SA' },
  { code: 'QAR', name: 'Qatari Riyal', locale: 'en-QA' },
  { code: 'SEK', name: 'Swedish Krona', locale: 'sv-SE' },
  { code: 'NOK', name: 'Norwegian Krone', locale: 'nb-NO' },
  { code: 'DKK', name: 'Danish Krone', locale: 'da-DK' },
  { code: 'ZAR', name: 'South African Rand', locale: 'en-ZA' },
  { code: 'BRL', name: 'Brazilian Real', locale: 'pt-BR' },
  { code: 'MXN', name: 'Mexican Peso', locale: 'es-MX' },
  { code: 'THB', name: 'Thai Baht', locale: 'th-TH' },
  { code: 'MYR', name: 'Malaysian Ringgit', locale: 'en-MY' },
  { code: 'IDR', name: 'Indonesian Rupiah', locale: 'id-ID' },
  { code: 'PHP', name: 'Philippine Peso', locale: 'en-PH' },
  { code: 'LKR', name: 'Sri Lankan Rupee', locale: 'en-LK' },
  { code: 'NPR', name: 'Nepalese Rupee', locale: 'en-NP' },
  { code: 'BDT', name: 'Bangladeshi Taka', locale: 'en-BD' },
  { code: 'PKR', name: 'Pakistani Rupee', locale: 'en-PK' },
  { code: 'TRY', name: 'Turkish Lira', locale: 'tr-TR' },
];

export const DEFAULT_CURRENCY = 'USD';

let current: CurrencyDef = CURRENCIES[0];
let nf = new Intl.NumberFormat(current.locale, { maximumFractionDigits: 0 });

export const findCurrency = (code?: string) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];

/** Called by the store whenever the workspace currency changes. */
export function setActiveCurrency(code?: string) {
  current = findCurrency(code);
  nf = new Intl.NumberFormat(current.locale, { maximumFractionDigits: 0 });
}
export const activeCurrency = () => current;

/** Narrow symbol for a currency, e.g. ₹, $, €, £. */
export const symbolOf = (code: string = current.code) => {
  const def = findCurrency(code);
  try {
    return new Intl.NumberFormat(def.locale, { style: 'currency', currency: def.code, currencyDisplay: 'narrowSymbol' })
      .formatToParts(0).find((p) => p.type === 'currency')?.value || def.code;
  } catch { return def.code; }
};
export const cur = () => symbolOf();

/** Locale-aware money formatting in the workspace currency. */
export function money(n: number | string, { compact = false, sign = false }: { compact?: boolean; sign?: boolean } = {}) {
  const v = Math.round(Number(n) || 0);
  const a = Math.abs(v);
  let body: string;
  if (compact && current.code === 'INR') {
    body = a >= 1e7 ? `${+(a / 1e7).toFixed(2)}Cr` : a >= 1e5 ? `${+(a / 1e5).toFixed(2)}L` : a >= 1e4 ? `${+(a / 1e3).toFixed(1)}k` : nf.format(a);
  } else if (compact && a >= 1e4) {
    body = a >= 1e9 ? `${+(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${+(a / 1e6).toFixed(2)}M` : `${+(a / 1e3).toFixed(1)}k`;
  } else body = nf.format(a);
  const s = v < 0 ? '−' : sign && v > 0 ? '+' : '';
  return `${s}${cur()}${body}`;
}

/** Example amount phrased for the active currency (for hints/suggestions). */
export const ex = (n: number) => money(n);
