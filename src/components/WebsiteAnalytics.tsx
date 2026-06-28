import React, { useState, useEffect } from 'react';
import { Globe, Link, Copy, Check, Plus, Trash2, RefreshCw, ExternalLink, BarChart3, TrendingUp, Users, MousePointer } from 'lucide-react';

interface WebsiteAnalyticsProps { workspaceId: string; }

const SOURCES = ['meta','google','tiktok','linkedin','twitter','email','sms','other'];
const MEDIUMS = ['paid','cpc','organic','social','email','referral','banner'];

function fmt(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M';
  if (n >= 1_000) return (n/1_000).toFixed(1)+'k';
  return n.toLocaleString();
}

export default function WebsiteAnalytics({ workspaceId }: WebsiteAnalyticsProps) {
  const [utmLinks, setUtmLinks] = useState<any[]>([]);
  const [ga4Data, setGa4Data] = useState<any[]>([]);
  const [ga4Connected, setGa4Connected] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState<string|null>(null);
  const [tab, setTab] = useState<'overview'|'utm'>('overview');
  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

  // UTM form
  const [utm, setUtm] = useState({
    base_url: '', source: 'meta', medium: 'paid', campaign: '',
    content: '', term: '', label: ''
  });

  useEffect(() => { loadLinks(); checkGA4(); }, [workspaceId]);

  const loadLinks = async () => {
    const r = await fetch(`/api/utm/links?workspaceId=${workspaceId}`, { headers: h });
    const d = await r.json();
    setUtmLinks(Array.isArray(d) ? d : []);
  };

  const checkGA4 = async () => {
    const r = await fetch(`/api/social-accounts?workspaceId=${workspaceId}`, { headers: h });
    const d = await r.json();
    const ga4 = (Array.isArray(d) ? d : []).find((a: any) => a.platform === 'ga4');
    if (ga4) { setGa4Connected(true); setPropertyId(ga4.handle || ''); }
  };

  const buildUrl = () => {
    if (!utm.base_url) return '';
    try {
      const url = new URL(utm.base_url.startsWith('http') ? utm.base_url : `https://${utm.base_url}`);
      if (utm.source)   url.searchParams.set('utm_source', utm.source);
      if (utm.medium)   url.searchParams.set('utm_medium', utm.medium);
      if (utm.campaign) url.searchParams.set('utm_campaign', utm.campaign.toLowerCase().replace(/\s+/g,'_'));
      if (utm.content)  url.searchParams.set('utm_content', utm.content.toLowerCase().replace(/\s+/g,'_'));
      if (utm.term)     url.searchParams.set('utm_term', utm.term.toLowerCase().replace(/\s+/g,'_'));
      return url.toString();
    } catch { return utm.base_url; }
  };

  const utmUrl = buildUrl();

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveLink = async () => {
    if (!utmUrl || !utm.campaign) return;
    await fetch('/api/utm/save', {
      method:'POST', headers:h,
      body:JSON.stringify({ workspace_id:workspaceId, label:utm.label||utm.campaign, original_url:utm.base_url, utm_url:utmUrl, source:utm.source, medium:utm.medium, campaign:utm.campaign })
    });
    setUtm(u => ({ ...u, label:'', campaign:'', content:'', term:'' }));
    loadLinks();
  };

  const deleteLink = async (id: string) => {
    await fetch(`/api/utm/links/${id}`, { method:'DELETE', headers:h });
    loadLinks();
  };

  const connectGA4 = async () => {
    if (!propertyId) return;
    setConnecting(true);
    // Store GA4 property ID — user must have Google OAuth done already
    const accounts = await fetch(`/api/social-accounts?workspaceId=${workspaceId}`, { headers:h }).then(r=>r.json());
    const google = (Array.isArray(accounts) ? accounts : []).find((a: any) => a.platform === 'youtube' || a.platform === 'google');
    await fetch('/api/website-analytics/connect', {
      method:'POST', headers:h,
      body:JSON.stringify({ workspaceId, propertyId, accessToken: google?.access_token || '' })
    });
    setGa4Connected(true);
    setConnecting(false);
    syncGA4();
  };

  const syncGA4 = async () => {
    setSyncing(true);
    const r = await fetch('/api/website-analytics/sync', { method:'POST', headers:h, body:JSON.stringify({ workspaceId }) });
    const d = await r.json();
    if (d.success && d.data) setGa4Data(d.data);
    setSyncing(false);
  };

  // Aggregate GA4 traffic sources
  const totalSessions = ga4Data.reduce((s: number, r: any) => s + parseInt(r.metricValues?.[0]?.value||'0'), 0);
  const totalUsers = ga4Data.reduce((s: number, r: any) => s + parseInt(r.metricValues?.[1]?.value||'0'), 0);
  const totalConversions = ga4Data.reduce((s: number, r: any) => s + parseInt(r.metricValues?.[5]?.value||'0'), 0);

  const trafficSources = ga4Data.map((r: any) => ({
    source: r.dimensionValues?.[0]?.value || 'Unknown',
    sessions: parseInt(r.metricValues?.[0]?.value||'0'),
    users: parseInt(r.metricValues?.[1]?.value||'0'),
    conversions: parseInt(r.metricValues?.[5]?.value||'0'),
  })).sort((a: any, b: any) => b.sessions - a.sessions);

  const sourceColors: Record<string,string> = {
    'Organic Search': '#10b981', 'Paid Search': '#3b82f6', 'Social': '#e1306c',
    'Direct': 'var(--primary)', 'Referral': '#f59e0b', 'Email': '#8b5cf6',
    'Organic Social': '#fe2c55', 'Paid Social': '#0a66c2',
  };

  const inputCls = "w-full text-xs rounded-xl px-3 py-2 border outline-none";
  const inputStyle = { background:'var(--surface)', borderColor:'var(--border)', color:'var(--text)' };

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color:'var(--text)' }}>Website Analytics</h1>
        <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>
          Connect Google Analytics 4 and build UTM tracking links for your campaigns
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background:'var(--surface)' }}>
        {(['overview','utm'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="text-xs font-semibold px-4 py-2 rounded-lg capitalize transition-all"
            style={tab===t ? { background:'var(--card)', color:'var(--text)' } : { color:'var(--muted)' }}>
            {t === 'overview' ? '📊 Analytics Overview' : '🔗 UTM Builder'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">

          {/* GA4 Connection */}
          <div className="glow-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color:'var(--text)' }}>Google Analytics 4</h3>
                <p className="text-xs" style={{ color:'var(--muted)' }}>
                  Connect your GA4 property to see sessions, traffic sources, and conversion data
                </p>
              </div>
              {ga4Connected && (
                <button onClick={syncGA4} disabled={syncing}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold text-white gradient-primary shrink-0">
                  <RefreshCw size={12} className={syncing?'animate-spin':''}/> Sync
                </button>
              )}
            </div>

            {!ga4Connected ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color:'var(--text)' }}>
                    Enter your GA4 Property ID
                  </p>
                  <p className="text-[10px] mb-3 leading-relaxed" style={{ color:'var(--muted)' }}>
                    Find it in GA4 → Admin → Property Settings → Property ID (e.g. 123456789)
                  </p>
                  <div className="flex gap-2">
                    <input value={propertyId} onChange={e => setPropertyId(e.target.value)}
                      placeholder="e.g. 123456789"
                      className={inputCls} style={inputStyle}/>
                    <button onClick={connectGA4} disabled={!propertyId || connecting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-white gradient-primary shrink-0 disabled:opacity-50">
                      {connecting ? <RefreshCw size={12} className="animate-spin"/> : 'Connect'}
                    </button>
                  </div>
                  <p className="text-[10px] mt-2" style={{ color:'var(--muted)' }}>
                    ⚠️ You must first connect Google (YouTube) from Connect Accounts so VeloxSpace has a valid Google OAuth token.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background:'var(--success)' }}/>
                <span className="text-xs font-semibold" style={{ color:'var(--success)' }}>
                  Connected — Property {propertyId}
                </span>
              </div>
            )}
          </div>

          {/* KPI Cards */}
          {ga4Data.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:'Sessions', value:fmt(totalSessions), icon:Users, color:'var(--info)' },
                { label:'Users', value:fmt(totalUsers), icon:Users, color:'var(--primary)' },
                { label:'Conversions', value:fmt(totalConversions), icon:TrendingUp, color:'var(--success)' },
                { label:'Conv Rate', value:totalSessions>0?((totalConversions/totalSessions)*100).toFixed(2)+'%':'—', icon:BarChart3, color:'#8b5cf6' },
              ].map(({ label, value, icon:Icon, color }) => (
                <div key={label} className="glow-card rounded-2xl p-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2"
                    style={{ background:color+'18', color }}>
                    <Icon size={14}/>
                  </div>
                  <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color:'var(--muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Traffic Sources */}
          {trafficSources.length > 0 && (
            <div className="glow-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
                <h3 className="text-sm font-bold" style={{ color:'var(--text)' }}>Traffic Sources</h3>
              </div>
              <div className="p-5 space-y-3">
                {trafficSources.map((s: any) => {
                  const color = sourceColors[s.source] || 'var(--primary)';
                  const pct = totalSessions > 0 ? Math.round((s.sessions/totalSessions)*100) : 0;
                  return (
                    <div key={s.source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold" style={{ color:'var(--text)' }}>{s.source}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono" style={{ color:'var(--muted)' }}>{fmt(s.sessions)} sessions</span>
                          <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background:'var(--surface)' }}>
                        <div className="h-full rounded-full" style={{ width:`${pct}%`, background:color }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {ga4Data.length === 0 && ga4Connected && (
            <div className="glow-card rounded-2xl p-12 text-center">
              <BarChart3 size={28} className="mx-auto mb-3" style={{ color:'var(--muted)' }}/>
              <p className="font-bold text-sm mb-2" style={{ color:'var(--text)' }}>Click Sync to load analytics data</p>
              <p className="text-xs" style={{ color:'var(--muted)' }}>VeloxSpace will pull your last 30 days of GA4 data</p>
            </div>
          )}

          {!ga4Connected && (
            <div className="glow-card rounded-2xl p-8 text-center">
              <Globe size={28} className="mx-auto mb-3" style={{ color:'var(--muted)' }}/>
              <p className="font-bold text-sm mb-2" style={{ color:'var(--text)' }}>No website analytics connected</p>
              <p className="text-xs" style={{ color:'var(--muted)' }}>Connect GA4 above, or use the UTM Builder tab to track campaign traffic</p>
            </div>
          )}
        </div>
      )}

      {tab === 'utm' && (
        <div className="space-y-5">

          {/* Builder */}
          <div className="glow-card rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-1" style={{ color:'var(--text)' }}>UTM Link Builder</h3>
            <p className="text-xs mb-4" style={{ color:'var(--muted)' }}>
              Build tagged URLs for your campaigns to track traffic sources in Google Analytics
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color:'var(--muted)' }}>
                  Destination URL *
                </label>
                <input value={utm.base_url} onChange={e => setUtm(u=>({...u,base_url:e.target.value}))}
                  placeholder="https://yoursite.com/landing-page" className={inputCls} style={inputStyle}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color:'var(--muted)' }}>
                  Campaign Source *
                </label>
                <select value={utm.source} onChange={e => setUtm(u=>({...u,source:e.target.value}))}
                  className={inputCls} style={inputStyle}>
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color:'var(--muted)' }}>
                  Campaign Medium
                </label>
                <select value={utm.medium} onChange={e => setUtm(u=>({...u,medium:e.target.value}))}
                  className={inputCls} style={inputStyle}>
                  {MEDIUMS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color:'var(--muted)' }}>
                  Campaign Name *
                </label>
                <input value={utm.campaign} onChange={e => setUtm(u=>({...u,campaign:e.target.value}))}
                  placeholder="e.g. january_sale" className={inputCls} style={inputStyle}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color:'var(--muted)' }}>
                  Ad Content (optional)
                </label>
                <input value={utm.content} onChange={e => setUtm(u=>({...u,content:e.target.value}))}
                  placeholder="e.g. video_ad or banner_blue" className={inputCls} style={inputStyle}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color:'var(--muted)' }}>
                  Label (to save as)
                </label>
                <input value={utm.label} onChange={e => setUtm(u=>({...u,label:e.target.value}))}
                  placeholder="e.g. Jan Meta Campaign" className={inputCls} style={inputStyle}/>
              </div>
            </div>

            {/* Preview */}
            {utmUrl && (
              <div className="mt-4 rounded-xl p-3" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color:'var(--muted)' }}>Generated URL</p>
                <p className="text-xs font-mono break-all mb-3" style={{ color:'var(--text)' }}>{utmUrl}</p>
                <div className="flex gap-2">
                  <button onClick={() => copyUrl(utmUrl)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={{ background:'var(--primary-soft)', color:'var(--primary)', border:'1px solid var(--primary-l)' }}>
                    {copied === utmUrl ? <Check size={11}/> : <Copy size={11}/>}
                    {copied === utmUrl ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button onClick={saveLink} disabled={!utm.campaign}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white gradient-primary disabled:opacity-50">
                    <Plus size={11}/> Save Link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Saved Links */}
          {utmLinks.length > 0 && (
            <div className="glow-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
                <h3 className="text-sm font-bold" style={{ color:'var(--text)' }}>Saved UTM Links</h3>
              </div>
              <div className="divide-y" style={{ borderColor:'var(--border)' }}>
                {utmLinks.map(link => (
                  <div key={link.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold" style={{ color:'var(--text)' }}>{link.label || link.campaign}</p>
                      <p className="text-[10px] font-mono truncate mt-0.5" style={{ color:'var(--muted)' }}>{link.utm_url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background:'var(--primary-soft)', color:'var(--primary)' }}>
                          {link.source}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                          style={{ background:'var(--surface)', color:'var(--muted)' }}>
                          {link.medium}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => copyUrl(link.utm_url)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ background:'var(--primary-soft)', color:'var(--primary)' }}>
                        {copied === link.utm_url ? <Check size={11}/> : <Copy size={11}/>}
                      </button>
                      <button onClick={() => deleteLink(link.id)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ background:'var(--danger-bg)', color:'var(--danger)' }}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
