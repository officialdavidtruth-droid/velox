import React, { useState, useEffect } from 'react';
import {
  Instagram, Linkedin, Video, RefreshCw, Trash2,
  CheckCircle2, AlertTriangle, Clock, Shield, Link,
  Plus, Facebook, Youtube, Twitter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SocialAccount, PlatformType } from '../types';

interface AccountConnectorProps {
  workspaceId: string;
}

export default function AccountConnector({ workspaceId }: AccountConnectorProps) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social-accounts?workspaceId=${workspaceId}`, {
        headers: { 'x-session-token': localStorage.getItem('velox_token') || '' },
      });
      if (res.ok) setAccounts(await res.json());
      else setActionError('Failed to load connected accounts.');
    } catch { setActionError('Network error loading accounts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); }, [workspaceId]);

  // ── postMessage listener — fixed to use window.location.origin ──
  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setActionSuccess('Account connected successfully!');
        setConnectingPlatform(null);
        setTimeout(() => setActionSuccess(null), 4000);
        loadAccounts();
      }
    };
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, [workspaceId]);

  const handleConnect = async (platform: PlatformType | string) => {
    setConnectingPlatform(platform);
    setActionError(null);
    try {
      const token = localStorage.getItem('velox_token') || '';
      const res = await fetch(
        `/api/social-accounts/oauth/url?platform=${platform}&workspaceId=${workspaceId}&sessionToken=${token}`
      );
      if (!res.ok) throw new Error('Could not get OAuth URL.');
      const { url, error } = await res.json();
      if (error) { setActionError(error); setConnectingPlatform(null); return; }
      const w = 500, h = 700;
      const left = window.screen.width / 2 - w / 2;
      const top  = window.screen.height / 2 - h / 2;
      const popup = window.open(url, `velox-oauth-${platform}`,
        `width=${w},height=${h},top=${top},left=${left},status=no,menubar=no,toolbar=no`);
      if (!popup) {
        setActionError('Popup blocked — please allow popups for this site.');
        setConnectingPlatform(null);
      }
    } catch (err: any) {
      setActionError(err.message || 'OAuth failed.');
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Disconnect this account?')) return;
    try {
      await fetch('/api/social-accounts/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-token': localStorage.getItem('velox_token') || '' },
        body: JSON.stringify({ accountId }),
      });
      setAccounts(prev => prev.filter(a => a.id !== accountId));
      setActionSuccess('Account disconnected.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch { setActionError('Failed to disconnect.'); }
  };

  const PLATFORMS = [
    {
      key: 'instagram',
      label: 'Instagram Business',
      sub: 'Graph API',
      icon: <Instagram className="w-4 h-4" />,
      iconBg: 'bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600',
      btn: 'bg-pink-600 hover:bg-pink-700',
      border: 'border-pink-500/20',
      cardBg: 'bg-pink-500/5 dark:bg-pink-500/10',
      desc: 'Sync follower counts, reach, and engagement from your Instagram Business profile.',
    },
    {
      key: 'facebook',
      label: 'Facebook Page',
      sub: 'Pages API',
      icon: <Facebook className="w-4 h-4" />,
      iconBg: 'bg-blue-600',
      btn: 'bg-blue-600 hover:bg-blue-700',
      border: 'border-blue-500/20',
      cardBg: 'bg-blue-500/5 dark:bg-blue-500/10',
      desc: 'Pull page fans, impressions, reach, and post engagement metrics.',
    },
    {
      key: 'tiktok',
      label: 'TikTok Pro',
      sub: 'Creator API',
      icon: <Video className="w-4 h-4 text-emerald-400" />,
      iconBg: 'bg-black border border-stone-800',
      btn: 'bg-stone-900 hover:bg-black',
      border: 'border-stone-300 dark:border-stone-800',
      cardBg: 'bg-stone-50 dark:bg-stone-950/40',
      desc: 'Sync video performance, follower growth, and content analytics.',
    },
    {
      key: 'linkedin',
      label: 'LinkedIn Corporate',
      sub: 'Enterprise API',
      icon: <Linkedin className="w-4 h-4" />,
      iconBg: 'bg-blue-700',
      btn: 'bg-blue-700 hover:bg-blue-800',
      border: 'border-blue-700/20',
      cardBg: 'bg-blue-700/5 dark:bg-blue-700/10',
      desc: 'Connect your LinkedIn company page for impressions and follower data.',
    },
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
      case 'facebook':  return <Facebook  className="w-3.5 h-3.5 text-blue-500" />;
      case 'tiktok':    return <Video     className="w-3.5 h-3.5 text-emerald-500" />;
      case 'linkedin':  return <Linkedin  className="w-3.5 h-3.5 text-blue-700" />;
      case 'youtube':   return <Youtube   className="w-3.5 h-3.5 text-red-500" />;
      case 'twitter':   return <Twitter   className="w-3.5 h-3.5 text-sky-500" />;
      default:          return <Link      className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />;
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(ellipse at top right, rgba(196,120,58,0.12), transparent 70%)' }} />
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-l)' }}>
            <Shield className="w-3.5 h-3.5 animate-pulse" />
            OAuth 2.0 Secured
          </div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
            Connected Accounts
          </h2>
          <p className="text-xs leading-relaxed max-w-2xl" style={{ color: 'var(--muted)' }}>
            Link your social media accounts to pull real analytics data into your workspace. Tokens are stored securely and never shared.
          </p>
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence mode="wait">
        {actionError && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="p-3 rounded-xl text-xs font-medium flex items-center gap-2.5"
            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {actionError}
          </motion.div>
        )}
        {actionSuccess && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="p-3 rounded-xl text-xs font-medium flex items-center gap-2.5"
            style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {actionSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left — connect new */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text)' }}>
            Connect a Platform
          </h3>
          {PLATFORMS.map(p => (
            <div key={p.key}
              className={`rounded-xl p-4 border ${p.border} ${p.cardBg} flex flex-col gap-3 transition-all hover:shadow-md`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 ${p.iconBg} text-white rounded-lg`}>{p.icon}</div>
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{p.label}</p>
                  <p className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{p.sub}</p>
                </div>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>{p.desc}</p>
              <button
                disabled={connectingPlatform !== null}
                onClick={() => handleConnect(p.key as PlatformType)}
                className={`w-full text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${p.btn}`}>
                {connectingPlatform === p.key
                  ? <RefreshCw className="w-3 h-3 animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />}
                {connectingPlatform === p.key ? 'Connecting…' : `Connect ${p.label.split(' ')[0]}`}
              </button>
            </div>
          ))}
        </div>

        {/* Right — connected accounts */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Active Connections</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {accounts.length} account{accounts.length !== 1 ? 's' : ''} connected
                </p>
              </div>
              <button onClick={loadAccounts}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="p-5">
              {loading && accounts.length === 0 ? (
                <div className="text-center py-10">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" style={{ color: 'var(--primary)' }} />
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Loading accounts…</p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-14 rounded-xl" style={{ border: '1px dashed var(--border)', background: 'var(--surface)' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'var(--primary-soft)' }}>
                    <Link className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                  </div>
                  <p className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>No accounts connected yet</p>
                  <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--muted)' }}>
                    Connect a platform on the left to start pulling real analytics data into your workspace.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map(acc => {
                    const isExpired = acc.status === 'expired';
                    const expiryDate = acc.expires_at ? new Date(acc.expires_at) : null;
                    const daysLeft = expiryDate
                      ? Math.round((expiryDate.getTime() - Date.now()) / 86400000)
                      : null;
                    return (
                      <div key={acc.id} className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>

                        {/* Avatar + info */}
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            {acc.avatar_url ? (
                              <img src={acc.avatar_url} alt={acc.account_name} referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-full object-cover"
                                style={{ border: '2px solid var(--border)' }} />
                            ) : (
                              <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold"
                                style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '2px solid var(--border)' }}>
                                {(acc.account_name || acc.platform).charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 rounded-full p-1 shadow-sm"
                              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                              {getPlatformIcon(acc.platform)}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{acc.account_name}</p>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                                style={{
                                  background: isExpired ? 'var(--warning-bg)' : 'var(--success-bg)',
                                  color: isExpired ? 'var(--warning)' : 'var(--success)',
                                }}>
                                {isExpired ? <AlertTriangle className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                                {isExpired ? 'Expired' : 'Active'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono capitalize" style={{ color: 'var(--primary)' }}>{acc.platform}</span>
                              <span style={{ color: 'var(--border)' }}>•</span>
                              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                                {acc.handle || '—'}
                              </span>
                              {daysLeft !== null && (
                                <>
                                  <span style={{ color: 'var(--border)' }}>•</span>
                                  <span className="text-[10px] flex items-center gap-1"
                                    style={{ color: daysLeft < 7 ? 'var(--warning)' : 'var(--muted)' }}>
                                    <Clock className="w-2.5 h-2.5" />
                                    {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                              Connected {new Date(acc.connected_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isExpired && (
                            <button onClick={() => handleConnect(acc.platform as PlatformType)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                              style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid rgba(217,119,6,0.2)' }}>
                              Reconnect
                            </button>
                          )}
                          <button onClick={() => handleDisconnect(acc.id)}
                            className="p-2 rounded-lg transition-all"
                            style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}
                            title="Disconnect">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Security note */}
          <div className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary-l)' }}>
            <Shield className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--primary)' }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--primary)' }}>
                Security Note
              </p>
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                VeloxSpace uses OAuth 2.0 and never stores your social media passwords. Tokens are encrypted at rest.
                Disconnecting an account immediately removes its token from our database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
