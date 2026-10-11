import { useState } from 'react';
import { ArrowRight, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useStore } from '../engine/store';
import { findCurrency, symbolOf } from '../engine/currency';
import { CurrencyPicker } from './CurrencyPicker';
import { Button, Drawer, Input, cn } from './ui';
import { getStoredPreference, setTheme, type ThemePreference } from '../engine/theme';

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2 mt-8 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-subtle first:mt-2">{children}</div>
);

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'system', label: 'System', icon: Monitor, desc: 'Follow your OS setting' },
  { value: 'light', label: 'Light', icon: Sun, desc: 'Clean, bright interface' },
  { value: 'dark', label: 'Dark', icon: Moon, desc: 'Fyza\'s signature navy' },
];

export default function Settings({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState(state.user.name);
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [themePref, setThemePref] = useState<ThemePreference>(getStoredPreference);

  const records = state.transactions.length + state.recurring.length + state.goals.length + state.trips.length + state.loans.length + state.accounts.length + state.cards.length + state.invoices.length;
  const c = findCurrency(state.currency);

  const apply = (code: string) => {
    dispatch({ type: 'set', patch: { currency: code } });
    setPending(null);
    setPicking(false);
  };
  const choose = (code: string) => {
    if (code === state.currency) return setPicking(false);
    // Amounts are stored without per-record currency; never convert silently.
    if (records > 0) setPending(code); else apply(code);
  };

  const saveName = () => { if (name.trim() && name.trim() !== state.user.name) dispatch({ type: 'set', patch: { user: { ...state.user, name: name.trim() } } }); };
  const reset = () => { if (window.confirm('Reset workspace? This permanently clears all Fyza data on this device.')) { dispatch({ type: 'reset' }); onClose(); } };

  const handleTheme = (pref: ThemePreference) => {
    setThemePref(pref);
    setTheme(pref);
  };

  return (
    <Drawer title="Settings" onClose={onClose}>
      <Label>Profile</Label>
      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && saveName()} aria-label="Name" placeholder="Your name" />
      <p className="mt-3 text-[13px] capitalize text-foreground-subtle">{state.profiles.join(' · ') || 'personal'}</p>

      <Label>Appearance</Label>
      <div className="flex gap-2" role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((opt) => {
          const on = themePref === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={on}
              onClick={() => handleTheme(opt.value)}
              className={cn(
                'group flex flex-1 flex-col items-center gap-2 rounded-xl border py-3 px-2 text-center transition-all duration-150',
                on
                  ? 'border-accent bg-accent-soft text-foreground shadow-card'
                  : 'border-border bg-surface text-foreground-muted hover:border-border-strong hover:text-foreground'
              )}
            >
              <opt.icon className={cn('size-5 transition-colors', on ? 'text-accent' : 'text-foreground-subtle group-hover:text-foreground-muted')} strokeWidth={1.75} />
              <span className="text-[13px] font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>

      <Label>Currency</Label>
      {!picking ? (
        <button onClick={() => setPicking(true)} className="group flex w-full items-center gap-4 border-y border-border py-4 text-left">
          <span className="num w-8 text-[20px] font-medium text-foreground-subtle">{symbolOf(c.code)}</span>
          <span className="flex-1">
            <span className="block text-[15px] font-medium">{c.name}</span>
            <span className="num text-[12px] tracking-[0.12em] text-foreground-subtle">{c.code}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground-muted transition-all group-hover:gap-2.5 group-hover:text-foreground">Change <ArrowRight className="size-3.5" /></span>
        </button>
      ) : pending ? (
        <div className="border-y border-border py-5">
          <p className="text-[15px] font-medium">Switch to {findCurrency(pending).name}?</p>
          <p className="mt-2 text-[13px] leading-5 text-foreground-subtle">
            You have {records} existing record{records === 1 ? '' : 's'}. Their amounts will be shown in {pending} as-is — Fyza does not convert values or use exchange rates.
            For example, {symbolOf(c.code)}1,000 becomes {symbolOf(pending)}1,000.
          </p>
          <div className="mt-5 flex gap-2">
            <Button variant="primary" onClick={() => apply(pending)}>Switch currency</Button>
            <Button variant="ghost" onClick={() => { setPending(null); setPicking(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <CurrencyPicker value={state.currency} onChange={choose} maxHeight={300} />
          <button onClick={() => setPicking(false)} className="mt-3 text-[13px] text-foreground-subtle hover:text-foreground">Cancel</button>
        </>
      )}

      <Label>Data</Label>
      <div className="flex items-center justify-between border-y border-border py-4">
        <div>
          <div className="text-[15px] font-medium">Stored on this device</div>
          <div className="text-[13px] text-foreground-subtle">{records} record{records === 1 ? '' : 's'} · no bank connection</div>
        </div>
      </div>
      <button onClick={reset} className="mt-4 text-[13px] font-medium text-negative/90 hover:text-negative">Reset workspace</button>

      <Label>Sign Out</Label>
      <button onClick={() => {
        if (window.confirm("Sign out? Your data is currently stored locally and may not be accessible until you implement a backend.")) {
          dispatch({ type: 'set', patch: { onboarded: false } });
          onClose();
        }
      }} className="w-full group flex items-center gap-4 border-y border-border py-4 text-left transition-colors hover:bg-surface-muted/30">
        <LogOut className="size-5 text-foreground-subtle shrink-0 group-hover:text-foreground transition-colors" />
        <div>
          <div className="text-[15px] font-medium text-foreground">Sign out</div>
          <div className="text-[13px] text-foreground-subtle group-hover:text-foreground-muted transition-colors">Sign out of your Fyza workspace</div>
        </div>
      </button>
    </Drawer>
  );
}
