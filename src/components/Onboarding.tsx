import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useStore } from '../engine/store';
import { Button, Input, cn } from './ui';

const PROFILES = [
  { id: 'personal', title: 'Personal', desc: 'Track salary, rent, everyday spending, and savings.' },
  { id: 'student', title: 'Student', desc: 'Manage pocket money, daily expenses, and college life.' },
  { id: 'freelancer', title: 'Freelancer', desc: 'Track irregular income, client invoices, and software subscriptions.' },
  { id: 'business', title: 'Business', desc: 'Full business dashboard with revenue, runway, and payroll.' },
  { id: 'family', title: 'Family', desc: 'Shared expenses, groceries, and household bills.' },
];

export default function Onboarding() {
  const { dispatch } = useStore();
  const [name, setName] = useState('');
  const [sel, setSel] = useState(['personal']);
  const [step, setStep] = useState(0);

  const toggle = (id: string) => setSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const complete = () => {
    dispatch({ type: 'seed', opts: { name, profiles: sel.length ? sel : ['personal'] } });
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col p-8 md:p-16">
        <div className="flex items-center gap-2.5 pb-10">
          <div className="grid size-7 place-items-center rounded-lg bg-inverse font-display text-[14px] font-bold text-inverse-foreground shadow-card">F</div>
          <span className="font-display text-[16px] font-semibold tracking-[-0.02em]">Fyza</span>
        </div>
        
        <div className="mb-10 flex gap-1.5">
          <div className={cn("h-1 w-7 rounded-full transition-colors", step === 0 ? "bg-foreground" : "bg-surface-muted")} />
          <div className={cn("h-1 w-7 rounded-full transition-colors", step === 1 ? "bg-foreground" : "bg-surface-muted")} />
        </div>
        
        {step === 0 ? (
          <div className="stagger max-w-[440px]">
            <h1 className="font-display text-[clamp(34px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.04em]">How do you<br/>want to use Fyza?</h1>
            <p className="my-6 text-body text-foreground-subtle">Fyza adapts to your life. You can combine multiple modes—like Personal + Freelancer—and seamlessly switch between them.</p>
            <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {PROFILES.map((p) => {
                const on = sel.includes(p.id);
                return (
                  <button key={p.id} className={cn("group relative flex items-start gap-3.5 rounded-2xl border bg-surface p-4 text-left transition-all hover:border-border-strong", on ? "border-foreground shadow-[0_0_0_1px_var(--foreground)_inset]" : "border-border")} onClick={() => toggle(p.id)}>
                    <div className={cn("absolute right-3.5 top-3.5 grid size-[18px] place-items-center rounded-[6px] border-[1.5px] transition-all", on ? "border-foreground bg-foreground text-background" : "border-border-strong text-transparent")}>
                      <Check className="size-3" strokeWidth={3} />
                    </div>
                    <div>
                      <b className="mb-0.5 block font-semibold text-foreground">{p.title}</b>
                      <small className="block pr-4 text-[12.5px] leading-[1.4] text-foreground-subtle">{p.desc}</small>
                    </div>
                  </button>
                );
              })}
            </div>
            <Button variant="primary" className="mt-8 h-12 w-32" disabled={sel.length === 0} onClick={() => setStep(1)}>Continue</Button>
          </div>
        ) : (
          <div className="stagger max-w-[440px]">
            <h1 className="font-display text-[clamp(34px,4vw,48px)] font-semibold leading-[1.05] tracking-[-0.04em]">What should we<br/>call you?</h1>
            <p className="my-6 text-body text-foreground-subtle">We'll build a custom financial workspace tailored to your selections.</p>
            <Input autoFocus className="h-14 font-display text-[20px]" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name && complete()} />
            <div className="mt-6 flex gap-3">
              <Button className="h-12 w-24" onClick={() => setStep(0)}>Back</Button>
              <Button variant="primary" className="h-12 flex-1" disabled={!name.trim()} onClick={complete}>Enter workspace <Sparkles className="size-4" /></Button>
            </div>
          </div>
        )}
      </div>
      
      <div className="relative hidden items-center justify-center overflow-hidden border-l border-border bg-surface-muted p-10 lg:flex">
        <div className="absolute right-[20%] top-[25%] w-[340px] animate-[float_7s_ease-in-out_infinite] rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className="mb-2 text-eyebrow font-medium uppercase text-foreground-subtle">AI Assistant</div>
          <p className="font-medium">"If I buy a ₹1.5L laptop, how does it affect my runway?"</p>
          <div className="mt-3 flex items-center gap-2 text-positive"><Sparkles className="size-4" /> <span className="text-[13px] font-medium">Fyza calculates the impact instantly.</span></div>
        </div>
        <div className="absolute bottom-[20%] left-[15%] w-[300px] animate-[float_7s_ease-in-out_infinite] rounded-2xl border border-border bg-surface p-5 shadow-card" style={{ animationDelay: '-3.5s' }}>
          <div className="mb-1.5 text-eyebrow font-medium uppercase text-foreground-subtle">Forecast</div>
          <div className="num text-[28px] font-semibold">₹4.2L <span className="text-[16px] font-medium text-foreground-subtle opacity-70">in 6 mo</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full w-[65%] rounded-full bg-accent" /></div>
        </div>
      </div>
    </div>
  );
}
