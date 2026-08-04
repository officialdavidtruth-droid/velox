import React, { useState } from 'react';
import {
  X, Mail, Lock, User, Globe, Building, Users,
  Check, Eye, EyeOff, ArrowLeft, Loader2, ChevronRight, Shield
} from 'lucide-react';

interface AuthFlowProps {
  initialMode?: 'login' | 'plan' | 'details';
  onClose: () => void;
  onSuccess: (token: string, user: any, subscription: any, credits: any) => void;
}

// ── Password strength ──────────────────────────────────────────────────────
function checkPassword(p: string) {
  const checks = {
    length:  p.length >= 8 && p.length <= 16,
    upper:   /[A-Z]/.test(p),
    lower:   /[a-z]/.test(p),
    number:  /[0-9]/.test(p),
    special: /[!@#$%^&*()\-_=+[\]{};:'",.<>?/\\|`~]/.test(p),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return { checks, score, valid: score === 5 };
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

// ── Plan definitions ───────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'starter', label: 'Starter', price: '₦15,000/mo', color: 'var(--muted)',
    badge: 'Entry Plan',
    tagline: 'For individuals and freelancers managing their own social media and analytics.',
    features: [
      '1 Workspace',
      '150 AI caption credits/month',
      'Social analytics (2 platforms)',
      'Content calendar',
      'Lead finder (20 searches/month)',
      'Basic campaign tracking',
    ],
  },
  {
    key: 'pro', label: 'Pro', price: '₦45,000/mo', color: 'var(--primary)',
    badge: 'Most Popular',
    tagline: 'For growing agencies and solo marketers managing multiple clients.',
    features: [
      '3 Workspaces',
      '500 AI caption credits/month',
      'All social platforms analytics',
      'Campaign tracker + Ads API',
      'Website analytics (GA4)',
      'Lead pipeline + UTM builder',
      'Engagement inbox',
    ],
  },
  {
    key: 'agency', label: 'Agency', price: '₦155,000/mo', color: '#8b5cf6',
    badge: 'Best Value',
    tagline: 'For full-service agencies managing multiple clients and large ad budgets.',
    features: [
      '6 Workspaces',
      '2,000 AI caption credits/month',
      'Everything in Pro',
      'White-label client portal',
      'Priority support + chat',
      'Bulk lead finder',
      'Full audit logs',
      'Custom announcement banners',
    ],
  },
];

const COUNTRIES = ['Nigeria','Ghana','South Africa','Kenya','Egypt','UK','USA','Canada','Australia','India','Germany','France','UAE','Saudi Arabia','Other'];
const ROLES = ['Agency Owner','Digital Marketer','Social Media Manager','Content Creator','Freelancer','In-house Marketer','Brand Manager'];
const CLIENT_RANGES = ['1–5 clients','6–10 clients','11–20 clients','20+ clients'];
const SPEND_RANGES = ['Under $1,000/month','$1,000–$5,000/month','$5,000–$20,000/month','Over $20,000/month'];
const PLATFORMS = ['Instagram','Facebook','TikTok','LinkedIn','YouTube','Twitter/X','Google Ads'];
const SERVICES = ['Social Media Management','Paid Advertising','Content Creation','SEO','Email Marketing','Analytics & Reporting','Influencer Marketing'];

export default function AuthFlow({ initialMode = 'login', onClose, onSuccess }: AuthFlowProps) {
  const [step, setStep] = useState<'login' | 'plan' | 'details'>(initialMode);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);

  // login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);

  // register state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [country, setCountry] = useState('Nigeria');
  const [agencyName, setAgencyName] = useState('');
  const [role, setRole] = useState('');
  const [clientRange, setClientRange] = useState('');
  const [spendRange, setSpendRange] = useState('');
  const [selPlatforms, setSelPlatforms] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [selServices, setSelServices] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const pw = checkPassword(password);

  const toggleArr = (arr: string[], setArr: (v:string[])=>void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val]);
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const d = await r.json();
      if (d.token) onSuccess(d.token, d.user, d.subscription, d.credit);
      else setError(d.error || 'Login failed. Check your email and password.');
    } catch { setError('Network error. Please try again.'); }
    setSubmitting(false);
  };

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw.valid) { setError('Password does not meet requirements.'); return; }
    if (!selectedPlan) return;
    if (selectedPlan.key !== 'starter' && !agencyName.trim()) { setError('Please enter your agency/company name.'); return; }
    if (selectedPlan.key === 'pro' && !role) { setError('Please select your role.'); return; }
    if (selectedPlan.key === 'agency' && (!clientRange || !spendRange)) { setError('Please fill in all required fields.'); return; }

    setError(''); setSubmitting(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, password, country, phone,
          plan: selectedPlan.key,
          agencyName: agencyName || name,
          role: role || 'agency',
          clientRange, spendRange,
          platforms: selPlatforms,
          services: selServices,
        }),
      });
      const d = await r.json();
      if (d.token) onSuccess(d.token, d.user, d.subscription, d.credit);
      else setError(d.error || 'Registration failed. Please try again.');
    } catch { setError('Network error. Please try again.'); }
    setSubmitting(false);
  };

  const iStyle = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' };
  const iCls = 'w-full text-sm rounded-xl border outline-none transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', maxWidth: step === 'plan' ? 780 : 440, maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            {(step === 'details') && (
              <button onClick={() => { setStep('plan'); setError(''); }}
                className="p-1.5 rounded-lg mr-1" style={{ color: 'var(--muted)', background: 'var(--surface)' }}>
                <ArrowLeft size={14}/>
              </button>
            )}
            <img src="/logo.png" alt="V" width={28} height={28} style={{ borderRadius: 6 }}
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }}/>
            <span className="font-black text-sm" style={{ color: 'var(--text)' }}>Velox Space</span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}><X size={16}/></button>
        </div>

        {/* ── LOGIN ─────────────────────────────────────────────────────── */}
        {step === 'login' && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Welcome back</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Sign in to access your Velox Space dashboard</p>
            </div>
            {error && <p className="text-xs p-3 rounded-xl flex items-center gap-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><X size={11}/>{error}</p>}
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                <input type="email" required placeholder="Email address" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  className={`${iCls} pl-9 pr-3 py-3`} style={iStyle}/>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                <input type={showLoginPw ? 'text' : 'password'} required placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                  className={`${iCls} pl-9 pr-10 py-3`} style={iStyle}/>
                <button type="button" onClick={() => setShowLoginPw(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                  {showLoginPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 rounded-xl text-sm font-bold text-white gradient-primary disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin"/>}
                Sign In
              </button>
            </form>
            <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
              Don&apos;t have an account?{' '}
              <button onClick={() => { setStep('plan'); setError(''); }} className="font-bold" style={{ color: 'var(--primary)' }}>
                Create account
              </button>
            </p>
          </div>
        )}

        {/* ── PLAN SELECTION ────────────────────────────────────────────── */}
        {step === 'plan' && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--text)' }}>Choose your plan</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Select your plan. Prices in NGN — adjusted to your local currency at checkout.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLANS.map(plan => (
                <button key={plan.key} onClick={() => { setSelectedPlan(plan); setStep('details'); setError(''); }}
                  className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02] group"
                  style={{ background: 'var(--surface)', border: `2px solid ${plan.color}22` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: plan.color+'20', color: plan.color }}>
                      {plan.badge}
                    </span>
                    <ChevronRight size={14} style={{ color: plan.color }}/>
                  </div>
                  <p className="font-black text-base mb-0.5" style={{ color: 'var(--text)' }}>{plan.label}</p>
                  <p className="font-black text-lg mb-2" style={{ color: plan.color }}>{plan.price}</p>
                  <p className="text-[10px] mb-3 leading-relaxed" style={{ color: 'var(--muted)' }}>{plan.tagline}</p>
                  <ul className="space-y-1.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-1.5 text-[10px]" style={{ color: 'var(--text-soft)' }}>
                        <Check size={10} className="mt-0.5 shrink-0" style={{ color: plan.color }}/>
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
            <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
              Already have an account?{' '}
              <button onClick={() => { setStep('login'); setError(''); }} className="font-bold" style={{ color: 'var(--primary)' }}>Sign in</button>
            </p>
          </div>
        )}

        {/* ── REGISTER DETAILS ──────────────────────────────────────────── */}
        {step === 'details' && selectedPlan && (
          <div className="p-6 space-y-5">
            {/* Plan badge */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mb-3"
                style={{ background: selectedPlan.color+'15', border: `1px solid ${selectedPlan.color}30` }}>
                <Shield size={12} style={{ color: selectedPlan.color }}/>
                <span className="text-xs font-bold" style={{ color: selectedPlan.color }}>
                  {selectedPlan.label} Plan — {selectedPlan.price}
                </span>
              </div>
              <h2 className="text-lg font-black" style={{ color: 'var(--text)' }}>Create your account</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Fill in your details to get started with the {selectedPlan.label} plan.</p>
            </div>

            {error && <p className="text-xs p-3 rounded-xl flex items-start gap-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><X size={11} className="mt-0.5 shrink-0"/>{error}</p>}

            <form onSubmit={handleRegister} className="space-y-4">

              {/* ── Common fields ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Full Name *</label>
                  <div className="relative">
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                    <input type="text" required value={name} onChange={e=>setName(e.target.value)}
                      placeholder="John Doe" className={`${iCls} pl-8 pr-3 py-2.5`} style={iStyle}/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Email Address *</label>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                    <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
                      placeholder="you@company.com" className={`${iCls} pl-8 pr-3 py-2.5`} style={iStyle}/>
                  </div>
                </div>
              </div>

              {/* Password with strength indicator */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>
                  Password * <span className="normal-case font-normal">(8–16 chars, include uppercase, number, special char)</span>
                </label>
                <div className="relative">
                  <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                  <input type={showPw ? 'text' : 'password'} required value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="Create a strong password" maxLength={16}
                    className={`${iCls} pl-8 pr-10 py-2.5`} style={iStyle}/>
                  <button type="button" onClick={()=>setShowPw(p=>!p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:'var(--muted)' }}>
                    {showPw ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 space-y-1.5">
                    {/* Strength bar */}
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                          style={{ background: i <= pw.score ? STRENGTH_COLORS[pw.score] : 'var(--border)' }}/>
                      ))}
                    </div>
                    <p className="text-[10px] font-semibold" style={{ color: STRENGTH_COLORS[pw.score] || 'var(--muted)' }}>
                      {STRENGTH_LABELS[pw.score]}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {[
                        { k:'length',  label:'8–16 characters' },
                        { k:'upper',   label:'One uppercase letter' },
                        { k:'lower',   label:'One lowercase letter' },
                        { k:'number',  label:'One number' },
                        { k:'special', label:'One special character (!@#$…)' },
                      ].map(({ k, label }) => (
                        <p key={k} className="text-[9px] flex items-center gap-1"
                          style={{ color: (pw.checks as any)[k] ? 'var(--success)' : 'var(--muted)' }}>
                          {(pw.checks as any)[k] ? '✓' : '○'} {label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Country */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Country *</label>
                <div className="relative">
                  <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                  <select value={country} onChange={e=>setCountry(e.target.value)} className={`${iCls} pl-8 pr-3 py-2.5 cursor-pointer`} style={iStyle}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Phone Number <span className="font-normal normal-case">(optional)</span></label>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)}
                  placeholder="+234 xxx xxx xxxx"
                  className={`${iCls} px-3 py-2.5`} style={iStyle}/>
              </div>

              {/* ── Pro fields ── */}
              {(selectedPlan.key === 'pro' || selectedPlan.key === 'agency') && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>
                    {selectedPlan.key === 'agency' ? 'Agency Name *' : 'Company / Agency Name *'}
                  </label>
                  <div className="relative">
                    <Building size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                    <input type="text" required value={agencyName} onChange={e=>setAgencyName(e.target.value)}
                      placeholder="Your agency or company name" className={`${iCls} pl-8 pr-3 py-2.5`} style={iStyle}/>
                  </div>
                </div>
              )}

              {selectedPlan.key === 'pro' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Your Role *</label>
                    <select value={role} onChange={e=>setRole(e.target.value)} className={`${iCls} px-3 py-2.5 cursor-pointer`} style={iStyle}>
                      <option value="">Select your role…</option>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Platforms You Manage</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map(p => (
                        <button key={p} type="button" onClick={() => toggleArr(selPlatforms, setSelPlatforms, p)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                          style={selPlatforms.includes(p) ? { background: 'var(--primary)', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ── Agency fields ── */}
              {selectedPlan.key === 'agency' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>
                        <Users size={10} className="inline mr-1"/>Clients Managed *
                      </label>
                      <select value={clientRange} onChange={e=>setClientRange(e.target.value)} className={`${iCls} px-3 py-2.5 cursor-pointer`} style={iStyle}>
                        <option value="">Select range…</option>
                        {CLIENT_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Monthly Ad Spend Managed *</label>
                      <select value={spendRange} onChange={e=>setSpendRange(e.target.value)} className={`${iCls} px-3 py-2.5 cursor-pointer`} style={iStyle}>
                        <option value="">Select range…</option>
                        {SPEND_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Platforms You Manage</label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map(p => (
                        <button key={p} type="button" onClick={() => toggleArr(selPlatforms, setSelPlatforms, p)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                          style={selPlatforms.includes(p) ? { background: '#8b5cf6', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Services You Offer</label>
                    <div className="flex flex-wrap gap-2">
                      {SERVICES.map(s => (
                        <button key={s} type="button" onClick={() => toggleArr(selServices, setSelServices, s)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
                          style={selServices.includes(s) ? { background: '#8b5cf6', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>Your Role</label>
                    <select value={role} onChange={e=>setRole(e.target.value)} className={`${iCls} px-3 py-2.5 cursor-pointer`} style={iStyle}>
                      <option value="">Select your role…</option>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </>
              )}

              <button type="submit" disabled={submitting || !pw.valid}
                className="w-full py-3 rounded-xl text-sm font-bold text-white gradient-primary disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin"/>}
                {submitting ? 'Creating account…' : `Create ${selectedPlan.label} Account`}
              </button>

              <p className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>
                By creating an account you agree to our{' '}
                <a href="/terms" target="_blank" className="underline" style={{ color: 'var(--primary)' }}>Terms</a>
                {' '}and{' '}
                <a href="/privacy" target="_blank" className="underline" style={{ color: 'var(--primary)' }}>Privacy Policy</a>.
              </p>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
