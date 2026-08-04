import LocationInput from './LocationInput';
import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Zap, AlertCircle, RefreshCw,
  ShoppingCart, Building,
} from 'lucide-react';

interface LeadFinderProps { workspaceId: string; onNavigate?: (view: string) => void; }

export default function LeadFinder({ workspaceId, onNavigate }: LeadFinderProps) {
  const [keyword, setKeyword]       = useState('');
  const [location, setLocation]     = useState('');
  const [totalLeads, setTotalLeads] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [credits, setCredits]       = useState({ remaining_credits: 0, total_credits_available: 500 });
  const [history, setHistory]       = useState<any[]>([]);

  // Business lookup state
  const [bizName, setBizName]       = useState('');
  const [bizLocation, setBizLocation] = useState('');
  const [bizSearching, setBizSearching] = useState(false);
  const [bizMsg, setBizMsg]         = useState('');
  const [bizError, setBizError]     = useState('');

  // Fresh Launches state
  const [freshKeyword, setFreshKeyword] = useState('');
  const [freshSearching, setFreshSearching] = useState(false);
  const [freshError, setFreshError] = useState('');
  const [freshMsg, setFreshMsg] = useState('');

  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

  useEffect(() => { loadLeadCount(); fetchCredits(); }, [workspaceId]);

  const loadLeadCount = async () => {
    try {
      const r = await fetch(`/api/leads?workspaceId=${workspaceId}`, { headers: h });
      const d = await r.json();
      if (Array.isArray(d)) setTotalLeads(d.length);
    } catch {}
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
    setIsSearching(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const r = await fetch('/api/leads/search', {
        method: 'POST', headers: h,
        body: JSON.stringify({ keyword, location, workspaceId }),
      });
      const d = await r.json();
      if (d.success) {
        await loadLeadCount();
        await fetchCredits();
        if (!d.results?.length) setErrorMsg(d.message || 'No results. Try a different keyword or location.');
        else setSuccessMsg(`✓ Found ${d.results.length} "${keyword}" businesses in "${location}". Check Lead Pipeline to view them.`);
      } else setErrorMsg(d.error || 'Search failed.');
    } catch (e: any) { setErrorMsg(e.message); }
    setIsSearching(false);
  };

  const handleFreshLaunches = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freshKeyword.trim()) return;
    setFreshSearching(true); setFreshError(''); setFreshMsg('');
    try {
      const r = await fetch('/api/leads/fresh-launches', {
        method: 'POST', headers: h,
        body: JSON.stringify({ keyword: freshKeyword, workspaceId }),
      });
      const d = await r.json();
      if (d.success) {
        setFreshMsg(d.results?.length ? `✓ Found ${d.results.length} fresh launches for "${freshKeyword}". Check Lead Pipeline to view them.` : (d.message || ''));
        await loadLeadCount();
        await fetchCredits();
      } else setFreshError(d.error || 'Search failed.');
    } catch (e: any) { setFreshError(e.message); }
    setFreshSearching(false);
  };

  const handleBizLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) return;
    setBizSearching(true); setBizError(''); setBizMsg('');
    try {
      const r = await fetch('/api/leads/business-lookup', {
        method: 'POST', headers: h,
        body: JSON.stringify({ businessName: bizName, location: bizLocation, workspaceId }),
      });
      const d = await r.json();
      if (d.found) { setBizMsg(`✓ Found "${d.result.business_name}". Check Lead Pipeline to view full details.`); fetchCredits(); loadLeadCount(); }
      else setBizError(d.message || 'Business not found.');
    } catch (e: any) { setBizError(e.message); }
    setBizSearching(false);
  };

  const handlePurchase = async (pkgId: string) => {
    try {
      const r = await fetch('/api/credits/purchase', { method: 'POST', headers: h, body: JSON.stringify({ packageId: pkgId }) });
      if (r.ok) { fetchCredits(); }
    } catch {}
  };

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
            {successMsg && <div className="mt-3 text-xs p-3 rounded-xl" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{successMsg}</div>}
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
            {bizMsg && <div className="mt-3 text-xs p-3 rounded-xl" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{bizMsg}</div>}
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
            {freshMsg && <div className="mt-3 text-xs p-3 rounded-xl" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{freshMsg}</div>}
          </div>

          {/* ── All leads live in Lead Pipeline now ── */}
          <div className="glow-card rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{totalLeads} lead{totalLeads !== 1 ? 's' : ''} saved</h4>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>Every search result — bulk, specific business, and fresh launches — is tracked in Lead Pipeline.</p>
            </div>
            <button onClick={() => onNavigate?.('pipeline')}
              className="text-xs font-bold px-4 py-2 rounded-xl text-white gradient-primary cursor-pointer shrink-0">
              View Lead Pipeline →
            </button>
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
