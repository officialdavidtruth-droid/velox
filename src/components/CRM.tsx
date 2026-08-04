import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Search, X, Trash2, RefreshCw, Phone, Mail, Globe, MapPin,
  DollarSign, Tag, Clock, MessageSquare, CheckSquare, Square, ChevronDown,
} from 'lucide-react';

interface CRMProps { workspaceId: string; }

const STATUSES = [
  { key: 'active',   label: 'Active',   color: 'var(--success)', bg: 'var(--success-bg)' },
  { key: 'inactive', label: 'Inactive', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  { key: 'churned',  label: 'Churned',  color: 'var(--danger)',  bg: 'var(--danger-bg)' },
];

function statusMeta(key: string) {
  return STATUSES.find(s => s.key === key) || STATUSES[0];
}

function fmtMoney(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${(n || 0).toLocaleString()}`;
}

function timeAgo(iso?: string) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function CRM({ workspaceId }: CRMProps) {
  const [clients, setClients]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected]   = useState<any>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [notes, setNotes]         = useState<any[]>([]);
  const [tasks, setTasks]         = useState<any[]>([]);
  const [newNote, setNewNote]     = useState('');
  const [noteType, setNoteType]   = useState('note');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [detailTab, setDetailTab] = useState<'notes' | 'tasks'>('notes');
  const [savingNote, setSavingNote] = useState(false);

  const [form, setForm] = useState({
    name: '', company: '', email: '', phone: '', website: '', address: '',
    status: 'active', value: '', tags: '', source: '',
  });

  const h = { 'Content-Type': 'application/json', 'x-session-token': localStorage.getItem('velox_token') || '' };

  useEffect(() => { load(); }, [workspaceId]);
  useEffect(() => { if (selected) loadClientDetail(selected.id); }, [selected?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/crm/clients?workspaceId=${workspaceId}`, { headers: h });
      const d = await r.json();
      setClients(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  };

  const loadClientDetail = async (clientId: string) => {
    try {
      const [nr, tr] = await Promise.all([
        fetch(`/api/crm/clients/${clientId}/notes`, { headers: h }),
        fetch(`/api/crm/clients/${clientId}/tasks`, { headers: h }),
      ]);
      setNotes(await nr.json());
      setTasks(await tr.json());
    } catch { setNotes([]); setTasks([]); }
  };

  const addClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch('/api/crm/clients', {
        method: 'POST', headers: h,
        body: JSON.stringify({
          workspaceId, name: form.name, company: form.company, email: form.email,
          phone: form.phone, website: form.website, address: form.address,
          status: form.status, value: parseFloat(form.value) || 0,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
          source: form.source,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setClients(prev => [d, ...prev]);
        setShowAdd(false);
        setForm({ name: '', company: '', email: '', phone: '', website: '', address: '', status: 'active', value: '', tags: '', source: '' });
      }
    } catch {}
    setSaving(false);
  };

  const updateStatus = async (clientId: string, status: string) => {
    await fetch(`/api/crm/clients/${clientId}`, { method: 'PUT', headers: h, body: JSON.stringify({ status }) });
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status } : c));
    if (selected?.id === clientId) setSelected((s: any) => ({ ...s, status }));
  };

  const deleteClient = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/crm/clients/${id}`, { method: 'DELETE', headers: h });
      setClients(prev => prev.filter(c => c.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {}
    setDeletingId(null);
  };

  const addNote = async () => {
    if (!newNote.trim() || !selected) return;
    setSavingNote(true);
    try {
      const r = await fetch(`/api/crm/clients/${selected.id}/notes`, {
        method: 'POST', headers: h, body: JSON.stringify({ workspaceId, body: newNote, type: noteType }),
      });
      const d = await r.json();
      if (r.ok) {
        setNotes(prev => [d, ...prev]);
        setNewNote('');
        setClients(prev => prev.map(c => c.id === selected.id ? { ...c, last_contacted_at: new Date().toISOString() } : c));
      }
    } catch {}
    setSavingNote(false);
  };

  const deleteNote = async (id: string) => {
    await fetch(`/api/crm/notes/${id}`, { method: 'DELETE', headers: h });
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const addTask = async () => {
    if (!newTaskTitle.trim() || !selected) return;
    const r = await fetch(`/api/crm/clients/${selected.id}/tasks`, {
      method: 'POST', headers: h, body: JSON.stringify({ workspaceId, title: newTaskTitle, due_date: newTaskDue || null }),
    });
    const d = await r.json();
    if (r.ok) { setTasks(prev => [...prev, d]); setNewTaskTitle(''); setNewTaskDue(''); }
  };

  const toggleTask = async (task: any) => {
    const r = await fetch(`/api/crm/tasks/${task.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ done: !task.done }) });
    const d = await r.json();
    setTasks(prev => prev.map(t => t.id === task.id ? d : t));
  };

  const deleteTask = async (id: string) => {
    await fetch(`/api/crm/tasks/${id}`, { method: 'DELETE', headers: h });
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const totalValue   = clients.reduce((s, c) => s + (c.value || 0), 0);
  const activeCount  = clients.filter(c => c.status === 'active').length;
  const filtered = clients
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q) || (c.company || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
    });

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>CRM</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Store and manage your clients — contacts, deal value, notes, and follow-ups</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <RefreshCw size={12}/> Refresh
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold text-white gradient-primary cursor-pointer">
            <Plus size={12}/> Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Clients', value: String(clients.length),   color: 'var(--info)' },
          { label: 'Active',        value: String(activeCount),      color: 'var(--success)' },
          { label: 'Total Value',   value: fmtMoney(totalValue),     color: '#8b5cf6' },
          { label: 'Avg Value',     value: fmtMoney(clients.length ? totalValue / clients.length : 0), color: 'var(--warning)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glow-card rounded-2xl p-4 text-center">
            <p className="text-2xl font-black font-mono" style={{ color }}>{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="glow-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients by name, company, or email..."
            className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button onClick={() => setStatusFilter('all')}
            className="text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer"
            style={{ background: statusFilter === 'all' ? 'var(--primary-soft)' : 'var(--surface)', color: statusFilter === 'all' ? 'var(--primary)' : 'var(--muted)', border: `1px solid ${statusFilter === 'all' ? 'var(--primary)' : 'var(--border)'}` }}>
            All ({clients.length})
          </button>
          {STATUSES.map(s => {
            const count = clients.filter(c => c.status === s.key).length;
            return (
              <button key={s.key} onClick={() => setStatusFilter(f => f === s.key ? 'all' : s.key)}
                className="text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap cursor-pointer"
                style={{ background: statusFilter === s.key ? s.bg : 'var(--surface)', color: statusFilter === s.key ? s.color : 'var(--muted)', border: `1px solid ${statusFilter === s.key ? s.color : 'var(--border)'}` }}>
                {s.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="glow-card rounded-2xl p-10 text-center">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" style={{ color: 'var(--primary)' }}/>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Loading clients...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glow-card rounded-2xl p-10 text-center">
          <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--muted)' }}/>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>No clients yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Add your first client to start tracking deals, notes, and follow-ups.</p>
        </div>
      ) : (
        <div className="glow-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Client','Status','Value','Contact','Last Contact',''].map(hd => (
                    <th key={hd} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{hd}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const sm = statusMeta(c.status);
                  return (
                    <tr key={c.id} onClick={() => setSelected(c)} className="cursor-pointer transition-colors hover:opacity-90"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{c.name}</p>
                        {c.company && <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{c.company}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-xs" style={{ color: 'var(--text)' }}>{fmtMoney(c.value || 0)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{c.email || c.phone || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{timeAgo(c.last_contacted_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={e => deleteClient(c.id, e)} disabled={deletingId === c.id}
                          className="p-1.5 rounded-lg cursor-pointer" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                          {deletingId === c.id ? <RefreshCw size={11} className="animate-spin"/> : <Trash2 size={11}/>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '88vh', overflowY: 'auto' }}>
            <div className="px-5 py-4 flex items-center justify-between sticky top-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Add Client</h3>
              <button onClick={() => setShowAdd(false)} style={{ color: 'var(--muted)' }}><X size={14}/></button>
            </div>
            <form onSubmit={addClient} className="p-5 space-y-3">
              <input required placeholder="Client name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              <input placeholder="Company" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              <div className="grid grid-cols-2 gap-2">
                <input type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                <input placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              </div>
              <input placeholder="Website" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              <input placeholder="Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <input type="number" placeholder="Deal value ($)" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              </div>
              <input placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              <input placeholder="Source (e.g. referral, cold outreach)" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
              <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl text-xs font-bold text-white gradient-primary cursor-pointer">
                {saving ? 'Saving...' : 'Add Client'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Client detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>{selected.name}</h3>
                {selected.company && <p className="text-[10px]" style={{ color: 'var(--muted)' }}>{selected.company}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => deleteClient(selected.id)} disabled={deletingId === selected.id}
                  className="p-1.5 rounded-lg cursor-pointer" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                  {deletingId === selected.id ? <RefreshCw size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                </button>
                <button onClick={() => setSelected(null)} style={{ color: 'var(--muted)' }}><X size={14}/></button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Status selector */}
              <div className="flex gap-1.5 flex-wrap">
                {STATUSES.map(s => (
                  <button key={s.key} onClick={() => updateStatus(selected.id, s.key)}
                    className="text-xs font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer"
                    style={{ background: selected.status === s.key ? s.color : s.bg, color: selected.status === s.key ? '#fff' : s.color, border: `1px solid ${s.color}` }}>
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Contact grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Phone size={8}/> Phone</p>
                  {selected.phone ? <a href={`tel:${selected.phone}`} className="text-xs font-semibold hover:underline" style={{ color: 'var(--primary)' }}>{selected.phone}</a> : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Mail size={8}/> Email</p>
                  {selected.email ? <a href={`mailto:${selected.email}`} className="text-xs font-semibold hover:underline break-all" style={{ color: 'var(--primary)' }}>{selected.email}</a> : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><Globe size={8}/> Website</p>
                  {selected.website ? <a href={selected.website} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold hover:underline break-all" style={{ color: 'var(--primary)' }}>{selected.website.replace(/^https?:\/\/(www\.)?/, '')}</a> : <p className="text-[10px]" style={{ color: 'var(--muted)' }}>—</p>}
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-[9px] font-bold uppercase mb-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><DollarSign size={8}/> Deal Value</p>
                  <p className="text-xs font-bold" style={{ color: 'var(--success)' }}>{fmtMoney(selected.value || 0)}</p>
                </div>
              </div>

              {selected.address && (
                <div className="flex items-start gap-2 text-xs" style={{ color: 'var(--text)' }}>
                  <MapPin size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--muted)' }}/> {selected.address}
                </div>
              )}

              {selected.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((t: string, i: number) => (
                    <span key={i} className="text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                      <Tag size={8}/> {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes / Tasks tabs */}
              <div className="flex gap-1.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setDetailTab('notes')} className="flex-1 text-xs font-bold py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                  style={{ background: detailTab === 'notes' ? 'var(--primary-soft)' : 'var(--surface)', color: detailTab === 'notes' ? 'var(--primary)' : 'var(--muted)' }}>
                  <MessageSquare size={12}/> Notes ({notes.length})
                </button>
                <button onClick={() => setDetailTab('tasks')} className="flex-1 text-xs font-bold py-2 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                  style={{ background: detailTab === 'tasks' ? 'var(--primary-soft)' : 'var(--surface)', color: detailTab === 'tasks' ? 'var(--primary)' : 'var(--muted)' }}>
                  <CheckSquare size={12}/> Tasks ({tasks.filter(t => !t.done).length})
                </button>
              </div>

              {detailTab === 'notes' ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select value={noteType} onChange={e => setNoteType(e.target.value)}
                      className="text-xs rounded-xl px-2 py-2 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                      <option value="note">Note</option>
                      <option value="call">Call</option>
                      <option value="email">Email</option>
                      <option value="meeting">Meeting</option>
                    </select>
                    <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Log a note, call, or meeting..."
                      onKeyDown={e => e.key === 'Enter' && addNote()}
                      className="flex-1 text-xs rounded-xl px-3 py-2 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                    <button onClick={addNote} disabled={savingNote || !newNote.trim()} className="px-3 py-2 rounded-xl text-xs font-bold text-white gradient-primary cursor-pointer">Add</button>
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {notes.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>No activity logged yet</p>}
                    {notes.map(n => (
                      <div key={n.id} className="rounded-xl p-3 flex items-start justify-between gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <div>
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full mr-1.5" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{n.type}</span>
                          <span className="text-[9px]" style={{ color: 'var(--muted)' }}><Clock size={8} className="inline mr-0.5"/>{timeAgo(n.created_at)}</span>
                          <p className="text-xs mt-1" style={{ color: 'var(--text)' }}>{n.body}</p>
                        </div>
                        <button onClick={() => deleteNote(n.id)} style={{ color: 'var(--muted)' }}><X size={12}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Follow-up task..."
                      onKeyDown={e => e.key === 'Enter' && addTask()}
                      className="flex-1 text-xs rounded-xl px-3 py-2 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                    <input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)}
                      className="text-xs rounded-xl px-2 py-2 border outline-none" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                    <button onClick={addTask} disabled={!newTaskTitle.trim()} className="px-3 py-2 rounded-xl text-xs font-bold text-white gradient-primary cursor-pointer">Add</button>
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {tasks.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--muted)' }}>No follow-ups scheduled</p>}
                    {tasks.map(t => (
                      <div key={t.id} className="rounded-xl p-3 flex items-center justify-between gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <button onClick={() => toggleTask(t)} className="flex items-center gap-2 flex-1 text-left cursor-pointer">
                          {t.done ? <CheckSquare size={14} style={{ color: 'var(--success)' }}/> : <Square size={14} style={{ color: 'var(--muted)' }}/>}
                          <span className="text-xs" style={{ color: t.done ? 'var(--muted)' : 'var(--text)', textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</span>
                        </button>
                        {t.due_date && <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{new Date(t.due_date).toLocaleDateString()}</span>}
                        <button onClick={() => deleteTask(t.id)} style={{ color: 'var(--muted)' }}><X size={12}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
