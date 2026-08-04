import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, RefreshCw, Phone, Globe, MapPin, Star, Mail, X, Trash2, AlertTriangle } from 'lucide-react';

interface LeadPipelineProps { workspaceId: string; }

const STAGES = [
  { key: 'new',         label: 'New',           color: 'var(--info)',    bg: 'var(--info-bg)' },
  { key: 'contacted',   label: 'Contacted',     color: 'var(--primary)', bg: 'var(--primary-soft)' },
  { key: 'proposal',    label: 'Proposal Sent', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  { key: 'negotiating', label: 'Negotiating',   color: '#8b5cf6',        bg: 'rgba(139,92,246,0.1)' },
  { key: 'won',         label: 'Won ✓',          color: 'var(--success)', bg: 'var(--success-bg)' },
];

export default function LeadPipeline({ workspaceId }: LeadPipelineProps) {
  const [leads, setLeads]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<any>(null);
  const [moving, setMoving]       = useState<string|null>(null);
  const [filter, setFilter]       = useState('all');
  const [deletingId, setDeletingId] = useState<string|null>(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing]   = useState(false);
  const [page, setPage]           = useState(0);
  const PAGE_SIZE = 5;
  const h = { 'Content-Type': 'application/json', 'x-session-token': localStorage.getItem('velox_token') || '' };

  useEffect(() => { load(); }, [workspaceId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/leads?workspaceId=${workspaceId}`, { headers: h });
      const d = await r.json();
      setLeads(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  };

  const moveStage = async (leadId: string, stage: string) => {
    setMoving(leadId);
    await fetch(`/api/leads/${leadId}/stage`, { method: 'PUT', headers: h, body: JSON.stringify({ stage }) });
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: stage } : l));
    if (selected?.id === leadId) setSelected((s: any) => ({ ...s, status: stage }));
    setMoving(null);
  };

  const deleteLead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/leads/${id}`, { method: 'DELETE', headers: h });
      setLeads(prev => prev.filter(l => l.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {}
    setDeletingId(null);
  };

  const clearAll = async () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 4000);
      return;
    }
    setClearing(true); setClearConfirm(false);
    try {
      await fetch('/api/leads/clear', { method: 'DELETE', headers: h, body: JSON.stringify({ workspaceId }) });
      setLeads([]); setSelected(null);
    } catch {}
    setClearing(false);
  };

  const totalWon  = leads.filter(l => l.status === 'won').length;
  const convRate  = leads.length > 0 ? ((totalWon / leads.length) * 100).toFixed(0) : '0';
  const avgScore  = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + (l.confidence_score || 0), 0) / leads.length) : 0;
  const displayed = filter === 'all' ? leads : leads.filter(l => (l.status || 'new') === filter);

  useEffect(() => { setPage(0); }, [filter, leads.length]);
  const totalPages = Math.max(1, Math.ceil(displayed.length / PAGE_SIZE));
  const pageLeads   = displayed.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Lead Pipeline</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Move leads through stages from discovery to closed deal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <RefreshCw size={12}/> Refresh
          </button>
          {leads.length > 0 && (
            <button onClick={clearAll} disabled={clearing}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold cursor-pointer transition-all"
              style={{
                background: clearConfirm ? 'var(--danger)' : 'var(--danger-bg)',
                color: clearConfirm ? '#fff' : 'var(--danger)',
                border: '1px solid rgba(248,113,113,0.3)',
              }}>
              {clearing ? <RefreshCw size={12} className="animate-spin"/> : <Trash2 size={12}/>}
              {clearConfirm ? 'Tap again to confirm' : 'Clear All Leads'}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Leads', value: String(leads.length), color: 'var(--info)' },
          { label: 'Won',         value: String(totalWon),     color: 'var(--success)' },
          { label: 'Win Rate',    value: `${convRate}%`,       color: '#8b5cf6' },
          { label: 'Avg Score',   value: `${avgScore}%`,       color: 'var(--warning)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glow-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Stage filter tabs */}
      <div className="glow-card rounded-2xl p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setFilter('all')}
            className="flex-1 min-w-[80px] rounded-xl p-3 text-center transition-all"
            style={{ background: filter === 'all' ? 'var(--primary-soft)' : 'var(--surface)', border: `1px solid ${filter === 'all' ? 'var(--primary)' : 'var(--border)'}` }}>
            <p className="text-xl font-black font-mono" style={{ color: 'var(--primary)' }}>{leads.length}</p>
            <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--muted)' }}>All</p>
          </button>
          {STAGES.map(stage => {
            const count = leads.filter(l => (l.status || 'new') === stage.key).length;
            const isActive = filter === stage.key;
            return (
              <button key={stage.key} onClick={() => setFilter(f => f === stage.key ? 'all' : stage.key)}
                className="flex-1 min-w-[90px] rounded-xl p-3 text-center transition-all"
                style={{ background: isActive ? stage.bg : 'var(--surface)', border: `1px solid ${isActive ? stage.color : 'var(--border)'}` }}>
                <p className="text-xl font-black font-mono" style={{ color: stage.color }}>{count}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--muted)' }}>{stage.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--primary)' }}/>
        </div>
      ) : leads.length === 0 ? (
        <div className="glow-card rounded-2xl p-16 text-center">
          <Users size={32} className="mx-auto mb-3" style={{ color: 'var(--muted)' }}/>
          <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>No leads yet</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Use Lead Finder to discover businesses, then track them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" style={{ alignItems: 'start' }}>
          {STAGES.map(stage => {
            const stageLeads = displayed.filter(l => (l.status || 'new') === stage.key);
            return (
              <div key={stage.key} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', background: stage.bg }}>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: stage.color }}>{stage.label}</span>
                  <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: stage.color + '30', color: stage.color }}>
                    {stageLeads.length}
                  </span>
                </div>
                <div
                  className="p-2 space-y-2 overflow-y-auto"
                  style={{
                    minHeight: 120,
                    maxHeight: 520, /* ~5 cards */
                    overflowY: 'auto',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0,194,212,0.25) transparent',
                  }}>
                  {stageLeads.map(lead => (
                    <div key={lead.id} className="rounded-xl p-3 cursor-pointer transition-all hover:shadow-md"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                      onClick={() => setSelected(lead)}>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-xs font-bold line-clamp-2" style={{ color: 'var(--text)' }}>{lead.business_name}</p>
                        {/* DELETE button on card */}
                        <button onClick={e => deleteLead(lead.id, e)} disabled={deletingId === lead.id}
                          className="p-1 rounded-lg shrink-0 cursor-pointer"
                          style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
                          title="Delete lead">
                          {deletingId === lead.id ? <RefreshCw size={9} className="animate-spin"/> : <Trash2 size={9}/>}
                        </button>
                      </div>
                      {lead.location && (
                        <p className="text-[9px] flex items-center gap-1 mb-1" style={{ color: 'var(--muted)' }}>
                          <MapPin size={8}/> {lead.location}
                        </p>
                      )}
                      {/* Quick contact icons */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {lead.phone && <a href={`tel:${lead.phone}`} onClick={e=>e.stopPropagation()} title={lead.phone} className="text-[9px] px-1 py-0.5 rounded" style={{ background:'var(--success-bg)', color:'var(--success)' }}>📞</a>}
                        {lead.email && <a href={`mailto:${lead.email}`} onClick={e=>e.stopPropagation()} title={lead.email} className="text-[9px] px-1 py-0.5 rounded" style={{ background:'var(--info-bg)', color:'var(--info)' }}>✉️</a>}
                        {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title={lead.website} className="text-[9px] px-1 py-0.5 rounded" style={{ background:'var(--primary-soft)', color:'var(--primary)' }}>🌐</a>}
                        {lead.social_facebook && <a href={lead.social_facebook} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="Facebook" className="text-[9px] px-1 py-0.5 rounded" style={{ background:'#1877f215', color:'#1877f2' }}>f</a>}
                        {lead.social_instagram && <a href={lead.social_instagram} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="Instagram" className="text-[9px] px-1 py-0.5 rounded font-black" style={{ background:'#e1306c15', color:'#e1306c' }}>ig</a>}
                        {lead.social_twitter && <a href={lead.social_twitter} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="Twitter/X" className="text-[9px] px-1 py-0.5 rounded font-black" style={{ background:'#00000015', color:'var(--text)' }}>𝕏</a>}
                        {lead.social_linkedin && <a href={lead.social_linkedin} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="LinkedIn" className="text-[9px] px-1 py-0.5 rounded font-black" style={{ background:'#0a66c215', color:'#0a66c2' }}>in</a>}
                        {lead.social_youtube && <a href={lead.social_youtube} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="YouTube" className="text-[9px] px-1 py-0.5 rounded font-black" style={{ background:'#ff000015', color:'#ff0000' }}>▶</a>}
                        {lead.social_tiktok && <a href={lead.social_tiktok} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} title="TikTok" className="text-[9px] px-1 py-0.5 rounded font-black" style={{ background:'#fe2c5515', color:'#fe2c55' }}>tt</a>}
                        {lead.rating > 0 && <span className="text-[9px] flex items-center gap-0.5" style={{ color: 'var(--warning)' }}><Star size={8} className="fill-current"/>{Number(lead.rating).toFixed(1)}</span>}
                      </div>
                      {/* Stage move buttons */}
                      <div className="flex gap-1 flex-wrap">
                        {STAGES.filter(s => s.key !== stage.key).slice(0, 2).map(s => (
                          <button key={s.key} onClick={e => { e.stopPropagation(); moveStage(lead.id, s.key); }}
                            disabled={moving === lead.id}
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full transition-all cursor-pointer"
                            style={{ background: s.bg, color: s.color }}>
                            → {s.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <p className="text-[10px] text-center py-4" style={{ color: 'var(--muted)' }}>Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── All Leads — full detail, paginated 5-per-page ── */}
      {leads.length > 0 && (
        <div className="glow-card rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <div>
              <h4 className="text-sm font-bold" style={{ color: 'var(--text)' }}>All Leads</h4>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                {displayed.length} lead{displayed.length !== 1 ? 's' : ''}{filter !== 'all' ? ` · ${STAGES.find(s => s.key === filter)?.label}` : ''} · showing {displayed.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, displayed.length)}
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {pageLeads.map(lead => (
              <div key={lead.id} className="rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                onClick={() => setSelected(lead)}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h5 className="font-black text-sm truncate" style={{ color: 'var(--text)' }}>{lead.business_name}</h5>
                    {lead.address && <p className="text-[10px] mt-0.5 flex items-center gap-1 truncate" style={{ color: 'var(--muted)' }}><MapPin size={9}/>{lead.address}</p>}
                    {lead.category && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-1 inline-block capitalize" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{lead.category}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(() => { const sm = STAGES.find(s => s.key === (lead.status || 'new')) || STAGES[0]; return (
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                    ); })()}
                    <button onClick={e => deleteLead(lead.id, e)} disabled={deletingId === lead.id} title="Delete"
                      className="p-1.5 rounded-lg cursor-pointer" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                      {deletingId === lead.id ? <RefreshCw size={11} className="animate-spin"/> : <Trash2 size={11}/>}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl p-2.5" style={{ background: 'var(--card)' }}>
                    <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Phone size={8}/>Phone</p>
                    {lead.phone ? <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="text-[10px] font-semibold hover:underline block truncate" style={{ color: 'var(--primary)' }}>{lead.phone}</a>
                      : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: 'var(--card)' }}>
                    <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Mail size={8}/>Email</p>
                    {lead.email ? <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="text-[10px] font-semibold hover:underline block truncate" style={{ color: 'var(--primary)' }}>{lead.email}</a>
                      : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: 'var(--card)' }}>
                    <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Globe size={8}/>Website</p>
                    {lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] font-semibold hover:underline block truncate" style={{ color: 'var(--primary)' }}>{lead.website.replace(/^https?:\/\/(www\.)?/, '')}</a>
                      : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: 'var(--card)' }}>
                    <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><MapPin size={8}/>Location</p>
                    <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text)' }}>{lead.location || '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Prev / Next pagination */}
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              ← Previous
            </button>
            <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="text-xs font-bold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="px-5 py-4 flex items-center justify-between sticky top-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{selected.business_name}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteLead(selected.id)} disabled={deletingId === selected.id}
                  className="p-1.5 rounded-lg cursor-pointer" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}
                  title="Delete this lead">
                  {deletingId === selected.id ? <RefreshCw size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                </button>
                <button onClick={() => setSelected(null)} style={{ color: 'var(--muted)' }}><X size={14}/></button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Stage selector */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Current Stage</p>
                <div className="flex gap-1.5 flex-wrap">
                  {STAGES.map(s => (
                    <button key={s.key} onClick={() => moveStage(selected.id, s.key)}
                      className="text-xs font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer"
                      style={{
                        background: (selected.status || 'new') === s.key ? s.color : s.bg,
                        color: (selected.status || 'new') === s.key ? '#fff' : s.color,
                        border: `1px solid ${s.color}`,
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact info — prominent cards */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Contact Information</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Phone size={8}/> Phone
                    </p>
                    {selected.phone ? (
                      <a href={`tel:${selected.phone}`} className="text-xs font-semibold hover:underline block" style={{ color: 'var(--primary)' }}>{selected.phone}</a>
                    ) : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Not available</p>}
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Mail size={8}/> Email
                    </p>
                    {selected.email ? (
                      <a href={`mailto:${selected.email}`} className="text-xs font-semibold hover:underline block break-all" style={{ color: 'var(--primary)' }}>{selected.email}</a>
                    ) : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Not available</p>}
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Globe size={8}/> Website
                    </p>
                    {selected.website ? (
                      <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:underline block break-all" style={{ color: 'var(--primary)' }}>
                        {selected.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </a>
                    ) : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>No website</p>}
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <MapPin size={8}/> Location
                    </p>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{selected.location || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Social Media Links */}
              {[
                { key: 'social_facebook',  label: 'Facebook',  color: '#1877f2', emoji: '📘', prefix: 'fb' },
                { key: 'social_instagram', label: 'Instagram', color: '#e1306c', emoji: '📸', prefix: 'ig' },
                { key: 'social_twitter',   label: 'Twitter/X', color: '#000000', emoji: '🐦', prefix: 'x'  },
                { key: 'social_linkedin',  label: 'LinkedIn',  color: '#0a66c2', emoji: '💼', prefix: 'in' },
                { key: 'social_youtube',   label: 'YouTube',   color: '#ff0000', emoji: '▶️', prefix: 'yt' },
                { key: 'social_tiktok',    label: 'TikTok',    color: '#fe2c55', emoji: '🎵', prefix: 'tt' },
              ].filter(s => selected[s.key]).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Social Media</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'social_facebook',  label: 'Facebook',  color: '#1877f2', emoji: '📘' },
                      { key: 'social_instagram', label: 'Instagram', color: '#e1306c', emoji: '📸' },
                      { key: 'social_twitter',   label: 'Twitter/X', color: '#000',    emoji: '🐦' },
                      { key: 'social_linkedin',  label: 'LinkedIn',  color: '#0a66c2', emoji: '💼' },
                      { key: 'social_youtube',   label: 'YouTube',   color: '#ff0000', emoji: '▶️' },
                      { key: 'social_tiktok',    label: 'TikTok',    color: '#fe2c55', emoji: '🎵' },
                    ].filter(s => selected[s.key]).map(s => (
                      <a key={s.key} href={selected[s.key]} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all hover:opacity-80"
                        style={{ background: s.color + '15', color: s.color, border: `1px solid ${s.color}30` }}>
                        <span>{s.emoji}</span> {s.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Other details — no Source */}
              <div className="space-y-1.5">
                {[
                  { label: 'Business',  value: selected.business_name },
                  { label: 'Category',  value: selected.category },
                  { label: 'Address',   value: selected.address },
                  { label: 'Rating',    value: selected.rating ? `${selected.rating} ★` : null },
                ].filter(d => d.value).map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3 text-xs py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-semibold w-20 shrink-0" style={{ color: 'var(--muted)' }}>{label}</span>
                    <span style={{ color: 'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {selected.ai_pitch && (
                <div className="rounded-xl p-3" style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-l)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--primary)' }}>AI Pitch</p>
                  <p className="text-xs" style={{ color: 'var(--text)' }}>{selected.ai_pitch}</p>
                </div>
              )}

              <button onClick={() => setSelected(null)} className="w-full py-2.5 rounded-xl text-xs font-semibold text-white gradient-primary cursor-pointer">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
