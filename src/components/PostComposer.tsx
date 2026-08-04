import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X, Sparkles, Send, Calendar, RefreshCw, Upload,
  Instagram, Facebook, Linkedin, Twitter, CheckCircle2,
  AlertCircle, Image, Trash2
} from 'lucide-react';

interface PostComposerProps {
  workspaceId: string;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const PLATFORMS: Record<string, { label: string; color: string; limit: number; Icon: any }> = {
  instagram: { label: 'Instagram', color: '#e1306c', limit: 2200, Icon: Instagram },
  facebook:  { label: 'Facebook',  color: '#1877f2', limit: 63206, Icon: Facebook  },
  linkedin:  { label: 'LinkedIn',  color: '#0a66c2', limit: 3000,  Icon: Linkedin  },
  twitter:   { label: 'Twitter/X', color: '#1DA1F2', limit: 280,   Icon: Twitter   },
};

export default function PostComposer({ workspaceId, user, onClose, onSuccess }: PostComposerProps) {
  const [caption, setCaption]           = useState('');
  const [hashtags, setHashtags]         = useState('');
  const [selected, setSelected]         = useState<string[]>(['facebook']);
  const [connected, setConnected]       = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState('');
  const [imageFile, setImageFile]       = useState<File | null>(null);
  const [imageUrl, setImageUrl]         = useState('');
  const [uploading, setUploading]       = useState(false);
  const [progress, setProgress]         = useState(0);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [publishing, setPublishing]     = useState(false);
  const [scheduling, setScheduling]     = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [preview, setPreview]           = useState('instagram');
  const [dragging, setDragging]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

  useEffect(() => { loadConnected(); }, [workspaceId]);

  const loadConnected = async () => {
    try {
      const r = await fetch(`/api/social-accounts?workspaceId=${workspaceId}`, { headers: h });
      const d = await r.json();
      const ps = Array.isArray(d)
        ? [...new Set(d.map((a: any) => ['meta_ads','youtube','google'].includes(a.platform) ? null : a.platform).filter(Boolean))] as string[]
        : [];
      setConnected(ps);
      if (ps.length) { setSelected([ps[0]]); setPreview(ps[0]); }
    } catch {}
  };

  const toggle = (p: string) =>
    setSelected(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Images only (JPG, PNG, WebP).'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Image must be under 8MB.'); return; }
    setImageFile(file); setError('');
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const uploadImg = async (): Promise<string> => {
    if (!imagePreview || !imageFile) return '';
    setUploading(true); setProgress(20);
    try {
      const r = await fetch('/api/upload/image', {
        method: 'POST', headers: h,
        body: JSON.stringify({ imageData: imagePreview, fileName: imageFile.name, mimeType: imageFile.type, workspaceId }),
      });
      setProgress(85);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setProgress(100); setImageUrl(d.url);
      return d.url;
    } catch (e: any) { setError('Upload failed: ' + e.message); return ''; }
    finally { setUploading(false); }
  };

  const aiCaption = async () => {
    setAiLoading(true);
    try {
      const r = await fetch('/api/ai/caption', {
        method: 'POST', headers: h,
        body: JSON.stringify({ prompt: caption || 'our brand and products', platform: selected[0] || 'social media', tone: 'engaging', cta: 'Learn more' }),
      });
      const d = await r.json();
      if (d.caption) setCaption(d.caption);
      if (d.hashtags) setHashtags(d.hashtags);
      if (d.error) setError(d.error);
    } catch { setError('AI error. Make sure GROQ_API_KEY is set in Vercel.'); }
    setAiLoading(false);
  };

  const submit = async (now: boolean) => {
    if (!caption.trim()) { setError('Write a caption first.'); return; }
    if (!selected.length) { setError('Select at least one platform.'); return; }
    if (!now && (!scheduleDate || !scheduleTime)) { setError('Set a date and time to schedule.'); return; }
    setError('');

    let imgUrl = imageUrl;
    if (imageFile && !imageUrl) {
      imgUrl = await uploadImg();
      if (!imgUrl && imageFile) return;
    }

    const full = hashtags ? `${caption}\n\n${hashtags}` : caption;
    const date = now ? new Date().toISOString() : new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

    now ? setPublishing(true) : setScheduling(true);
    try {
      const r = await fetch('/api/posts', {
        method: 'POST', headers: h,
        body: JSON.stringify({
          workspace_id: workspaceId, title: full.slice(0, 80),
          description: full, platforms: selected,
          cta: 'Learn More', publish_date: date,
          image_url: imgUrl, ai_generated: false,
        }),
      });
      const post = await r.json();
      if (post.error) throw new Error(post.error);

      if (now) {
        const pub = await fetch(`/api/posts/${post.id}/publish`, { method: 'POST', headers: h });
        const pd = await pub.json();
        const ok = (pd.results || []).filter((r: any) => r.success).length;
        const fail = (pd.results || []).filter((r: any) => !r.success);
        if (ok === 0) throw new Error(pd.results?.[0]?.error || 'Publishing failed on all platforms.');
        setSuccess(`Published to ${ok} platform${ok>1?'s':''}${fail.length ? ` (failed: ${fail.map((f:any)=>f.platform).join(', ')})` : '!'}`);
      } else {
        setSuccess(`Scheduled for ${new Date(date).toLocaleString()}`);
      }
      setTimeout(() => { onSuccess(); onClose(); }, 2500);
    } catch (e: any) { setError(e.message); }
    setPublishing(false); setScheduling(false);
  };

  const full = hashtags ? `${caption}\n\n${hashtags}` : caption;
  const minLimit = Math.min(...selected.map(p => PLATFORMS[p]?.limit || 99999));
  const over = full.length > minLimit;
  const displayName = user?.name || 'Your Page';

  /* ── Platform preview cards ───────────────────────────────── */
  const Preview = () => {
    const handle = `@${displayName.toLowerCase().replace(/\s+/g, '')}`;

    if (preview === 'instagram') return (
      <div className="rounded-2xl overflow-hidden max-w-[260px] mx-auto shadow-xl" style={{ background: '#fff', border: '1px solid #dbdbdb' }}>
        <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: '#dbdbdb' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>{displayName[0]}</div>
          <div><p className="text-xs font-bold text-gray-900">{displayName}</p><p className="text-[9px] text-gray-400">Sponsored</p></div>
        </div>
        <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
          {imagePreview ? <img src={imagePreview} alt="" className="w-full h-full object-cover"/> : <Image size={32} className="text-gray-300"/>}
        </div>
        <div className="p-3">
          <div className="text-base mb-2">❤️ 💬 📤</div>
          <p className="text-xs text-gray-800 leading-relaxed"><span className="font-bold">{displayName}</span> {full || <span className="text-gray-400 italic">Your caption here…</span>}</p>
        </div>
      </div>
    );

    if (preview === 'facebook') return (
      <div className="rounded-2xl overflow-hidden max-w-[260px] mx-auto shadow-xl" style={{ background: '#fff', border: '1px solid #ddd' }}>
        <div className="flex items-center gap-2 p-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm" style={{ background: '#1877f2' }}>{displayName[0]}</div>
          <div><p className="text-xs font-bold text-gray-900">{displayName}</p><p className="text-[9px] text-gray-400">Just now · 🌍</p></div>
        </div>
        <p className="px-3 pb-2 text-xs text-gray-700 leading-relaxed">{full || <span className="text-gray-400 italic">Your caption here…</span>}</p>
        {imagePreview ? <img src={imagePreview} alt="" className="w-full max-h-48 object-cover"/> : null}
        <div className="px-3 py-2 border-t text-[10px] text-gray-500 flex gap-3" style={{ borderColor: '#ddd' }}>👍 Like · 💬 Comment · ↗️ Share</div>
      </div>
    );

    if (preview === 'linkedin') return (
      <div className="rounded-2xl overflow-hidden max-w-[260px] mx-auto shadow-xl" style={{ background: '#fff', border: '1px solid #ddd' }}>
        <div className="flex items-center gap-2 p-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black" style={{ background: '#0a66c2' }}>{displayName[0]}</div>
          <div><p className="text-xs font-bold text-gray-900">{displayName}</p><p className="text-[9px] text-gray-400">Founder · 1st · Just now</p></div>
        </div>
        <p className="px-3 pb-2 text-xs text-gray-700 leading-relaxed">{full || <span className="text-gray-400 italic">Your caption here…</span>}</p>
        {imagePreview && <img src={imagePreview} alt="" className="w-full object-cover max-h-40"/>}
        <div className="px-3 py-2 border-t text-[10px] text-gray-500 flex gap-3" style={{ borderColor: '#ddd' }}>👍 Like · 💬 Comment · 🔁 Repost</div>
      </div>
    );

    if (preview === 'twitter') return (
      <div className="rounded-2xl p-3 max-w-[260px] mx-auto shadow-xl" style={{ background: '#fff', border: '1px solid #ddd' }}>
        <div className="flex gap-2">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black shrink-0" style={{ background: '#1DA1F2' }}>{displayName[0]}</div>
          <div>
            <p className="text-xs font-bold text-gray-900">{displayName} <span className="text-gray-400 font-normal">{handle}</span></p>
            <p className="text-xs text-gray-700 mt-1 leading-relaxed">{full.slice(0,280) || <span className="text-gray-400 italic">Your tweet here…</span>}</p>
            {full.length > 280 && <p className="text-[9px] text-red-500 mt-0.5">⚠️ {full.length-280} chars over limit</p>}
            {imagePreview && <img src={imagePreview} alt="" className="mt-2 w-full rounded-xl object-cover max-h-32"/>}
            <p className="text-[10px] text-gray-400 mt-2">💬 🔁 ❤️ 📊</p>
          </div>
        </div>
      </div>
    );
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full sm:max-w-4xl flex flex-col animate-fade-in"
        style={{
          background: 'rgba(10,22,50,0.85)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.08) inset',
          borderRadius: '20px',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl gradient-primary flex items-center justify-center">
              <Send size={12} className="text-white"/>
            </div>
            <h2 className="font-black text-base" style={{ color: 'var(--text)' }}>Compose Post</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl cursor-pointer transition-all hover:bg-white/10"
            style={{ color: 'var(--muted)' }}><X size={16}/></button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ── LEFT: Compose ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-w-0">

            {/* Platform selector */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Post to</p>
              {connected.length === 0 ? (
                <p className="text-xs px-3 py-2 rounded-xl" style={{ background: 'rgba(251,191,36,0.10)', color: 'var(--warning)' }}>
                  Connect social accounts first from the Connect Accounts page.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {connected.map(p => {
                    const cfg = PLATFORMS[p]; if (!cfg) return null;
                    const active = selected.includes(p);
                    return (
                      <button key={p} onClick={() => toggle(p)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all"
                        style={active
                          ? { background: cfg.color, color: '#fff', boxShadow: `0 4px 16px ${cfg.color}55` }
                          : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-soft)', border: `1px solid ${cfg.color}30` }}>
                        <cfg.Icon size={12}/> {cfg.label}
                        {active && <CheckCircle2 size={11}/>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Caption</p>
                <button onClick={aiCaption} disabled={aiLoading}
                  className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-50"
                  style={{ background: 'rgba(0,194,212,0.15)', color: 'var(--primary)', border: '1px solid rgba(0,194,212,0.25)' }}>
                  {aiLoading ? <RefreshCw size={10} className="animate-spin"/> : <Sparkles size={10}/>}
                  {aiLoading ? 'Generating…' : 'AI Caption'}
                </button>
              </div>
              <textarea
                value={caption} onChange={e => setCaption(e.target.value)} rows={5}
                placeholder="Write your caption here, or click AI Caption to generate one…"
                className="w-full text-sm rounded-2xl px-4 py-3 border outline-none resize-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: over ? 'var(--danger)' : 'rgba(255,255,255,0.10)',
                  color: 'var(--text)',
                  backdropFilter: 'blur(12px)',
                }}/>
              <div className="flex justify-between mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                <span>{selected.map(p => PLATFORMS[p]?.label).join(', ')}</span>
                <span className="font-mono font-bold" style={{ color: over ? 'var(--danger)' : full.length > minLimit*0.8 ? 'var(--warning)' : 'var(--muted)' }}>
                  {full.length}/{minLimit.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>Hashtags</p>
              <input value={hashtags} onChange={e => setHashtags(e.target.value)}
                placeholder="#digitalmarketing #socialmedia #business"
                className="w-full text-sm rounded-2xl px-4 py-2.5 border outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', color: 'var(--primary)' }}/>
            </div>

            {/* Image upload */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>
                Image <span className="normal-case font-normal text-[9px]">(required for Instagram · max 8MB)</span>
              </p>
              {!imagePreview ? (
                <div onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)} onDrop={onDrop}
                  className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
                  style={{
                    borderColor: dragging ? 'var(--primary)' : 'rgba(255,255,255,0.12)',
                    background: dragging ? 'rgba(0,194,212,0.08)' : 'rgba(255,255,255,0.03)',
                  }}>
                  <Upload size={28} className="mx-auto mb-2" style={{ color: dragging ? 'var(--primary)' : 'var(--muted)' }}/>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {dragging ? 'Drop it here!' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>JPG · PNG · WebP · GIF</p>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}/>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden group" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
                  <img src={imagePreview} alt="Preview" className="w-full max-h-52 object-cover"/>
                  {/* Upload progress */}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                      <div className="text-center text-white">
                        <RefreshCw size={24} className="animate-spin mx-auto mb-2"/>
                        <p className="text-xs font-bold">Uploading {progress}%</p>
                      </div>
                    </div>
                  )}
                  {/* Hover controls */}
                  <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all"
                    style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <button onClick={() => fileRef.current?.click()}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                      Change Image
                    </button>
                    <button onClick={() => { setImagePreview(''); setImageFile(null); setImageUrl(''); }}
                      className="p-2 rounded-xl cursor-pointer"
                      style={{ background: 'rgba(239,68,68,0.6)', backdropFilter: 'blur(8px)' }}>
                      <Trash2 size={14} className="text-white"/>
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}/>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>
                Schedule <span className="normal-case font-normal text-[9px]">(optional — leave empty to publish now)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="text-xs rounded-xl px-3 py-2.5 border outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', color: 'var(--text)' }}/>
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)}
                  className="text-xs rounded-xl px-3 py-2.5 border outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)', color: 'var(--text)' }}/>
              </div>
            </div>

            {error  && <div className="rounded-xl p-3 flex items-start gap-2 text-xs" style={{ background: 'rgba(248,113,113,0.10)', color: 'var(--danger)', border: '1px solid rgba(248,113,113,0.20)' }}><AlertCircle size={13} className="mt-0.5 shrink-0"/>{error}</div>}
            {success && <div className="rounded-xl p-3 flex items-start gap-2 text-xs" style={{ background: 'rgba(52,211,153,0.10)', color: 'var(--success)', border: '1px solid rgba(52,211,153,0.20)' }}><CheckCircle2 size={13} className="mt-0.5 shrink-0"/>{success}</div>}
          </div>

          {/* ── RIGHT: Live Preview ──────────────────────────────── */}
          <div className="hidden lg:flex w-[300px] shrink-0 flex-col" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Live Preview</p>
              <div className="flex gap-1 flex-wrap">
                {(selected.length ? selected : Object.keys(PLATFORMS)).map(p => {
                  const cfg = PLATFORMS[p]; if (!cfg) return null;
                  return (
                    <button key={p} onClick={() => setPreview(p)}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                      style={preview===p ? { background: cfg.color, color: '#fff' } : { background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <Preview/>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
          <button onClick={() => submit(false)}
            disabled={scheduling || publishing || !selected.length || !caption.trim()}
            className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {scheduling ? <RefreshCw size={14} className="animate-spin"/> : <Calendar size={14}/>}
            {scheduling ? 'Scheduling…' : 'Schedule'}
          </button>
          <button onClick={() => submit(true)}
            disabled={publishing || scheduling || !selected.length || !caption.trim() || over}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 gradient-primary transition-all">
            {publishing ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}
            {publishing ? 'Publishing…' : `Publish Now → ${selected.length} platform${selected.length!==1?'s':''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
