import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useStore } from '../engine/store';
import { Input, cn } from './ui';
import { CurrencyPicker } from './CurrencyPicker';
import { Logo } from './Logo';
import welcomeVid from '../assets/welcome.mp4';

const PROFILES = [
  { id: 'personal', title: 'Personal', desc: 'Salary, rent, everyday spending, savings.' },
  { id: 'student', title: 'Student', desc: 'Pocket money, daily expenses, college life.' },
  { id: 'freelancer', title: 'Freelancer', desc: 'Irregular income, invoices, subscriptions.' },
  { id: 'business', title: 'Business', desc: 'Revenue, runway and payroll.' },
  { id: 'family', title: 'Family', desc: 'Shared expenses, groceries, household bills.' },
];

const CAPTIONS = [
  { eyebrow: 'No. 01 — Clarity', line: 'Every money, accounted for. Every plan, within reach.' },
  { eyebrow: 'No. 02 — Shape', line: 'One workspace that bends to the way you actually live.' },
  { eyebrow: 'No. 03 — Global', line: 'Speak your money’s language.' },
  { eyebrow: 'No. 04 — Begin', line: 'The quiet confidence of knowing where you stand.' },
];

function PrimaryCTA({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="group inline-flex h-14 items-center gap-3 rounded-full bg-foreground pl-7 pr-2 text-[15px] font-medium text-background transition-all duration-300 hover:gap-4 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
      <span className="grid size-10 place-items-center rounded-full bg-background/15 transition-transform duration-300 group-hover:translate-x-0.5">
        <ArrowRight className="size-4" />
      </span>
    </button>
  );
}

export default function Onboarding() {
  const { dispatch } = useStore();
  const [name, setName] = useState('');
  const [sel, setSel] = useState(['personal']);
  const [currency, setCurrency] = useState('USD');
  const [step, setStep] = useState(0); // 0 welcome · 1 profiles · 2 currency · 3 name

  const toggle = (id: string) => setSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const complete = () => {
    dispatch({ type: 'seed', opts: { name, profiles: sel.length ? sel : ['personal'], currency } });
  };

  const cap = CAPTIONS[step];

  return (
    <main className="onb-atmos flex min-h-dvh flex-col p-3 lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:p-4">
      {/* Visual */}
      <section aria-hidden className="relative h-[38vh] min-h-[260px] overflow-hidden rounded-[28px] bg-[#0d1422] lg:h-full">
        <video
          ref={(v) => { if (v) v.playbackRate = 0.7; }}
          src={welcomeVid}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 size-full object-cover object-[50%_50%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/10" />
        <div className="absolute left-6 top-6 flex items-center gap-2 text-white/90 lg:left-8 lg:top-8">
          <Logo className="size-3" />
          <span className="text-[11px] font-medium uppercase tracking-[0.22em]">Fyza</span>
        </div>
        <div key={step} className="absolute inset-x-6 bottom-6 max-w-[420px] animate-[fadeUp_.7s_ease-out_both] text-white lg:inset-x-10 lg:bottom-10">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.22em] text-white/60">{cap.eyebrow}</div>
          <p className="hidden font-display text-[22px] font-medium leading-[1.25] tracking-[-0.02em] text-white/95 sm:block">{cap.line}</p>
        </div>
      </section>

      {/* Content */}
      <section className="relative flex flex-1 flex-col px-5 pb-6 pt-8 sm:px-10 lg:px-16 lg:py-10 xl:px-24">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="size-10" />
            <span className="font-display text-[19px] font-semibold tracking-[-0.03em]">Fyza</span>
          </div>
          {step > 0 && (
            <div className="flex gap-1.5" aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={cn('h-[3px] rounded-full transition-all duration-500', step >= i ? 'w-8 bg-foreground' : 'w-4 bg-border-strong')} />
              ))}
            </div>
          )}
        </header>

        <div key={step} className="flex flex-1 flex-col justify-center py-10 lg:py-0">
          {step === 0 && (
            <div className="stagger max-w-[520px]">
              <h1 className="font-display text-[clamp(48px,7vw,96px)] font-semibold leading-[0.95] tracking-[-0.05em]">
                Your money,<br />
                <span className="text-foreground-subtle">understood.</span>
              </h1>
              <p className="mt-7 max-w-[380px] text-[17px] leading-[1.55] text-foreground-subtle">
                A financial workspace to track, plan and understand your money.
              </p>
              <div className="mt-10">
                <PrimaryCTA onClick={() => setStep(1)}>Get started</PrimaryCTA>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="stagger max-w-[520px]">
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-subtle">Step one</div>
              <h1 className="font-display text-[clamp(36px,4.5vw,60px)] font-semibold leading-[1] tracking-[-0.045em]">
                How will you<br />use Fyza?
              </h1>
              <p className="mt-5 max-w-[400px] text-[15px] leading-[1.55] text-foreground-subtle">
                Choose one or combine several. You can switch between them anytime.
              </p>
              <ul className="mt-8 border-t border-border">
                {PROFILES.map((p) => {
                  const on = sel.includes(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        onClick={() => toggle(p.id)}
                        aria-pressed={on}
                        className="group flex w-full items-center gap-5 border-b border-border py-4 text-left transition-colors"
                      >
                        <span className={cn('font-display text-[20px] font-semibold tracking-[-0.03em] transition-colors', on ? 'text-foreground' : 'text-foreground-subtle group-hover:text-foreground')}>
                          {p.title}
                        </span>
                        <span className="hidden flex-1 text-[13px] text-foreground-subtle sm:block">{p.desc}</span>
                        <span className={cn('ml-auto grid size-6 shrink-0 place-items-center rounded-full border transition-all duration-300', on ? 'border-foreground bg-foreground text-background' : 'border-border-strong text-transparent group-hover:border-foreground-subtle')}>
                          <Check className="size-3.5" strokeWidth={3} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-9 flex items-center gap-6">
                <PrimaryCTA disabled={sel.length === 0} onClick={() => setStep(2)}>Continue</PrimaryCTA>
                <button onClick={() => setStep(0)} className="text-[14px] font-medium text-foreground-subtle transition-colors hover:text-foreground">Back</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="stagger max-w-[520px]">
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-subtle">Step two</div>
              <h1 className="font-display text-[clamp(36px,4.5vw,60px)] font-semibold leading-[1] tracking-[-0.045em]">
                What currency<br />do you use?
              </h1>
              <div className="mt-8">
                <CurrencyPicker value={currency} onChange={setCurrency} className="w-full max-w-[400px]" maxHeight={260} />
              </div>
              <div className="mt-9 flex items-center gap-6">
                <PrimaryCTA onClick={() => setStep(3)}>Continue</PrimaryCTA>
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground-subtle transition-colors hover:text-foreground">
                  <ArrowLeft className="size-3.5" /> Back
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="stagger max-w-[520px]">
              <div className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] text-foreground-subtle">Step three</div>
              <h1 className="font-display text-[clamp(36px,4.5vw,60px)] font-semibold leading-[1] tracking-[-0.045em]">
                What should we<br />call you?
              </h1>
              <p className="mt-5 max-w-[400px] text-[15px] leading-[1.55] text-foreground-subtle">
                We'll shape a workspace around your selections.
              </p>
              <Input
                autoFocus
                className="mt-10 h-16 rounded-none border-0 border-b border-border-strong bg-transparent px-0 font-display text-[28px] font-medium tracking-[-0.03em] shadow-none focus-visible:border-foreground focus-visible:ring-0"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && complete()}
              />
              <div className="mt-10 flex items-center gap-6">
                <PrimaryCTA disabled={!name.trim()} onClick={complete}>Enter workspace</PrimaryCTA>
                <button onClick={() => setStep(2)} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-foreground-subtle transition-colors hover:text-foreground">
                  <ArrowLeft className="size-3.5" /> Back
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="text-[12px] leading-[1.5] text-foreground-subtle">
          Your data stays on this device. Manual-first — no bank connection required.
        </footer>
      </section>
    </main>
  );
}
