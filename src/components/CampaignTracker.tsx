import React, { useState, useEffect } from 'react';
import {
  Target, Plus, Trash2, Edit3, DollarSign, TrendingUp,
  RefreshCw, BarChart3, AlertCircle, Check, X, ChevronDown
} from 'lucide-react';

interface CampaignTrackerProps { workspaceId: string; }

const PLATFORMS = ['Meta Ads','Google Ads','TikTok Ads','LinkedIn Ads','Twitter Ads'];
const STATUS_COLORS: Record<string,string> = {
  active: 'var(--success)', paused: 'var(--warning)', ended: 'var(--muted)', draft: 'var(--info)'
};

function fmt(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M';
  if (n >= 1_000) return (n/1_000).toFixed(1)+'k';
  return n.toLocaleString();
}

export default function CampaignTracker({ workspaceId }: CampaignTrackerProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [apiSyncing, setApiSyncing] = useState(false);
  const [apiSyncMsg, setApiSyncMsg] = useState<{text:string, ok:boolean} | null>(null);
  const [editId, setEditId] = useState<string|null>(null);
  const [form, setForm] = useState({
    name: '', platform: 'Meta Ads', status: 'active',
    budget: '', spend: '', impressions: '', clicks: '',
    conversions: '', revenue: '', start_date: '', end_date: '', notes: ''
  });
  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

  useEffect(() => { load(); }, [workspaceId]);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/campaigns?workspaceId=${workspaceId}`, { headers: h });
    const d = await r.json();
    setCampaigns(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  const syncFromApi = async () => {
    setApiSyncing(true);
    setApiSyncMsg(null);
    try {
      const r = await fetch('/api/campaigns/sync-from-api', { method:'POST', headers:h, body: JSON.stringify({ workspaceId }) });
      const d = await r.json();
      if (d.success) {
        setApiSyncMsg({ text: `Imported ${d.imported} campaign${d.imported!==1?'s':''} from connected ad APIs.${d.errors?.length ? ' Some issues: '+d.errors.join('; ') : ''}`, ok: true });
        load();
      } else {
        setApiSyncMsg({ text: d.error || 'No campaigns synced. Make sure you have connected Ads API credentials under Ads API Connections.', ok: false });
      }
    } catch {
      setApiSyncMsg({ text: 'Network error syncing from API.', ok: false });
    }
    setApiSyncing(false);
    setTimeout(() => setApiSyncMsg(null), 8000);
  };

  const resetForm = () => {
    setForm({ name:'',platform:'Meta Ads',status:'active',budget:'',spend:'',impressions:'',clicks:'',conversions:'',revenue:'',start_date:'',end_date:'',notes:'' });
    setEditId(null);
  };

  const handleSave = async () => {
    if (!form.name) return;
    const payload = {
      workspace_id: workspaceId,
      name: form.name, platform: form.platform, status: form.status,
      budget: Number(form.budget)||0, spend: Number(form.spend)||0,
      impressions: Number(form.impressions)||0, clicks: Number(form.clicks)||0,
      conversions: Number(form.conversions)||0, revenue: Number(form.revenue)||0,
      start_date: form.start_date||null, end_date: form.end_date||null, notes: form.notes
    };
    if (editId) {
      await fetch(`/api/campaigns/${editId}`, { method:'PUT', headers:h, body:JSON.stringify(payload) });
    } else {
      await fetch('/api/campaigns', { method:'POST', headers:h, body:JSON.stringify(payload) });
    }
    resetForm(); setShowForm(false); load();
  };

  const handleEdit = (c: any) => {
    setForm({
      name: c.name, platform: c.platform, status: c.status,
      budget: String(c.budget||''), spend: String(c.spend||''),
      impressions: String(c.impressions||''), clicks: String(c.clicks||''),
      conversions: String(c.conversions||''), revenue: String(c.revenue||''),
      start_date: c.start_date||'', end_date: c.end_date||'', notes: c.notes||''
    });
    setEditId(c.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await fetch(`/api/campaigns/${id}`, { method:'DELETE', headers:h });
    load();
  };

  // Aggregate totals
  const active = campaigns.filter(c => c.status === 'active');
  const totalBudget = campaigns.reduce((s,c) => s+(c.budget||0), 0);
  const totalSpend = campaigns.reduce((s,c) => s+(c.spend||0), 0);
  const totalRev = campaigns.reduce((s,c) => s+(c.revenue||0), 0);
  const totalConv = campaigns.reduce((s,c) => s+(c.conversions||0), 0);
  const totalClicks = campaigns.reduce((s,c) => s+(c.clicks||0), 0);
  const totalImpr = campaigns.reduce((s,c) => s+(c.impressions||0), 0);
  const overallROAS = totalSpend > 0 ? (totalRev/totalSpend).toFixed(2) : '—';
  const overallCTR = totalImpr > 0 ? ((totalClicks/totalImpr)*100).toFixed(2) : '—';
  const overallCPC = totalClicks > 0 ? (totalSpend/totalClicks).toFixed(2) : '—';
  const overallCPA = totalConv > 0 ? (totalSpend/totalConv).toFixed(2) : '—';

  // Funnel data
  const funnelSteps = [
    { label: 'Impressions', value: totalImpr, color: 'var(--info)' },
    { label: 'Clicks', value: totalClicks, color: 'var(--primary)' },
    { label: 'Conversions', value: totalConv, color: 'var(--success)' },
    { label: 'Revenue', value: totalRev, prefix: '$', color: '#f59e0b' },
  ];
  const maxFunnel = totalImpr || 1;

  const input = (field: keyof typeof form, label: string, type='text', placeholder='') => (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>{label}</label>
      {field === 'platform' ? (
        <select value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          className="w-full text-xs rounded-xl px-3 py-2 border outline-none"
          style={{ background:'var(--surface)',borderColor:'var(--border)',color:'var(--text)' }}>
          {PLATFORMS.map(p => <option key={p}>{p}</option>)}
        </select>
      ) : field === 'status' ? (
        <select value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          className="w-full text-xs rounded-xl px-3 py-2 border outline-none"
          style={{ background:'var(--surface)',borderColor:'var(--border)',color:'var(--text)' }}>
          {['active','paused','draft','ended'].map(s => <option key={s}>{s}</option>)}
        </select>
      ) : field === 'notes' ? (
        <textarea value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder} rows={2}
          className="w-full text-xs rounded-xl px-3 py-2 border outline-none resize-none"
          style={{ background:'var(--surface)',borderColor:'var(--border)',color:'var(--text)' }}/>
      ) : (
        <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
          placeholder={placeholder}
          className="w-full text-xs rounded-xl px-3 py-2 border outline-none"
          style={{ background:'var(--surface)',borderColor:'var(--border)',color:'var(--text)' }}/>
      )}
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color:'var(--text)' }}>Campaign Tracker</h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>
            Track ad spend, ROAS, and performance across all platforms
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={syncFromApi} disabled={apiSyncing}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold transition-all disabled:opacity-50"
            style={{ background:'var(--surface)', color:'var(--text)', border:'1px solid var(--border)' }}>
            <RefreshCw size={13} className={apiSyncing ? 'animate-spin' : ''}/> {apiSyncing ? 'Syncing…' : 'Sync from API'}
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold text-white gradient-primary">
            <Plus size={13}/> New Campaign
          </button>
        </div>
      </div>
      {apiSyncMsg && (
        <div className="rounded-xl p-3 text-xs"
          style={{ background: apiSyncMsg.ok ? 'var(--success-bg)' : 'var(--warning-bg)', color: apiSyncMsg.ok ? 'var(--success)' : 'var(--warning)' }}>
          {apiSyncMsg.text}
        </div>
      )}


      {/* KPI Row */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Total Budget', value:`$${fmt(totalBudget)}`, color:'var(--info)', sub:`$${fmt(totalBudget-totalSpend)} remaining` },
            { label:'Total Spend', value:`$${fmt(totalSpend)}`, color:'var(--danger)', sub:`${totalBudget>0?Math.round((totalSpend/totalBudget)*100):0}% of budget` },
            { label:'Overall ROAS', value:`${overallROAS}x`, color:'var(--success)', sub:`$${fmt(totalRev)} revenue` },
            { label:'Conversions', value:fmt(totalConv), color:'#8b5cf6', sub:`$${overallCPA} CPA` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="glow-card rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color:'var(--muted)' }}>{label}</p>
              <p className="text-xl font-black font-mono" style={{ color }}>{value}</p>
              <p className="text-[10px] mt-0.5" style={{ color:'var(--muted)' }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Funnel */}
        {campaigns.length > 0 && (
          <div className="glow-card rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-4" style={{ color:'var(--text)' }}>Conversion Funnel</h3>
            <div className="space-y-3">
              {funnelSteps.map(({ label, value, color, prefix='' }, i) => {
                const pct = maxFunnel > 0 ? Math.max(5, Math.round((value/maxFunnel)*100)) : 0;
                const convRate = i > 0 && funnelSteps[i-1].value > 0
                  ? ((value/funnelSteps[i-1].value)*100).toFixed(1)+'%' : null;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color:'var(--text)' }}>{label}</span>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold" style={{ color }}>{prefix}{fmt(value)}</span>
                        {convRate && <span className="text-[9px] ml-2 font-semibold" style={{ color:'var(--success)' }}>{convRate}</span>}
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background:'var(--surface)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:color }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 grid grid-cols-2 gap-2" style={{ borderTop:'1px solid var(--border)' }}>
              {[
                { label:'CTR', value:`${overallCTR}%` },
                { label:'CPC', value:`$${overallCPC}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl p-2 text-center" style={{ background:'var(--surface)' }}>
                  <p className="text-xs font-black font-mono" style={{ color:'var(--text)' }}>{value}</p>
                  <p className="text-[9px]" style={{ color:'var(--muted)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campaign List */}
        <div className={`${campaigns.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'} glow-card rounded-2xl overflow-hidden`}>
          <div className="px-5 py-4" style={{ borderBottom:'1px solid var(--border)' }}>
            <h3 className="text-sm font-bold" style={{ color:'var(--text)' }}>
              {campaigns.length} Campaign{campaigns.length !== 1 ? 's' : ''}
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw size={20} className="animate-spin mx-auto mb-2" style={{ color:'var(--primary)' }}/>
              <p className="text-xs" style={{ color:'var(--muted)' }}>Loading campaigns…</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <Target size={28} className="mx-auto mb-3" style={{ color:'var(--muted)' }}/>
              <p className="font-bold text-sm mb-1" style={{ color:'var(--text)' }}>No campaigns yet</p>
              <p className="text-xs mb-4" style={{ color:'var(--muted)' }}>
                Add your ad campaigns manually. Enter data from Meta Ads Manager, Google Ads, or any platform.
              </p>
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="text-xs font-semibold px-4 py-2 rounded-xl text-white gradient-primary">
                + Add First Campaign
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['Campaign','Platform','Budget','Spend','ROAS','Conv.','Status',''].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold text-[10px] uppercase tracking-wide whitespace-nowrap"
                        style={{ color:'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => {
                    const roas = c.spend > 0 ? (c.revenue/c.spend).toFixed(1)+'x' : '—';
                    const spendPct = c.budget > 0 ? Math.round((c.spend/c.budget)*100) : 0;
                    return (
                      <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td className="px-4 py-3">
                          <p className="font-semibold" style={{ color:'var(--text)' }}>{c.name}</p>
                          {c.notes && <p className="text-[9px] mt-0.5 truncate max-w-[120px]" style={{ color:'var(--muted)' }}>{c.notes}</p>}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color:'var(--text-soft)' }}>{c.platform}</td>
                        <td className="px-4 py-3">
                          <p className="font-mono" style={{ color:'var(--text)' }}>${fmt(c.budget||0)}</p>
                          <div className="h-1 w-16 rounded-full mt-1 overflow-hidden" style={{ background:'var(--surface)' }}>
                            <div className="h-full rounded-full" style={{ width:`${Math.min(100,spendPct)}%`, background: spendPct>90?'var(--danger)':'var(--success)' }}/>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color:'var(--danger)' }}>${fmt(c.spend||0)}</td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: parseFloat(roas)>2?'var(--success)':'var(--warning)' }}>{roas}</td>
                        <td className="px-4 py-3 font-mono" style={{ color:'var(--text)' }}>{fmt(c.conversions||0)}</td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full capitalize"
                            style={{ background: STATUS_COLORS[c.status]+'20', color: STATUS_COLORS[c.status] }}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(c)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background:'var(--primary-soft)', color:'var(--primary)' }}>
                              <Edit3 size={11}/>
                            </button>
                            <button onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ background:'var(--danger-bg)', color:'var(--danger)' }}>
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Budget Tracker per Platform */}
      {campaigns.length > 0 && (
        <div className="glow-card rounded-2xl p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color:'var(--text)' }}>Budget by Platform</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORMS.map(platform => {
              const pCamps = campaigns.filter(c => c.platform === platform);
              if (pCamps.length === 0) return null;
              const budget = pCamps.reduce((s,c) => s+(c.budget||0),0);
              const spend = pCamps.reduce((s,c) => s+(c.spend||0),0);
              const pct = budget > 0 ? Math.round((spend/budget)*100) : 0;
              const rev = pCamps.reduce((s,c) => s+(c.revenue||0),0);
              const roas = spend > 0 ? (rev/spend).toFixed(1) : '0';
              return (
                <div key={platform} className="rounded-xl p-4" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold" style={{ color:'var(--text)' }}>{platform}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: pct>90?'var(--danger-bg)':pct>70?'var(--warning-bg)':'var(--success-bg)',
                               color: pct>90?'var(--danger)':pct>70?'var(--warning)':'var(--success)' }}>
                      {pct}% used
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background:'var(--border)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width:`${Math.min(100,pct)}%`,
                               background: pct>90?'var(--danger)':pct>70?'var(--warning)':'var(--success)' }}/>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span style={{ color:'var(--muted)' }}>${fmt(spend)} spent</span>
                    <span style={{ color:'var(--muted)' }}>${fmt(budget)} budget</span>
                  </div>
                  <div className="mt-2 pt-2 flex justify-between" style={{ borderTop:'1px solid var(--border)' }}>
                    <span className="text-[10px]" style={{ color:'var(--muted)' }}>ROAS</span>
                    <span className="text-xs font-black font-mono" style={{ color: parseFloat(roas)>2?'var(--success)':'var(--warning)' }}>
                      {roas}x
                    </span>
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
              <h3 className="font-bold text-sm" style={{ color:'var(--text)' }}>
                {editId ? 'Edit Campaign' : 'New Campaign'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="p-1.5 rounded-lg" style={{ color:'var(--muted)' }}>
                <X size={14}/>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {input('name','Campaign Name','text','e.g. January Instagram Push')}
                {input('platform','Platform')}
                {input('status','Status')}
                {input('budget','Budget ($)','number','0')}
                {input('spend','Current Spend ($)','number','0')}
                {input('impressions','Impressions','number','0')}
                {input('clicks','Clicks','number','0')}
                {input('conversions','Conversions','number','0')}
                {input('revenue','Revenue Generated ($)','number','0')}
                {input('start_date','Start Date','date')}
                {input('end_date','End Date','date')}
              </div>
              {input('notes','Notes (optional)','text','Any campaign details...')}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border"
                  style={{ borderColor:'var(--border)', color:'var(--muted)' }}>
                  Cancel
                </button>
                <button onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white gradient-primary">
                  {editId ? 'Save Changes' : 'Add Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
