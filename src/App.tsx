import { useState, useEffect, useCallback } from 'react';
import { Home, LineChart, Compass, Building2, PanelLeftClose, PanelLeft, Plus, Search, Plane, Landmark, CreditCard, HandCoins, Repeat } from 'lucide-react';
import { useStore } from './engine/store';
import Onboarding from './components/Onboarding';
import HomePage from './pages/Home';
import ActivityPage from './pages/Activity';
import PlansPage from './pages/Plans';
import BusinessPage from './pages/Business';
import ManagePage from './pages/Manage';
import { Palette } from './components/AI';
import { AddFlow } from './components/AddFlow';
import { ItemView } from './components/ItemView';
import { Toast, Button, Kbd, AIMark, cn } from './components/ui';
import Atmosphere from './components/Atmosphere';
import Settings from './components/Settings';
import { World } from './types/finance';
import { hasCapability } from './engine/capabilities';

export type Page = 'home' | 'activity' | 'plans' | 'trips' | 'accounts' | 'cards' | 'loans' | 'subscriptions' | 'business';

import { Logo } from './components/Logo';

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo className="size-9" />
      {!compact && <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">Fyza</span>}
    </div>
  );
}

export default function App() {
  const { state, dispatch } = useStore();
  const [page, setPage] = useState<Page>('home');
  const [cmd, setCmd] = useState(false);
  const [add, setAdd] = useState<string | boolean>(false);
  const [item, setItem] = useState<{ type: string; id: string } | null>(null);
  const [toast, setToast] = useState('');
  const [sb, setSb] = useState(true);
  const [settings, setSettings] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement;
      const inInput = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);
      
      if (e.key === 'k') { 
        e.preventDefault(); 
        setCmd((c) => !c); 
      }
      if (e.key === 'i') { 
        if (inInput) return;
        e.preventDefault(); 
        setAdd('income'); 
      }
      if (e.key === 'e') { 
        if (inInput) return;
        e.preventDefault(); 
        setAdd('expense'); 
      }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  const openAdd = useCallback((t?: string) => setAdd(t || true), []);
  const openItem = useCallback((type: string, id: string) => setItem({ type, id }), []);
  const clearToast = useCallback(() => setToast(''), []);

  if (!state.onboarded) return <Onboarding />;

  const hasBiz = hasCapability(state, 'business');
  
  const NAV_GROUPS = [
    {
      label: 'Main',
      items: [
        { id: 'home' as Page, label: 'Home', icon: Home },
        { id: 'activity' as Page, label: 'Activity', icon: LineChart },
        { id: 'plans' as Page, label: 'Plans', icon: Compass },
        ...(state.world === 'personal' ? [{ id: 'trips' as Page, label: 'Trips', icon: Plane }] : []),
      ]
    },
    {
      label: 'Manage',
      items: [
        ...(hasCapability(state, 'accounts') ? [{ id: 'accounts' as Page, label: 'Accounts', icon: Landmark }] : []),
        ...(state.world === 'personal' && hasCapability(state, 'cards') ? [{ id: 'cards' as Page, label: 'Cards', icon: CreditCard }] : []),
        ...(hasCapability(state, 'loans') ? [{ id: 'loans' as Page, label: 'Loans', icon: HandCoins }] : []),
        { id: 'subscriptions' as Page, label: 'Subscriptions', icon: Repeat },
      ].filter(Boolean)
    },
    ...(hasBiz ? [{
      label: 'Business',
      items: [
        { id: 'business' as Page, label: 'Business', icon: Building2 },
      ]
    }] : [])
  ];

  const MOBILE_NAV = [
    { id: 'home' as Page, label: 'Home', icon: Home },
    { id: 'activity' as Page, label: 'Activity', icon: LineChart },
    { id: 'plans' as Page, label: 'Plans', icon: Compass },
    ...(hasBiz ? [{ id: 'business' as Page, label: 'Business', icon: Building2 }] : []),
  ];

  const initials = state.user.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase() || 'F';

  return (
    <div className="onb-atmos onb-atmos-app flex min-h-full">
      <Atmosphere />
      {/* ---------- Sidebar (desktop) ---------- */}
      {sb && (
        <aside className="sticky top-0 flex h-dvh w-[240px] shrink-0 flex-col border-r border-border bg-surface-muted/30 px-3 pb-4 pt-4 max-lg:hidden" aria-label="Primary">
          <div className="flex h-8 items-center justify-between px-2 mb-4">
            <Brand />
            <Button variant="ghost" size="sm" icon aria-label="Collapse sidebar" onClick={() => setSb(false)} className="-mr-1 text-foreground-subtle"><PanelLeftClose /></Button>
          </div>

          {hasBiz && (
            <div className="mb-6 grid grid-cols-2 gap-0.5 rounded-lg border border-border bg-surface-muted p-0.5" role="tablist" aria-label="Workspace">
              {(['personal', 'business'] as World[]).map((w) => (
                <button key={w} role="tab" aria-selected={state.world === w} onClick={() => dispatch({ type: 'set', patch: { world: w } })}
                  className={cn('h-7 rounded-md text-meta font-medium capitalize transition-all', state.world === w ? 'bg-background text-foreground shadow-card ring-1 ring-border' : 'text-foreground-subtle hover:text-foreground')}>{w}</button>
              ))}
            </div>
          )}

          <nav className="flex flex-1 flex-col gap-6 overflow-y-auto pb-4 [-webkit-overflow-scrolling:touch]">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">{group.label}</div>
                {group.items.map((n) => {
                  const on = page === n.id;
                  return (
                    <button key={n.id} onClick={() => setPage(n.id)} aria-current={on ? 'page' : undefined}
                      className={cn('group relative flex h-[34px] items-center gap-2.5 rounded-md px-2 text-[13.5px] font-medium transition-colors',
                        on ? 'bg-surface-muted text-foreground' : 'text-foreground-muted hover:bg-surface-muted/60 hover:text-foreground')}>
                      {on && <span className="absolute -left-3 top-[7px] h-5 w-[3px] rounded-r-full bg-foreground" aria-hidden />}
                      <n.icon className={cn('size-4 transition-colors', on ? 'text-foreground' : 'text-foreground-subtle group-hover:text-foreground-muted')} strokeWidth={on ? 2 : 1.75} />
                      {n.label}
                    </button>
                  );
                })}
              </div>
            ))}
            
            <div className="flex flex-col gap-1">
              <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-subtle">AI</div>
              <button onClick={() => setCmd(true)} className="group relative flex h-[34px] items-center gap-2.5 rounded-md px-2 text-[13.5px] font-medium text-foreground-muted transition-colors hover:bg-surface-muted/60 hover:text-foreground">
                <AIMark />Ask Fyza<Kbd className="ml-auto bg-transparent border-transparent text-foreground-subtle group-hover:text-foreground-muted shadow-none">⌘K</Kbd>
              </button>
            </div>
          </nav>

          <div className="mt-auto flex flex-col pt-4">
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button onClick={() => setSettings(true)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-surface-muted text-left">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-muted text-[11px] font-semibold text-foreground-muted ring-1 ring-border">{initials}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-foreground">{state.user.name || 'You'}</div>
                  <div className="truncate text-[11px] capitalize text-foreground-subtle">{state.profiles.join(' · ') || 'personal'}</div>
                </div>
              </button>

            </div>
          </div>
        </aside>
      )}

      {/* ---------- Main ---------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-transparent px-6 backdrop-blur-xl max-md:px-4 lg:border-transparent">
          {!sb && <Button variant="ghost" size="sm" icon aria-label="Expand sidebar" onClick={() => setSb(true)} className="max-lg:hidden"><PanelLeft /></Button>}
          <div className="lg:hidden"><Brand compact /></div>
          <button onClick={() => setCmd(true)} aria-label="Ask or tell Fyza anything (Command K)"
            className="group flex h-9 w-full max-w-[440px] items-center gap-2.5 rounded-lg border border-border bg-surface-elevated px-3 text-left text-[13px] text-foreground-muted shadow-card transition-all duration-200 hover:border-border-strong hover:text-foreground focus-visible:ring-4 focus-visible:ring-accent-soft">
            <Search className="size-4 shrink-0 transition-colors group-hover:text-foreground" strokeWidth={1.75} />
            <span className="flex-1 truncate">Ask or tell Fyza anything…</span>
            <Kbd className="max-md:hidden">⌘K</Kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {hasBiz && (
              <div className="flex rounded-lg border border-border bg-surface-muted p-0.5 lg:hidden">
                {(['personal', 'business'] as World[]).map((w) => (
                  <button key={w} aria-pressed={state.world === w} onClick={() => dispatch({ type: 'set', patch: { world: w } })} className={cn('h-7 rounded-md px-2 text-[11px] font-medium capitalize', state.world === w ? 'bg-surface text-foreground shadow-card' : 'text-foreground-subtle')}>{w === 'personal' ? 'Me' : 'Biz'}</button>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" icon aria-label="Settings" onClick={() => setSettings(true)} className="lg:hidden max-[400px]:hidden"><div className="grid size-6 place-items-center rounded-full bg-surface-muted text-[10px] font-bold text-foreground-muted ring-1 ring-border">{initials}</div></Button>
            <Button variant="primary" size="sm" onClick={() => openAdd()} className="max-lg:hidden"><Plus />Add</Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-16 pt-8 max-md:px-4 max-md:pt-6 max-lg:pb-[calc(96px+env(safe-area-inset-bottom))]" key={page + state.world}>
          {page === 'home' && <HomePage go={(p) => setPage(p as Page)} openAdd={openAdd} openPalette={() => setCmd(true)} openItem={openItem} />}
          {page === 'activity' && <ActivityPage openAdd={openAdd} />}
          {page === 'plans' && <PlansPage openAdd={openAdd} openItem={openItem} />}
          {page === 'trips' && <PlansPage openAdd={openAdd} openItem={openItem} initialTab="trips" />}
          {['accounts', 'cards', 'loans', 'subscriptions'].includes(page) && <ManagePage tab={page} openAdd={openAdd} openItem={openItem} />}
          {page === 'business' && <BusinessPage openAdd={openAdd} />}
        </main>

        {/* ---------- Bottom navigation (mobile/tablet) ---------- */}
        <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex h-16 max-w-[560px] items-stretch px-2">
            {MOBILE_NAV.slice(0, 2).map((n) => <TabItem key={n.id} n={n} on={page === n.id} onClick={() => setPage(n.id)} />)}
            <div className="flex flex-1 items-center justify-center">
              <button onClick={() => openAdd()} aria-label="Add" className="grid size-11 place-items-center rounded-full bg-inverse text-inverse-foreground shadow-pop transition-transform active:scale-95"><Plus className="size-5" /></button>
            </div>
            {MOBILE_NAV.slice(2).map((n) => <TabItem key={n.id} n={n} on={page === n.id} onClick={() => setPage(n.id)} />)}
            {MOBILE_NAV.length === 3 && <div className="flex-1" />}
          </div>
        </nav>
      </div>

      {cmd && <Palette onClose={() => setCmd(false)} onNavigate={(p) => { setPage(p as Page); setCmd(false); }} onAdd={(t) => { setCmd(false); openAdd(t); }} hasBiz={hasBiz} />}
      {add !== false && <AddFlow initial={typeof add === 'string' ? add : null} onClose={() => setAdd(false)} onDone={setToast} />}
      {item && <ItemView type={item.type} id={item.id} onClose={() => setItem(null)} />}
      {settings && <Settings onClose={() => setSettings(false)} />}
      {toast && <Toast msg={toast} onDone={clearToast} />}
    </div>
  );
}

function TabItem({ n, on, onClick }: { n: { label: string; icon: React.ElementType }; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-current={on ? 'page' : undefined} className={cn('flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors', on ? 'text-foreground' : 'text-foreground-subtle')}>
      <n.icon className="size-5" strokeWidth={on ? 2 : 1.6} />{n.label}
    </button>
  );
}
