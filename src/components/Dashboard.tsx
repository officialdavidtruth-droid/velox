import React, { useState, useEffect } from 'react';
import {
  Sparkles, TrendingUp, Users, Zap, Globe, Calendar,
  ArrowRight, RefreshCw, Target, DollarSign, BarChart3,
  Clock, CheckCircle2, AlertCircle, Plus, Eye, Heart
} from 'lucide-react';

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

export default function Dashboard({ user, workspaceId, analytics, posts, subscription, onNavigate }: DashboardProps) {
  const [brief, setBrief] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
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

  const generateBrief = async () => {
    setBriefLoading(true);
    try {
      const r = await fetch(`/api/ai/brief?workspaceId=${workspaceId}`, { headers: { 'x-session-token': token } });
      const d = await r.json();
      setBrief(d.brief);
    } catch {}
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

  const kpis = [
    { label: 'Total Followers', value: fmt(totalFollowers), icon: Users, color: '#8B3A10', change: '+2.4%', good: true, action: 'analytics', desc: 'Across all platforms' },
    { label: 'Total Reach', value: fmt(totalReach), icon: Eye, color: '#1877f2', change: '+8.1%', good: true, action: 'analytics', desc: 'Last 30 days' },
    { label: 'Engagements', value: fmt(totalEngagement), icon: Heart, color: '#e1306c', change: '+5.3%', good: true, action: 'analytics', desc: 'Likes, comments, shares' },
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

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── HERO GREETING ── */}
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(139,58,16,0.1) 0%, transparent 60%)' }}/>
        <div className="absolute top-0 right-0 w-64 h-32 opacity-5 pointer-events-none"
          style={{ background: 'linear-gradient(135deg, var(--primary), transparent)', borderRadius: '0 16px 0 100%' }}/>
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

        {/* AI Brief */}
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

        {/* ── PLATFORM PERFORMANCE ── */}
        <div className="lg:col-span-2 glow-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Platform Performance</h2>
            <button onClick={() => onNavigate('analytics')}
              className="text-xs font-semibold flex items-center gap-1 transition-all hover:gap-2"
              style={{ color: 'var(--primary)' }}>
              Full analytics <ArrowRight size={11}/>
            </button>
          </div>
          {analytics.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'var(--surface)' }}>
                <TrendingUp size={20} style={{ color: 'var(--muted)' }}/>
              </div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>No data yet</p>
              <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Connect accounts then sync to see performance</p>
              <button onClick={() => onNavigate('accounts-connector')}
                className="text-xs font-semibold px-4 py-2 rounded-xl text-white gradient-primary">
                Connect Accounts
              </button>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {analytics.map(a => {
                const color = PLATFORM_COLORS[a.platform] || 'var(--primary)';
                const maxFollowers = Math.max(...analytics.map(x => x.followers || 0), 1);
                const pct = Math.round(((a.followers || 0) / maxFollowers) * 100);
                return (
                  <div key={a.platform} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm capitalize font-bold shrink-0"
                      style={{ background: color+'20', color }}>
                      {a.platform.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold capitalize" style={{ color: 'var(--text)' }}>{a.platform}</span>
                        <span className="text-xs font-mono font-bold" style={{ color }}>{fmt(a.followers || 0)}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>{fmt(a.reach || 0)} reach</p>
                      <p className="text-[10px]" style={{ color: 'var(--success)' }}>{fmt(a.engagement || 0)} eng</p>
                    </div>
                  </div>
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

      {/* ── LEAD PIPELINE SNAPSHOT ── */}
      {leads.length > 0 && (
        <div className="glow-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Lead Pipeline</h2>
            <button onClick={() => onNavigate('pipeline')}
              className="text-xs font-semibold flex items-center gap-1" style={{ color: 'var(--primary)' }}>
              Full pipeline <ArrowRight size={11}/>
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {['new','contacted','proposal','negotiating','won'].map(stage => {
              const count = leads.filter(l => (l.status || 'new') === stage).length;
              const colors: Record<string,string> = {
                new:'var(--info)', contacted:'var(--primary)', proposal:'var(--warning)',
                negotiating:'#8b5cf6', won:'var(--success)'
              };
              return (
                <div key={stage} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xl font-black font-mono" style={{ color: colors[stage] }}>{count}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide mt-0.5 capitalize" style={{ color: 'var(--muted)' }}>{stage}</p>
                </div>
              );
            })}
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
