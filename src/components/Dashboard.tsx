import React, { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, Users, Zap, Globe, Calendar,
  ArrowRight, RefreshCw, Target, DollarSign, BarChart3,
  Clock, CheckCircle2, AlertCircle, Plus, Eye, Heart, Search,
  ArrowUpRight, ArrowDownRight, Rocket
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';

interface DashboardProps {
  user: any;
  workspaceId: string;
  analytics: any[];
  posts: any[];
  subscription: any;
  onNavigate: (view: string) => void;
}

function fmt(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M';
  if (n >= 1_000) return (n/1_000).toFixed(1)+'k';
  return n.toLocaleString();
}

const PIPELINE_STAGES = ['new', 'contacted', 'proposal', 'negotiating', 'won'] as const;
const PIPELINE_COLORS: Record<string, string> = {
  new: 'var(--info)', contacted: 'var(--primary)', proposal: 'var(--warning)',
  negotiating: '#8b5cf6', won: 'var(--success)',
};

export default function Dashboard({ user, workspaceId, analytics, posts, subscription, onNavigate }: DashboardProps) {
  const [brief, setBrief] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const token = localStorage.getItem('velox_token') || '';

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const loadData = async () => {
    const [c, l] = await Promise.all([
      fetch(`/api/campaigns?workspaceId=${workspaceId}`, { headers: { 'x-session-token': token } }).then(r => r.json()).catch(() => []),
      fetch(`/api/leads?workspaceId=${workspaceId}`, { headers: { 'x-session-token': token } }).then(r => r.json()).catch(() => []),
    ]);
    setCampaigns(Array.isArray(c) ? c : []);
    setLeads(Array.isArray(l) ? l : []);
  };

  const [briefError, setBriefError] = useState('');

  const generateBrief = async () => {
    setBriefLoading(true);
    setBriefError('');
    try {
      const r = await fetch(`/api/ai/brief?workspaceId=${workspaceId}`, { headers: { 'x-session-token': token } });
      const d = await r.json();
      if (d.brief) { setBrief(d.brief); setBriefError(''); }
      else {
        const rawErr = d.error || 'Could not generate brief.';
        if (rawErr.includes('quota') || rawErr.includes('RESOURCE_EXHAUSTED') || rawErr.includes('429')) {
          setBriefError('AI error. Add GROQ_API_KEY to Vercel env vars for free AI (get one at console.groq.com).');
        } else if (rawErr.includes('GROQ_API_KEY') || rawErr.includes('No AI key')) {
          setBriefError('No AI key configured. Go to Vercel → Environment Variables → add GROQ_API_KEY (free at console.groq.com) → redeploy.');
        } else {
          setBriefError(rawErr.length > 120 ? rawErr.slice(0, 120) + '…' : rawErr);
        }
      }
    } catch (e: any) {
      setBriefError('Network error generating brief. Check your Vercel deployment.');
    }
    setBriefLoading(false);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const totalFollowers = analytics.reduce((s, a) => s + (a.followers || 0), 0);
  const totalReach = analytics.reduce((s, a) => s + (a.reach || 0), 0);
  const totalEngagement = analytics.reduce((s, a) => s + (a.engagement || 0), 0);
  const totalAdSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const leadsThisWeek = leads.filter(l => new Date(l.created_at) > new Date(Date.now() - 7*24*3600000)).length;
  const wonLeads = leads.filter(l => l.status === 'won');
  const pipelineValue = wonLeads.reduce((s, l) => s + (l.ai_score || 0), 0);

  const upcomingPosts = posts
    .filter(p => new Date(p.publish_date) > new Date() && p.status === 'scheduled')
    .sort((a, b) => new Date(a.publish_date).getTime() - new Date(b.publish_date).getTime())
    .slice(0, 4);

  const PLATFORM_COLORS: Record<string,string> = {
    instagram:'#e1306c', facebook:'#1877f2', twitter:'#000',
    linkedin:'#0a66c2', tiktok:'#fe2c55', youtube:'#ff0000',
  };

  // ── Colorful quick-stat strip (Modernize-style tinted tiles) ──────────────
  const quickStats = [
    { label: 'Total Followers', value: fmt(totalFollowers), icon: Users, tint: 'var(--primary-soft)', text: 'var(--primary)', action: 'analytics' },
    { label: 'Total Reach', value: fmt(totalReach), icon: Eye, tint: 'var(--success-bg)', text: 'var(--success)', action: 'analytics' },
    { label: 'Engagements', value: fmt(totalEngagement), icon: Heart, tint: 'var(--danger-bg)', text: 'var(--danger)', action: 'analytics' },
    { label: 'Leads This Week', value: String(leadsThisWeek), icon: Zap, tint: 'var(--warning-bg)', text: 'var(--warning)', action: 'pipeline' },
    { label: 'Ad Spend', value: `$${fmt(totalAdSpend)}`, icon: DollarSign, tint: 'var(--info-bg)', text: 'var(--info)', action: 'campaigns' },
    { label: 'Scheduled Posts', value: String(upcomingPosts.length), icon: Calendar, tint: 'var(--primary-soft)', text: 'var(--accent)', action: 'calendar' },
  ];

  const kpis = [
    { label: 'Total Followers', value: fmt(totalFollowers), icon: Users, color: '#8B3A10', change: analytics.length > 0 ? `${analytics.length} platform${analytics.length>1?'s':''}` : 'No data', good: analytics.length > 0, action: 'analytics', desc: 'Across all platforms' },
    { label: 'Total Reach', value: fmt(totalReach), icon: Eye, color: '#1877f2', change: totalReach > 0 ? 'Last 30 days' : 'Sync to update', good: totalReach > 0, action: 'analytics', desc: 'Last 30 days' },
    { label: 'Engagements', value: fmt(totalEngagement), icon: Heart, color: '#e1306c', change: totalEngagement > 0 ? 'Real data' : 'Sync to update', good: totalEngagement > 0, action: 'analytics', desc: 'Likes, comments, shares' },
    { label: 'Leads This Week', value: String(leadsThisWeek), icon: Zap, color: '#f59e0b', change: leadsThisWeek > 0 ? `+${leadsThisWeek}` : '0', good: leadsThisWeek > 0, action: 'pipeline', desc: 'From lead finder' },
    { label: 'Ad Spend', value: `$${fmt(totalAdSpend)}`, icon: DollarSign, color: '#10b981', change: campaigns.length > 0 ? `${campaigns.length} campaigns` : 'No campaigns', good: true, action: 'campaigns', desc: 'Total active spend' },
    { label: 'Content Scheduled', value: String(upcomingPosts.length), icon: Calendar, color: '#8b5cf6', change: upcomingPosts.length > 0 ? 'On track' : 'Add posts', good: upcomingPosts.length > 0, action: 'calendar', desc: 'Upcoming posts' },
  ];

  const quickActions = [
    { label: 'Schedule Post', icon: Plus, view: 'calendar', color: 'var(--primary)' },
    { label: 'Generate Caption', icon: Sparkles, view: 'copywriter', color: '#8b5cf6' },
    { label: 'Find Leads', icon: Zap, view: 'leads', color: '#f59e0b' },
    { label: 'View Analytics', icon: BarChart3, view: 'analytics', color: '#3b82f6' },
    { label: 'Track Campaigns', icon: Target, view: 'campaigns', color: '#10b981' },
    { label: 'Website Analytics', icon: Globe, view: 'website', color: '#e1306c' },
  ];

  // ── Chart data ──────────────────────────────────────────────────────────
  const reachChartData = analytics.map(a => ({
    name: a.platform ? a.platform.charAt(0).toUpperCase() + a.platform.slice(1) : 'Unknown',
    reach: a.reach || 0,
    engagement: a.engagement || 0,
  }));

  const pipelineChartData = PIPELINE_STAGES
    .map(stage => ({ name: stage, value: leads.filter(l => (l.status || 'new') === stage).length, color: PIPELINE_COLORS[stage] }))
    .filter(d => d.value > 0);
  const totalLeads = leads.length;

  const filteredLeads = leads.filter(l =>
    !leadSearch || (l.name || '').toLowerCase().includes(leadSearch.toLowerCase()) || (l.company || '').toLowerCase().includes(leadSearch.toLowerCase())
  ).slice(0, 6);

  const bestPlatform = [...analytics].sort((a, b) => (b.reach || 0) - (a.reach || 0))[0];
  const maxReachForBar = Math.max(...analytics.map(a => a.reach || 0), 1);

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── QUICK STAT STRIP (Modernize-style tinted tiles) ── */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {quickStats.map(({ label, value, icon: Icon, tint, text, action }) => (
          <button key={label} onClick={() => onNavigate(action)}
            className="shrink-0 w-[132px] rounded-2xl p-4 text-center transition-all hover:-translate-y-0.5 cursor-pointer"
            style={{ background: tint }}>
            <div className="flex justify-center mb-2">
              <Icon size={20} style={{ color: text }} />
            </div>
            <p className="text-[11px] font-semibold" style={{ color: text }}>{label}</p>
            <p className="text-lg font-black font-mono mt-0.5" style={{ color: text }}>{value}</p>
          </button>
        ))}
      </div>

      {/* ── HERO GREETING ── */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(93,135,255,0.1) 0%, transparent 60%)' }}/>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent)' }}>
              {new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' })}
            </p>
            <h1 className="text-2xl font-black tracking-tight mb-1" style={{ color: 'var(--text)' }}>
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {analytics.length > 0
                ? `You're managing ${analytics.length} platform${analytics.length > 1 ? 's' : ''} — here's your daily snapshot.`
                : 'Connect your accounts to start seeing real data here.'}
            </p>
          </div>
          <button onClick={generateBrief} disabled={briefLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 shrink-0 gradient-primary shadow-lg">
            {briefLoading ? <RefreshCw size={14} className="animate-spin"/> : <Sparkles size={14}/>}
            {brief ? 'Refresh Brief' : 'AI Morning Brief'}
          </button>
        </div>

        {briefError && (
          <div className="mt-4 rounded-xl p-3 flex items-start gap-2"
            style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <AlertCircle size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--warning)' }}/>
            <p className="text-xs" style={{ color: 'var(--warning)' }}>{briefError}</p>
          </div>
        )}
        {brief && (
          <div className="mt-4 rounded-xl p-4 space-y-3"
            style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-l)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              ✦ {brief.insight}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(brief.highlights || []).map((h: string, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--success)' }}/>
                  <p className="text-xs" style={{ color: 'var(--text-soft)' }}>{h}</p>
                </div>
              ))}
            </div>
            {(brief.action_items || []).length > 0 && (
              <div className="pt-2 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--primary-l)' }}>
                {brief.action_items.map((a: string, i: number) => (
                  <span key={i} className="text-[10px] font-semibold px-2 py-1 rounded-lg flex items-center gap-1"
                    style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                    <AlertCircle size={9}/> {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── REACH CHART + LEAD PIPELINE DONUT (Modernize "Revenue Updates" pattern) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glow-card rounded-2xl p-6">
          <div className="sm:flex items-center justify-between mb-6">
            <div>
              <h5 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Reach & Engagement</h5>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>By connected platform</p>
            </div>
            <button onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold flex items-center gap-1 mt-2 sm:mt-0"
              style={{ color: 'var(--primary)' }}>
              Full analytics <ArrowRight size={11}/>
            </button>
          </div>
          {reachChartData.length === 0 ? (
            <div className="py-14 text-center">
              <TrendingUp size={22} className="mx-auto mb-2" style={{ color: 'var(--muted)' }}/>
              <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>No platform data yet</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Connect accounts to populate this chart</p>
            </div>
          ) : (
            <div className="grid grid-cols-12 items-center gap-6">
              <div className="col-span-12 lg:col-span-8 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reachChartData} barGap={6}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="reach" name="Reach" fill="var(--primary)" radius={[6,6,0,0]} />
                    <Bar dataKey="engagement" name="Engagement" fill="var(--success)" radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="col-span-12 lg:col-span-4">
                <div className="flex items-center gap-4">
                  <div className="bg-[var(--primary-soft)] shrink-0 h-10 w-10 flex justify-center items-center rounded-md">
                    <Eye size={16} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black" style={{ color: 'var(--text)' }}>{fmt(totalReach)}</h4>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Total Reach</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-3 pt-6">
                  <i className="h-2 w-2 rounded-full" style={{ background: 'var(--primary)' }}/>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Best platform</p>
                    <h6 className="text-sm font-semibold capitalize" style={{ color: 'var(--text)' }}>{bestPlatform?.platform || '—'}</h6>
                  </div>
                </div>
                <div className="flex items-baseline gap-3 pt-4">
                  <i className="h-2 w-2 rounded-full" style={{ background: 'var(--success)' }}/>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Total engagement</p>
                    <h6 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{fmt(totalEngagement)}</h6>
                  </div>
                </div>
                <button onClick={() => onNavigate('analytics')}
                  className="mt-6 w-full text-xs font-semibold py-2.5 rounded-xl text-white gradient-primary">
                  View full report
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="glow-card rounded-2xl p-6">
          <h5 className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>Lead Pipeline</h5>
          <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>By stage</p>
          {totalLeads === 0 ? (
            <div className="py-10 text-center">
              <Target size={20} className="mx-auto mb-2" style={{ color: 'var(--muted)' }}/>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>No leads yet</p>
            </div>
          ) : (
            <>
              <div className="h-40 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pipelineChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={3}>
                      {pipelineChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{totalLeads}</span>
                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>leads</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1.5 mt-3">
                {PIPELINE_STAGES.map(stage => {
                  const count = leads.filter(l => (l.status || 'new') === stage).length;
                  if (!count) return null;
                  return (
                    <div key={stage} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 capitalize" style={{ color: 'var(--text-soft)' }}>
                        <i className="h-2 w-2 rounded-full" style={{ background: PIPELINE_COLORS[stage] }}/> {stage}
                      </span>
                      <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => onNavigate('pipeline')}
                className="mt-4 w-full text-xs font-semibold py-2 rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                View full pipeline
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, change, good, action, desc }) => (
          <button key={label} onClick={() => onNavigate(action)}
            className="glow-card rounded-2xl p-4 text-left transition-all cursor-pointer group w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: color+'18', color }}>
                <Icon size={14}/>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: good ? 'var(--success-bg)' : 'var(--warning-bg)', color: good ? 'var(--success)' : 'var(--warning)' }}>
                {change}
              </span>
            </div>
            <p className="text-lg font-black font-mono" style={{ color: 'var(--text)' }}>{value}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="text-[9px] mt-0.5 opacity-0 group-hover:opacity-100 transition-all"
              style={{ color: 'var(--accent)' }}>{desc}</p>
          </button>
        ))}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="glow-card rounded-2xl p-5">
        <h2 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
          <Zap size={14} style={{ color: 'var(--accent)' }}/> Quick Actions
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(({ label, icon: Icon, view, color }) => (
            <button key={view} onClick={() => onNavigate(view)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: color+'18', color }}>
                <Icon size={18}/>
              </div>
              <p className="text-[10px] font-semibold text-center leading-tight" style={{ color: 'var(--text)' }}>{label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── RECENT LEADS TABLE (Modernize "Top Performers" pattern) ── */}
        <div className="lg:col-span-2 glow-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Recent Leads</h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Latest activity in your pipeline</p>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
              <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Search leads…"
                className="pl-8 pr-3 py-2 text-xs rounded-xl border w-full sm:w-48"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
            </div>
          </div>
          {filteredLeads.length === 0 ? (
            <div className="p-10 text-center">
              <Target size={20} className="mx-auto mb-2" style={{ color: 'var(--muted)' }}/>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>No leads found</p>
              <button onClick={() => onNavigate('leads')}
                className="text-xs font-semibold px-4 py-2 mt-2 rounded-xl text-white gradient-primary">
                Find Leads
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {filteredLeads.map(l => {
                const stage = l.status || 'new';
                return (
                  <button key={l.id} onClick={() => onNavigate('pipeline')}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:opacity-90 transition-all">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: PIPELINE_COLORS[stage] }}>
                      {(l.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{l.name || 'Unnamed lead'}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{l.company || 'No company'}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full capitalize shrink-0"
                      style={{ background: PIPELINE_COLORS[stage]+'22', color: PIPELINE_COLORS[stage] }}>
                      {stage}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── UPCOMING POSTS ── */}
        <div className="glow-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Upcoming Posts</h2>
            <button onClick={() => onNavigate('calendar')}
              className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--primary)' }}>
              Calendar <ArrowRight size={11}/>
            </button>
          </div>
          <div className="p-4 space-y-3">
            {upcomingPosts.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={24} className="mx-auto mb-2" style={{ color: 'var(--muted)' }}/>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text)' }}>No posts scheduled</p>
                <p className="text-[10px] mb-3" style={{ color: 'var(--muted)' }}>Stay consistent — schedule your next post</p>
                <button onClick={() => onNavigate('calendar')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white gradient-primary">
                  + Schedule Post
                </button>
              </div>
            ) : upcomingPosts.map(post => {
              const dt = new Date(post.publish_date);
              const isToday = dt.toDateString() === new Date().toDateString();
              const isTomorrow = dt.toDateString() === new Date(Date.now()+86400000).toDateString();
              const when = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dt.toLocaleDateString(undefined,{month:'short',day:'numeric'});
              return (
                <div key={post.id} className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--text)' }}>{post.title}</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ background: isToday ? 'var(--warning-bg)' : 'var(--primary-soft)', color: isToday ? 'var(--warning)' : 'var(--primary)' }}>
                      {when}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={9} style={{ color: 'var(--muted)' }}/>
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {dt.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'})}
                    </span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                      {(post.platforms || []).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SPOTLIGHT: BEST PLATFORM + PLATFORM SHARE (Modernize "Best Selling" pattern) ── */}
      {analytics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="p-6 gradient-primary">
              <h5 className="text-sm font-bold text-white flex items-center gap-2"><Rocket size={14}/> Best Performing Platform</h5>
              <p className="text-xs text-white/80 mt-0.5">Ranked by reach</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white capitalize"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {(bestPlatform?.platform || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-bold capitalize">{bestPlatform?.platform || '—'}</p>
                  <p className="text-white/80 text-xs">{fmt(bestPlatform?.reach || 0)} reach</p>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {analytics.slice(0, 3).map(a => {
                const color = PLATFORM_COLORS[a.platform] || 'var(--primary)';
                const pct = Math.round(((a.reach || 0) / maxReachForBar) * 100);
                return (
                  <div key={a.platform}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold capitalize" style={{ color: 'var(--text)' }}>{a.platform}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: color+'18', color }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── THIS MONTH SNAPSHOT ── */}
          <div className="glow-card rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h5 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Ad Spend</h5>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Active campaigns</p>
            </div>
            <div className="my-6">
              <h4 className="text-3xl font-black font-mono" style={{ color: 'var(--text)' }}>${fmt(totalAdSpend)}</h4>
              <div className="flex items-center gap-1.5 mt-2">
                {totalAdSpend > 0
                  ? <ArrowUpRight size={12} style={{ color: 'var(--success)' }}/>
                  : <ArrowDownRight size={12} style={{ color: 'var(--muted)' }}/>}
                <span className="text-xs font-semibold" style={{ color: totalAdSpend > 0 ? 'var(--success)' : 'var(--muted)' }}>
                  {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'} tracked
                </span>
              </div>
            </div>
            <button onClick={() => onNavigate('campaigns')}
              className="w-full text-xs font-semibold py-2.5 rounded-xl border" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              View campaigns
            </button>
          </div>

          {/* ── TOP MOVERS (Modernize "Weekly Stats" pattern) ── */}
          <div className="glow-card rounded-2xl p-6">
            <h5 className="text-sm font-bold mb-4" style={{ color: 'var(--text)' }}>Top Movers</h5>
            <div className="flex flex-col gap-4">
              {kpis.filter(k => k.good).slice(0, 3).map(k => (
                <div key={k.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 flex justify-center items-center rounded-md" style={{ background: k.color+'18', color: k.color }}>
                      <k.icon size={15}/>
                    </div>
                    <div>
                      <h6 className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{k.label}</h6>
                      <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{k.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{k.value}</span>
                </div>
              ))}
              {kpis.filter(k => k.good).length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>Connect accounts to see top movers</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBSCRIPTION BANNER (if starter) ── */}
      {subscription?.plan_type === 'starter' && (
        <div className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, #3D1A00, #8B3A10)', border: '1px solid #C4783A33' }}>
          <div>
            <p className="text-xs font-bold text-amber-300 mb-1">🚀 You're on the Starter plan</p>
            <p className="text-sm font-bold text-white">Unlock ads analytics, unlimited AI captions, and more</p>
            <p className="text-xs text-amber-200 mt-0.5">Upgrade to Pro for $29/month and scale your agency faster</p>
          </div>
          <button onClick={() => onNavigate('billing')}
            className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-400 transition-all shadow-lg">
            Upgrade to Pro
          </button>
        </div>
      )}
    </div>
  );
}
