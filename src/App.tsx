import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, Calendar, Sparkles, Zap, Gift, CreditCard, Coins,
  Building, Bell, LogOut, ChevronDown, Plus, Link, Moon, Sun,
  X, Menu, Wifi, WifiOff, Shield, ArrowRight, Check, Play,
  BarChart3, Users, Globe, Star, ChevronRight, Instagram,
  Loader2, Mail, User
} from 'lucide-react';
import AnalyticsView from './components/AnalyticsView';
import CalendarView from './components/CalendarView';
import CaptionGenerator from './components/CaptionGenerator';
import LeadFinder from './components/LeadFinder';
import ReferralCenter from './components/ReferralCenter';
import BillingManager from './components/BillingManager';
import ClientPortalView from './components/ClientPortalView';
import PropertyManager from './components/PropertyManager';
import AccountConnector from './components/AccountConnector';
import RoasAnalytics from './components/RoasAnalytics';

// ── API helper with error handling ─────────────────────────────────────────
export const api = {
  _headers: () => {
    const token = localStorage.getItem('velox_token');
    return { 'Content-Type': 'application/json', ...(token ? { 'x-session-token': token } : {}) };
  },
  get: async (url: string) => {
    const r = await fetch(url, { headers: api._headers() });
    return r.json();
  },
  post: async (url: string, body?: any) => {
    try {
      const r = await fetch(url, { method: 'POST', headers: api._headers(), body: body ? JSON.stringify(body) : undefined });
      return r.json();
    } catch (e: any) {
      return { error: 'Network error — please check your connection.' };
    }
  },
  put: async (url: string, body?: any) => {
    const r = await fetch(url, { method: 'PUT', headers: api._headers(), body: body ? JSON.stringify(body) : undefined });
    return r.json();
  },
  del: async (url: string) => {
    const r = await fetch(url, { method: 'DELETE', headers: api._headers() });
    return r.json();
  },
};

// ── Animated counter ────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let start = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        start += step;
        if (start >= target) { setVal(target); clearInterval(timer); }
        else setVal(Math.floor(start));
      }, 16);
      obs.disconnect();
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

export default function App() {
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMsg, setAuthMsg] = useState({ text: '', type: '' });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as any) || 'dark');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [currentView, setCurrentView] = useState('analytics');
  const [posts, setPosts] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsHistory, setAnalyticsHistory] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenu, setIsMobileMenu] = useState(false);
  const [isNewWsModal, setIsNewWsModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#portal/')) setPortalToken(hash.replace('#portal/', ''));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  const loadDashboard = async () => {
    try {
      const me = await api.get('/api/auth/me');
      if (me?.user) {
        setUser(me.user); setSubscription(me.subscription); setCredits(me.credit);
        const wsList = await api.get('/api/workspaces');
        setWorkspaces(Array.isArray(wsList) ? wsList : []);
        if (Array.isArray(wsList) && wsList.length > 0) setActiveWorkspace(wsList[0]);
        const nots = await api.get('/api/notifications');
        const notList = Array.isArray(nots) ? nots : [];
        setNotifications(notList);
        setUnreadCount(notList.filter((n: any) => !n.is_read).length);
      }
    } catch {}
    setAuthLoading(false);
  };

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    if (!activeWorkspace || !user) return;
    api.get(`/api/posts?workspaceId=${activeWorkspace.id}`).then(d => setPosts(Array.isArray(d) ? d : []));
    api.get(`/api/analytics?workspaceId=${activeWorkspace.id}`).then(d => setAnalyticsData(Array.isArray(d) ? d : []));
    api.get(`/api/analytics/history?workspaceId=${activeWorkspace.id}`).then(d => setAnalyticsHistory(Array.isArray(d) ? d : []));
  }, [activeWorkspace, user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg({ text: '', type: '' });
    setAuthSubmitting(true);
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login' ? { email: authEmail } : { email: authEmail, name: authName };
    const data = await api.post(endpoint, payload);
    setAuthSubmitting(false);
    if (data?.token) {
      localStorage.setItem('velox_token', data.token);
      setUser(data.user); setAuthModal(false);
      setAuthEmail(''); setAuthName('');
      setAuthLoading(true);
      await loadDashboard();
    } else {
      setAuthMsg({ text: data?.error || 'Something went wrong. Please try again.', type: 'error' });
    }
  };

  const handleDemo = async () => {
    setAuthSubmitting(true);
    const data = await api.post('/api/auth/demo');
    setAuthSubmitting(false);
    if (data?.token) {
      localStorage.setItem('velox_token', data.token);
      setUser(data.user); setSubscription(data.subscription); setCredits(data.credit);
      setAuthModal(false);
      setAuthLoading(true);
      await loadDashboard();
    } else {
      setAuthMsg({ text: 'Demo failed — please try again.', type: 'error' });
    }
  };

  const handleLogout = async () => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('velox_token');
    setUser(null); setActiveWorkspace(null); setCurrentView('analytics');
    setWorkspaces([]); setAnalyticsData([]); setPosts([]);
  };

  const handleMarkRead = async () => {
    const data = await api.post('/api/notifications/read');
    setNotifications(data.notifications || []); setUnreadCount(0);
  };

  const handleCreateWs = async (e: React.FormEvent) => {
    e.preventDefault();
    const ws = await api.post('/api/workspaces', { name: newWsName });
    setNewWsName(''); setIsNewWsModal(false);
    const wsList = await api.get('/api/workspaces');
    setWorkspaces(Array.isArray(wsList) ? wsList : []);
    if (ws?.id) setActiveWorkspace(ws);
  };

  const nav = (view: string, label: string, icon: React.ReactNode) => (
    <button onClick={() => { setCurrentView(view); setIsMobileMenu(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
        currentView === view ? 'text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
      }`}
      style={currentView === view ? { background: 'var(--primary-soft)' } : {}}>
      {icon} {label}
    </button>
  );

  if (portalToken) return <ClientPortalView shareToken={portalToken} />;

  if (authLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white mb-4 gradient-primary">V</div>
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
      <p className="text-xs mt-3 font-medium" style={{ color: 'var(--muted)' }}>Loading VeloxSpace…</p>
    </div>
  );

  // ── LANDING PAGE ──────────────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Auth Modal */}
      {authModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black gradient-primary">V</div>
                  <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>VeloxSpace</span>
                </div>
                <button onClick={() => { setAuthModal(false); setAuthMsg({ text: '', type: '' }); }} style={{ color: 'var(--muted)' }}><X size={16}/></button>
              </div>
              <h3 className="font-bold text-base mt-3" style={{ color: 'var(--text)' }}>
                {authMode === 'login' ? 'Welcome back' : 'Create your account'}
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {authMode === 'login' ? 'Enter your email to access your dashboard' : 'Start your free account in seconds'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {authMsg.text && (
                <div className="text-xs rounded-xl px-4 py-3 flex items-start gap-2"
                  style={{ background: authMsg.type === 'error' ? 'var(--danger-bg)' : 'var(--success-bg)', color: authMsg.type === 'error' ? 'var(--danger)' : 'var(--success)' }}>
                  <span className="font-bold shrink-0">{authMsg.type === 'error' ? '✕' : '✓'}</span>
                  {authMsg.text}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-3">
                {authMode === 'register' && (
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                    <input type="text" required placeholder="Your full name" value={authName} onChange={e => setAuthName(e.target.value)}
                      className="w-full text-sm rounded-xl pl-9 pr-3 py-3 border outline-none"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                  </div>
                )}
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                  <input type="email" required placeholder="Email address" value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.currentTarget.form as HTMLFormElement)?.requestSubmit()}
                    className="w-full text-sm rounded-xl pl-9 pr-3 py-3 border outline-none"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                </div>
                <button type="submit" disabled={authSubmitting}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white gradient-primary flex items-center justify-center gap-2 disabled:opacity-60">
                  {authSubmitting ? <Loader2 size={14} className="animate-spin"/> : null}
                  {authMode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }}/>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }}/>
              </div>

              <button onClick={handleDemo} disabled={authSubmitting}
                className="w-full py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-60"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--surface)' }}>
                {authSubmitting ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} style={{ color: 'var(--primary)' }}/>}
                Try instant demo — no signup needed
              </button>

              <p className="text-center text-xs" style={{ color: 'var(--muted)' }}>
                {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                <button onClick={() => { setAuthMode(m => m === 'login' ? 'register' : 'login'); setAuthMsg({ text: '', type: '' }); }}
                  className="font-semibold" style={{ color: 'var(--primary)' }}>
                  {authMode === 'login' ? 'Sign up free' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b" style={{ background: 'rgba(10,11,16,0.85)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm gradient-primary">V</div>
            <span className="font-black text-sm tracking-tight" style={{ color: 'var(--text)' }}>VeloxSpace</span>
            <span className="hidden sm:inline text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>Beta</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#platforms" className="hover:text-white transition-colors">Platforms</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl" style={{ color: 'var(--muted)' }}>
              {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}
            </button>
            <button onClick={() => { setAuthMode('login'); setAuthModal(true); }}
              className="text-xs font-semibold px-4 py-2 rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Sign in
            </button>
            <button onClick={() => { setAuthMode('register'); setAuthModal(true); }}
              className="text-xs font-semibold px-4 py-2 rounded-xl text-white gradient-primary shadow-lg">
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}/>
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }}/>
          <div className="absolute top-40 right-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }}/>
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px' }}/>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold mb-8"
            style={{ background: 'var(--primary-soft)', borderColor: 'rgba(99,102,241,0.3)', color: 'var(--primary)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
            ⚡ Now with AI-powered lead generation & business management
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            <span style={{ color: 'var(--text)' }}>The analytics</span>
            <br/>
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)' }}>
              command center
            </span>
            <br/>
            <span style={{ color: 'var(--text)' }}>for agencies.</span>
          </h1>

          <p className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--muted)' }}>
            Unify your social analytics, ad campaigns, content calendar, AI lead finder, and client management into one workspace. Built for digital marketing agencies that move fast.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button onClick={handleDemo}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-bold text-sm gradient-primary shadow-xl">
              <Sparkles size={16}/> Try free demo — instant access
            </button>
            <button onClick={() => { setAuthMode('register'); setAuthModal(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm border"
              style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--card)' }}>
              Create free account <ArrowRight size={14}/>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: 18540, suffix: '+', label: 'Posts Scheduled' },
              { value: 2400, suffix: '+', label: 'Agencies Active' },
              { value: 99, suffix: '.9%', label: 'Uptime SLA' },
              { value: 420, suffix: 'K+', label: 'Leads Generated' },
            ].map(({ value, suffix, label }) => (
              <div key={label} className="rounded-2xl p-5 border text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="text-2xl font-black mb-1" style={{ color: 'var(--primary)' }}>
                  <Counter target={value} suffix={suffix}/>
                </div>
                <div className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORM LOGOS ──────────────────────────────────────────────── */}
      <section id="platforms" className="border-y py-10 overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-center text-[10px] font-black uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>Connected platforms</p>
        <div className="flex items-center justify-center gap-6 sm:gap-12 flex-wrap px-6">
          {[
            { name: 'Instagram', color: '#e1306c', emoji: '📸' },
            { name: 'Facebook', color: '#1877f2', emoji: '👥' },
            { name: 'TikTok', color: '#000', emoji: '🎵' },
            { name: 'LinkedIn', color: '#0a66c2', emoji: '💼' },
            { name: 'YouTube', color: '#ff0000', emoji: '▶️' },
            { name: 'X / Twitter', color: '#000', emoji: '🐦' },
            { name: 'Meta Ads', color: '#0866ff', emoji: '📊' },
            { name: 'Google Ads', color: '#4285f4', emoji: '🔍' },
          ].map(p => (
            <div key={p.name} className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--muted)' }}>
              <span className="text-xl">{p.emoji}</span>
              <span className="hidden sm:inline">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Everything in one place</p>
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--text)' }}>Built for serious marketing teams</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <TrendingUp size={20}/>, color: '#6366f1', title: 'Live Analytics Radar', desc: 'Real-time follower counts, reach, impressions, engagement rate, and growth trends across all connected platforms in one unified dashboard.' },
            { icon: <Coins size={20}/>, color: '#f59e0b', title: 'Ads & ROAS Analytics', desc: 'Track spend, CPC, CTR, conversions and Return on Ad Spend across Meta Ads, Google Ads, and TikTok Ads simultaneously.' },
            { icon: <Calendar size={20}/>, color: '#10b981', title: 'Content Calendar', desc: 'Plan and schedule posts with a visual monthly grid. Country-specific holidays for Nigeria, Ghana, Kenya, South Africa and more pre-loaded.' },
            { icon: <Sparkles size={20}/>, color: '#8b5cf6', title: 'AI Caption Generator', desc: 'Generate high-converting social captions in seconds using Google Gemini AI. Select tone, platform, and call-to-action.' },
            { icon: <Zap size={20}/>, color: '#06b6d4', title: 'AI Lead Finder', desc: 'Find businesses that need your marketing services. Search by type and location, get AI-scored leads with personalized cold pitches.' },
            { icon: <Building size={20}/>, color: '#f97316', title: 'Business Management', desc: 'Full CRM for agency clients — manage projects, track invoices, monitor budgets, and get contract renewal alerts.' },
            { icon: <Users size={20}/>, color: '#ec4899', title: 'Multi-Workspace', desc: 'Manage multiple brands or clients from a single login. Switch between workspaces in one click. Perfect for agencies.' },
            { icon: <Globe size={20}/>, color: '#14b8a6', title: 'Client Portal', desc: 'Generate a shareable read-only link for each client workspace. They see live analytics without needing an account.' },
            { icon: <Gift size={20}/>, color: '#f43f5e', title: 'Referral Program', desc: 'Share your referral link. When someone upgrades to Pro, you both get 14 days free. Built-in growth engine for the platform.' },
          ].map(({ icon, color, title, desc }) => (
            <div key={title} className="rounded-2xl p-6 border group hover:border-[var(--primary)] transition-all"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15`, color }}>
                {icon}
              </div>
              <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--text)' }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <section className="border-y py-16" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-yellow-400" style={{ color: '#facc15' }}/>)}
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Loved by marketing agencies worldwide</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: "VeloxSpace cut our reporting time by 80%. We used to spend 3 hours on weekly client reports. Now it's 20 minutes.", name: 'Amara Osei', role: 'Founder, Digital Edge Agency', location: 'Lagos, Nigeria' },
              { quote: "The AI lead finder alone pays for the subscription. We found 12 new clients in the first month just from the lead generator.", name: 'Kwame Mensah', role: 'Director, KM Digital', location: 'Accra, Ghana' },
              { quote: "Finally a tool built for agencies, not individual creators. The multi-workspace feature is exactly what we needed.", name: 'Tunde Adeyemi', role: 'MD, AdVantage Marketing', location: 'Abuja, Nigeria' },
            ].map(({ quote, name, role, location }) => (
              <div key={name} className="rounded-2xl p-6 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="fill-yellow-400" style={{ color: '#facc15' }}/>)}
                </div>
                <p className="text-xs leading-relaxed mb-5 italic" style={{ color: 'var(--text-soft)' }}>"{quote}"</p>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{name}</p>
                  <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{role}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--primary)' }}>{location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Simple pricing</p>
          <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--text)' }}>Start free. Scale as you grow.</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No credit card required · Cancel anytime</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Starter', price: '$0', period: '/month', color: 'var(--muted)', features: ['1 Workspace', 'Analytics dashboard', 'Content calendar', 'AI captions (10/mo)', 'Lead finder (10 searches)'], cta: 'Start free', highlight: false },
            { name: 'Pro', price: '$29', period: '/month', color: '#6366f1', features: ['5 Workspaces', 'Everything in Starter', 'Ads analytics (Meta/Google/TikTok)', 'AI captions (unlimited)', 'Lead finder (50 searches/mo)', 'Client portal', 'Priority support'], cta: 'Start Pro trial', highlight: true },
            { name: 'Agency', price: '$79', period: '/month', color: '#8b5cf6', features: ['Unlimited workspaces', 'Everything in Pro', 'Business management (CRM)', 'AI Lead Finder (200 searches/mo)', 'Invoice management', 'Team members', 'White-label reports'], cta: 'Start Agency trial', highlight: false },
          ].map(({ name, price, period, color, features, cta, highlight }) => (
            <div key={name} className={`rounded-2xl p-6 border relative ${highlight ? 'ring-2 ring-[var(--primary)]' : ''}`}
              style={{ background: 'var(--card)', borderColor: highlight ? 'var(--primary)' : 'var(--border)' }}>
              {highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full text-white" style={{ background: 'var(--primary)' }}>Most popular</div>}
              <h3 className="font-black text-base mb-1" style={{ color: 'var(--text)' }}>{name}</h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-3xl font-black" style={{ color }}>{price}</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{period}</span>
              </div>
              <ul className="space-y-2.5 mb-6">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                    <Check size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--success)' }}/> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => { setAuthMode('register'); setAuthModal(true); }}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${highlight ? 'text-white gradient-primary' : 'border'}`}
                style={!highlight ? { borderColor: 'var(--border)', color: 'var(--text)' } : {}}>
                {cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}/>
        </div>
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: 'var(--text)' }}>
            Ready to grow your agency?
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
            Join thousands of marketing agencies using VeloxSpace to manage analytics, create content, and find clients.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={handleDemo} className="w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold gradient-primary shadow-xl flex items-center justify-center gap-2">
              <Sparkles size={16}/> Try free demo
            </button>
            <button onClick={() => { setAuthMode('register'); setAuthModal(true); }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold border flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Create free account <ArrowRight size={14}/>
            </button>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>No credit card · Free forever plan · Setup in 2 minutes</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black gradient-primary">V</div>
            <span className="font-bold text-xs" style={{ color: 'var(--text)' }}>VeloxSpace</span>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>© 2026 VeloxSpace · Built for African marketing agencies</p>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--muted)' }}>
            <Shield size={11} style={{ color: 'var(--success)' }}/> SOC2 Secure · GDPR Ready
          </div>
        </div>
      </footer>
    </div>
  );

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header className="sticky top-0 z-40 border-b h-14 flex items-center justify-between px-4 sm:px-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenu(!isMobileMenu)} className="p-1.5 rounded-xl md:hidden" style={{ color: 'var(--muted)' }}>
            {isMobileMenu ? <X size={18}/> : <Menu size={18}/>}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black gradient-primary">V</div>
            <span className="font-bold text-sm hidden sm:block" style={{ color: 'var(--text)' }}>VeloxSpace</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeWorkspace && (
            <div className="relative group">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer text-xs font-semibold border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                <span className="hidden sm:inline" style={{ color: 'var(--muted)' }}>Workspace:</span>
                <span className="max-w-[90px] truncate">{activeWorkspace.name}</span>
                <ChevronDown size={11} style={{ color: 'var(--muted)' }}/>
              </div>
              <div className="hidden group-hover:block absolute right-0 top-10 rounded-xl shadow-xl z-50 py-1 w-48 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                {workspaces.map(ws => (
                  <button key={ws.id} onClick={() => setActiveWorkspace(ws)} className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface)] transition-all" style={{ color: activeWorkspace.id === ws.id ? 'var(--primary)' : 'var(--text)' }}>
                    {ws.name}
                  </button>
                ))}
                <div className="border-t my-1" style={{ borderColor: 'var(--border)' }}/>
                <button onClick={() => setIsNewWsModal(true)} className="w-full text-left px-3 py-2 text-xs flex items-center gap-1.5 font-semibold" style={{ color: 'var(--primary)' }}>
                  <Plus size={11}/> New workspace
                </button>
              </div>
            </div>
          )}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold`}
            style={{ background: isOnline ? 'var(--success-bg)' : 'var(--warning-bg)', color: isOnline ? 'var(--success)' : 'var(--warning)' }}>
            {isOnline ? <Wifi size={11}/> : <WifiOff size={11}/>}
          </div>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            {theme === 'dark' ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          <div className="relative">
            <button onClick={() => { setIsNotifOpen(!isNotifOpen); if (!isNotifOpen) handleMarkRead(); }} className="p-2 rounded-xl border relative" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <Bell size={14}/>
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ background: 'var(--danger)' }}>{unreadCount}</span>}
            </button>
            {isNotifOpen && (
              <div className="absolute right-0 top-11 rounded-2xl shadow-2xl z-50 w-64 border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="px-4 py-3 border-b text-xs font-semibold" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Notifications</div>
                <div className="max-h-60 overflow-y-auto">
                  {!notifications.length ? <p className="text-xs text-center py-6" style={{ color: 'var(--muted)' }}>No notifications</p>
                    : notifications.map(n => (
                      <div key={n.id} className="px-4 py-3 border-b text-xs" style={{ borderColor: 'var(--border)', background: n.is_read ? 'transparent' : 'var(--primary-soft)' }}>
                        <p className="font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{n.title}</p>
                        <p style={{ color: 'var(--muted)' }}>{n.message}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative group cursor-pointer hidden sm:block">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold gradient-primary">{user.name?.charAt(0) || 'U'}</div>
            <div className="hidden group-hover:block absolute right-0 top-9 pt-2 z-50">
              <div className="rounded-xl shadow-lg py-1 w-36 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="px-3 py-1.5 text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{user.name}</div>
                <div className="border-t my-1" style={{ borderColor: 'var(--border)' }}/>
                <button onClick={handleLogout} className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-1.5 font-semibold" style={{ color: 'var(--danger)' }}>
                  <LogOut size={11}/> Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className={`${isMobileMenu ? 'fixed inset-0 top-14 z-40' : 'hidden'} md:flex flex-col w-52 border-r p-3 gap-1 shrink-0`}
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-[9px] font-black uppercase tracking-widest px-3 pt-2 pb-1" style={{ color: 'var(--muted)' }}>Analytics</p>
          {nav('analytics', 'Live Analytics', <TrendingUp size={13}/>)}
          {nav('roas-analytics', 'Ads & ROAS', <Coins size={13}/>)}
          {nav('accounts-connector', 'Connect Accounts', <Link size={13}/>)}
          <p className="text-[9px] font-black uppercase tracking-widest px-3 pt-3 pb-1" style={{ color: 'var(--muted)' }}>Content</p>
          {nav('calendar', 'Calendar', <Calendar size={13}/>)}
          {nav('copywriter', 'AI Captions', <Sparkles size={13}/>)}
          <p className="text-[9px] font-black uppercase tracking-widest px-3 pt-3 pb-1" style={{ color: 'var(--muted)' }}>Growth</p>
          {nav('leads', 'Lead Finder', <Zap size={13}/>)}
          {nav('pms', 'Business Mgmt', <Building size={13}/>)}
          <p className="text-[9px] font-black uppercase tracking-widest px-3 pt-3 pb-1" style={{ color: 'var(--muted)' }}>Account</p>
          {nav('referrals', 'Referrals', <Gift size={13}/>)}
          {nav('billing', 'Billing', <CreditCard size={13}/>)}
          <div className="mt-auto pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="px-3 flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
              <Shield size={10} style={{ color: 'var(--primary)' }}/> Secured workspace
            </div>
          </div>
        </aside>

        {activeWorkspace && (
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
            {currentView === 'analytics' && <AnalyticsView workspaceId={activeWorkspace.id} analytics={analyticsData} history={analyticsHistory} onRefresh={loadDashboard}/>}
            {currentView === 'roas-analytics' && <RoasAnalytics />}
            {currentView === 'calendar' && <CalendarView workspaceId={activeWorkspace.id} posts={posts} onRefresh={loadDashboard} isOffline={!isOnline}/>}
            {currentView === 'accounts-connector' && <AccountConnector workspaceId={activeWorkspace.id}/>}
            {currentView === 'copywriter' && <CaptionGenerator workspaceId={activeWorkspace.id} onPostScheduled={loadDashboard}/>}
            {currentView === 'leads' && <LeadFinder workspaceId={activeWorkspace.id}/>}
            {currentView === 'pms' && <PropertyManager workspaceId={activeWorkspace.id} isOffline={!isOnline} onAddPostToCalendar={(post: any) => {
              api.post('/api/posts', { workspace_id: activeWorkspace.id, title: post.title, description: post.description, platforms: post.platforms, cta: 'None', publish_date: new Date(Date.now() + post.delayHours*3600000).toISOString() }).then(() => { loadDashboard(); setCurrentView('calendar'); });
            }}/>}
            {currentView === 'referrals' && <ReferralCenter onRefreshSubscription={loadDashboard}/>}
            {currentView === 'billing' && subscription && <BillingManager subscription={subscription} onRefresh={loadDashboard}/>}
          </main>
        )}
      </div>

      {isNewWsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-xs rounded-2xl p-5 border shadow-2xl" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--text)' }}>Create Workspace</h3>
            <form onSubmit={handleCreateWs} className="space-y-3">
              <input type="text" required placeholder="Workspace / client name" value={newWsName} onChange={e => setNewWsName(e.target.value)}
                className="w-full text-sm rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsNewWsModal(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold border" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>Cancel</button>
                <button type="submit" className="flex-1 py-2 rounded-xl text-xs font-semibold text-white gradient-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
