import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins, TrendingUp, DollarSign, BarChart3, Plus, Trash2,
  RefreshCw, Info, Save, AlertCircle, ExternalLink
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area
} from 'recharts';
import { api } from '../App';

interface AdEntry {
  id: string;
  platform: string;
  campaign: string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  revenue: number;
}

const PLATFORMS = [
  { id: 'meta_ads',    name: 'Meta Ads',    emoji: '📘', color: '#1877F2' },
  { id: 'google_ads',  name: 'Google Ads',  emoji: '🔍', color: '#4285f4' },
  { id: 'tiktok_ads',  name: 'TikTok Ads',  emoji: '🎵', color: '#fe2c55' },
  { id: 'linkedin_ads',name: 'LinkedIn Ads',emoji: '💼', color: '#0077b5' },
];

function fmt(n: number, prefix = '$') {
  if (n >= 1_000_000) return `${prefix}${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${prefix}${(n/1_000).toFixed(1)}k`;
  return `${prefix}${n.toLocaleString()}`;
}
function pct(n: number) { return n.toFixed(2) + '%'; }
function money(n: number) { return '$' + n.toFixed(2); }

export default function RoasAnalytics({ workspaceId }: { workspaceId?: string }) {
  const [analytics,    setAnalytics]    = useState<any[]>([]);
  const [history,      setHistory]      = useState<any[]>([]);
  const [adEntries,    setAdEntries]    = useState<AdEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saved,        setSaved]        = useState(false);
  const [avgOrderValue,setAvgOrderValue]= useState(100);

  // Load real analytics from Supabase
  useEffect(() => {
    if (!workspaceId) { setLoading(false); return; }
    Promise.all([
      api.get(`/api/analytics?workspaceId=${workspaceId}`),
      api.get(`/api/analytics/history?workspaceId=${workspaceId}`),
    ]).then(([a, h]) => {
      setAnalytics(Array.isArray(a) ? a : []);
      setHistory(Array.isArray(h) ? h : []);
      setLoading(false);
    });

    // Load saved ad entries from localStorage
    const saved = localStorage.getItem(`velox_ads_${workspaceId}`);
    if (saved) {
      try { setAdEntries(JSON.parse(saved)); } catch {}
    }
  }, [workspaceId]);

  const addEntry = () => {
    setAdEntries(prev => [...prev, {
      id: Date.now().toString(),
      platform: 'meta_ads', campaign: '',
      spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0
    }]);
  };

  const updateEntry = (id: string, key: keyof AdEntry, value: any) => {
    setAdEntries(prev => prev.map(e => e.id === id ? { ...e, [key]: value } : e));
  };

  const removeEntry = (id: string) => {
    setAdEntries(prev => prev.filter(e => e.id !== id));
  };

  const saveEntries = () => {
    if (workspaceId) localStorage.setItem(`velox_ads_${workspaceId}`, JSON.stringify(adEntries));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Calculations from real entered data
  const totals = useMemo(() => {
    const totalSpend       = adEntries.reduce((s, e) => s + (Number(e.spend) || 0), 0);
    const totalClicks      = adEntries.reduce((s, e) => s + (Number(e.clicks) || 0), 0);
    const totalImpressions = adEntries.reduce((s, e) => s + (Number(e.impressions) || 0), 0);
    const totalConversions = adEntries.reduce((s, e) => s + (Number(e.conversions) || 0), 0);
    const totalRevenue     = adEntries.reduce((s, e) => s + (Number(e.revenue) || (Number(e.conversions) * avgOrderValue)), 0);
    const roas    = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const ctr     = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc     = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpa     = totalConversions > 0 ? totalSpend / totalConversions : 0;
    return { totalSpend, totalClicks, totalImpressions, totalConversions, totalRevenue, roas, ctr, cpc, cpa };
  }, [adEntries, avgOrderValue]);

  // Chart combining social history + ad spend over time
  const chartData = useMemo(() => {
    const byDate: Record<string, any> = {};
    history.forEach(h => {
      if (!byDate[h.date]) byDate[h.date] = { date: h.date };
      byDate[h.date][h.platform + '_reach'] = h.reach || 0;
      byDate[h.date][h.platform + '_engagement'] = h.engagement || 0;
    });
    return Object.values(byDate).slice(-14);
  }, [history]);

  // Per-platform ad breakdown
  const byPlatform = useMemo(() => {
    const map: Record<string, { spend: number; revenue: number; conversions: number; clicks: number; impressions: number }> = {};
    adEntries.forEach(e => {
      if (!map[e.platform]) map[e.platform] = { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0 };
      map[e.platform].spend       += Number(e.spend) || 0;
      map[e.platform].revenue     += Number(e.revenue) || (Number(e.conversions) * avgOrderValue);
      map[e.platform].conversions += Number(e.conversions) || 0;
      map[e.platform].clicks      += Number(e.clicks) || 0;
      map[e.platform].impressions += Number(e.impressions) || 0;
    });
    return map;
  }, [adEntries, avgOrderValue]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--primary)' }}/>
    </div>
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl mb-1" style={{ color: 'var(--text)' }}>Ads & ROAS Analytics</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Enter your real ad spend data — ROAS and metrics calculated instantly from your actual numbers
          </p>
        </div>
      </div>

      {/* Info notice */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'var(--info-bg)', border: '1px solid var(--info)' }}>
        <Info size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--info)' }}/>
        <div>
          <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--info)' }}>How this works</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-soft)' }}>
            Enter your ad spend, clicks, impressions, and conversions from your Meta Ads Manager, Google Ads, or TikTok Ads dashboard. VeloxSpace calculates ROAS, CTR, CPC, and CPA from your real numbers. Data is saved to your browser.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'ROAS', value: totals.roas > 0 ? totals.roas.toFixed(2) + 'x' : '—', color: totals.roas >= 3 ? 'var(--success)' : totals.roas > 1 ? 'var(--warning)' : 'var(--muted)', sub: totals.roas >= 3 ? '🔥 Profitable' : totals.roas > 1 ? '⚠️ Marginal' : 'Enter data above' },
          { label: 'Total Ad Spend', value: totals.totalSpend > 0 ? fmt(totals.totalSpend) : '$0', color: 'var(--danger)', sub: `${adEntries.length} campaign${adEntries.length !== 1 ? 's' : ''}` },
          { label: 'Total Revenue', value: totals.totalRevenue > 0 ? fmt(totals.totalRevenue) : '$0', color: 'var(--success)', sub: `${totals.totalConversions} conversions` },
          { label: 'CTR', value: totals.ctr > 0 ? pct(totals.ctr) : '—', color: 'var(--primary)', sub: `${(totals.totalClicks).toLocaleString()} clicks` },
          { label: 'CPA', value: totals.cpa > 0 ? money(totals.cpa) : '—', color: 'var(--warning)', sub: 'Cost per acquisition' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="glow-card rounded-2xl p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>{label}</p>
            <p className="text-2xl font-black font-mono mb-1" style={{ color }}>{value}</p>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Average order value */}
      <div className="glow-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={15} style={{ color: 'var(--primary)' }}/>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Average order / conversion value</span>
          <span className="text-xs ml-auto font-mono font-bold" style={{ color: 'var(--primary)' }}>${avgOrderValue}</span>
        </div>
        <input type="range" min="10" max="10000" step="10" value={avgOrderValue}
          onChange={e => setAvgOrderValue(Number(e.target.value))}
          className="w-full h-2 rounded-full outline-none cursor-pointer"
          style={{ accentColor: 'var(--primary)' }}/>
        <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
          <span>$10</span>
          <span>Used when revenue is not entered per campaign</span>
          <span>$10,000</span>
        </div>
      </div>

      {/* Campaign entries */}
      <div className="glow-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Campaign data</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Enter your real numbers from your ads dashboards</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={saveEntries}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all"
              style={{ borderColor: saved ? 'var(--success)' : 'var(--border)', color: saved ? 'var(--success)' : 'var(--muted)' }}>
              <Save size={12}/>{saved ? 'Saved!' : 'Save'}
            </button>
            <button onClick={addEntry}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl text-white font-semibold"
              style={{ background: 'var(--primary)' }}>
              <Plus size={12}/> Add campaign
            </button>
          </div>
        </div>

        {adEntries.length === 0 ? (
          <div className="p-10 text-center">
            <BarChart3 size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }}/>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No ad data yet</p>
            <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>Click "Add campaign" and enter your real numbers from Meta Ads, Google Ads, or TikTok Ads</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                { name: 'Meta Ads Manager', url: 'https://adsmanager.facebook.com' },
                { name: 'Google Ads', url: 'https://ads.google.com' },
                { name: 'TikTok Ads', url: 'https://ads.tiktok.com' },
              ].map(p => (
                <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
                  style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
                  {p.name} <ExternalLink size={10}/>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Platform', 'Campaign name', 'Spend ($)', 'Clicks', 'Impressions', 'Conversions', 'Revenue ($)', 'ROAS', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold uppercase tracking-wide whitespace-nowrap text-[10px]" style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {adEntries.map(entry => {
                  const pl = PLATFORMS.find(p => p.id === entry.platform);
                  const rev = Number(entry.revenue) || (Number(entry.conversions) * avgOrderValue);
                  const roas = Number(entry.spend) > 0 ? (rev / Number(entry.spend)).toFixed(2) : '—';
                  return (
                    <tr key={entry.id}>
                      <td className="px-4 py-2">
                        <select value={entry.platform} onChange={e => updateEntry(entry.id, 'platform', e.target.value)}
                          className="text-xs rounded-lg px-2 py-1.5 border outline-none"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                          {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input value={entry.campaign} onChange={e => updateEntry(entry.id, 'campaign', e.target.value)}
                          placeholder="Campaign name…"
                          className="w-36 text-xs rounded-lg px-2 py-1.5 border outline-none"
                          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                      </td>
                      {(['spend','clicks','impressions','conversions','revenue'] as const).map(field => (
                        <td key={field} className="px-4 py-2">
                          <input type="number" value={entry[field] || ''} onChange={e => updateEntry(entry.id, field, parseFloat(e.target.value) || 0)}
                            placeholder="0" min="0"
                            className="w-24 text-xs rounded-lg px-2 py-1.5 border outline-none font-mono"
                            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                        </td>
                      ))}
                      <td className="px-4 py-2">
                        <span className="font-mono font-bold text-xs"
                          style={{ color: Number(roas) >= 3 ? 'var(--success)' : Number(roas) > 1 ? 'var(--warning)' : 'var(--muted)' }}>
                          {roas !== '—' ? roas + 'x' : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => removeEntry(entry.id)} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--danger)' }}>
                          <Trash2 size={12}/>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t font-bold" style={{ borderColor: 'var(--border)' }}>
                <tr>
                  <td className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }} colSpan={2}>Totals</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--danger)' }}>${totals.totalSpend.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text)' }}>{totals.totalClicks.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text)' }}>{totals.totalImpressions.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text)' }}>{totals.totalConversions}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--success)' }}>${totals.totalRevenue.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-xs font-bold" style={{ color: totals.roas >= 3 ? 'var(--success)' : 'var(--warning)' }}>
                    {totals.roas > 0 ? totals.roas.toFixed(2) + 'x' : '—'}
                  </td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Per-platform breakdown */}
      {Object.keys(byPlatform).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(byPlatform).map(([platformId, data]) => {
            const pl = PLATFORMS.find(p => p.id === platformId);
            const roas = data.spend > 0 ? data.revenue / data.spend : 0;
            return (
              <div key={platformId} className="glow-card rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{pl?.emoji}</span>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{pl?.name}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Spend</span><span className="font-mono font-semibold" style={{ color: 'var(--danger)' }}>${data.spend.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Revenue</span><span className="font-mono font-semibold" style={{ color: 'var(--success)' }}>${data.revenue.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>ROAS</span><span className="font-mono font-bold" style={{ color: roas >= 3 ? 'var(--success)' : roas > 1 ? 'var(--warning)' : 'var(--danger)' }}>{roas > 0 ? roas.toFixed(2) + 'x' : '—'}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Conversions</span><span className="font-mono" style={{ color: 'var(--text)' }}>{data.conversions}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Real analytics chart from connected accounts */}
      {analytics.length > 0 && (
        <div className="glow-card rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text)' }}>Real social analytics from connected accounts</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {analytics.map(a => (
              <div key={a.platform} className="text-center p-3 rounded-xl" style={{ background: 'var(--surface)' }}>
                <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: 'var(--muted)' }}>{a.platform}</p>
                <p className="text-lg font-black font-mono" style={{ color: 'var(--primary)' }}>
                  {a.followers >= 1000 ? (a.followers/1000).toFixed(1) + 'k' : a.followers}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--muted)' }}>followers</p>
              </div>
            ))}
          </div>

          {history.length > 0 && chartData.length > 0 && (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                  <XAxis dataKey="date" stroke="var(--muted)" fontSize={10}
                    tickFormatter={v => v ? new Date(v).toLocaleDateString(undefined, { month:'short', day:'numeric' }) : ''}/>
                  <YAxis stroke="var(--muted)" fontSize={10}/>
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11 }}/>
                  {analytics.slice(0, 3).map((a, i) => {
                    const colors = ['#6366f1','#10b981','#f59e0b'];
                    return <Area key={a.platform} type="monotone" dataKey={a.platform + '_reach'} stroke={colors[i]} fill={colors[i] + '20'} strokeWidth={2} name={a.platform + ' reach'}/>;
                  })}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {history.length === 0 && (
            <div className="py-8 text-center rounded-xl" style={{ background: 'var(--surface)' }}>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Sync your connected accounts to see analytics history trends</p>
            </div>
          )}
        </div>
      )}

      {analytics.length === 0 && adEntries.length === 0 && (
        <div className="glow-card rounded-2xl p-10 text-center">
          <TrendingUp size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }}/>
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text)' }}>No data yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Connect your social accounts and add your ad campaign data to see real ROAS analytics</p>
        </div>
      )}
    </div>
  );
}
