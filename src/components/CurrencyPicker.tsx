import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { CURRENCIES, symbolOf } from '../engine/currency';
import { cn } from './ui';

/** Searchable, list-style currency selector (symbol · name · code). */
export function CurrencyPicker({ value, onChange, className, maxHeight = 320 }: { value: string; onChange: (code: string) => void; className?: string; maxHeight?: number }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? CURRENCIES.filter((c) => c.code.toLowerCase().includes(s) || c.name.toLowerCase().includes(s)) : CURRENCIES;
  }, [q]);

  return (
    <div className={className}>
      <label className="flex h-11 items-center gap-2.5 border-b border-border-strong text-foreground-subtle focus-within:border-foreground">
        <Search className="size-4 shrink-0" strokeWidth={1.75} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search currency"
          aria-label="Search currency"
          className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-foreground-subtle"
        />
      </label>
      <ul role="listbox" aria-label="Currency" className="mt-1 overflow-y-auto overscroll-contain" style={{ maxHeight }}>
        {list.map((c) => {
          const on = c.code === value;
          return (
            <li key={c.code}>
              <button
                role="option"
                aria-selected={on}
                onClick={() => onChange(c.code)}
                className={cn('group grid w-full grid-cols-[40px_minmax(0,1fr)_auto_20px] items-center gap-3 border-b border-border py-3 text-left transition-colors', on ? 'text-foreground' : 'text-foreground-muted hover:text-foreground')}
              >
                <span className="num text-[18px] font-medium text-foreground-subtle group-hover:text-foreground">{symbolOf(c.code)}</span>
                <span className="truncate text-[15px] font-medium">{c.name}</span>
                <span className="num text-[12px] tracking-[0.12em] text-foreground-subtle">{c.code}</span>
                <span className="grid place-items-center">{on && <Check className="size-4 text-foreground" strokeWidth={2.5} />}</span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="py-6 text-[13px] text-foreground-subtle">No currency matches “{q}”.</li>}
      </ul>
    </div>
  );
}
