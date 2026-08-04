import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, RefreshCw, ChevronUp } from 'lucide-react';

interface SiteChatbotProps { user: any; }

// widget lifecycle:
//  'bubble'    - default floating launcher, polls for new messages
//  'open'      - chat panel expanded, polls for new messages
//  'minimized' - user hit cancel: docked as a slim tab in the corner, polling stopped
type WidgetState = 'bubble' | 'open' | 'minimized';

export default function SiteChatbot({ user }: SiteChatbotProps) {
  const [widgetState, setWidgetState] = useState<WidgetState>('bubble');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [initError, setInitError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = () => localStorage.getItem('velox_token') || '';
  const h = () => ({ 'Content-Type': 'application/json', 'x-session-token': token() });

  const open = widgetState === 'open';

  useEffect(() => { if (user) initSession(); }, [user]);

  // Pause polling entirely while minimized so the dismissed widget has zero
  // ongoing network/CPU footprint until the user brings it back.
  useEffect(() => {
    if (!sessionId || widgetState === 'minimized') return;
    const interval = setInterval(() => loadMessages(sessionId), 5000);
    return () => clearInterval(interval);
  }, [sessionId, widgetState]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const initSession = async () => {
    try {
      const r = await fetch('/api/chat/session', { method: 'POST', headers: h(), body: JSON.stringify({ userId: user.id }) });
      const d = await r.json();
      if (d.id) { setSessionId(d.id); loadMessages(d.id); }
      else setInitError('Could not start chat session.');
    } catch (e: any) { setInitError('Chat unavailable.'); }
  };

  const loadMessages = async (sid: string) => {
    try {
      const r = await fetch(`/api/chat/messages?sessionId=${sid}`, { headers: h() });
      const d = await r.json();
      if (Array.isArray(d)) {
        setMessages(d);
        if (widgetState !== 'open') setUnread(d.filter((m: any) => m.sender === 'admin' && !m.read_by_user).length);
      }
    } catch {}
  };

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    let sid = sessionId;
    if (!sid) {
      try {
        const r = await fetch('/api/chat/session', { method: 'POST', headers: h(), body: JSON.stringify({ userId: user.id }) });
        const d = await r.json();
        if (d.id) { sid = d.id; setSessionId(d.id); }
        else return;
      } catch { return; }
    }
    setSending(true);
    setText('');
    setMessages(prev => [...prev, { id: `t${Date.now()}`, sender: 'user', message: msg, created_at: new Date().toISOString() }]);
    try {
      await fetch('/api/chat/send', { method: 'POST', headers: h(), body: JSON.stringify({ sessionId: sid, sender: 'user', message: msg }) });
      loadMessages(sid);
    } catch {}
    setSending(false);
  };

  const openChat = () => {
    setWidgetState('open'); setUnread(0);
    if (sessionId) fetch('/api/chat/mark-read', { method: 'POST', headers: h(), body: JSON.stringify({ sessionId, reader: 'user' }) }).catch(() => {});
  };

  // Cancel: dismiss the widget off to the side so it stops polling and stays
  // out of the way, without losing the conversation.
  const minimize = () => setWidgetState('minimized');

  if (!user) return null;

  // Docked corner tab — minimal footprint, no network activity while here.
  if (widgetState === 'minimized') {
    return (
      <button onClick={() => setWidgetState('bubble')}
        className="fixed bottom-6 left-0 z-40 flex items-center gap-1.5 pl-3 pr-2.5 py-2.5 rounded-r-full shadow-2xl text-white gradient-primary transition-transform hover:pl-4 cursor-pointer"
        style={{ boxShadow: '0 4px 24px rgba(0,194,212,0.35)' }}
        title="Reopen support chat">
        <MessageCircle size={16}/>
        <ChevronUp size={12} className="rotate-90"/>
        {unread > 0 && <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: 'var(--danger)', color: '#fff' }}>{unread}</span>}
      </button>
    );
  }

  return (
    <>
      {widgetState === 'bubble' && (
        <div className="fixed bottom-6 left-6 z-40 flex items-end gap-1.5">
          <button onClick={openChat}
            className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white gradient-primary transition-transform hover:scale-110 cursor-pointer relative"
            style={{ boxShadow: '0 4px 24px rgba(0,194,212,0.4)' }}>
            <MessageCircle size={22}/>
            {unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--danger)', color: '#fff' }}>{unread}</span>}
          </button>
          <button onClick={minimize}
            className="w-5 h-5 rounded-full flex items-center justify-center border shadow-md cursor-pointer"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}
            title="Dismiss chat widget">
            <X size={11}/>
          </button>
        </div>
      )}

      {open && (
        <div className="fixed bottom-24 left-6 z-40 w-80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', height: 420 }}>
          <div className="px-4 py-3 flex items-center justify-between gradient-primary shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center"><MessageCircle size={14} className="text-white"/></div>
              <div><p className="text-xs font-bold text-white">Velox Space Support</p><p className="text-[9px] text-white/70">Typically replies in minutes</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={minimize} className="text-white/80 hover:text-white cursor-pointer" title="Cancel — dock to corner">
                <X size={16}/>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {initError && <div className="text-[10px] p-2 rounded-lg" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>{initError}</div>}
            {messages.length === 0 && !initError && (
              <div className="text-center pt-6">
                <MessageCircle size={24} className="mx-auto mb-2" style={{ color: 'var(--muted)' }}/>
                <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Hi {user.name?.split(' ')[0]}! 👋</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Send us a message and we will reply shortly.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[82%] rounded-2xl px-3 py-2 text-xs"
                  style={msg.sender === 'user' ? { background: 'var(--primary)', color: '#fff', borderRadius: '12px 12px 2px 12px' } : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px 12px 12px 2px' }}>
                  {msg.sender === 'admin' && <p className="text-[9px] font-bold mb-0.5" style={{ color: 'var(--accent)' }}>Velox Space Team</p>}
                  <p className="leading-relaxed">{msg.message}</p>
                  <p className="text-[8px] mt-0.5 opacity-50">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            <div ref={bottomRef}/>
          </div>
          <div className="p-3 flex gap-2 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message…"
              className="flex-1 text-xs rounded-xl px-3 py-2.5 border outline-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}/>
            <button onClick={send} disabled={!text.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white gradient-primary disabled:opacity-40 cursor-pointer"
              style={{ minWidth: 40 }}>
              {sending ? <RefreshCw size={13} className="animate-spin"/> : <Send size={14}/>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
