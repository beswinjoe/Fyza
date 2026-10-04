import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useStore } from '../engine/store';

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

  const toggle = (id) => setSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const complete = () => {
    dispatch({ type: 'seed', opts: { name, profiles: sel.length ? sel : ['personal'] } });
  };

  return (
    <div className="onb">
      <div className="onb-left">
        <div className="brand" style={{ padding: '0 0 40px' }}><div className="brand-mark">F</div>Fyza</div>
        <div className="steps"><i className="on" /><i className={step > 0 ? 'on' : ''} /></div>
        
        {step === 0 ? (
          <div className="stagger" style={{ maxWidth: 440 }}>
            <h1 className="onb-title">How do you<br/>want to use Fyza?</h1>
            <p className="muted" style={{ margin: '16px 0 24px', fontSize: 16 }}>Fyza adapts to your life. You can combine multiple modes—like Personal + Freelancer—and seamlessly switch between them.</p>
            <div className="profile-grid">
              {PROFILES.map((p) => (
                <button key={p.id} className={`profile ${sel.includes(p.id) ? 'on' : ''}`} onClick={() => toggle(p.id)}>
                  <div className="check"><Check /></div>
                  <div><b>{p.title}</b><small>{p.desc}</small></div>
                </button>
              ))}
            </div>
            <button className="btn primary" style={{ marginTop: 32, height: 48, fontSize: 15 }} disabled={sel.length === 0} onClick={() => setStep(1)}>Continue</button>
          </div>
        ) : (
          <div className="stagger" style={{ maxWidth: 440 }}>
            <h1 className="onb-title">What should we<br/>call you?</h1>
            <p className="muted" style={{ margin: '16px 0 32px', fontSize: 16 }}>We'll build a custom financial workspace tailored to your selections.</p>
            <input autoFocus className="input" style={{ height: 56, fontSize: 20 }} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name && complete()} />
            <div className="row" style={{ marginTop: 24, gap: 12 }}>
              <button className="btn" style={{ height: 48 }} onClick={() => setStep(0)}>Back</button>
              <button className="btn primary" style={{ height: 48, flex: 1, fontSize: 15 }} disabled={!name.trim()} onClick={complete}>Enter workspace <Sparkles size={16} /></button>
            </div>
          </div>
        )}
      </div>
      <div className="onb-right">
        <div className="float-card card" style={{ width: 340, padding: 24, top: '25%', right: '20%' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>AI Assistant</div>
          <p style={{ fontWeight: 500 }}>"If I buy a ₹1.5L laptop, how does it affect my runway?"</p>
          <div className="row" style={{ gap: 8, marginTop: 12, color: 'var(--pos)' }}><Sparkles size={16} /> <span style={{ fontSize: 13, fontWeight: 500 }}>Fyza calculates the impact instantly.</span></div>
        </div>
        <div className="float-card card" style={{ width: 300, padding: 20, bottom: '20%', left: '15%', animationDelay: '-3.5s' }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Forecast</div>
          <div className="num" style={{ fontSize: 28, fontWeight: 600 }}>₹4.2L <span className="faint" style={{ fontSize: 16 }}>in 6 mo</span></div>
          <div className="bar" style={{ marginTop: 12 }}><i style={{ width: '65%', background: 'var(--accent)' }} /></div>
        </div>
      </div>
    </div>
  );
}
