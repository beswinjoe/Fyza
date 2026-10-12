import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  TrendingUp,
  CreditCard,
  Plane,
  Building2,
  Lock,
  ChevronDown,
  Menu,
  X,
  Check,
  Compass,
  LineChart,
  Wallet,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import Atmosphere, { applyAtmosphere } from '../components/Atmosphere';
import { useRouter, Link } from '../engine/router';
import { useAuth } from '../engine/auth';
import { getStoredPreference, resolveTheme, applyTheme } from '../engine/theme';
import { Button, cn } from '../components/ui';

/* ================================================================
   Public Landing Page for Fyza
   
   - Exclusively Light Mode (Morning sky atmosphere gradient).
   - High-contrast, polished typography and text colors.
   - Comprehensive sections: Nav, Hero, What is Fyza, Features,
     How it works, Who it's for, Privacy & Data Control, FAQ, Footer.
   - Zero generic AI imagery; realistic demonstration preview.
   ================================================================ */

export default function LandingPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [demoTab, setDemoTab] = useState<'overview' | 'activity' | 'plans' | 'business'>('overview');

  // Enforce Light mode on the public landing page as requested
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
    applyAtmosphere();

    return () => {
      // When navigating away from landing page, restore the stored user preference
      const stored = getStoredPreference();
      applyTheme(resolveTheme(stored));
      applyAtmosphere();
    };
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const ctaDestination = user ? '/app' : '/login';

  return (
    <div className="onb-atmos min-h-dvh flex flex-col text-slate-900 selection:bg-accent-soft selection:text-slate-900">
      <Atmosphere />

      {/* ============================================================
          A. Navigation (Light Mode Only — No Theme Switcher)
          ============================================================ */}
      <header className="sticky top-0 z-50 w-full border-b border-white/40 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <Logo className="size-8 text-slate-950" />
            <span className="font-display text-[19px] font-semibold tracking-[-0.03em] text-slate-950">
              Fyza
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[13.5px] font-medium text-slate-700">
            <a href="#features" className="transition-colors hover:text-slate-950">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-950">
              How it works
            </a>
            <a href="#who-its-for" className="transition-colors hover:text-slate-950">
              Who it's for
            </a>
            <a href="#privacy" className="transition-colors hover:text-slate-950">
              Privacy
            </a>
            <a href="#faq" className="transition-colors hover:text-slate-950">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-4 text-[13.5px] font-medium text-white shadow-card transition-all hover:bg-slate-900 active:scale-[0.98]"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="size-3.5" />
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-1.5 text-[13.5px] font-medium text-slate-700 transition-colors hover:text-slate-950"
                >
                  Sign in
                </Link>
                <button
                  onClick={() => navigate('/login')}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-4 text-[13.5px] font-medium text-white shadow-card transition-all hover:bg-slate-900 active:scale-[0.98]"
                >
                  <span>Get started</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid size-9 place-items-center rounded-lg border border-slate-300/80 bg-white/80 text-slate-900"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-2xl sm:hidden animate-fade-in">
            <nav className="flex flex-col gap-3 text-[15px] font-medium text-slate-700">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-slate-950"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-slate-950"
              >
                How it works
              </a>
              <a
                href="#who-its-for"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-slate-950"
              >
                Who it's for
              </a>
              <a
                href="#privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-slate-950"
              >
                Privacy
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-slate-950"
              >
                FAQ
              </a>
            </nav>

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
              <Button
                variant="primary"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(ctaDestination);
                }}
                className="w-full justify-center bg-slate-950 text-white hover:bg-slate-900"
              >
                {user ? 'Enter Workspace' : 'Get started'}
              </Button>
              {!user && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                  className="w-full justify-center text-slate-800 hover:text-slate-950"
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ============================================================
          B. Hero Section (Fixed Text Coloring & High Contrast)
          ============================================================ */}
      <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-1.5 text-[12.5px] font-medium text-slate-800 shadow-sm backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Local-First Financial Workspace</span>
          </div>

          {/* Main Headline */}
          <h1 className="mt-8 font-display text-[clamp(40px,6vw,72px)] font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950">
            Your money. Your plans.<br />
            <span className="text-slate-800/80">One clear picture.</span>
          </h1>

          {/* Concise explanation */}
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.6] text-slate-800 sm:text-[19px] font-normal">
            Fyza brings your transactions, cash flow, accounts, and financial milestones into a calm, private workspace. Built for absolute precision with zero bank credentials required.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate(ctaDestination)}
              className="group inline-flex h-13 items-center gap-3 rounded-full bg-slate-950 px-7 text-[15px] font-medium text-white shadow-pop transition-all hover:bg-slate-900 active:scale-[0.98]"
            >
              <span>{user ? 'Open Workspace' : 'Get started'}</span>
              <span className="grid size-7 place-items-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="size-3.5 text-white" />
              </span>
            </button>

            <a
              href="#how-it-works"
              className="inline-flex h-13 items-center rounded-full border border-slate-300/80 bg-white/90 px-6 text-[15px] font-medium text-slate-900 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:border-slate-400"
            >
              See how it works
            </a>
          </div>

          {/* High-Contrast Trust Markers */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[13px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-1.5 font-medium text-slate-800 shadow-sm backdrop-blur-md">
              <Check className="size-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
              <span>No bank connection required</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-1.5 font-medium text-slate-800 shadow-sm backdrop-blur-md">
              <Check className="size-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
              <span>Local storage on your device</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-1.5 font-medium text-slate-800 shadow-sm backdrop-blur-md">
              <Check className="size-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
              <span>Google Authentication ready</span>
            </div>
          </div>
        </div>

        {/* ============================================================
            Hero Interactive Product Preview (Demonstration Data)
            ============================================================ */}
        <div className="mx-auto mt-14 max-w-5xl">
          <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-pop backdrop-blur-2xl sm:p-5 text-slate-900">
            {/* Demo notice tag */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3 px-2">
              <div className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
                <span className="inline-block size-2 rounded-full bg-emerald-600" />
                <span className="font-semibold text-slate-900">Interactive Workspace Preview</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 border border-slate-200 font-medium">
                  Demonstration Data
                </span>
              </div>

              {/* Workspace world simulation tabs */}
              <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[12px]">
                {(['overview', 'activity', 'plans', 'business'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDemoTab(tab)}
                    className={cn(
                      'rounded-md px-3 py-1 font-medium capitalize transition-all',
                      demoTab === tab ? 'bg-slate-950 text-white shadow-card' : 'text-slate-600 hover:text-slate-950'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Inner Mockup Body */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7">
              {demoTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top Stats */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                      <div className="text-[11.5px] font-medium uppercase tracking-wider text-slate-500">
                        Net Worth
                      </div>
                      <div className="mt-1 font-display text-[28px] font-semibold tracking-[-0.03em] text-slate-950 num">
                        $54,280.00
                      </div>
                      <div className="mt-1 text-[12px] font-medium text-emerald-700">
                        +$2,480.00 this month (4.8%)
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                      <div className="text-[11.5px] font-medium uppercase tracking-wider text-slate-500">
                        Monthly Cash Flow
                      </div>
                      <div className="mt-1 font-display text-[28px] font-semibold tracking-[-0.03em] text-slate-950 num">
                        +$2,850.00
                      </div>
                      <div className="mt-1 text-[12px] text-slate-600 font-medium">
                        $6,200 income · $3,350 spend
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                      <div className="text-[11.5px] font-medium uppercase tracking-wider text-slate-500">
                        Runway
                      </div>
                      <div className="mt-1 font-display text-[28px] font-semibold tracking-[-0.03em] text-slate-950 num">
                        14.2 months
                      </div>
                      <div className="mt-1 text-[12px] text-slate-600 font-medium">
                        Based on avg 3-mo burn rate
                      </div>
                    </div>
                  </div>

                  {/* Demonstration Recent Activity & AI Prompt */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                    {/* Recent ledger sample */}
                    <div className="space-y-3 lg:col-span-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-700">
                          Recent Records
                        </span>
                        <span className="text-[12px] text-slate-500">Sample ledger</span>
                      </div>

                      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-900">
                              <Building2 className="size-4.5" />
                            </div>
                            <div>
                              <div className="text-[13.5px] font-medium text-slate-900">Client Retainer</div>
                              <div className="text-[11.5px] text-slate-500">Freelance World · Income</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[14px] font-semibold text-emerald-700 num">+$3,500.00</div>
                            <div className="text-[11.5px] text-slate-500">Oct 10</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-900">
                              <CreditCard className="size-4.5" />
                            </div>
                            <div>
                              <div className="text-[13.5px] font-medium text-slate-900">Workspace Studio Rent</div>
                              <div className="text-[11.5px] text-slate-500">Operating Expenses</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[14px] font-semibold text-slate-900 num">-$1,200.00</div>
                            <div className="text-[11.5px] text-slate-500">Oct 05</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-900">
                              <Wallet className="size-4.5" />
                            </div>
                            <div>
                              <div className="text-[13.5px] font-medium text-slate-900">Emergency Fund Deposit</div>
                              <div className="text-[11.5px] text-slate-500">Savings Plan · Goal</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[14px] font-semibold text-slate-700 num">+$650.00</div>
                            <div className="text-[11.5px] text-slate-500">Oct 01</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Ask Fyza Card */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between lg:col-span-2 shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 uppercase tracking-wider">
                          <Sparkles className="size-3.5 text-emerald-700" />
                          <span>Fyza Intelligence</span>
                        </div>
                        <p className="mt-3 text-[13.5px] leading-relaxed text-slate-800">
                          "If you keep your current savings rate, your <strong>Emergency Fund</strong> goal will be fully reached by <strong>December 15</strong>."
                        </p>
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-2.5 text-[12px] text-slate-700 shadow-sm">
                        <span className="font-semibold text-slate-950">Natural command:</span> "What's my forecasted net worth in 6 months?"
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {demoTab === 'activity' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-[18px] font-semibold text-slate-950">Ledger & Flow Activity</h4>
                      <p className="text-[13px] text-slate-600">Filtered timeline of income, transfers and categorized spending.</p>
                    </div>
                    <div className="rounded-lg bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-900 border border-slate-200">
                      Monthly Total: $4,550
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                      <div className="text-[12px] font-medium text-slate-500">Largest Outflow Category</div>
                      <div className="mt-1 font-display text-[20px] font-semibold text-slate-950">Housing & Utilities (38%)</div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-slate-800 rounded-full" style={{ width: '38%' }} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                      <div className="text-[12px] font-medium text-slate-500">Discretionary Spending</div>
                      <div className="mt-1 font-display text-[20px] font-semibold text-slate-950">$480.00 of $750.00</div>
                      <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: '64%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {demoTab === 'plans' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-[18px] font-semibold text-slate-950">Financial Plans & Goals</h4>
                      <p className="text-[13px] text-slate-600">Targeted savings goals, trip budgets, and scenario forecasts.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-[15px] text-slate-950">Emergency Reserve</div>
                          <div className="text-[12px] text-slate-500 font-medium">Target: $12,000</div>
                        </div>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-semibold">
                          75% done
                        </span>
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-emerald-600" style={{ width: '75%' }} />
                      </div>
                      <div className="mt-2 text-[12px] font-medium text-slate-600">$9,000 saved · $3,000 to go</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-[15px] text-slate-950">Kyoto Expedition</div>
                          <div className="text-[12px] text-slate-500 font-medium">Dedicated Trip Budget (JPY)</div>
                        </div>
                        <span className="rounded-full bg-slate-200 text-slate-800 px-2 py-0.5 text-[11px] font-semibold">
                          Active trip
                        </span>
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full bg-slate-800" style={{ width: '45%' }} />
                      </div>
                      <div className="mt-2 text-[12px] font-medium text-slate-600">¥180,000 spent of ¥400,000 cap</div>
                    </div>
                  </div>
                </div>
              )}

              {demoTab === 'business' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display text-[18px] font-semibold text-slate-950">Business World</h4>
                      <p className="text-[13px] text-slate-600">Invoice tracking, business runway, and separate tax-deductible flow.</p>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11.5px] font-semibold text-slate-800">
                      World: Business
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-sm">
                      <div className="text-[11px] font-medium text-slate-500 uppercase">Invoiced this Q</div>
                      <div className="mt-1 font-display text-[22px] font-semibold text-slate-950 num">$18,400</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-sm">
                      <div className="text-[11px] font-medium text-slate-500 uppercase">Pending Collection</div>
                      <div className="mt-1 font-display text-[22px] font-semibold text-amber-700 num">$3,200</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 shadow-sm">
                      <div className="text-[11px] font-medium text-slate-500 uppercase">Effective Runway</div>
                      <div className="mt-1 font-display text-[22px] font-semibold text-slate-950 num">8.4 mo</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          C. What is Fyza? (Crisp Typography)
          ============================================================ */}
      <section className="border-t border-white/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-700">
              The Philosophy
            </span>
            <h2 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[44px]">
              What is Fyza?
            </h2>
            <p className="mt-4 text-[16.5px] leading-relaxed text-slate-800 sm:text-[18px]">
              Fyza brings financial information into one unified workspace so you can truly understand your finances and plan ahead—without giving away passwords or being overwhelmed by noisy graphs.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm">
              <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-950">
                <LineChart className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-[18px] font-semibold text-slate-950">Total Clarity</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                See cash balances, loan paydowns, credit card utilization, and long-term trajectory side-by-side.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm">
              <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-950">
                <Layers className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-[18px] font-semibold text-slate-950">Manual-First Control</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                Every record is deliberate. No broken bank scrapers, no duplicate transaction errors, and no missing categorizations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm">
              <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-950">
                <Compass className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-[18px] font-semibold text-slate-950">Multi-Profile Shape</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                Switch profiles or toggle between Personal and Business financial worlds within the same workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm">
              <div className="grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-950">
                <Shield className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-[18px] font-semibold text-slate-950">Complete Sovereignty</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                Financial records stay in local browser storage. Export everything to JSON or restore whenever you choose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          D. Features (Genuinely Implemented)
          ============================================================ */}
      <section id="features" className="border-t border-white/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-700">
              Features
            </span>
            <h2 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[44px]">
              Built for real financial life
            </h2>
            <p className="mt-3 text-[16px] text-slate-800">
              Inspect everything Fyza actually does today—every tool designed with deliberate precision.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. Transactions & Expense Tracking */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm transition-all hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-950">
                  <CreditCard className="size-5" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-slate-950">Ledger & Expenses</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Comprehensive tracking of daily expenses and income with custom categories, account linkage, and tags.
              </p>
            </div>

            {/* 2. Income & Overview */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm transition-all hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-950">
                  <TrendingUp className="size-5" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-slate-950">Cash Flow & Runway</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Real-time calculations for net savings rate, monthly burn rate, and projected months of emergency runway.
              </p>
            </div>

            {/* 3. Net Worth & Forecasting */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm transition-all hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-950">
                  <LineChart className="size-5" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-slate-950">Net Worth Projection</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Synthesize bank accounts, credit card balances, and loans to forecast net worth progression over time.
              </p>
            </div>

            {/* 4. Savings Goals & Financial Planning */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm transition-all hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-950">
                  <Wallet className="size-5" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-slate-950">Savings Goals</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Create concrete milestones with target deadlines. Monitor your pace and see exactly when goals will be reached.
              </p>
            </div>

            {/* 5. Accounts, Cards & Loans */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm transition-all hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-950">
                  <Layers className="size-5" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-slate-950">Accounts, Cards & Loans</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Manage checking, credit card utilization ratios, and loan amortization schedules without mixing liabilities and assets.
              </p>
            </div>

            {/* 6. Trip Budgets */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm transition-all hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-950">
                  <Plane className="size-5" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-slate-950">Trip & Travel Budgets</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Spin up isolated budgets for holidays or business travel with distinct travel currencies and per-trip ledgers.
              </p>
            </div>

            {/* 7. Business Finances */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm transition-all hover:border-slate-300">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-950">
                  <Building2 className="size-5" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-slate-950">Business Finance World</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Toggle between personal and business worlds to handle client invoices, commercial expenses, and corporate runway.
              </p>
            </div>

            {/* 8. AI-Assisted Insights */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm transition-all hover:border-slate-300 md:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-950">
                  <Sparkles className="size-5 text-emerald-700" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-slate-950">AI Assistant & Command Palette</h3>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Ask questions in plain English ("How much did I spend on dining this month?"), create scenario simulations, or trigger rapid actions using <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-800">⌘K</kbd>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          E. How It Works (Three Simple Steps)
          ============================================================ */}
      <section id="how-it-works" className="border-t border-white/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-700">
              Workflow
            </span>
            <h2 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[44px]">
              How it works
            </h2>
            <p className="mt-3 text-[16px] text-slate-800">
              Get started in three straightforward steps. No financial credentials needed.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-3xl border border-slate-200/80 bg-white/90 p-8 backdrop-blur-md shadow-sm">
              <div className="text-[12px] font-bold uppercase tracking-wider text-emerald-700">
                Step 01
              </div>
              <h3 className="mt-3 font-display text-[22px] font-semibold text-slate-950">
                Set up your workspace
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Sign in with Google to establish your private profile. Pick your base currency (USD, EUR, GBP, JPY, INR, etc.) and your workspace profile.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-3xl border border-slate-200/80 bg-white/90 p-8 backdrop-blur-md shadow-sm">
              <div className="text-[12px] font-bold uppercase tracking-wider text-emerald-700">
                Step 02
              </div>
              <h3 className="mt-3 font-display text-[22px] font-semibold text-slate-950">
                Add financial records
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Add accounts, recurring bills, or everyday expenses manually at your pace. You have complete control over each data point.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-3xl border border-slate-200/80 bg-white/90 p-8 backdrop-blur-md shadow-sm">
              <div className="text-[12px] font-bold uppercase tracking-wider text-emerald-700">
                Step 03
              </div>
              <h3 className="mt-3 font-display text-[22px] font-semibold text-slate-950">
                Understand and plan
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
                Review your net worth forecast, track goals, and ask Fyza questions in natural language to gain quiet financial confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          F. Who Fyza is For
          ============================================================ */}
      <section id="who-its-for" className="border-t border-white/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-700">
              Profiles
            </span>
            <h2 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[44px]">
              Who Fyza is for
            </h2>
            <p className="mt-3 text-[16px] text-slate-800">
              Designed to adapt flexibly to your current stage of life.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
                Students
              </span>
              <h3 className="mt-4 font-display text-[19px] font-semibold text-slate-950">Students & Campus Life</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                Track allowances, semester rent, textbooks, and daily food expenses without complicated banking rules.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
                Personal
              </span>
              <h3 className="mt-4 font-display text-[19px] font-semibold text-slate-950">Personal Finance</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                Salary, subscriptions, emergency fund targets, debt payoff tracking, and holistic net worth monitoring.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
                Freelancers
              </span>
              <h3 className="mt-4 font-display text-[19px] font-semibold text-slate-950">Freelancers & Solopreneurs</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                Smooth out irregular income waves, log project invoices, estimate tax withholdings, and manage variable expenses.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
                Family
              </span>
              <h3 className="mt-4 font-display text-[19px] font-semibold text-slate-950">Families & Households</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                Plan shared groceries, mortgage and utility commitments, and dedicated savings budgets for family vacations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-md shadow-sm sm:col-span-2 lg:col-span-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
                Business
              </span>
              <h3 className="mt-4 font-display text-[19px] font-semibold text-slate-950">Small Businesses & Agencies</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                Dedicated business mode with client accounts, accounts receivable, vendor costs, and runway calculation to keep personal money distinct.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          G. Privacy & Data Control
          ============================================================ */}
      <section id="privacy" className="border-t border-white/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-pop backdrop-blur-2xl sm:p-12 text-slate-900">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-950 border border-slate-200">
              <Lock className="size-6 text-emerald-700" />
            </div>
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-700">
                Sovereignty
              </span>
              <h2 className="font-display text-[28px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[34px]">
                Your privacy and data control
              </h2>
            </div>
          </div>

          <p className="mt-6 text-[15px] leading-relaxed text-slate-700 sm:text-[16px]">
            Fyza takes a refreshingly transparent approach to financial security:
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-3.5" />
              </div>
              <div>
                <strong className="font-semibold text-slate-950">Local storage on your device:</strong>
                <span className="text-slate-600 text-[14px] ml-1.5">
                  Your transactions, accounts, and financial plans reside in your browser’s local storage. Fyza does not maintain a central database of your bank ledgers.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-3.5" />
              </div>
              <div>
                <strong className="font-semibold text-slate-950">Zero bank credential scraping:</strong>
                <span className="text-slate-600 text-[14px] ml-1.5">
                  We never ask for bank usernames, passwords, or Plaid tokens. You remain the sole custodian of your money data.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-3.5" />
              </div>
              <div>
                <strong className="font-semibold text-slate-950">Google Authentication:</strong>
                <span className="text-slate-600 text-[14px] ml-1.5">
                  Google Auth identifies you and isolates your workspace on shared devices, preventing other users on the same computer from seeing your data.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Check className="size-3.5" />
              </div>
              <div>
                <strong className="font-semibold text-slate-950">Backup & JSON Export:</strong>
                <span className="text-slate-600 text-[14px] ml-1.5">
                  Export full workspace backups anytime in standard JSON format, or restore from automatic local corrupted-data safeguards.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          H. FAQ Section
          ============================================================ */}
      <section id="faq" className="border-t border-white/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-slate-700">
              Answers
            </span>
            <h2 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[44px]">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-12 space-y-4">
            {[
              {
                q: 'What is Fyza?',
                a: 'Fyza is a calm personal and business financial workspace designed to give you clarity over your money, runway, and savings goals without third-party bank connections.',
              },
              {
                q: 'Is Fyza suitable for students?',
                a: 'Yes. Fyza offers a dedicated Student profile tailored for budgeting pocket money, college living expenses, and keeping spending on track with minimal friction.',
              },
              {
                q: 'Do I need to connect a bank account?',
                a: 'No. Fyza is manual-first by design. You never have to share online banking credentials, passwords, or risk broken bank sync connections.',
              },
              {
                q: 'Where is my financial data stored?',
                a: 'All transactions, accounts, and settings are stored locally on your device in your browser. Fyza does not upload your ledger records to external cloud databases.',
              },
              {
                q: 'Can I manage personal and business finances in one place?',
                a: 'Yes. If enabled in your profile, Fyza provides a two-way workspace toggle between Personal and Business, keeping tax records, client invoices, and business runway separate.',
              },
              {
                q: 'How does Google sign-in work?',
                a: 'Google sign-in securely verifies your identity via Firebase Authentication. On shared computers, it ensures your workspace remains isolated from any other user who signs in on the same browser.',
              },
            ].map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-5 text-left font-display text-[17px] font-semibold text-slate-950 transition-colors hover:text-slate-700"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        'size-5 text-slate-500 transition-transform duration-200 shrink-0 ml-4',
                        isOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0 text-[14.5px] leading-relaxed text-slate-600 animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          I. Final CTA & Footer
          ============================================================ */}
      <section className="border-t border-white/50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/80 bg-white/95 p-8 text-center shadow-pop backdrop-blur-2xl sm:p-14 text-slate-900">
          <h2 className="font-display text-[32px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[46px]">
            Ready to understand your money?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-slate-700 sm:text-[18px]">
            Enter your private financial workspace today. No bank credentials, no trackers, and complete control.
          </p>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate(ctaDestination)}
              className="group inline-flex h-14 items-center gap-3 rounded-full bg-slate-950 px-8 text-[15px] font-medium text-white shadow-pop transition-all hover:bg-slate-900 active:scale-[0.98]"
            >
              <span>{user ? 'Open Your Workspace' : 'Get started with Google'}</span>
              <span className="grid size-8 place-items-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="size-4 text-white" />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/50 bg-white/70 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Logo className="size-6 text-slate-950" />
            <span className="font-display text-[16px] font-semibold tracking-tight text-slate-950">
              Fyza
            </span>
            <span className="text-[12px] text-slate-500 font-medium">
              · Calm financial workspace
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[13px] font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-950">Features</a>
            <a href="#how-it-works" className="hover:text-slate-950">How it works</a>
            <a href="#privacy" className="hover:text-slate-950">Privacy</a>
            <a href="#faq" className="hover:text-slate-950">FAQ</a>
            <Link href="/login" className="hover:text-slate-950">Sign in</Link>
          </div>

          <div className="text-[12px] text-slate-500 font-medium">
            Local-first · Manual control · Privacy-first
          </div>
        </div>
      </footer>
    </div>
  );
}
