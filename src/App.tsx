import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, Calendar, Sparkles, Zap, Gift, CreditCard, Coins,
  Building, Bell, LogOut, ChevronDown, Plus, Link, Moon, Sun,
  X, Menu, Wifi, WifiOff, Shield, ArrowRight, Check, Play,
  BarChart3, Users, Globe, Star, ChevronRight, Home, Target,
  PieChart, Loader2, Mail, User, Lock
} from 'lucide-react';
import AnalyticsView from './components/AnalyticsView';
import VeloxLogo from './components/VeloxLogo';
import CalendarView from './components/CalendarView';
import CaptionGenerator from './components/CaptionGenerator';
import LeadFinder from './components/LeadFinder';
import ReferralCenter from './components/ReferralCenter';
import BillingManager from './components/BillingManager';
import ClientPortalView from './components/ClientPortalView';
import AccountConnector from './components/AccountConnector';
import RoasAnalytics from './components/RoasAnalytics';
import Dashboard from './components/Dashboard';
import CampaignTracker from './components/CampaignTracker';
import LeadPipeline from './components/LeadPipeline';
import CRM from './components/CRM';
import WebsiteAnalytics from './components/WebsiteAnalytics';
import AdsApiConnector from './components/AdsApiConnector';
import EngagementInbox from './components/EngagementInbox';
import AuthFlow from './components/AuthFlow';
import PostComposer from './components/PostComposer';

// ── API helper with timeout + error handling ────────────────────────────────
const TIMEOUT_MS = 12000;
function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

export const api = {
  _headers: () => {
    const token = localStorage.getItem('velox_token');
    return { 'Content-Type': 'application/json', ...(token ? { 'x-session-token': token } : {}) };
  },
  get: async (url: string) => {
    try {
      const r = await fetchWithTimeout(url, { headers: api._headers() });
      return r.json();
    } catch { return null; }
  },
  post: async (url: string, body?: any) => {
    try {
      const r = await fetchWithTimeout(url, { method: 'POST', headers: api._headers(), body: body ? JSON.stringify(body) : undefined });
      const text = await r.text();
      try { return JSON.parse(text); } catch { return { error: `Server error (${r.status}). Check Vercel env vars and run migration SQL in Supabase.` }; }
    } catch (e: any) {
      if (e.name === 'AbortError') return { error: 'Request timed out. The server may be starting up — please try again.' };
      return { error: 'Network error. Please check your connection.' };
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
  const [authMode, setAuthMode] = useState<'login' | 'plan'>('login');
  const [authEmail,    setAuthEmail]    = useState('');
  const [authName,     setAuthName]     = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMsg, setAuthMsg] = useState({ text: '', type: '' });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme_v2') as any) || 'light');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<any>(null);
  const [currentView, setCurrentView] = useState(() =>
    sessionStorage.getItem('velox_current_view') || 'dashboard'
  );
  // Save page on every navigation so reload restores it
  React.useEffect(() => {
    if (currentView) sessionStorage.setItem('velox_current_view', currentView);
  }, [currentView]);
  // navigateTo is just setCurrentView — useEffect below saves to sessionStorage
  const navigateTo = setCurrentView;
  const [posts, setPosts] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsHistory, setAnalyticsHistory] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenu, setIsMobileMenu] = useState(false);
  const [isNewWsModal, setIsNewWsModal] = useState(false);
  const [wsDropOpen,   setWsDropOpen]   = useState(false);
  const [profileDropOpen, setProfileDropOpen] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [livePricing, setLivePricing] = useState<any>({
    starter: { monthly: 15000, annual: 13500  },
    pro:     { monthly: 45000, annual: 40500  },
    agency:  { monthly: 155000,annual: 139500 },
  });
  const [pricingCycle, setPricingCycle] = useState<'monthly'|'annual'>('monthly');
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [newWsName, setNewWsName] = useState('');

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#portal/')) setPortalToken(hash.replace('#portal/', ''));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme_v2', theme);
  }, [theme]);

  useEffect(() => {
    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));
  }, []);

  const loadDashboard = async () => {
    try {
      const me = await api.get('/api/auth/me');
      if (me?.maintenance) {
        setMaintenance(true);
        setMaintenanceMsg(me.maintenanceMsg || 'Velox Space is under maintenance.');
        setAuthLoading(false);
        return;
      }
      setMaintenance(false);
      if (me?.announcement) setAnnouncement(me.announcement);
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

  const handleAuthSuccess = async (token: string, user: any, subscription: any, credits: any) => {
    localStorage.setItem('velox_token', token);
    setUser(user);
    if (subscription) setSubscription(subscription);
    if (credits) setCredits(credits);
    setAuthModal(false);
    setAuthLoading(true);
    await loadDashboard();
  };


  const handleLogout = async () => {
    await api.post('/api/auth/logout');
    localStorage.removeItem('velox_token');
    setUser(null); setActiveWorkspace(null); navigateTo('dashboard');
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
    <button onClick={() => { navigateTo(view); setIsMobileMenu(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all cursor-pointer text-left mt-0.5 ${
        currentView === view ? 'text-[var(--primary)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]'
      }`}
      style={currentView === view ? { background: 'var(--primary-soft)' } : {}}>
      {icon} {label}
    </button>
  );

  if (portalToken) return <ClientPortalView shareToken={portalToken} />;

  // ── Maintenance mode screen ──────────────────────────────────────────────
  if (maintenance) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex justify-center"><VeloxLogo size={64} showText={false} /></div>
        <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text)' }}>Under Maintenance</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{maintenanceMsg}</p>
        <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>We'll be back shortly. Thank you for your patience.</p>
      </div>
    </div>
  );

  if (authLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="mb-4"><VeloxLogo size={48} showText={false} /></div>
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
      <p className="text-xs mt-3 font-medium" style={{ color: 'var(--muted)' }}>Loading Velox Space…</p>
    </div>
  );

  // ── LANDING PAGE ──────────────────────────────────────────────────────────
  if (!user) return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Auth Modal */}
      {authModal && (
        <AuthFlow
          initialMode={authMode}
          onClose={() => setAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <VeloxLogo size={32} showText={false} />
            <span className="font-black text-sm tracking-tight" style={{ color: 'var(--text)' }}>Velox Space</span>
            <span className="hidden sm:inline text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>Beta</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-xs font-semibold" style={{ color: 'var(--muted)' }}>
            <a href="#features" className="hover:opacity-70 transition-opacity">Features</a>
            <a href="#testimonials" className="hover:opacity-70 transition-opacity">Testimonials</a>
            <a href="#pricing" className="hover:opacity-70 transition-opacity">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl" style={{ color: 'var(--muted)' }}>
              {theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}
            </button>
            <button onClick={() => { setAuthMode('login'); setAuthModal(true); }}
              className="text-xs font-semibold px-4 py-2 rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Sign in
            </button>
            <button onClick={() => { setAuthMode('plan'); setAuthModal(true); }}
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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button onClick={() => { setAuthMode('plan'); setAuthModal(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm border"
              style={{ borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--card)' }}>
              Sign up <ArrowRight size={14}/>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-16 text-xs font-medium" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1.5"><Check size={13} style={{ color: 'var(--success)' }}/> No credit card</span>
            <span className="flex items-center gap-1.5"><Check size={13} style={{ color: 'var(--success)' }}/> Free forever plan</span>
            <span className="flex items-center gap-1.5"><Check size={13} style={{ color: 'var(--success)' }}/> Setup in 2 minutes</span>
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

      {/* ── WHAT IS VELOX SPACE ─────────────────────────────────────────── */}
      <section id="about" className="max-w-5xl mx-auto px-6 py-16 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="rounded-3xl p-8 sm:p-10 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>What is Velox Space?</p>
          <h2 className="text-2xl sm:text-3xl font-black mb-4" style={{ color: 'var(--text)' }}>
            A single dashboard for your agency's social &amp; ad analytics
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-soft)' }}>
            Velox Space is a social media and digital marketing analytics platform built for agencies and marketing teams.
            It lets you connect your Meta, Google, and TikTok accounts to see follower growth, post engagement, ad spend, and
            ROAS in one place — instead of logging into five different dashboards every morning. On top of analytics, Velox
            Space includes a content scheduler, an AI caption generator, a lead-finding tool for prospecting new clients, and
            a client-facing reporting portal.
          </p>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Why we ask for account access</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            {[
              { platform: 'Meta (Facebook & Instagram)', reason: 'Read Page insights, posts, and ad account performance to display analytics in your dashboard. We never post or spend on your behalf without you initiating it in-app.' },
              { platform: 'Google (Analytics / GA4)', reason: 'Read your website traffic and conversion data (analytics.readonly) to power the Website Analytics view.' },
            ].map(({ platform, reason }) => (
              <div key={platform} className="rounded-2xl p-4 border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--text)' }}>{platform}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>{reason}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-4" style={{ color: 'var(--muted)' }}>
            We only request the minimum scopes each feature needs, we never store your platform passwords, and you can
            disconnect any account at any time from Settings. Read more in our{' '}
            <a href="/privacy" className="underline font-semibold" style={{ color: 'var(--primary)' }}>Privacy Policy</a>{' '}
            and{' '}
            <a href="/terms" className="underline font-semibold" style={{ color: 'var(--primary)' }}>Terms &amp; Conditions</a>.
          </p>
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
            { icon: <Sparkles size={20}/>, color: '#8b5cf6', title: 'AI Caption Generator', desc: 'Generate high-converting social captions in seconds using Groq AI. Select tone, platform, and call-to-action.' },
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
      <section id="testimonials" className="border-y py-16" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-yellow-400" style={{ color: '#facc15' }}/>)}
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Loved by marketing agencies worldwide</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: "Velox Space cut our reporting time by 80%. We used to spend 3 hours on weekly client reports. Now it's 20 minutes.", name: 'Amara Osei', role: 'Founder, Digital Edge Agency', location: 'Lagos, Nigeria' },
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
        <div className="text-center mb-10">
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--primary)' }}>Simple pricing</p>
          <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--text)' }}>Start today. Scale as you grow.</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Prices in ₦ NGN · Annual plans save 10%</p>
          {/* Billing toggle */}
          <div className="inline-flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}>
            {(['monthly','annual'] as const).map(c => (
              <button key={c} onClick={() => setPricingCycle(c)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer"
                style={pricingCycle === c
                  ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 4px 16px rgba(0,194,212,0.4)' }
                  : { color: 'var(--muted)' }}>
                {c}
                {c === 'annual' && <span className="ml-1.5 text-[9px] font-black" style={{ color: pricingCycle==='annual' ? 'rgba(255,255,255,0.8)' : 'var(--success)' }}>-10%</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              key: 'starter', name: 'Starter', color: 'var(--muted)',
              features: ['1 Workspace','Analytics dashboard','Content calendar','AI captions (150/mo)','Lead finder (10 searches)'],
              cta: 'Get Started', highlight: false,
            },
            {
              key: 'pro', name: 'Pro', color: 'var(--primary)',
              features: ['3 Workspaces','Everything in Starter','Ads analytics (Meta/Google/TikTok)','AI captions (500/mo)','Lead finder (33 searches/mo)','Website analytics','Engagement inbox'],
              cta: 'Start Pro', highlight: true,
            },
            {
              key: 'agency', name: 'Agency', color: '#8b5cf6',
              features: ['6 Workspaces','Everything in Pro','AI captions (2,000/mo)','Lead finder (133 searches/mo)','White-label portal','Priority support','Full audit logs'],
              cta: 'Start Agency', highlight: false,
            },
          ].map(({ key, name, color, features, cta, highlight }) => {
            const p = livePricing[key];
            const price = p ? (pricingCycle === 'annual' ? p.annual : p.monthly) : 0;
            return (
              <div key={name} className="glow-card p-6 relative flex flex-col"
                style={highlight ? { borderColor: 'rgba(93,135,255,0.45)', boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(93,135,255,0.30)' } : {}}>
                {highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg, #5D87FF, #4570EA)', boxShadow: '0 4px 16px rgba(93,135,255,0.5)' }}>
                    Most Popular
                  </div>
                )}
                <h3 className="font-black text-base mb-1" style={{ color: 'var(--text)' }}>{name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black" style={{ color }}>
                    ₦{price.toLocaleString()}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>/month</span>
                </div>
                {pricingCycle === 'annual' && p && (
                  <p className="text-[10px] mb-4" style={{ color: 'var(--success)' }}>
                    Save ₦{((p.monthly - p.annual) * 12).toLocaleString()}/year
                  </p>
                )}
                <ul className="space-y-2.5 mb-6 flex-1 mt-4">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-soft)' }}>
                      <Check size={11} className="shrink-0 mt-0.5" style={{ color: color }}/> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => { setAuthMode('plan'); setAuthModal(true); }}
                  className={`w-full py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${highlight ? 'gradient-primary text-white' : ''}`}
                  style={!highlight ? {
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  } : {}}>
                  {cta}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-center text-[10px] mt-6" style={{ color: 'var(--muted)' }}>
          Prices update automatically when changed in the Admin Panel · Annual billing saves 10%
        </p>
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
            Join thousands of marketing agencies using Velox Space to manage analytics, create content, and find clients.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => { setAuthMode('plan'); setAuthModal(true); }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-bold border flex items-center justify-center gap-2"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              Sign up <ArrowRight size={14}/>
            </button>
          </div>
          <p className="text-xs mt-4" style={{ color: 'var(--muted)' }}>No credit card · Free forever plan · Setup in 2 minutes</p>
        </div>
      </section>

      {/* Footer */}
      {/* Contact Us */}
      <section id="contact" className="py-20 px-6" style={{ background: 'var(--card)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
            Get in Touch
          </span>
          <h2 className="text-3xl font-black mb-3" style={{ color: 'var(--text)' }}>We would love to hear from you</h2>
          <p className="text-sm mb-10" style={{ color: 'var(--muted)' }}>Have a question, a feature request, or need help? Send us a message and we will get back to you within 24 hours.</p>
          <ContactForm />
        </div>
      </section>

            <footer className="border-t py-10" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <VeloxLogo size={28} showText={false} />
                <span className="font-black text-sm" style={{ color: 'var(--text)' }}>Velox Space</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>The command center for digital marketing agencies.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-1 text-[11px]">
              <span className="font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Product</span>
              <span className="font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Legal</span>
              {['Features','Pricing','Analytics','Lead Finder'].map(l => (
                <a key={l} href="#" className="hover:underline" style={{ color: 'var(--text-soft)' }}>{l}</a>
              ))}
              <a href="/terms" className="hover:underline" style={{ color: 'var(--text-soft)' }}>Terms & Conditions</a>
              <a href="/privacy" className="hover:underline" style={{ color: 'var(--text-soft)' }}>Privacy Policy</a>
              <a href="mailto:support@veloxspace.io" className="hover:underline" style={{ color: 'var(--text-soft)' }}>Contact Us</a>
              <a href="mailto:legal@veloxspace.io" className="hover:underline" style={{ color: 'var(--text-soft)' }}>Legal</a>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>© {new Date().getFullYear()} Velox Space · Built for African marketing agencies</p>
            <div className="flex items-center gap-4 text-[10px]">
              <div className="flex items-center gap-1" style={{ color: 'var(--success)' }}>
                <Shield size={10}/> SOC2 Secure
              </div>
              <div className="flex items-center gap-1" style={{ color: 'var(--muted)' }}>GDPR Ready</div>
              <a href="/terms" className="hover:underline font-semibold" style={{ color: 'var(--primary)' }}>Terms</a>
              <a href="/privacy" className="hover:underline font-semibold" style={{ color: 'var(--primary)' }}>Privacy</a>
              <a href="/legal" className="hover:underline font-semibold" style={{ color: 'var(--primary)' }}>Legal</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {announcement && (
        <div className="px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2"
          style={{ background: 'var(--warning-bg)', color: 'var(--warning)', borderBottom: '1px solid rgba(251,191,36,0.3)' }}>
          <span>📢</span> {announcement}
          <button onClick={() => setAnnouncement('')} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b h-14 flex items-center justify-between px-4 sm:px-6" style={{ background: 'var(--card)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMobileMenu(!isMobileMenu)} className="p-1.5 rounded-xl md:hidden" style={{ color: 'var(--muted)' }}>
            {isMobileMenu ? <X size={18}/> : <Menu size={18}/>}
          </button>
          <div className="flex items-center gap-2">
            <VeloxLogo size={28} showText={false} />
            <button onClick={() => navigateTo('dashboard')} className="font-bold text-sm hidden sm:block cursor-pointer hover:opacity-80 transition-opacity" style={{ color: 'var(--text)', background: 'none', border: 'none', padding: 0 }}>Velox Space</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeWorkspace && (
            <div className="relative">
              <button onClick={() => setWsDropOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer text-xs font-semibold border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                <span className="hidden sm:inline" style={{ color: 'var(--muted)' }}>Workspace:</span>
                <span className="max-w-[90px] truncate">{activeWorkspace.name}</span>
                <ChevronDown size={11} style={{ color: 'var(--muted)', transform: wsDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}/>
              </button>
              {wsDropOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setWsDropOpen(false)}/>
                  <div className="absolute right-0 top-10 rounded-xl shadow-xl z-50 py-1 w-52 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Your workspaces</div>
                    {workspaces.map(ws => (
                      <button key={ws.id} onClick={() => { setActiveWorkspace(ws); setWsDropOpen(false); }}
                        className="w-full text-left px-3 py-2 text-xs transition-all flex items-center gap-2 cursor-pointer"
                        style={{ color: activeWorkspace.id === ws.id ? 'var(--primary)' : 'var(--text)', background: activeWorkspace.id === ws.id ? 'var(--primary-soft)' : 'transparent' }}>
                        {activeWorkspace.id === ws.id && <span style={{ color: 'var(--primary)' }}>✓</span>}
                        {ws.name}
                      </button>
                    ))}
                    <div className="border-t my-1" style={{ borderColor: 'var(--border)' }}/>
                    <button onClick={() => { setWsDropOpen(false); setIsNewWsModal(true); }}
                      className="w-full text-left px-3 py-2 text-xs flex items-center gap-1.5 font-semibold cursor-pointer transition-all"
                      style={{ color: 'var(--primary)' }}>
                      <Plus size={11}/> Add new workspace
                    </button>
                  </div>
                </>
              )}
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
          <div className="relative hidden sm:block">
            {profileDropOpen && <div className="fixed inset-0 z-40" onClick={() => setProfileDropOpen(false)}/>}
            <button onClick={() => setProfileDropOpen(o => !o)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold gradient-primary cursor-pointer">
              {user.name?.charAt(0) || 'U'}
            </button>
            {profileDropOpen && (
              <div className="absolute right-0 top-9 z-50 rounded-xl shadow-xl py-1 w-44 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="px-3 py-2 text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{user.name}</div>
                <div className="px-3 pb-1 text-[10px] truncate" style={{ color: 'var(--muted)' }}>{user.email}</div>
                <div className="border-t my-1" style={{ borderColor: 'var(--border)' }}/>
                <button onClick={() => { setProfileDropOpen(false); handleLogout(); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-1.5 font-semibold transition-all hover:opacity-80 cursor-pointer"
                  style={{ color: 'var(--danger)' }}>
                  <LogOut size={11}/> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className={`${isMobileMenu ? 'fixed inset-0 top-14 z-40 h-[calc(100vh-56px)]' : 'hidden md:flex md:h-full'} md:flex-col w-[270px] border-r p-3 gap-0.5 shrink-0 overflow-y-auto`}
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {nav('dashboard', 'Dashboard', <Home size={17}/>)}
          <p className="text-[11px] font-bold uppercase tracking-wide px-3 pt-5 pb-1" style={{ color: 'var(--muted)' }}>Analytics</p>
          {nav('analytics', 'Social Analytics', <TrendingUp size={17}/>)}
          {nav('website', 'Website Analytics', <Globe size={17}/>)}
          {nav('campaigns', 'Campaign Tracker', <Target size={17}/>)}
          {nav('ads-api', 'Ads API Connections', <Link size={17}/>)}
          <p className="text-[11px] font-bold uppercase tracking-wide px-3 pt-5 pb-1" style={{ color: 'var(--muted)' }}>Content</p>
          {nav('calendar', 'Content Calendar', <Calendar size={17}/>)}
          {nav('copywriter', 'AI Captions', <Sparkles size={17}/>)}
          <p className="text-[11px] font-bold uppercase tracking-wide px-3 pt-5 pb-1" style={{ color: 'var(--muted)' }}>Growth</p>
          {nav('leads', 'Lead Finder', <Zap size={17}/>)}
          {nav('pipeline', 'Lead Pipeline', <PieChart size={17}/>)}
          {nav('crm', 'CRM', <Users size={17}/>)}
          {nav('inbox', 'Engagement Inbox', <Bell size={17}/>)}
          <p className="text-[11px] font-bold uppercase tracking-wide px-3 pt-5 pb-1" style={{ color: 'var(--muted)' }}>Workspace</p>
          {nav('accounts-connector', 'Connect Accounts', <Link size={17}/>)}
          {nav('referrals', 'Referrals', <Gift size={17}/>)}
          {nav('billing', 'Billing', <CreditCard size={17}/>)}

          {/* Promo card — Modernize sidebar pattern */}
          {subscription?.plan !== 'agency' && (
            <div className="mt-6 mb-2 mx-0.5 rounded-lg p-4" style={{ background: 'var(--primary-soft)' }}>
              <p className="text-[13px] font-semibold mb-2" style={{ color: 'var(--text)' }}>Unlock more?</p>
              <p className="text-[11px] mb-3" style={{ color: 'var(--muted)' }}>Upgrade to Agency for unlimited workspaces and priority AI credits.</p>
              <button onClick={() => navigateTo('billing')}
                className="w-full text-[12px] font-semibold py-2 rounded-md text-white gradient-primary cursor-pointer">
                Upgrade Plan
              </button>
            </div>
          )}

          <div className="mt-auto pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="px-3 flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
              <Shield size={10} style={{ color: 'var(--primary)' }}/> Secured workspace
            </div>
          </div>
        </aside>

        {activeWorkspace && (
          <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-h-0">
            {currentView === 'dashboard' && <Dashboard user={user} workspaceId={activeWorkspace.id} analytics={analyticsData} posts={posts} subscription={subscription} onNavigate={navigateTo}/>}
            {currentView === 'analytics' && <AnalyticsView workspaceId={activeWorkspace.id} analytics={analyticsData} history={analyticsHistory} onRefresh={loadDashboard}/>}
            {currentView === 'website' && <WebsiteAnalytics workspaceId={activeWorkspace.id}/>}
            {currentView === 'campaigns' && <CampaignTracker workspaceId={activeWorkspace.id}/>}
            {currentView === 'ads-api' && <AdsApiConnector workspaceId={activeWorkspace.id}/>}
            {currentView === 'calendar' && <CalendarView workspaceId={activeWorkspace.id} posts={posts} onRefresh={loadDashboard} isOffline={!isOnline}/>}
            {currentView === 'copywriter' && <CaptionGenerator workspaceId={activeWorkspace.id} onPostScheduled={loadDashboard}/>}
            {currentView === 'leads' && <LeadFinder workspaceId={activeWorkspace.id} onNavigate={navigateTo}/>}
            {currentView === 'pipeline' && <LeadPipeline workspaceId={activeWorkspace.id}/>}
            {currentView === 'crm' && <CRM workspaceId={activeWorkspace.id}/>}
            {currentView === 'inbox' && <EngagementInbox workspaceId={activeWorkspace.id}/>}
            {currentView === 'accounts-connector' && <AccountConnector workspaceId={activeWorkspace.id}/>}

            {currentView === 'referrals' && <ReferralCenter onRefreshSubscription={loadDashboard}/>}
            {currentView === 'billing' && subscription && <BillingManager subscription={subscription} user={user} onRefresh={loadDashboard}/>}
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
    {/* Post Composer */}
    {showComposer && user && activeWorkspace && (
      <PostComposer
        workspaceId={activeWorkspace.id}
        user={user}
        onClose={() => setShowComposer(false)}
        onSuccess={() => { setShowComposer(false); loadDashboard(); }}
      />
    )}

    </div>
  );
}

function ContactForm() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [err, setErr] = React.useState('');

  const submit = async () => {
    if (!name || !email || !message) { setErr('Please fill in all fields.'); return; }
    setSending(true); setErr('');
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, message }) });
      const d = await r.json();
      if (d.success) { setSent(true); setName(''); setEmail(''); setMessage(''); }
      else setErr(d.error || 'Failed to send. Please try again.');
    } catch { setErr('Network error. Please try again.'); }
    setSending(false);
  };

  const inp = "w-full text-sm rounded-2xl px-4 py-3 border outline-none transition-all focus:border-[var(--primary)]";
  const style = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' } as React.CSSProperties;

  if (sent) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--success-bg)', border: '1px solid rgba(52,211,153,0.3)' }}>
      <div className="text-4xl mb-3">✅</div>
      <p className="font-bold text-lg mb-1" style={{ color: 'var(--success)' }}>Message sent!</p>
      <p className="text-sm" style={{ color: 'var(--text-soft)' }}>We will get back to you within 24 hours.</p>
      <button onClick={() => setSent(false)} className="mt-4 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Send another message</button>
    </div>
  );

  return (
    <div className="rounded-2xl p-6 space-y-4 text-left" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {err && <p className="text-xs p-3 rounded-xl text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text)' }}>Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className={inp} style={style}/>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text)' }}>Email Address *</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@company.com" type="email" className={inp} style={style}/>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text)' }}>Message *</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Tell us how we can help you..." rows={4} className={`${inp} resize-none`} style={style}/>
      </div>
      <button onClick={submit} disabled={sending}
        className="w-full py-3 rounded-2xl font-bold text-white gradient-primary disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90">
        {sending ? '⏳ Sending…' : '📨 Send Message'}
      </button>
    </div>
  );
}
