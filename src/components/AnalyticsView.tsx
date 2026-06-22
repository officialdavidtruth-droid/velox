import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Users, Eye, Heart, MousePointer, RefreshCw,
  ArrowUpRight, Info, Wifi, WifiOff, Zap, BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { api } from '../App';

interface Props {
  workspaceId: string;
  analytics: any[];
  history: any[];
  onRefresh: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#e1306c', facebook: '#1877f2', twitter: '#000000',
  linkedin: '#0a66c2', tiktok: '#fe2c55', youtube: '#ff0000',
};
const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👥', twitter: '🐦',
  linkedin: '💼', tiktok: '🎵', youtube: '▶️',
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString();
}

export default function AnalyticsView({ workspaceId, analytics, history, onRefresh }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>('');

  const token = localStorage.getItem('velox_token') || '';

  const handleSync = async () => {
    setSyncing(true); setSyncResult('');
    try {
      const r = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': token },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await r.json();
      if (data.synced > 0) {
        setSyncResult(`✓ Synced ${data.synced} platform${data.synced !== 1 ? 's' : ''} successfully`);
        onRefresh();
      } else {
        setSyncResult(data.message || 'No connected accounts to sync. Connect accounts first.');
      }
    } catch {
      setSyncResult('Sync failed — check your connection.');
    }
    setSyncing(false);
    setTimeout(() => setSyncResult(''), 5000);
  };

  // Filter by platform
  const filtered = selectedPlatform === 'all'
    ? analytics
    : analytics.filter(a => a.platform === selectedPlatform);

  const totals = filtered.reduce((acc, a) => ({
    followers:     acc.followers     + (a.followers     || 0),
    reach:         acc.reach         + (a.reach         || 0),
    impressions:   acc.impressions   + (a.impressions   || 0),
    engagement:    acc.engagement    + (a.engagement    || 0),
    clicks:        acc.clicks        + (a.clicks        || 0),
    profile_visits:acc.profile_visits+ (a.profile_visits|| 0),
  }), { followers: 0, reach: 0, impressions: 0, engagement: 0, clicks: 0, profile_visits: 0 });

  const engagementRate = totals.reach > 0
    ? ((totals.engagement / totals.reach) * 100).toFixed(2) + '%'
    : '—';

  // Chart data from real history
  const chartData = useMemo(() => {
    const records = selectedPlatform === 'all'
      ? history
      : history.filter(h => h.platform === selectedPlatform);
    const byDate: Record<string, any> = {};
    records.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date, followers: 0, reach: 0, engagement: 0, impressions: 0 };
      byDate[r.date].followers   += r.followers   || 0;
      byDate[r.date].reach       += r.reach       || 0;
      byDate[r.date].engagement  += r.engagement  || 0;
      byDate[r.date].impressions += r.impressions || 0;
    });
    return Object.values(byDate)
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .map((d: any) => ({ ...d, date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }));
  }, [history, selectedPlatform]);

  const hasData    = analytics.length > 0;
  const hasHistory = history.length > 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl mb-1" style={{ color: 'var(--text)' }}>Live Analytics</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Real data from your connected accounts — sync to pull the latest numbers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Platform filter */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)' }}>
            <button onClick={() => setSelectedPlatform('all')}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={selectedPlatform === 'all' ? { background: 'var(--card)', color: 'var(--text)' } : { color: 'var(--muted)' }}>
              All
            </button>
            {analytics.map(a => (
              <button key={a.platform} onClick={() => setSelectedPlatform(a.platform)}
                className="text-xs px-2 py-1.5 rounded-lg font-semibold transition-all"
                style={selectedPlatform === a.platform ? { background: 'var(--card)', color: 'var(--text)' } : { color: 'var(--muted)' }}>
                {PLATFORM_EMOJI[a.platform] || a.platform}
              </button>
            ))}
          </div>

          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: 'var(--primary)' }}>
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''}/>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="text-xs rounded-xl px-4 py-3"
          style={{ background: syncResult.startsWith('✓') ? 'var(--success-bg)' : 'var(--warning-bg)', color: syncResult.startsWith('✓') ? 'var(--success)' : 'var(--warning)' }}>
          {syncResult}
        </div>
      )}

      {/* No accounts connected */}
      {!hasData && (
        <div className="glow-card rounded-2xl p-12 text-center">
          <Wifi size={32} className="mx-auto mb-4" style={{ color: 'var(--muted)' }}/>
          <p className="font-semibold text-sm mb-2" style={{ color: 'var(--text)' }}>No analytics data yet</p>
          <p className="text-xs mb-4 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>
            Connect your social accounts in Settings → Connect Accounts, then click Sync Now to pull your real follower counts, reach, and engagement.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--primary)' }}>
            <Zap size={12}/> Go to Connect Accounts to get started
          </div>
        </div>
      )}

      {hasData && (
        <>
          {/* KPI Cards — real numbers only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Followers',  value: fmt(totals.followers),     color: '#8b5cf6', icon: <Users size={14}/> },
              { label: 'Organic Reach',    value: fmt(totals.reach),         color: '#3b82f6', icon: <Eye size={14}/> },
              { label: 'Impressions',      value: fmt(totals.impressions),   color: '#f59e0b', icon: <BarChart3 size={14}/> },
              { label: 'Engagement',       value: fmt(totals.engagement),    color: '#ef4444', icon: <Heart size={14}/> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="glow-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{label}</p>
                  <div className="p-2 rounded-xl" style={{ background: color + '15', color }}>{icon}</div>
                </div>
                <p className="text-2xl font-black font-mono" style={{ color: 'var(--text)' }}>{value}</p>
                {value === '0' || value === '0.0' ? (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Sync to update</p>
                ) : null}
              </div>
            ))}
          </div>

          {/* Engagement rate + clicks */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Engagement Rate', value: engagementRate, color: 'var(--success)' },
              { label: 'Link Clicks',     value: fmt(totals.clicks),         color: 'var(--info)' },
              { label: 'Profile Visits',  value: fmt(totals.profile_visits), color: 'var(--primary)' },
              { label: 'Platforms',       value: String(analytics.length),   color: '#9333ea' },
            ].map(({ label, value, color }) => (
              <div key={label} className="glow-card rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
                  <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Per-platform breakdown */}
          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Per-platform breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    {['Platform', 'Followers', 'Reach', 'Impressions', 'Engagement', 'Clicks', 'Last synced'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold uppercase tracking-wide text-[10px]" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {analytics.map(a => (
                    <tr key={a.platform}>
                      <td className="px-4 py-3 font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                        <span>{PLATFORM_EMOJI[a.platform] || '📱'}</span>
                        <span className="capitalize">{a.platform}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold" style={{ color: PLATFORM_COLORS[a.platform] || 'var(--text)' }}>{fmt(a.followers || 0)}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text)' }}>{fmt(a.reach || 0)}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text)' }}>{fmt(a.impressions || 0)}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text)' }}>{fmt(a.engagement || 0)}</td>
                      <td className="px-4 py-3 font-mono" style={{ color: 'var(--text)' }}>{fmt(a.clicks || 0)}</td>
                      <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--muted)' }}>
                        {a.last_updated ? new Date(a.last_updated).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts — only shown when history exists */}
          {hasHistory ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Followers trend */}
              <div className="lg:col-span-2 glow-card rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Follower growth over time</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradFollowers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                      <XAxis dataKey="date" stroke="var(--muted)" fontSize={10}/>
                      <YAxis stroke="var(--muted)" fontSize={10}/>
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}/>
                      <Area type="monotone" dataKey="followers" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gradFollowers)" name="Followers"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Engagement bar */}
              <div className="glow-card rounded-2xl p-5">
                <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Engagement (last 7 days)</h3>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(-7)} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                      <XAxis dataKey="date" stroke="var(--muted)" fontSize={9}/>
                      <YAxis stroke="var(--muted)" fontSize={9}/>
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}/>
                      <Bar dataKey="engagement" fill="var(--success)" radius={[4, 4, 0, 0]} name="Engagement"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="glow-card rounded-2xl p-8 text-center">
              <BarChart3 size={24} className="mx-auto mb-2" style={{ color: 'var(--muted)' }}/>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No history yet</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Charts will appear after your first sync. Each sync saves a daily snapshot for trend analysis.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
