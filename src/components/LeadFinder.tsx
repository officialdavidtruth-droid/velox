import LocationInput from './LocationInput';
import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Zap, AlertCircle, Trash2, RefreshCw,
  Phone, Mail, Globe, Star, ShoppingCart, Building, X
} from 'lucide-react';

interface LeadFinderProps { workspaceId: string; }

const SOCIAL_CONFIG = [
  { key: 'social_facebook',  label: 'Facebook',  color: '#1877f2', bg: '#1877f215' },
  { key: 'social_instagram', label: 'Instagram', color: '#e1306c', bg: '#e1306c15' },
  { key: 'social_twitter',   label: 'Twitter/X', color: '#1DA1F2', bg: '#1DA1F215' },
  { key: 'social_linkedin',  label: 'LinkedIn',  color: '#0a66c2', bg: '#0a66c215' },
  { key: 'social_youtube',   label: 'YouTube',   color: '#ff0000', bg: '#ff000015' },
  { key: 'social_tiktok',    label: 'TikTok',    color: '#fe2c55', bg: '#fe2c5515' },
];

export default function LeadFinder({ workspaceId }: LeadFinderProps) {
  const [keyword, setKeyword]       = useState('');
  const [location, setLocation]     = useState('');
  const [leads, setLeads]           = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [errorMsg, setErrorMsg]     = useState('');
  const [credits, setCredits]       = useState({ remaining_credits: 0, total_credits_available: 500 });
  const [history, setHistory]       = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [clearing, setClearing]     = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Business lookup state
  const [bizName, setBizName]       = useState('');
  const [bizLocation, setBizLocation] = useState('');
  const [bizSearching, setBizSearching] = useState(false);
  const [bizResult, setBizResult]   = useState<any>(null);
  const [bizError, setBizError]     = useState('');

  // Fresh Launches state
  const [freshKeyword, setFreshKeyword] = useState('');
  const [freshSearching, setFreshSearching] = useState(false);
  const [freshResults, setFreshResults] = useState<any[]>([]);
  const [freshError, setFreshError] = useState('');
  const [freshMsg, setFreshMsg] = useState('');

  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

  useEffect(() => { loadLeads(); fetchCredits(); }, [workspaceId]);

  const dedup = (arr: any[]) => {
    const seen = new Set<string>();
    return arr.filter(l => {
      const key = (l.business_name || '').toLowerCase().replace(/\s+/g, '');
      if (!key || seen.has(key)) return false;
      seen.add(key); return true;
    });
  };

  const loadLeads = async () => {
    setLoadingLeads(true);
    try {
      const r = await fetch(`/api/leads?workspaceId=${workspaceId}`, { headers: h });
      const d = await r.json();
      if (Array.isArray(d)) setLeads(dedup(d));
    } catch {}
    setLoadingLeads(false);
  };

  const fetchCredits = async () => {
    try {
      const r = await fetch('/api/credits/history', { headers: h });
      if (r.ok) { const d = await r.json(); setCredits(d.balance); setHistory(d.transactions || []); }
    } catch {}
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword || !location) return;
    setIsSearching(true); setErrorMsg('');
    try {
      const r = await fetch('/api/leads/search', {
        method: 'POST', headers: h,
        body: JSON.stringify({ keyword, location, workspaceId }),
      });
      const d = await r.json();
      if (d.success) {
        await loadLeads();
        await fetchCredits();
        if (!d.results?.length) setErrorMsg(d.message || 'No results. Try a different keyword or location.');
      } else setErrorMsg(d.error || 'Search failed.');
    } catch (e: any) { setErrorMsg(e.message); }
    setIsSearching(false);
  };

  const handleFreshLaunches = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freshKeyword.trim()) return;
    setFreshSearching(true); setFreshError(''); setFreshMsg(''); setFreshResults([]);
    try {
      const r = await fetch('/api/leads/fresh-launches', {
        method: 'POST', headers: h,
        body: JSON.stringify({ keyword: freshKeyword, workspaceId }),
      });
      const d = await r.json();
      if (d.success) {
        setFreshResults(d.results || []);
        setFreshMsg(d.message || '');
        await loadLeads();
        await fetchCredits();
      } else setFreshError(d.error || 'Search failed.');
    } catch (e: any) { setFreshError(e.message); }
    setFreshSearching(false);
  };

  const handleBizLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) return;
    setBizSearching(true); setBizError(''); setBizResult(null);
    try {
      const r = await fetch('/api/leads/business-lookup', {
        method: 'POST', headers: h,
        body: JSON.stringify({ businessName: bizName, location: bizLocation, workspaceId }),
      });
      const d = await r.json();
      if (d.found) { setBizResult(d.result); fetchCredits(); }
      else setBizError(d.message || 'Business not found.');
    } catch (e: any) { setBizError(e.message); }
    setBizSearching(false);
  };

  const deleteLead = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE', headers: h });
      setLeads(prev => prev.filter(l => l.id !== id));
    } catch {}
    setDeletingId(null);
  };

  const clearAll = async () => {
    if (!clearConfirm) { setClearConfirm(true); setTimeout(() => setClearConfirm(false), 4000); return; }
    setClearing(true); setClearConfirm(false);
    try {
      await fetch('/api/leads/clear', { method: 'DELETE', headers: h, body: JSON.stringify({ workspaceId }) });
      setLeads([]);
    } catch {}
    setClearing(false);
  };

  const handlePurchase = async (pkgId: string) => {
    try {
      const r = await fetch('/api/credits/purchase', { method: 'POST', headers: h, body: JSON.stringify({ packageId: pkgId }) });
      if (r.ok) { fetchCredits(); }
    } catch {}
  };

  const LeadCard = ({ lead }: { lead: any }) => (
    <div className="rounded-2xl p-4 transition-all"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h5 className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>{lead.business_name}</h5>
          {lead.address && <p className="text-[10px] mt-0.5 flex items-center gap-1 truncate" style={{ color: 'var(--muted)' }}><MapPin size={9}/>{lead.address}</p>}
          {lead.category && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block capitalize" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{lead.category}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {lead.rating > 0 && <span className="text-[9px] font-bold flex items-center gap-0.5" style={{ color: 'var(--warning)' }}><Star size={9} className="fill-current"/>{Number(lead.rating).toFixed(1)}</span>}
          <button onClick={() => deleteLead(lead.id)} disabled={deletingId === lead.id} title="Delete"
            className="p-1.5 rounded-lg cursor-pointer" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            {deletingId === lead.id ? <RefreshCw size={11} className="animate-spin"/> : <Trash2 size={11}/>}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-2.5" style={{ background: 'var(--card)' }}>
          <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Phone size={8}/>Phone</p>
          {lead.phone ? <a href={`tel:${lead.phone}`} className="text-[10px] font-semibold hover:underline block truncate" style={{ color: 'var(--primary)' }}>{lead.phone}</a>
            : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ background: 'var(--card)' }}>
          <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Mail size={8}/>Email</p>
          {lead.email ? <a href={`mailto:${lead.email}`} className="text-[10px] font-semibold hover:underline block truncate" style={{ color: 'var(--primary)' }}>{lead.email}</a>
            : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ background: 'var(--card)' }}>
          <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Globe size={8}/>Website</p>
          {lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold hover:underline block truncate" style={{ color: 'var(--primary)' }}>{lead.website.replace(/^https?:\/\/(www\.)?/,'')}</a>
            : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ background: 'var(--card)' }}>
          <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><MapPin size={8}/>Location</p>
          <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text)' }}>{lead.location || '—'}</p>
        </div>
      </div>
      {SOCIAL_CONFIG.filter(s => (lead as any)[s.key]).length > 0 && (
        <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Social Media</p>
          <div className="flex flex-wrap gap-1.5">
            {SOCIAL_CONFIG.filter(s => (lead as any)[s.key]).map(s => (
              <a key={s.key} href={(lead as any)[s.key]} target="_blank" rel="noopener noreferrer"
                className="text-[9px] font-bold px-2 py-1 rounded-lg hover:opacity-80 transition-all"
                style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const creditsUsed = credits.total_credits_available - credits.remaining_credits;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Credits banner */}
      <div className="glow-card rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center gradient-primary shrink-0"><Zap size={18} className="text-white"/></div>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>AI Lead Credits</p>
            <p className="text-xl font-black font-mono" style={{ color: 'var(--primary)' }}>{credits.remaining_credits}<span className="text-xs font-semibold ml-1" style={{ color: 'var(--muted)' }}>remaining</span></p>
          </div>
          <div className="hidden sm:block pl-4" style={{ borderLeft: '1px solid var(--border)' }}>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Used: <strong style={{ color: 'var(--text)' }}>{creditsUsed}</strong></p>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Bulk: 15 credits · Specific: 5 credits · Fresh Launches: 10 credits</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* LEFT — Search + Results */}
        <div className="lg:col-span-3 space-y-4">

          {/* ── Bulk Keyword Search ── */}
          <div className="glow-card rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Search size={14}/> Bulk Business Search <span className="text-[10px] font-normal normal-case" style={{ color: 'var(--muted)' }}>· 15 credits · finds up to 20 businesses</span>
            </h3>
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Keyword / Niche</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm">💼</span>
                  <input type="text" required value={keyword} onChange={e => setKeyword(e.target.value)}
                    placeholder="e.g. Hotel, Salon, Clinic"
                    className="w-full pl-8 pr-3 py-2.5 text-xs rounded-xl border outline-none"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Location</label>
                <LocationInput value={location} onChange={setLocation} placeholder="City, State or Country"
                  className="w-full py-2.5 text-xs rounded-xl border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={isSearching || credits.remaining_credits < 15}
                  className="w-full py-2.5 text-xs font-bold text-white rounded-xl gradient-primary disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
                  {isSearching ? <RefreshCw size={13} className="animate-spin"/> : <Search size={13}/>}
                  {isSearching ? 'Searching…' : 'Search (15 Credits)'}
                </button>
              </div>
            </form>
            {errorMsg && <div className="mt-3 text-xs p-3 rounded-xl flex items-start gap-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><AlertCircle size={13} className="mt-0.5 shrink-0"/>{errorMsg}</div>}
          </div>

          {/* ── Specific Business Search ── */}
          <div className="glow-card rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Building size={14}/> Find Specific Business <span className="text-[10px] font-normal normal-case" style={{ color: 'var(--muted)' }}>· 5 credits · detailed info on one company</span>
            </h3>
            <p className="text-[10px] mb-4" style={{ color: 'var(--muted)' }}>
              Know the business name? Search directly to get their phone, email, website and social media.
            </p>
            <form onSubmit={handleBizLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Business Name *</label>
                <input type="text" required value={bizName} onChange={e => setBizName(e.target.value)}
                  placeholder="e.g. Sharon Ultimate Hotels, GTBank, Chicken Republic"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Location (optional)</label>
                <input type="text" value={bizLocation} onChange={e => setBizLocation(e.target.value)}
                  placeholder="Abuja, Lagos…"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              </div>
              <div className="sm:col-span-3">
                <button type="submit" disabled={bizSearching || !bizName.trim() || credits.remaining_credits < 5}
                  className="px-6 py-2.5 text-xs font-bold text-white rounded-xl gradient-primary disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
                  {bizSearching ? <RefreshCw size={13} className="animate-spin"/> : <Search size={13}/>}
                  {bizSearching ? 'Searching…' : 'Find Business (5 Credits)'}
                </button>
              </div>
            </form>
            {bizError && <div className="mt-3 text-xs p-3 rounded-xl" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>⚠️ {bizError}</div>}
            {bizResult && (
              <div className="mt-4 relative">
                <button onClick={() => setBizResult(null)} className="absolute top-2 right-2 p-1 rounded-lg cursor-pointer z-10" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><X size={12}/></button>
                <div className="rounded-xl p-2" style={{ background: 'rgba(0,194,212,0.06)', border: '1px solid rgba(0,194,212,0.20)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--primary)' }}>✓ Business Found</p>
                  <LeadCard lead={{ ...bizResult, id: 'preview' }}/>
                </div>
              </div>
            )}
          </div>

          {/* ── Fresh Launches ── */}
          <div className="glow-card rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <Zap size={14}/> Fresh Launches <span className="text-[10px] font-normal normal-case" style={{ color: 'var(--muted)' }}>· 10 credits · sites launched in the last 21 days</span>
            </h3>
            <p className="text-[10px] mb-4" style={{ color: 'var(--muted)' }}>
              Catches new websites and online stores the moment they go live — before your competitors find them. Reach founders while their business is brand new.
            </p>
            <form onSubmit={handleFreshLaunches} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--muted)' }}>Niche keyword *</label>
                <input type="text" required value={freshKeyword} onChange={e => setFreshKeyword(e.target.value)}
                  placeholder="e.g. shop, fitness, clinic, studio, agency"
                  className="w-full px-3 py-2.5 text-xs rounded-xl border outline-none"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              </div>
              <div className="flex items-end">
                <button type="submit" disabled={freshSearching || !freshKeyword.trim() || credits.remaining_credits < 10}
                  className="w-full py-2.5 text-xs font-bold text-white rounded-xl gradient-primary disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer">
                  {freshSearching ? <RefreshCw size={13} className="animate-spin"/> : <Zap size={13}/>}
                  {freshSearching ? 'Scanning…' : 'Find Fresh Launches (10 Credits)'}
                </button>
              </div>
            </form>
            {freshError && <div className="mt-3 text-xs p-3 rounded-xl flex items-start gap-2" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}><AlertCircle size={13} className="mt-0.5 shrink-0"/>{freshError}</div>}
            {freshMsg && <div className="mt-3 text-xs p-3 rounded-xl" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{freshMsg}</div>}
            {freshResults.length > 0 && (
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {freshResults.map((lead, i) => <LeadCard key={lead.id || i} lead={lead}/>)}
              </div>
            )}
          </div>

          {/* ── Saved Leads (scrollable) ── */}
          <div className="glow-card rounded-2xl overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>Saved Leads</h4>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{leads.length} lead{leads.length !== 1 ? 's' : ''} total</p>
              </div>
              <div className="flex gap-2">
                <button onClick={loadLeads} disabled={loadingLeads}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                  style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  <RefreshCw size={11} className={loadingLeads ? 'animate-spin' : ''}/>Refresh
                </button>
                {leads.length > 0 && (
                  <button onClick={clearAll} disabled={clearing}
                    className="flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{ background: clearConfirm ? 'var(--danger)' : 'var(--danger-bg)', color: clearConfirm ? '#fff' : 'var(--danger)', border: '1px solid rgba(248,113,113,0.3)' }}>
                    {clearing ? <RefreshCw size={11} className="animate-spin"/> : <Trash2 size={11}/>}
                    {clearConfirm ? 'Confirm Clear All' : 'Clear All'}
                  </button>
                )}
              </div>
            </div>

            {/* ── SCROLLABLE LIST — shows 5 cards (~540px), scroll for more ── */}
            {loadingLeads ? (
              <div className="p-10 text-center"><RefreshCw size={18} className="animate-spin mx-auto mb-2" style={{ color: 'var(--primary)' }}/><p className="text-xs" style={{ color: 'var(--muted)' }}>Loading…</p></div>
            ) : leads.length === 0 ? (
              <div className="p-12 text-center">
                <Search size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }}/>
                <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>No leads yet</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Use Bulk Search or Find Specific Business above.</p>
              </div>
            ) : (
              <div
                className="p-4 space-y-3 overflow-y-auto"
                style={{
                  maxHeight: '560px',   /* ≈ 5 cards */
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(0,194,212,0.3) transparent',
                }}>
                {leads.map(lead => <LeadCard key={lead.id} lead={lead}/>)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Credits Shop */}
        <div className="space-y-4">
          <div className="glow-card rounded-2xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
              <ShoppingCart size={12}/> Credit Shop
            </h4>
            <div className="space-y-2">
              {[
                { id: 'starter',   label: '50 Credits',   price: '₦5,000',  searches: '3 bulk / 10 specific' },
                { id: 'premium',   label: '200 Credits',  price: '₦15,000', searches: '13 bulk / 40 specific', badge: 'POPULAR' },
                { id: 'unlimited', label: '1000 Credits', price: '₦50,000', searches: '66 bulk / 200 specific' },
              ].map(pkg => (
                <button key={pkg.id} onClick={() => handlePurchase(pkg.id)}
                  className="w-full text-left p-3 rounded-xl transition-all cursor-pointer relative"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {pkg.badge && <span className="absolute -top-1.5 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'var(--warning)', color: '#000' }}>{pkg.badge}</span>}
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{pkg.label}</span>
                    <span className="text-xs font-black" style={{ color: 'var(--primary)' }}>{pkg.price}</span>
                  </div>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--muted)' }}>{pkg.searches}</p>
                </button>
              ))}
            </div>
          </div>

          {history.length > 0 && (
            <div className="glow-card rounded-2xl p-4">
              <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Credit History</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {history.slice(0, 20).map((t: any) => (
                  <div key={t.id} className="flex justify-between text-[10px] py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="truncate max-w-[130px]" style={{ color: 'var(--text)' }}>{t.description}</span>
                    <span className="font-bold font-mono shrink-0 ml-2" style={{ color: t.amount < 0 ? 'var(--danger)' : 'var(--success)' }}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
