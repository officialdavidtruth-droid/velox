import React, { useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Users, Eye, Heart, MousePointer, Zap, Calendar, ChevronDown, ArrowUpRight, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

interface Props {
  workspaceId: string;
  analytics: any[];
  history: any[];
  onRefresh: () => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram:'#e1306c', facebook:'#1877f2', twitter:'#000',
  linkedin:'#0a66c2', tiktok:'#fe2c55', youtube:'#ff0000',
};
const PLATFORM_EMOJI: Record<string, string> = {
  instagram:'📸', facebook:'👥', twitter:'🐦',
  linkedin:'💼', tiktok:'🎵', youtube:'▶️',
};

function fmt(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M';
  if (n >= 1_000)     return (n/1_000).toFixed(1)+'k';
  return n.toLocaleString();
}
function delta(curr: number, prev: number) {
  if (!prev) return null;
  return ((curr - prev) / prev * 100).toFixed(1);
}

const DATE_RANGES = [
  { label:'Last 7 days', days:7 },
  { label:'Last 14 days', days:14 },
  { label:'Last 30 days', days:30 },
  { label:'Last 90 days', days:90 },
];

export default function AnalyticsView({ workspaceId, analytics, history, onRefresh }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [dateRange, setDateRange]               = useState(30);
  const [syncing, setSyncing]                   = useState(false);
  const [syncMsg, setSyncMsg]                   = useState('');
  const [activeMetric, setActiveMetric]         = useState<'followers'|'reach'|'impressions'|'engagement'>('followers');
  const token = localStorage.getItem('velox_token') || '';

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const r = await fetch('/api/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': token },
        body: JSON.stringify({ workspaceId }),
      });
      const d = await r.json();
      setSyncMsg(d.synced > 0 ? `✓ Synced ${d.synced} platform${d.synced!==1?'s':''} successfully` : (d.message || 'No connected accounts found. Connect accounts first.'));
      if (d.synced > 0) onRefresh();
    } catch { setSyncMsg('Sync failed — check your connection.'); }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 5000);
  };

  const filtered = selectedPlatform === 'all' ? analytics : analytics.filter(a => a.platform === selectedPlatform);

  const totals = filtered.reduce((acc, a) => ({
    followers:      acc.followers      + (a.followers      || 0),
    reach:          acc.reach          + (a.reach          || 0),
    impressions:    acc.impressions    + (a.impressions    || 0),
    engagement:     acc.engagement     + (a.engagement     || 0),
    clicks:         acc.clicks         + (a.clicks         || 0),
    profile_visits: acc.profile_visits + (a.profile_visits || 0),
  }), { followers:0, reach:0, impressions:0, engagement:0, clicks:0, profile_visits:0 });

  const engagementRate = totals.reach > 0 ? ((totals.engagement/totals.reach)*100).toFixed(2)+'%' : '—';

  // Chart data filtered by date range
  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - dateRange);
    const records = (selectedPlatform === 'all' ? history : history.filter(h => h.platform === selectedPlatform))
      .filter(h => new Date(h.date) >= cutoff);
    const byDate: Record<string, any> = {};
    records.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { date: r.date, followers:0, reach:0, engagement:0, impressions:0, clicks:0 };
      byDate[r.date].followers   += r.followers   || 0;
      byDate[r.date].reach       += r.reach       || 0;
      byDate[r.date].engagement  += r.engagement  || 0;
      byDate[r.date].impressions += r.impressions || 0;
      byDate[r.date].clicks      += r.clicks      || 0;
    });
    return Object.values(byDate)
      .sort((a:any,b:any) => a.date.localeCompare(b.date))
      .map((d:any) => ({ ...d, date: new Date(d.date).toLocaleDateString(undefined,{month:'short',day:'numeric'}) }));
  }, [history, selectedPlatform, dateRange]);

  // Previous period for delta
  const prevChartData = useMemo(() => {
    const end = new Date(); end.setDate(end.getDate() - dateRange);
    const start = new Date(end); start.setDate(start.getDate() - dateRange);
    return history.filter(h => {
      const d = new Date(h.date);
      return d >= start && d < end && (selectedPlatform === 'all' || h.platform === selectedPlatform);
    });
  }, [history, selectedPlatform, dateRange]);

  const prevTotals = prevChartData.reduce((acc, a) => ({
    followers: acc.followers+(a.followers||0), reach: acc.reach+(a.reach||0),
    engagement: acc.engagement+(a.engagement||0), impressions: acc.impressions+(a.impressions||0),
  }), { followers:0, reach:0, engagement:0, impressions:0 });

  // Pie for platform distribution
  const pieData = analytics.map(a => ({
    name: a.platform, value: a.followers || 0, color: PLATFORM_COLORS[a.platform] || '#888',
  })).filter(d => d.value > 0);

  const METRICS = [
    { key:'followers',  label:'Followers',    value: fmt(totals.followers),   raw: totals.followers,   prev: prevTotals.followers,   color:'#8b5cf6', Icon:Users },
    { key:'reach',      label:'Reach',        value: fmt(totals.reach),       raw: totals.reach,       prev: prevTotals.reach,       color:'#3b82f6', Icon:Eye },
    { key:'impressions',label:'Impressions',  value: fmt(totals.impressions), raw: totals.impressions, prev: prevTotals.impressions, color:'#f59e0b', Icon:BarChart3 },
    { key:'engagement', label:'Engagements',  value: fmt(totals.engagement),  raw: totals.engagement,  prev: prevTotals.engagement,  color:'#ef4444', Icon:Heart },
  ] as const;

  const hasData    = analytics.length > 0;
  const hasHistory = chartData.length > 0;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl" style={{ color:'var(--text)' }}>Analytics</h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>Real data from your connected social accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range */}
          <select value={dateRange} onChange={e => setDateRange(Number(e.target.value))}
            className="text-xs rounded-xl px-3 py-2 border outline-none cursor-pointer font-semibold"
            style={{ background:'var(--surface)', borderColor:'var(--border)', color:'var(--text)' }}>
            {DATE_RANGES.map(r => <option key={r.days} value={r.days}>{r.label}</option>)}
          </select>
          {/* Platform filter */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background:'var(--surface)' }}>
            <button onClick={() => setSelectedPlatform('all')}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
              style={selectedPlatform==='all' ? {background:'var(--card)',color:'var(--text)'} : {color:'var(--muted)'}}>
              All
            </button>
            {analytics.map(a => (
              <button key={a.platform} onClick={() => setSelectedPlatform(a.platform)}
                title={a.platform}
                className="text-xs px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                style={selectedPlatform===a.platform ? {background:'var(--card)',color:'var(--text)'} : {color:'var(--muted)'}}>
                {PLATFORM_EMOJI[a.platform] || a.platform}
              </button>
            ))}
          </div>
          <button onClick={handleSync} disabled={syncing}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold text-white transition-all disabled:opacity-60 cursor-pointer"
            style={{ background:'var(--primary)' }}>
            <RefreshCw size={12} className={syncing?'animate-spin':''}/>
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="text-xs rounded-xl px-4 py-3 font-medium"
          style={{ background: syncMsg.startsWith('✓') ? 'var(--success-bg)' : 'var(--warning-bg)', color: syncMsg.startsWith('✓') ? 'var(--success)' : 'var(--warning)' }}>
          {syncMsg}
        </div>
      )}

      {!hasData ? (
        <div className="glow-card rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4" style={{ background:'var(--surface)' }}>📊</div>
          <p className="font-bold text-sm mb-2" style={{ color:'var(--text)' }}>No analytics data yet</p>
          <p className="text-xs leading-relaxed max-w-xs mx-auto mb-4" style={{ color:'var(--muted)' }}>
            Connect your social accounts then click Sync to pull real follower counts, reach, impressions, and engagement from your profiles.
          </p>
          <p className="text-xs font-semibold" style={{ color:'var(--primary)' }}>⚡ Go to Connect Accounts in the sidebar</p>
        </div>
      ) : (
        <>
          {/* Metric cards — GA4 style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {METRICS.map(({ key, label, value, raw, prev, color, Icon }) => {
              const d = delta(raw, prev);
              const isUp = d !== null && parseFloat(d) >= 0;
              return (
                <button key={key}
                  onClick={() => setActiveMetric(key as any)}
                  className="glow-card rounded-2xl p-5 text-left transition-all cursor-pointer w-full"
                  style={activeMetric===key ? { borderColor:color, boxShadow:`0 0 0 2px ${color}30` } : {}}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:color+'15', color }}>
                      <Icon size={16}/>
                    </div>
                    {d !== null && (
                      <span className="text-[10px] font-bold flex items-center gap-0.5"
                        style={{ color: isUp ? 'var(--success)' : 'var(--danger)' }}>
                        {isUp ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                        {Math.abs(parseFloat(d))}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-black font-mono mb-0.5" style={{ color:'var(--text)' }}>{value}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color:'var(--muted)' }}>{label}</p>
                  {activeMetric===key && <div className="w-full h-0.5 rounded-full mt-3" style={{ background:color }}/>}
                </button>
              );
            })}
          </div>

          {/* Main chart */}
          {hasHistory ? (
            <div className="glow-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm" style={{ color:'var(--text)' }}>
                    {METRICS.find(m=>m.key===activeMetric)?.label} over time
                  </h3>
                  <p className="text-[10px] mt-0.5" style={{ color:'var(--muted)' }}>Click a metric card above to change the chart</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-xl font-semibold" style={{ background:'var(--success-bg)', color:'var(--success)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                  Live data
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top:5, right:5, left:-20, bottom:0 }}>
                    <defs>
                      <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={METRICS.find(m=>m.key===activeMetric)?.color||'#6366f1'} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={METRICS.find(m=>m.key===activeMetric)?.color||'#6366f1'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="date" stroke="var(--muted)" fontSize={10} tickLine={false}/>
                    <YAxis stroke="var(--muted)" fontSize={10} tickLine={false} axisLine={false}/>
                    <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, fontSize:11 }}
                      cursor={{ stroke:'var(--border)', strokeWidth:1 }}/>
                    <Area type="monotone" dataKey={activeMetric}
                      stroke={METRICS.find(m=>m.key===activeMetric)?.color||'#6366f1'}
                      strokeWidth={2.5} fill="url(#metricGrad)"
                      name={METRICS.find(m=>m.key===activeMetric)?.label}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="glow-card rounded-2xl p-8 text-center">
              <BarChart3 size={24} className="mx-auto mb-2" style={{ color:'var(--muted)' }}/>
              <p className="font-semibold text-sm mb-1" style={{ color:'var(--text)' }}>Sync to see charts</p>
              <p className="text-xs" style={{ color:'var(--muted)' }}>Charts appear after your first sync. Each sync saves a daily snapshot for trend analysis.</p>
            </div>
          )}

          {/* Per-platform breakdown + pie */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Table */}
            <div className="lg:col-span-2 glow-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor:'var(--border)' }}>
                <h3 className="font-bold text-sm" style={{ color:'var(--text)' }}>Platform breakdown</h3>
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background:'var(--primary-soft)', color:'var(--primary)' }}>
                  {analytics.length} connected
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['Platform','Followers','Reach','Impressions','Engagement','ER %','Last sync'].map(h=>(
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wide" style={{ color:'var(--muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.map(a => {
                      const er = a.reach > 0 ? ((a.engagement/a.reach)*100).toFixed(2)+'%' : '—';
                      return (
                        <tr key={a.platform} className="cursor-pointer transition-all"
                          onClick={() => setSelectedPlatform(a.platform===selectedPlatform?'all':a.platform)}
                          style={{ borderBottom:'1px solid var(--border)', background: selectedPlatform===a.platform ? 'var(--primary-soft)' : 'transparent' }}>
                          <td className="px-4 py-3 font-semibold flex items-center gap-2" style={{ color:'var(--text)' }}>
                            <span style={{ color:PLATFORM_COLORS[a.platform]||'#888' }}>{PLATFORM_EMOJI[a.platform]||'📱'}</span>
                            <span className="capitalize">{a.platform}</span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold" style={{ color:PLATFORM_COLORS[a.platform]||'var(--text)' }}>{fmt(a.followers||0)}</td>
                          <td className="px-4 py-3 font-mono" style={{ color:'var(--text)' }}>{fmt(a.reach||0)}</td>
                          <td className="px-4 py-3 font-mono" style={{ color:'var(--text)' }}>{fmt(a.impressions||0)}</td>
                          <td className="px-4 py-3 font-mono" style={{ color:'var(--text)' }}>{fmt(a.engagement||0)}</td>
                          <td className="px-4 py-3 font-mono font-semibold" style={{ color:'var(--success)' }}>{er}</td>
                          <td className="px-4 py-3 text-[10px]" style={{ color:'var(--muted)' }}>
                            {a.last_updated ? new Date(a.last_updated).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Never'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audience distribution pie */}
            <div className="glow-card rounded-2xl p-5">
              <h3 className="font-bold text-sm mb-4" style={{ color:'var(--text)' }}>Audience distribution</h3>
              {pieData.length > 0 ? (
                <>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                        </Pie>
                        <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:11 }} formatter={(v:any)=>fmt(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {pieData.map(d => {
                      const pct = totals.followers > 0 ? ((d.value/totals.followers)*100).toFixed(0) : '0';
                      return (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background:d.color }}/>
                            <span className="text-xs capitalize" style={{ color:'var(--text)' }}>{d.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono" style={{ color:'var(--muted)' }}>{fmt(d.value)}</span>
                            <span className="text-[10px] font-bold" style={{ color:d.color }}>{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="text-xs text-center py-8" style={{ color:'var(--muted)' }}>No follower data yet</p>
              )}
            </div>
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label:'Engagement Rate', value:engagementRate, color:'var(--success)', desc:'Engagement ÷ Reach' },
              { label:'Total Clicks',    value:fmt(totals.clicks),         color:'var(--info)',    desc:'Link clicks across platforms' },
              { label:'Profile Visits',  value:fmt(totals.profile_visits), color:'var(--primary)', desc:'Profile views this period' },
              { label:'Accounts',        value:String(analytics.length),   color:'#9333ea',        desc:'Connected platforms' },
            ].map(({ label, value, color, desc }) => (
              <div key={label} className="glow-card rounded-2xl p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color:'var(--muted)' }}>{label}</p>
                <p className="text-xl font-black font-mono mb-0.5" style={{ color }}>{value}</p>
                <p className="text-[10px]" style={{ color:'var(--muted)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
