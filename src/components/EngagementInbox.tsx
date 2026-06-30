import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, Instagram, Facebook, Heart, Reply, Clock, Filter, Inbox as InboxIcon } from 'lucide-react';

interface EngagementInboxProps { workspaceId: string; }

const PLATFORM_ICON: Record<string, any> = { instagram: Instagram, facebook: Facebook };
const PLATFORM_COLOR: Record<string, string> = { instagram: '#e1306c', facebook: '#1877f2' };

export default function EngagementInbox({ workspaceId }: EngagementInboxProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all'|'comments'|'messages'>('all');
  const [replyText, setReplyText] = useState<Record<string,string>>({});
  const [replying, setReplying] = useState<string|null>(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

  useEffect(() => { load(); }, [workspaceId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/inbox?workspaceId=${workspaceId}`, { headers: h });
      const d = await r.json();
      setItems(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  };

  const sync = async () => {
    setSyncing(true);
    setError('');
    try {
      const r = await fetch('/api/inbox/sync', { method: 'POST', headers: h, body: JSON.stringify({ workspaceId }) });
      const d = await r.json();
      if (d.success) load();
      else setError(d.error || 'Sync failed.');
    } catch {
      setError('Network error syncing inbox.');
    }
    setSyncing(false);
  };

  const sendReply = async (item: any) => {
    const text = replyText[item.id];
    if (!text) return;
    setReplying(item.id);
    try {
      await fetch('/api/inbox/reply', {
        method: 'POST', headers: h,
        body: JSON.stringify({ workspaceId, itemId: item.id, platform: item.platform, externalId: item.external_id, message: text }),
      });
      setReplyText(p => ({ ...p, [item.id]: '' }));
      load();
    } catch {}
    setReplying(null);
  };

  const filtered = items.filter(i => filter === 'all' || (filter === 'comments' ? i.type === 'comment' : i.type === 'message'));

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Engagement Inbox</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            All comments and messages from your connected platforms, in one place
          </p>
        </div>
        <button onClick={sync} disabled={syncing}
          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold text-white gradient-primary disabled:opacity-60">
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''}/> {syncing ? 'Syncing…' : 'Sync Inbox'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)' }}>
        {(['all','comments','messages'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="text-xs font-semibold px-4 py-2 rounded-lg capitalize transition-all"
            style={filter===f ? { background: 'var(--card)', color: 'var(--text)' } : { color: 'var(--muted)' }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" style={{ color: 'var(--primary)' }}/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glow-card rounded-2xl p-16 text-center">
          <InboxIcon size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }}/>
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text)' }}>Inbox is empty</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Click Sync Inbox to pull comments and messages from your connected Instagram and Facebook accounts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const Icon = PLATFORM_ICON[item.platform] || MessageCircle;
            const color = PLATFORM_COLOR[item.platform] || 'var(--primary)';
            return (
              <div key={item.id} className="glow-card rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {item.from_avatar ? (
                      <img src={item.from_avatar} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" alt=""/>
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                        {(item.from_name||'?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 rounded-full p-0.5" style={{ background: 'var(--card)' }}>
                      <Icon size={11} style={{ color }}/>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{item.from_name || 'Unknown'}</p>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                        style={{ background: 'var(--surface)', color: 'var(--muted)' }}>{item.type}</span>
                      <span className="text-[9px] flex items-center gap-0.5 ml-auto" style={{ color: 'var(--muted)' }}>
                        <Clock size={9}/> {new Date(item.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-soft)' }}>{item.text}</p>
                    {item.post_caption && (
                      <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--muted)' }}>on: "{item.post_caption}"</p>
                    )}

                    {/* Reply box */}
                    <div className="flex gap-2 mt-3">
                      <input value={replyText[item.id]||''} onChange={e => setReplyText(p=>({...p,[item.id]:e.target.value}))}
                        placeholder="Write a reply…"
                        className="flex-1 text-xs rounded-lg px-3 py-1.5 border outline-none"
                        style={{ background:'var(--surface)', borderColor:'var(--border)', color:'var(--text)' }}/>
                      <button onClick={() => sendReply(item)} disabled={!replyText[item.id] || replying===item.id}
                        className="px-3 rounded-lg text-xs font-semibold text-white gradient-primary disabled:opacity-40 flex items-center gap-1">
                        {replying===item.id ? <RefreshCw size={11} className="animate-spin"/> : <Reply size={11}/>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
