import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, Heart, Reply, Clock, Inbox as InboxIcon, AlertCircle } from 'lucide-react';

interface EngagementInboxProps { workspaceId: string; }

const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  instagram: { label: 'Instagram', color: '#e1306c', icon: '📸' },
  facebook:  { label: 'Facebook',  color: '#1877f2', icon: '📘' },
  tiktok:    { label: 'TikTok',    color: '#fe2c55', icon: '🎵' },
  linkedin:  { label: 'LinkedIn',  color: '#0a66c2', icon: '💼' },
  twitter:   { label: 'Twitter/X', color: '#000000', icon: '🐦' },
  youtube:   { label: 'YouTube',   color: '#ff0000', icon: '▶️' },
};

export default function EngagementInbox({ workspaceId }: EngagementInboxProps) {
  const [items, setItems] = useState<any[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activePlatform, setActivePlatform] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'comments' | 'messages'>('all');
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

  useEffect(() => { loadAll(); }, [workspaceId]);

  const loadAll = async () => {
    setLoading(true);
    const [inboxRes, accountsRes] = await Promise.all([
      fetch(`/api/inbox?workspaceId=${workspaceId}`, { headers: h }).then(r => r.json()).catch(() => []),
      fetch(`/api/social-accounts?workspaceId=${workspaceId}`, { headers: h }).then(r => r.json()).catch(() => []),
    ]);
    setItems(Array.isArray(inboxRes) ? inboxRes : []);
    // Only platforms that have real inbox support (instagram + facebook for now)
    const inboxPlatforms = ['instagram', 'facebook'];
    setConnectedAccounts(Array.isArray(accountsRes) ? accountsRes.filter((a: any) => inboxPlatforms.includes(a.platform)) : []);
    setLoading(false);
  };

  const sync = async () => {
    setSyncing(true); setError('');
    try {
      const r = await fetch('/api/inbox/sync', { method: 'POST', headers: h, body: JSON.stringify({ workspaceId }) });
      const d = await r.json();
      if (d.success) await loadAll();
      else setError(d.error || 'Sync failed.');
    } catch { setError('Network error syncing inbox.'); }
    setSyncing(false);
  };

  const sendReply = async (item: any) => {
    const text = replyText[item.id]?.trim();
    if (!text) return;
    setReplying(item.id);
    try {
      await fetch('/api/inbox/reply', {
        method: 'POST', headers: h,
        body: JSON.stringify({ workspaceId, itemId: item.id, platform: item.platform, externalId: item.external_id, message: text }),
      });
      setReplyText(p => ({ ...p, [item.id]: '' }));
      await loadAll();
    } catch {}
    setReplying(null);
  };

  // Filter items by active platform + type
  const filtered = items.filter(i => {
    const platformMatch = activePlatform === 'all' || i.platform === activePlatform;
    const typeMatch = filter === 'all' || i.type === (filter === 'comments' ? 'comment' : 'message');
    return platformMatch && typeMatch;
  });

  const countForPlatform = (platform: string) =>
    platform === 'all' ? items.length : items.filter(i => i.platform === platform).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Engagement Inbox</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            All comments and messages from your connected platforms, in one place
          </p>
        </div>
        <button onClick={sync} disabled={syncing}
          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-semibold text-white gradient-primary disabled:opacity-60 cursor-pointer">
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''}/> {syncing ? 'Syncing…' : 'Sync Inbox'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-xs flex items-start gap-2" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
          <AlertCircle size={13} className="shrink-0 mt-0.5"/>
          {error}
        </div>
      )}

      {/* Platform tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* All tab */}
        <button
          onClick={() => setActivePlatform('all')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0"
          style={activePlatform === 'all'
            ? { background: 'var(--primary)', color: '#fff' }
            : { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
          All
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            {countForPlatform('all')}
          </span>
        </button>

        {/* Connected platform tabs */}
        {connectedAccounts.length === 0 && !loading && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
            No inbox-compatible accounts connected. Connect Instagram or Facebook to see messages here.
          </p>
        )}
        {connectedAccounts.map(acc => {
          const meta = PLATFORM_META[acc.platform] || { label: acc.platform, color: 'var(--primary)', icon: '🔗' };
          const isActive = activePlatform === acc.platform;
          const count = countForPlatform(acc.platform);
          return (
            <button key={acc.id}
              onClick={() => setActivePlatform(acc.platform)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0"
              style={isActive
                ? { background: meta.color, color: '#fff' }
                : { background: 'var(--surface)', color: 'var(--text)', border: `1px solid ${meta.color}40` }}>
              {/* Avatar */}
              {acc.avatar_url ? (
                <img src={acc.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer"/>
              ) : (
                <span>{meta.icon}</span>
              )}
              <span>{acc.account_name || meta.label}</span>
              {count > 0 && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: isActive ? 'rgba(255,255,255,0.25)' : meta.color+'20', color: isActive ? '#fff' : meta.color }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Type filter */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)' }}>
        {(['all', 'comments', 'messages'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg capitalize transition-all"
            style={filter === f ? { background: 'var(--card)', color: 'var(--text)' } : { color: 'var(--muted)' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Inbox items */}
      {loading ? (
        <div className="text-center py-16">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" style={{ color: 'var(--primary)' }}/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glow-card rounded-2xl p-16 text-center">
          <InboxIcon size={28} className="mx-auto mb-3" style={{ color: 'var(--muted)' }}/>
          <p className="font-bold text-sm mb-2" style={{ color: 'var(--text)' }}>
            {activePlatform !== 'all'
              ? `No ${filter !== 'all' ? filter : 'messages'} from ${PLATFORM_META[activePlatform]?.label || activePlatform} yet`
              : 'Inbox is empty'}
          </p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {connectedAccounts.length === 0
              ? 'Connect Instagram or Facebook from Connect Accounts, then click Sync Inbox.'
              : 'Click Sync Inbox to pull comments and messages from your connected accounts.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const meta = PLATFORM_META[item.platform] || { label: item.platform, color: 'var(--primary)', icon: '🔗' };
            return (
              <div key={item.id} className="glow-card rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {item.from_avatar ? (
                      <img src={item.from_avatar} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" alt=""/>
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ background: meta.color + '20', color: meta.color }}>
                        {(item.from_name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 rounded-full p-0.5 text-[10px]"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                      {meta.icon}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{item.from_name || 'Unknown'}</p>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                        style={{ background: meta.color + '15', color: meta.color }}>
                        {item.type}
                      </span>
                      <span className="text-[9px] flex items-center gap-0.5 ml-auto" style={{ color: 'var(--muted)' }}>
                        <Clock size={9}/> {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--text-soft)' }}>{item.text}</p>
                    {item.post_caption && (
                      <p className="text-[10px] truncate mb-2" style={{ color: 'var(--muted)' }}>
                        on: "{item.post_caption}"
                      </p>
                    )}
                    {/* Reply */}
                    <div className="flex gap-2 mt-2">
                      <input value={replyText[item.id] || ''} onChange={e => setReplyText(p => ({ ...p, [item.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && sendReply(item)}
                        placeholder="Write a reply…"
                        className="flex-1 text-xs rounded-lg px-3 py-1.5 border outline-none"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
                      <button onClick={() => sendReply(item)} disabled={!replyText[item.id]?.trim() || replying === item.id}
                        className="px-3 rounded-lg text-xs font-semibold text-white gradient-primary disabled:opacity-40 flex items-center gap-1 cursor-pointer">
                        {replying === item.id ? <RefreshCw size={11} className="animate-spin"/> : <Reply size={11}/>}
                        Reply
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
