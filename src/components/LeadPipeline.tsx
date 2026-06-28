import React, { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, RefreshCw, Phone, Globe, MapPin, Star, ChevronRight, X, Filter } from 'lucide-react';

interface LeadPipelineProps { workspaceId: string; }

const STAGES = [
  { key: 'new',          label: 'New',            color: 'var(--info)',    bg: 'var(--info-bg)' },
  { key: 'contacted',    label: 'Contacted',      color: 'var(--primary)', bg: 'var(--primary-soft)' },
  { key: 'proposal',     label: 'Proposal Sent',  color: 'var(--warning)', bg: 'var(--warning-bg)' },
  { key: 'negotiating',  label: 'Negotiating',    color: '#8b5cf6',        bg: 'rgba(139,92,246,0.1)' },
  { key: 'won',          label: 'Won ✓',           color: 'var(--success)', bg: 'var(--success-bg)' },
];

export default function LeadPipeline({ workspaceId }: LeadPipelineProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [moving, setMoving] = useState<string|null>(null);
  const [filter, setFilter] = useState('all');
  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

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
    await fetch(`/api/leads/${leadId}/stage`, { method:'PUT', headers:h, body:JSON.stringify({ stage }) });
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: stage } : l));
    if (selected?.id === leadId) setSelected((s: any) => ({ ...s, status: stage }));
    setMoving(null);
  };

  const totalWon = leads.filter(l => l.status === 'won').length;
  const convRate = leads.length > 0 ? ((totalWon/leads.length)*100).toFixed(0) : '0';
  const avgScore = leads.length > 0 ? Math.round(leads.reduce((s,l) => s+(l.ai_score||l.confidence_score||0),0)/leads.length) : 0;

  const filteredLeads = filter === 'all' ? leads : leads.filter(l => (l.status||'new') === filter);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={20} className="animate-spin" style={{ color:'var(--primary)' }}/>
    </div>
  );

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color:'var(--text)' }}>Lead Pipeline</h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--muted)' }}>
            Move leads through stages from discovery to closed deal
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold"
          style={{ background:'var(--surface)', color:'var(--text)', border:'1px solid var(--border)' }}>
          <RefreshCw size={12}/> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Leads', value:String(leads.length), color:'var(--info)' },
          { label:'Won', value:String(totalWon), color:'var(--success)' },
          { label:'Win Rate', value:`${convRate}%`, color:'#8b5cf6' },
          { label:'Avg Score', value:`${avgScore}`, color:'var(--warning)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glow-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color:'var(--muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Stage Summary */}
      <div className="glow-card rounded-2xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--muted)' }}>Pipeline Overview</h3>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STAGES.map(stage => {
            const count = leads.filter(l => (l.status||'new') === stage.key).length;
            const isFilter = filter === stage.key;
            return (
              <button key={stage.key}
                onClick={() => setFilter(f => f === stage.key ? 'all' : stage.key)}
                className="flex-1 min-w-[100px] rounded-xl p-3 text-center transition-all"
                style={{
                  background: isFilter ? stage.bg : 'var(--surface)',
                  border: `1px solid ${isFilter ? stage.color : 'var(--border)'}`,
                }}>
                <p className="text-xl font-black font-mono" style={{ color:stage.color }}>{count}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color:'var(--muted)' }}>
                  {stage.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban Board */}
      {leads.length === 0 ? (
        <div className="glow-card rounded-2xl p-16 text-center">
          <Users size={32} className="mx-auto mb-3" style={{ color:'var(--muted)' }}/>
          <p className="font-bold text-sm mb-1" style={{ color:'var(--text)' }}>No leads yet</p>
          <p className="text-xs" style={{ color:'var(--muted)' }}>
            Use the Lead Finder to discover businesses, then track them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {STAGES.map(stage => {
            const stageLeads = (filter === 'all' ? leads : filteredLeads)
              .filter(l => (l.status||'new') === stage.key);
            return (
              <div key={stage.key} className="rounded-2xl overflow-hidden"
                style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
                {/* Column header */}
                <div className="px-3 py-2.5 flex items-center justify-between"
                  style={{ borderBottom:'1px solid var(--border)', background:stage.bg }}>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color:stage.color }}>
                    {stage.label}
                  </span>
                  <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background:stage.color+'30', color:stage.color }}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[120px]">
                  {stageLeads.map(lead => (
                    <div key={lead.id}
                      className="rounded-xl p-3 cursor-pointer transition-all hover:shadow-md"
                      style={{ background:'var(--card)', border:'1px solid var(--border)' }}
                      onClick={() => setSelected(lead)}>
                      <p className="text-xs font-bold mb-1 line-clamp-2" style={{ color:'var(--text)' }}>
                        {lead.business_name}
                      </p>
                      {lead.location && (
                        <p className="text-[9px] flex items-center gap-1 mb-1" style={{ color:'var(--muted)' }}>
                          <MapPin size={8}/> {lead.location}
                        </p>
                      )}
                      {lead.rating > 0 && (
                        <p className="text-[9px] flex items-center gap-1 mb-2" style={{ color:'var(--warning)' }}>
                          <Star size={8} className="fill-current"/> {lead.rating}
                        </p>
                      )}
                      {/* Stage buttons */}
                      <div className="flex gap-1 flex-wrap mt-2">
                        {STAGES.filter(s => s.key !== stage.key).slice(0,2).map(s => (
                          <button key={s.key}
                            onClick={e => { e.stopPropagation(); moveStage(lead.id, s.key); }}
                            disabled={moving === lead.id}
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full transition-all"
                            style={{ background:s.bg, color:s.color }}>
                            → {s.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <p className="text-[10px] text-center py-4" style={{ color:'var(--muted)' }}>Empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ background:'var(--card)', border:'1px solid var(--border)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
              <h3 className="font-bold text-sm" style={{ color:'var(--text)' }}>{selected.business_name}</h3>
              <button onClick={() => setSelected(null)} style={{ color:'var(--muted)' }}><X size={14}/></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Current stage */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color:'var(--muted)' }}>Current Stage</p>
                <div className="flex gap-1.5 flex-wrap">
                  {STAGES.map(s => (
                    <button key={s.key}
                      onClick={() => moveStage(selected.id, s.key)}
                      className="text-xs font-bold px-2.5 py-1 rounded-full transition-all"
                      style={{
                        background: (selected.status||'new') === s.key ? s.color : s.bg,
                        color: (selected.status||'new') === s.key ? '#fff' : s.color,
                        border: `1px solid ${s.color}`,
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Details */}
              <div className="space-y-2">
                {[
                  { label:'Category', value:selected.category },
                  { label:'Location', value:selected.location },
                  { label:'Address', value:selected.address },
                  { label:'Rating', value:selected.rating ? `${selected.rating} ★` : null },
                  { label:'Website', value:selected.has_website ? 'Yes' : 'No' },
                  { label:'Source', value:selected.source },
                ].filter(d => d.value).map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-3 text-xs">
                    <span className="font-semibold w-20 shrink-0" style={{ color:'var(--muted)' }}>{label}</span>
                    <span style={{ color:'var(--text)' }}>{value}</span>
                  </div>
                ))}
              </div>
              {selected.ai_pitch && (
                <div className="rounded-xl p-3" style={{ background:'var(--primary-soft)', border:'1px solid var(--primary-l)' }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color:'var(--primary)' }}>AI Pitch</p>
                  <p className="text-xs" style={{ color:'var(--text)' }}>{selected.ai_pitch}</p>
                </div>
              )}
              <button onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white gradient-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
