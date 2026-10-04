import { useState, useEffect } from 'react';
import { Home, LineChart, Target, Compass, Sparkles, Building2, PanelLeftClose, PanelLeft, Moon, Sun } from 'lucide-react';
import { useStore } from './engine/store';
import Onboarding from './components/Onboarding';
import HomePage from './pages/Home';
import ActivityPage from './pages/Activity';
import PlansPage from './pages/Plans';
import BusinessPage from './pages/Business';
import { Palette } from './components/AI';
import { AddFlow } from './components/AddFlow';
import { ItemView } from './components/ItemView';
import { Toast } from './components/ui';

export default function App() {
  const { state, dispatch } = useStore();
  const [page, setPage] = useState('home');
  const [cmd, setCmd] = useState(false);
  const [add, setAdd] = useState(false);
  const [item, setItem] = useState(null); // { type, id }
  const [toast, setToast] = useState('');
  const [sb, setSb] = useState(true);

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCmd((c) => !c); }
      if (e.key === 'i' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setAdd('income'); }
      if (e.key === 'e' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setAdd('expense'); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);

  if (!state.onboarded) return <Onboarding />;

  const hasBiz = state.profiles.includes('business') || state.profiles.includes('freelancer');

  const NAV = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'activity', label: 'Activity', icon: LineChart },
    { id: 'plans', label: 'Plans', icon: Compass },
    ...(hasBiz ? [{ id: 'business', label: 'Business', icon: Building2 }] : []),
  ];

  return (
    <div className="app">
      {sb && (
        <div className="sidebar hide-m">
          <div className="brand"><div className="brand-mark">F</div>Fyza</div>
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
              <n.icon />{n.label}
            </button>
          ))}
          <button className="nav-item" style={{ marginTop: 'auto', background: 'var(--accent-soft)', color: 'var(--accent)' }} onClick={() => setCmd(true)}>
            <Sparkles />Ask Fyza<span className="kbd">⌘K</span>
          </button>
          <div className="sidebar-foot" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div className="row between" style={{ padding: '0 12px' }}>
              <div className="faint" style={{ fontSize: 12 }}>{state.user.name}</div>
              <button className="btn ghost icon sm" onClick={() => dispatch({ type: 'set', patch: { theme: state.theme === 'light' ? 'dark' : 'light' } })}>
                {state.theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
            </div>
            {hasBiz && (
              <select className="select" style={{ height: 32, fontSize: 13, padding: '0 8px', background: 'var(--surface)', borderColor: 'transparent' }} 
                value={state.world} onChange={(e) => dispatch({ type: 'set', patch: { world: e.target.value } })}>
                <option value="personal">Personal World</option>
                <option value="business">Business World</option>
              </select>
            )}
          </div>
        </div>
      )}

      <div className="main">
        <div className="topbar">
          <button className="btn ghost icon sm hide-m" onClick={() => setSb(!sb)}>{sb ? <PanelLeftClose /> : <PanelLeft />}</button>
          <button className="command" onClick={() => setCmd(true)}>
            <Sparkles size={14} /><span>Ask or tell Fyza anything...</span><span className="kbd hide-m">⌘K</span>
          </button>
        </div>

        {page === 'home' && <HomePage go={setPage} openAdd={setAdd} openPalette={() => setCmd(true)} openItem={(t, id) => setItem({ type: t, id })} />}
        {page === 'activity' && <ActivityPage />}
        {page === 'plans' && <PlansPage openAdd={setAdd} openItem={(t, id) => setItem({ type: t, id })} />}
        {page === 'business' && <BusinessPage />}

        <div className="tabbar">
          {NAV.map((n) => (
            <button key={n.id} className={page === n.id ? 'active' : ''} onClick={() => setPage(n.id)}>
              <n.icon />{n.label}
            </button>
          ))}
        </div>
      </div>

      {cmd && <Palette onClose={() => setCmd(false)} onOpenAI={() => { setCmd(false); setPage('home'); }} />}
      {add !== false && <AddFlow initial={typeof add === 'string' ? add : null} onClose={() => setAdd(false)} onDone={setToast} />}
      {item && <ItemView type={item.type} id={item.id} onClose={() => setItem(null)} />}
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </div>
  );
}
