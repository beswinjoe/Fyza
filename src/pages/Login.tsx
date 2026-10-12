import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../engine/auth';
import { useRouter, Link } from '../engine/router';
import { Logo } from '../components/Logo';
import Atmosphere, { applyAtmosphere } from '../components/Atmosphere';
import { getStoredPreference, applyTheme, resolveTheme } from '../engine/theme';

/* ================================================================
   Login Page — Google & Email/Password Authentication
   
   - Dedicated authentication screen matching Fyza's exact visual identity.
   - Supports Email & Password (Sign In + Create Account).
   - Supports Google Sign-In with popup.
   - Works seamlessly both with Firebase and local offline fallback.
   - Redirects authenticated users to /app or their target redirect URL.
   ================================================================ */

export default function LoginPage() {
  const {
    user,
    loading: authLoading,
    error: authError,
    isConfigured,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    clearError,
  } = useAuth();
  const { navigate, query } = useRouter();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submittingGoogle, setSubmittingGoogle] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const redirectTarget = query.redirect || '/app';

  // Enforce Light mode on login screen (morning atmosphere)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
    applyAtmosphere();

    return () => {
      const stored = getStoredPreference();
      applyTheme(resolveTheme(stored));
      applyAtmosphere();
    };
  }, []);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (!authLoading && user) {
      navigate(redirectTarget, { replace: true });
    }
  }, [user, authLoading, navigate, redirectTarget]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Please enter your email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setSubmittingEmail(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(trimmedEmail, password, name.trim());
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmittingEmail(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    setLocalError(null);
    setSubmittingGoogle(true);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setLocalError(err?.message || 'Google sign-in could not be completed.');
    } finally {
      setSubmittingGoogle(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="onb-atmos flex min-h-dvh flex-col justify-between p-4 sm:p-6 lg:p-8">
      <Atmosphere />

      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all hover:border-slate-300 hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Fyza</span>
        </Link>

        <div className="flex items-center gap-2 text-slate-600 text-[12px] font-medium">
          <ShieldCheck className="size-4 text-emerald-600" />
          <span>Local-first & private</span>
        </div>
      </header>

      {/* Center card */}
      <main className="mx-auto my-auto flex w-full max-w-[420px] flex-col items-center py-6 sm:py-10">
        <div className="w-full rounded-3xl border border-slate-200/80 bg-white/90 p-7 shadow-pop backdrop-blur-2xl sm:p-9">
          {/* Logo & Heading */}
          <div className="flex flex-col items-center text-center">
            <div className="grid size-13 place-items-center rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm">
              <Logo className="size-7.5 text-slate-950" />
            </div>

            <h1 className="mt-5 font-display text-[24px] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[26px]">
              {mode === 'signin' ? 'Sign in to Fyza' : 'Create your account'}
            </h1>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-600">
              {mode === 'signin'
                ? 'Access your private, local financial workspace.'
                : 'Start tracking your net worth and cash flow privately.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mt-6 flex w-full rounded-xl bg-slate-100 p-1 border border-slate-200/70">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                clearError();
                setLocalError(null);
              }}
              className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-all ${
                mode === 'signin'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearError();
                setLocalError(null);
              }}
              className={`flex-1 rounded-lg py-1.5 text-[13px] font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error notice */}
          {displayError && (
            <div
              className="mt-4 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-[13px] text-red-900 animate-fade-in"
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 text-[12.5px] leading-relaxed">
                  {displayError}
                </div>
              </div>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="mt-5 space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-slate-700">
                  Full Name <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Smith"
                    autoComplete="name"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-950 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[12.5px] font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-950 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-[12.5px] font-medium text-slate-700">
                  Password
                </label>
                {mode === 'signup' && (
                  <span className="text-[11px] text-slate-400">At least 6 characters</span>
                )}
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-slate-950 focus:outline-none focus:ring-1 focus:ring-slate-950 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingEmail || submittingGoogle || authLoading}
              className="relative mt-2 flex h-11.5 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[14px] font-semibold text-white shadow-card transition-all duration-200 hover:bg-slate-900 active:scale-[0.99] disabled:opacity-50"
            >
              {submittingEmail ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{mode === 'signin' ? 'Signing in…' : 'Creating account…'}</span>
                </>
              ) : (
                <span>{mode === 'signin' ? 'Sign In with Email' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="w-full border-t border-slate-200" />
            <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              or
            </span>
          </div>

          {/* Google Sign-in */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submittingEmail || submittingGoogle || authLoading}
              aria-label="Continue with Google"
              className="group relative flex h-11.5 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-medium text-slate-800 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:opacity-50"
            >
              {submittingGoogle ? (
                <>
                  <Loader2 className="size-4.5 animate-spin text-slate-600" />
                  <span>Connecting to Google…</span>
                </>
              ) : (
                <>
                  <svg className="size-4.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {!isConfigured && (
              <p className="mt-2 text-center text-[11px] text-slate-500">
                Google sign-in requires Firebase keys in <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">.env</code> · Email sign-in works offline!
              </p>
            )}
          </div>

          {/* Mode Switcher Link */}
          <div className="mt-5 text-center text-[13px] text-slate-500">
            {mode === 'signin' ? (
              <span>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    clearError();
                    setLocalError(null);
                  }}
                  className="font-semibold text-slate-900 underline underline-offset-2 hover:text-slate-800"
                >
                  Create one
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    clearError();
                    setLocalError(null);
                  }}
                  className="font-semibold text-slate-900 underline underline-offset-2 hover:text-slate-800"
                >
                  Sign in
                </button>
              </span>
            )}
          </div>

          {/* Reassurance pills */}
          <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>Zero bank logins or third-party credential scraping</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>Financial data stored exclusively in your local browser</span>
            </div>
          </div>
        </div>

        {/* Footer info note */}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-slate-500 max-w-[340px]">
          By continuing, you enter Fyza’s private workspace. You can export or clear your local records at any time.
        </p>
      </main>

      {/* Empty bottom spacer to center card */}
      <footer className="mx-auto w-full max-w-5xl py-2 text-center text-[11px] text-slate-500">
        Fyza · Calm Financial Workspace
      </footer>
    </div>
  );
}

