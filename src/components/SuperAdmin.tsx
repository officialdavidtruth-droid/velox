import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Activity, MessageCircle, FileText, Settings,
  CreditCard, AlertTriangle, LogOut, Ban, TrendingUp,
  RefreshCw, X, Eye, EyeOff, Send, Shield,
  Trash2, Search, Bell, Lock, Unlock, Sun, Moon,
  DollarSign, BarChart3, Wrench, Check, AlertCircle
} from 'lucide-react';

const TABS = [
  { key:'overview',  label:'Overview',     icon:BarChart3 },
  { key:'users',     label:'Users',         icon:Users },
  { key:'chat',      label:'Support Chat',  icon:MessageCircle },
  { key:'referrals', label:'Referrals',     icon:TrendingUp },
  { key:'audit',     label:'Audit Logs',    icon:FileText },
  { key:'site',      label:'Site Control',  icon:Settings },
  { key:'messages',  label:'Messages',      icon:MessageCircle },
  { key:'billing',   label:'Billing',       icon:CreditCard },
  { key:'emergency', label:'Emergency',     icon:AlertTriangle },
];

export default function SuperAdmin() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('velox_admin_dark');
    return saved !== null ? saved === 'true' : true; // default dark
  });
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('velox_admin_token') || '');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loginErr, setLoginErr] = useState('');
  const [logging, setLogging] = useState(false);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState<any>(null);
  const [statsErr, setStatsErr] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [usersErr, setUsersErr] = useState('');
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string|null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatReply, setChatReply] = useState('');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [billingSettings, setBillingSettings] = useState<any>({});
  const [userSearch, setUserSearch] = useState('');
  const [deleteCountdown, setDeleteCountdown] = useState<{id:string, type:string, count:number, timer:any}|null>(null);
  const [flash, setFlash] = useState<{text:string, ok:boolean}|null>(null);
  const [loading, setLoading] = useState<Record<string,boolean>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  // Apply dark class to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    if (adminToken) { refreshAll(); }
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    const interval = setInterval(() => {
      loadChatSessions();
      if (activeChatId) loadChatMessages(activeChatId);
    }, 6000);
    return () => clearInterval(interval);
  }, [adminToken, activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, open]);

  const setLoad = (key: string, val: boolean) => setLoading(p => ({ ...p, [key]: val }));

  const api = async (path: string, method = 'GET', body?: any) => {
    try {
      const r = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: body ? JSON.stringify(body) : undefined,
      });
      const d = await r.json();
      if (r.status === 401) {
        localStorage.removeItem('velox_admin_token');
        setAdminToken('');
        return { __authErr: d.error };
      }
      return d;
    } catch (e: any) {
      return { __err: e.message };
    }
  };

  const showFlash = (text: string, ok: boolean) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash(null), 5000);
  };

  const refreshAll = () => {
    loadStats();
    loadUsers();
    loadChatSessions();
    loadAuditLogs();
    loadSettings();
    loadReferrals();
    loadContactMessages();
  };

  const loadStats = async () => {
    setLoad('stats', true);
    setStatsErr('');
    const d = await api('/api/admin/stats');
    if (d.__err || d.__authErr) setStatsErr(d.__err || d.__authErr);
    else if (d.error) setStatsErr(d.error);
    else setStats(d);
    setLoad('stats', false);
  };

  const loadUsers = async () => {
    setLoad('users', true);
    setUsersErr('');
    const d = await api('/api/admin/users');
    if (d.__err || d.__authErr) setUsersErr(d.__err || d.__authErr);
    else if (d.error) setUsersErr(d.error);
    else if (Array.isArray(d)) setUsers(d);
    setLoad('users', false);
  };

  const loadChatSessions = async () => {
    const d = await api('/api/admin/chat/sessions');
    if (Array.isArray(d)) setChatSessions(d);
  };

  const loadChatMessages = async (id: string) => {
    const d = await api(`/api/admin/chat/messages?sessionId=${id}`);
    if (Array.isArray(d)) setChatMessages(d);
  };

  const loadAuditLogs = async () => {
    const d = await api('/api/admin/audit');
    if (Array.isArray(d)) setAuditLogs(d);
  };

  const loadReferrals = async () => {
    const d = await api('/api/admin/referrals');
    if (Array.isArray(d)) setReferrals(d);
  };

  const loadContactMessages = async () => {
    const d = await api('/api/admin/contact-messages');
    if (Array.isArray(d)) setContactMessages(d);
  };

  const loadSettings = async () => {
    const [site, billing] = await Promise.all([
      api('/api/admin/settings'),
      api('/api/admin/billing-settings'),
    ]);
    if (!site.__err && !site.error) setSiteSettings(site);
    if (!billing.__err && !billing.error) setBillingSettings(billing);
  };

  const doLogin = async () => {
    if (!pin) return;
    setLogging(true);
    setLoginErr('');
    const d = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if (d.token) {
      localStorage.setItem('velox_admin_token', d.token);
      setAdminToken(d.token);
    } else {
      setLoginErr(d.error || 'Login failed. Check your ADMIN_PIN in Vercel env vars.');
    }
    setLogging(false);
  };

  const doLogout = () => {
    localStorage.removeItem('velox_admin_token');
    setAdminToken('');
  };

  const userAction = async (userId: string, action: string, value?: any) => {
    const d = await api('/api/admin/users/action', 'POST', { userId, action, value });
    if (d.success) { showFlash(`✓ ${action} applied`, true); loadUsers(); }
    else showFlash(d.error || 'Action failed', false);
  };

  const sendReply = async () => {
    if (!chatReply.trim() || !activeChatId) return;
    await api('/api/admin/chat/reply', 'POST', { sessionId: activeChatId, message: chatReply.trim() });
    setChatReply('');
    loadChatMessages(activeChatId);
  };

  const initiateDelete = (id: string, type: string) => {
    let count = 10;
    const timer = setInterval(() => {
      count--;
      setDeleteCountdown(prev => prev ? { ...prev, count } : null);
      if (count <= 0) clearInterval(timer);
    }, 1000);
    setDeleteCountdown({ id, type, count, timer });
  };

  const cancelDelete = () => {
    if (deleteCountdown?.timer) clearInterval(deleteCountdown.timer);
    setDeleteCountdown(null);
  };

  const confirmDelete = async () => {
    if (!deleteCountdown) return;
    const { id, type, timer } = deleteCountdown;
    clearInterval(timer);
    setDeleteCountdown(null);
    if (type === 'user') await userAction(id, 'delete');
  };

  const inp = (label: string, val: string, onChange: (v: string) => void, type = 'text', ph = '') => (
    <div key={label}>
      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>{label}</label>
      <input type={type} value={val} onChange={e => onChange(e.target.value)} placeholder={ph}
        className="w-full text-xs rounded-xl px-3 py-2 border outline-none"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
    </div>
  );

  const errBox = (msg: string) => msg ? (
    <div className="p-4 rounded-xl text-xs flex items-start gap-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.2)' }}>
      <AlertCircle size={13} className="shrink-0 mt-0.5"/>
      <div>
        <p className="font-bold">Error loading data</p>
        <p className="mt-0.5">{msg}</p>
        {msg.includes('migration') && <p className="mt-1 font-semibold">→ Run <code>new_tables_migration.sql</code> in Supabase SQL Editor first.</p>}
      </div>
    </div>
  ) : null;

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  if (!adminToken) return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm rounded-2xl p-8 space-y-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <div className="flex justify-end">
            <button onClick={() => { const nd = !dark; setDark(nd); localStorage.setItem('velox_admin_dark', String(nd)); }} className="p-2 rounded-xl cursor-pointer" style={{ background: 'var(--surface)', color: 'var(--muted)' }}>
              {dark ? <Sun size={14}/> : <Moon size={14}/>}
            </button>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 gradient-primary">
              <Shield size={28} className="text-white"/>
            </div>
            <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Velox Space Admin</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Enter your admin PIN to access the control panel</p>
          </div>
          {loginErr && (
            <div className="p-3 rounded-xl text-xs text-center" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
              {loginErr}
            </div>
          )}
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => setPin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doLogin()}
              placeholder="Enter admin PIN"
              autoFocus
              className="w-full text-sm rounded-xl px-4 py-3 border outline-none pr-11"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <button type="button" onClick={() => setShowPin(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
              {showPin ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
          </div>
          <button onClick={doLogin} disabled={!pin || logging}
            className="w-full py-3 rounded-xl font-bold text-white gradient-primary disabled:opacity-50 flex items-center justify-center gap-2">
            {logging ? <RefreshCw size={14} className="animate-spin"/> : <Lock size={14}/>}
            {logging ? 'Verifying…' : 'Enter Admin Panel'}
          </button>
          <p className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>
            PIN is set via the <code>ADMIN_PIN</code> environment variable in Vercel.
          </p>
        </div>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const unreadCount = chatSessions.filter((s: any) => s.unread_admin > 0).length;

  // ── ADMIN PANEL ───────────────────────────────────────────────────────────
  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>

        {/* Sidebar */}
        <aside className="w-56 shrink-0 flex flex-col border-r" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
                <Shield size={15} className="text-white"/>
              </div>
              <div>
                <p className="text-xs font-black" style={{ color: 'var(--text)' }}>SupaAdmin</p>
                <p className="text-[9px]" style={{ color: 'var(--muted)' }}>Velox Space Control</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left"
                  style={tab === t.key ? { background: 'var(--primary-soft)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
                  <Icon size={13}/>
                  {t.label}
                  {t.key === 'chat' && unreadCount > 0 && (
                    <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'var(--danger)', color: '#fff' }}>{unreadCount}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-3 space-y-1 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => { const nd = !dark; setDark(nd); localStorage.setItem('velox_admin_dark', String(nd)); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ color: 'var(--muted)' }}>
              {dark ? <Sun size={13}/> : <Moon size={13}/>}
              {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button onClick={doLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ color: 'var(--danger)' }}>
              <LogOut size={13}/> Sign Out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto min-h-0" style={{ maxHeight: '100vh' }}>

          {/* Flash message */}
          {flash && (
            <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2"
              style={{ background: flash.ok ? 'var(--success-bg)' : 'var(--danger-bg)', color: flash.ok ? 'var(--success)' : 'var(--danger)', border: `1px solid ${flash.ok ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
              {flash.ok ? <Check size={13}/> : <AlertCircle size={13}/>}
              {flash.text}
            </div>
          )}

          {/* Delete countdown — floating toast (non-blocking) */}
          {deleteCountdown && (
            <div className="fixed bottom-6 left-60 z-50 w-72 rounded-2xl shadow-2xl p-4"
              style={{ background: 'var(--card)', border: `2px solid var(--danger)`, boxShadow: '0 8px 32px rgba(248,113,113,0.25)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Trash2 size={14} style={{ color: 'var(--danger)' }}/>
                  <span className="text-xs font-bold" style={{ color: 'var(--danger)' }}>
                    {deleteCountdown.count > 0 ? `Deleting in ${deleteCountdown.count}s…` : 'Confirm deletion'}
                  </span>
                </div>
                {deleteCountdown.count > 0 && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                    style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '2px solid var(--danger)' }}>
                    {deleteCountdown.count}
                  </div>
                )}
              </div>
              {deleteCountdown.count > 0 ? (
                <>
                  <p className="text-[10px] mb-3" style={{ color: 'var(--muted)' }}>This action is permanent. Click cancel to abort.</p>
                  <button onClick={cancelDelete} className="w-full py-2 rounded-xl text-xs font-bold border cursor-pointer"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                    Cancel Delete
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[10px] mb-3" style={{ color: 'var(--muted)' }}>Are you absolutely sure? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button onClick={cancelDelete} className="flex-1 py-2 rounded-xl text-xs font-bold border cursor-pointer"
                      style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>Cancel</button>
                    <button onClick={confirmDelete} className="flex-1 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                      style={{ background: 'var(--danger)' }}>Delete Forever</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Overview</h1>
                <button onClick={refreshAll} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  <RefreshCw size={12} className={loading.stats ? 'animate-spin' : ''}/> Refresh
                </button>
              </div>
              {errBox(statsErr)}
              {stats && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total Users',   value: stats.totalUsers || 0,      color: 'var(--primary)' },
                      { label: 'Active Today',  value: stats.activeToday || 0,     color: 'var(--success)' },
                      { label: 'New This Week', value: stats.newThisWeek || 0,     color: 'var(--warning)' },
                      { label: 'Workspaces',    value: stats.totalWorkspaces || 0, color: '#8b5cf6' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="glow-card rounded-2xl p-4">
                        <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
                        <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Starter Plans', value: stats.starterCount || 0, color: 'var(--muted)' },
                      { label: 'Pro Plans',      value: stats.proCount || 0,     color: 'var(--info)' },
                      { label: 'Agency Plans',   value: stats.agencyCount || 0,  color: 'var(--primary)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="glow-card rounded-2xl p-4 text-center">
                        <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
                        <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  {(stats.recentSignups || []).length > 0 && (
                    <div className="glow-card rounded-2xl p-5">
                      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Recent Signups</h3>
                      <div className="space-y-2">
                        {stats.recentSignups.map((u: any) => (
                          <div key={u.id} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{u.name?.charAt(0) || '?'}</div>
                            <div className="flex-1"><p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{u.name}</p><p className="text-[9px]" style={{ color: 'var(--muted)' }}>{u.email}</p></div>
                            <p className="text-[9px]" style={{ color: 'var(--muted)' }}>{new Date(u.created_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── USERS ───────────────────────────────────────────────────────── */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Users ({users.length})</h1>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search name or email…"
                      className="text-xs rounded-xl pl-8 pr-3 py-2 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)', width: 200 }}/>
                  </div>
                  <button onClick={loadUsers} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                    <RefreshCw size={12} className={loading.users ? 'animate-spin' : ''}/>
                  </button>
                </div>
              </div>
              {errBox(usersErr)}
              <div className="glow-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                        {['User','Email','Plan','Status','Joined','Actions'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-12 text-center text-xs" style={{ color: 'var(--muted)' }}>
                          {loading.users ? 'Loading users…' : 'No users found'}
                        </td></tr>
                      )}
                      {filteredUsers.map((u: any) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{u.name?.charAt(0) || '?'}</div>
                              <span className="font-semibold" style={{ color: 'var(--text)' }}>{u.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-soft)' }}>{u.email}</td>
                          <td className="px-4 py-3">
                            <select value={u.plan_type || 'starter'} onChange={e => userAction(u.id, 'upgrade', e.target.value)}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer capitalize"
                              style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary-l)', color: 'var(--primary)' }}>
                              {['starter','pro','agency'].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full capitalize"
                              style={{ background: u.banned ? 'var(--danger-bg)' : 'var(--success-bg)', color: u.banned ? 'var(--danger)' : 'var(--success)' }}>
                              {u.banned ? 'Banned' : 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button onClick={() => userAction(u.id, u.banned ? 'unban' : 'ban')}
                                className="p-1.5 rounded-lg" title={u.banned ? 'Unban' : 'Ban'}
                                style={{ background: u.banned ? 'var(--success-bg)' : 'var(--warning-bg)', color: u.banned ? 'var(--success)' : 'var(--warning)' }}>
                                {u.banned ? <Unlock size={11}/> : <Ban size={11}/>}
                              </button>
                              <button onClick={() => userAction(u.id, 'logout')}
                                className="p-1.5 rounded-lg" title="Force logout"
                                style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                                <LogOut size={11}/>
                              </button>
                              <button onClick={() => initiateDelete(u.id, 'user')}
                                className="p-1.5 rounded-lg" title="Delete user"
                                style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                                <Trash2 size={11}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CHAT ────────────────────────────────────────────────────────── */}
          {tab === 'chat' && (
            <div className="space-y-4">
              <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Support Chat</h1>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 560 }}>
                <div className="glow-card rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-4 py-3 text-xs font-bold" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                    Conversations ({chatSessions.length})
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {chatSessions.length === 0 && <p className="text-xs text-center p-8" style={{ color: 'var(--muted)' }}>No conversations yet</p>}
                    {chatSessions.map((s: any) => (
                      <button key={s.id} onClick={() => { setActiveChatId(s.id); loadChatMessages(s.id); }}
                        className="w-full px-4 py-3 text-left"
                        style={{ background: activeChatId === s.id ? 'var(--primary-soft)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{s.user_name || 'Unknown'}</p>
                          {s.unread_admin > 0 && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'var(--danger)', color: '#fff' }}>{s.unread_admin}</span>}
                        </div>
                        <p className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{s.last_message || 'No messages yet'}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-2 glow-card rounded-2xl overflow-hidden flex flex-col">
                  {!activeChatId ? (
                    <div className="flex-1 flex items-center justify-center"><p className="text-xs" style={{ color: 'var(--muted)' }}>Select a conversation to reply</p></div>
                  ) : (
                    <>
                      <div className="px-4 py-3 text-xs font-bold" style={{ borderBottom: '1px solid var(--border)', color: 'var(--text)' }}>
                        {chatSessions.find((s: any) => s.id === activeChatId)?.user_name || 'Chat'}
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {chatMessages.map((m: any) => (
                          <div key={m.id} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[75%] rounded-2xl px-3 py-2 text-xs"
                              style={m.sender === 'admin' ? { background: 'var(--primary)', color: '#fff' } : { background: 'var(--surface)', color: 'var(--text)' }}>
                              {m.sender === 'admin' && <p className="text-[9px] font-bold mb-0.5 opacity-70">You (Admin)</p>}
                              {m.message}
                              <p className="text-[8px] mt-0.5 opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={bottomRef}/>
                      </div>
                      <div className="p-3 flex gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                        <input value={chatReply} onChange={e => setChatReply(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendReply()}
                          placeholder="Reply to user…"
                          className="flex-1 text-xs rounded-xl px-3 py-2 border outline-none"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                        <button onClick={sendReply} disabled={!chatReply.trim()}
                          className="px-3 rounded-xl text-white gradient-primary disabled:opacity-40">
                          <Send size={13}/>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── AUDIT LOGS ──────────────────────────────────────────────────── */}
          {tab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Audit Logs</h1>
                <button onClick={loadAuditLogs} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  <RefreshCw size={12}/> Refresh
                </button>
              </div>
              <div className="glow-card rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                      {['Time','User','Action','IP'].map(h => <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>No audit logs yet</td></tr>}
                    {auditLogs.map((log: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-2.5 text-[10px] font-mono" style={{ color: 'var(--muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: 'var(--text)' }}>{log.user_id?.slice(0, 8) || '—'}</td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--text-soft)' }}>{log.action}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{log.ip_address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SITE CONTROL ────────────────────────────────────────────────── */}
          {tab === 'site' && (
            <div className="space-y-5 max-w-xl">
              <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Site Control</h1>
              <div className="glow-card rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Maintenance Mode</h3>
                <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Enable Maintenance Mode</p>
                    <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Blocks all non-admin users from accessing the site</p>
                  </div>
                  <button onClick={() => setSiteSettings((p: any) => ({ ...p, maintenance: p.maintenance === 'true' ? 'false' : 'true' }))}
                    className="w-12 h-6 rounded-full transition-all relative shrink-0"
                    style={{ background: siteSettings.maintenance === 'true' ? 'var(--danger)' : 'var(--border)' }}>
                    <div className="absolute w-5 h-5 rounded-full bg-white top-0.5 transition-all shadow"
                      style={{ left: siteSettings.maintenance === 'true' ? 'calc(100% - 22px)' : 2 }}/>
                  </button>
                </div>
                {inp('Maintenance Message', siteSettings.maintenance_msg || '', v => setSiteSettings((p: any) => ({ ...p, maintenance_msg: v })), 'text', 'Site is under maintenance, back soon!')}
                {inp('Site Announcement (optional)', siteSettings.announcement || '', v => setSiteSettings((p: any) => ({ ...p, announcement: v })), 'text', 'e.g. New features just launched!')}
                <button onClick={async () => { const d = await api('/api/admin/settings', 'POST', siteSettings); showFlash(d.success ? 'Settings saved' : d.error || 'Failed', !!d.success); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white gradient-primary">Save Settings</button>
              </div>
            </div>
          )}

          {/* ── BILLING ─────────────────────────────────────────────────────── */}
          {/* ── CONTACT MESSAGES ──────────────────────────────────────────────── */}
          {tab === 'messages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Contact Messages ({contactMessages.length})</h1>
                <button onClick={loadContactMessages} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  <RefreshCw size={12}/> Refresh
                </button>
              </div>
              {contactMessages.length === 0 ? (
                <div className="glow-card rounded-2xl p-12 text-center">
                  <MessageCircle size={24} className="mx-auto mb-3" style={{ color: 'var(--muted)' }}/>
                  <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>No contact messages yet</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Messages from the homepage contact form will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactMessages.map((msg: any) => (
                    <div key={msg.id} className="glow-card rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                            {msg.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{msg.name}</p>
                            <a href={`mailto:${msg.email}`} className="text-[10px] hover:underline" style={{ color: 'var(--primary)' }}>{msg.email}</a>
                          </div>
                        </div>
                        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{new Date(msg.created_at).toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl p-3" style={{ background: 'var(--surface)' }}>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-soft)' }}>{msg.message}</p>
                      </div>
                      <a href={`mailto:${msg.email}?subject=Re: Your Velox Space enquiry`}
                        className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                        Reply via Email →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'billing' && (
            <div className="space-y-5 max-w-2xl">
              <h1 className="text-xl font-black" style={{ color: 'var(--text)' }}>Billing & Payments</h1>
              <div className="glow-card rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Plan Pricing (USD/month)</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['starter','pro','agency'].map(plan => inp(`${plan} Plan ($)`, billingSettings[`${plan}_price`] || '', v => setBillingSettings((p: any) => ({ ...p, [`${plan}_price`]: v })), 'number', plan === 'starter' ? '0' : plan === 'pro' ? '29' : '79'))}
                </div>
              </div>
              <div className="glow-card rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Paystack</h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Get keys at <a href="https://dashboard.paystack.com" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--primary)' }}>dashboard.paystack.com</a> → Settings → API Keys</p>
                {inp('Public Key', billingSettings.paystack_public_key || '', v => setBillingSettings((p: any) => ({ ...p, paystack_public_key: v })), 'text', 'pk_live_xxxxxxxx')}
                {inp('Secret Key', billingSettings.paystack_secret_key || '', v => setBillingSettings((p: any) => ({ ...p, paystack_secret_key: v })), 'password', 'sk_live_xxxxxxxx')}
              </div>
              <div className="glow-card rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Flutterwave</h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Get keys at <a href="https://dashboard.flutterwave.com" target="_blank" rel="noreferrer" className="underline" style={{ color: 'var(--primary)' }}>dashboard.flutterwave.com</a> → Settings → API</p>
                {inp('Public Key', billingSettings.flutterwave_public_key || '', v => setBillingSettings((p: any) => ({ ...p, flutterwave_public_key: v })), 'text', 'FLWPUBK-xxxxxxxx')}
                {inp('Secret Key', billingSettings.flutterwave_secret_key || '', v => setBillingSettings((p: any) => ({ ...p, flutterwave_secret_key: v })), 'password', 'FLWSECK-xxxxxxxx')}
              </div>
              <button onClick={async () => { const d = await api('/api/admin/billing-settings', 'POST', billingSettings); showFlash(d.success ? 'Billing settings saved' : d.error || 'Failed', !!d.success); }}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white gradient-primary">Save Billing Settings</button>
            </div>
          )}

          {/* ── EMERGENCY ───────────────────────────────────────────────────── */}
          {tab === 'emergency' && (
            <div className="space-y-5 max-w-lg">
              <h1 className="text-xl font-black" style={{ color: 'var(--danger)' }}>⚠️ Emergency Controls</h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>These actions are immediate and affect all users. Use only in emergencies.</p>
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--danger-bg)', border: '1px solid rgba(248,113,113,0.3)' }}>
                <h3 className="font-bold text-sm" style={{ color: 'var(--danger)' }}>Force Logout All Users</h3>
                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Immediately invalidates ALL active sessions. Every user will be logged out on their next action.</p>
                <button onClick={async () => {
                  if (!confirm('This will log out ALL users immediately. Continue?')) return;
                  const d = await api('/api/admin/emergency-logout', 'POST');
                  showFlash(d.success ? `Logged out ${d.count || 0} sessions` : d.error || 'Failed', !!d.success);
                }} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ background: 'var(--danger)' }}>
                  <LogOut size={16}/> Force Logout ALL Users Now
                </button>
              </div>
              <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--warning-bg)', border: '1px solid rgba(251,191,36,0.3)' }}>
                <h3 className="font-bold text-sm" style={{ color: 'var(--warning)' }}>Enable Maintenance Mode</h3>
                <p className="text-xs" style={{ color: 'var(--text-soft)' }}>Redirect to Site Control to toggle maintenance mode on.</p>
                <button onClick={() => setTab('site')} className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2" style={{ background: 'var(--warning)', color: '#000' }}>
                  <Wrench size={16}/> Go to Site Control →
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
