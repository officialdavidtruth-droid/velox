import React, { useState, useEffect } from 'react';
import {
  Instagram,
  Linkedin,
  Video,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  HelpCircle,
  Link,
  Plus,
  ArrowUpRight,
  Sparkles,
  ExternalLink
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

  // Load connected accounts from workspace
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social-accounts?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      } else {
        setActionError('Failed to fetch synchronized social credentials.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Error contacting SOC2 credential vault.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [workspaceId]);

  // Listen for message from popup window (success callback)
  useEffect(() => {
    const handleOauthMessage = (event: MessageEvent) => {
      // Validate origin is securely our relative app runs
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setActionSuccess('OAuth channel synchronization completed successfully!');
        setConnectingPlatform(null);
        setTimeout(() => setActionSuccess(null), 4000);
        loadAccounts();
      }
    };
    
    window.addEventListener('message', handleOauthMessage);
    return () => window.removeEventListener('message', handleOauthMessage);
  }, [workspaceId]);

  // Initiate popup-based OAuth authorization stream
  const handleConnect = async (platform: PlatformType) => {
    setConnectingPlatform(platform);
    setActionError(null);
    try {
      const res = await fetch(`/api/social-accounts/oauth/url?platform=${platform}&workspaceId=${workspaceId}`);
      if (!res.ok) {
        throw new Error('Could not request callback gateway URL.');
      }
      const { url } = await res.json();
      
      // Open direct OAuth mimicking URL in a clean popup window
      const width = 500;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        `Secure OAuth Integration - ${platform}`,
        `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no`
      );
      
      if (!popup) {
        setActionError('OAuth popup blocked. Please allow browser popups to link sandbox accounts.');
        setConnectingPlatform(null);
      }
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'OAuth initialization failed.');
      setConnectingPlatform(null);
    }
  };

  // Reconnect / refresh expired credential tokens directly
  const handleReconnect = async (account: SocialAccount) => {
    setActionError(null);
    
    // Instead of doing passive POST refresh, let's open the popup flow to replicate authentic security challenge consent!
    // But we also support quick bypass if user clicks Reconnect by launching the interactive flow
    handleConnect(account.platform);
  };

  // Disconnect / revoke channel integrations
  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to revoke these tokens? This instantly locks published queue streams for this channel.')) {
      return;
    }
    
    setActionError(null);
    try {
      const res = await fetch('/api/social-accounts/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
      if (res.ok) {
        setAccounts(prev => prev.filter(a => a.id !== accountId));
        setActionSuccess('Social credential tokens successfully revoked inside secure sandbox vault.');
        setTimeout(() => setActionSuccess(null), 3500);
      } else {
        setActionError('Failed to safely disconnect social provider.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Vault disruption occurred while unlinking token buffers.');
    }
  };

  const getPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-5 h-5 text-pink-500" />;
      case 'linkedin': return <Linkedin className="w-5 h-5 text-blue-600" />;
      case 'tiktok': return <Video className="w-5 h-5 text-purple-500" />;
      default: return <Link className="w-5 h-5" />;
    }
  };

  const getPlatformStyling = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return {
          bg: 'bg-gradient-to-tr from-yellow-500/10 via-red-500/10 to-purple-600/10 dark:from-yellow-500/5 dark:via-red-500/5 dark:to-purple-600/5',
          border: 'border-pink-500/20 dark:border-pink-500/10',
          badge: 'bg-pink-500/10 text-pink-650 dark:text-pink-400 border-pink-500/20',
        };
      case 'tiktok':
        return {
          bg: 'bg-slate-900/10 dark:bg-slate-950/40',
          border: 'border-slate-350 dark:border-slate-800',
          badge: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25',
        };
      case 'linkedin':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/5',
          border: 'border-blue-500/20 dark:border-blue-500/10',
          badge: 'bg-blue-500/10 text-blue-650 dark:text-blue-400 border-blue-500/20',
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          badge: 'bg-slate-100 text-slate-600',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER HERO AREA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm p-6 relative overflow-hidden transition shadow-xs">
        <div className="absolute right-0 bottom-0 top-0 w-48 bg-indigo-50/20 dark:bg-indigo-950/5 rounded-l-full pointer-events-none"></div>
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30 px-3 py-1 rounded-sm text-[10px] font-extrabold uppercase font-mono tracking-wider">
            <Shield className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            OAuth Credential Integration Portal
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white uppercase">
            Platform Account Connector
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
            Maintain deep social media ledger synchronizations. Connect brand pipelines directly to schedule organic properties promotion, harvest real-time reach insight telemetry, and guarantee automated posting streams.
          </p>
        </div>
      </div>

      {/* FEEDBACK LABELS */}
      <AnimatePresence mode="wait">
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-sm text-xs text-rose-700 dark:text-rose-450 font-medium flex items-center gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{actionError}</span>
          </motion.div>
        )}

        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-sm text-xs text-emerald-700 dark:text-emerald-405 font-medium flex items-center gap-2.5 animate-pulse"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: AVAILABLE CHANNELS GATEWAY */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-sm shadow-xs">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-850 dark:text-white mb-2 font-display">
              Link New Social Channel
            </h3>
            <p className="text-[11px] text-slate-450 dark:text-slate-500 mb-4 leading-normal">
              Click to initiate a secure sandbox OAuth authentication flow to bind brand resources safely.
            </p>

            <div className="space-y-3">
              {/* INSTAGRAM OAUTH CARD */}
              <div className="border border-pink-500/10 bg-pink-500/5 dark:bg-pink-505/20 p-4 rounded-sm hover:border-pink-500/30 transition flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 text-white rounded-sm">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Instagram Business</h4>
                    <span className="text-[8px] uppercase font-mono text-pink-650 dark:text-pink-400 font-bold tracking-widest">Graph API</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-505 dark:text-slate-400 mb-4 leading-normal">
                  Publish interactive imagery Reels, retrieve visitor counts, and index customer sentiment trends.
                </p>
                <button
                  disabled={connectingPlatform !== null}
                  onClick={() => handleConnect('instagram')}
                  className="w-full text-center bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-sm cursor-pointer shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {connectingPlatform === 'instagram' ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : <Plus className="w-3.5 h-3.5" />}
                  Connect Instagram
                </button>
              </div>

              {/* TIKTOK OAUTH CARD */}
              <div className="border border-slate-250 dark:border-slate-805 bg-slate-50 dark:bg-slate-950 p-4 rounded-sm hover:border-slate-400 transition flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-black text-white rounded-sm border border-slate-800">
                    <Video className="w-4 h-4 text-emerald-450" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">TikTok Pro Account</h4>
                    <span className="text-[8px] uppercase font-mono text-slate-500 font-bold tracking-widest">Creator API</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-550 dark:text-slate-400 mb-4 leading-normal">
                  Sync high fidelity luxury video promotions, auto-comment, and process algorithmic performance markers.
                </p>
                <button
                  disabled={connectingPlatform !== null}
                  onClick={() => handleConnect('tiktok')}
                  className="w-full text-center bg-slate-900 hover:bg-black border border-slate-750 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-sm cursor-pointer shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {connectingPlatform === 'tiktok' ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : <Plus className="w-3.5 h-3.5" />}
                  Connect TikTok
                </button>
              </div>

              {/* LINKEDIN OAUTH CARD */}
              <div className="border border-blue-500/10 bg-blue-500/5 dark:bg-blue-505/20 p-4 rounded-sm hover:border-blue-500/30 transition flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-sm">
                    <Linkedin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">LinkedIn Corporate</h4>
                    <span className="text-[8px] uppercase font-mono text-blue-650 dark:text-blue-400 font-bold tracking-widest">Enterprise API</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-505 dark:text-slate-400 mb-4 leading-normal">
                  Disseminate corporate announcements, target corporate guest partnerships, and map team milestones.
                </p>
                <button
                  disabled={connectingPlatform !== null}
                  onClick={() => handleConnect('linkedin')}
                  className="w-full text-center bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2 rounded-sm cursor-pointer shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  {connectingPlatform === 'linkedin' ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : <Plus className="w-3.5 h-3.5" />}
                  Connect LinkedIn
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE SYNCED CONNECTIONS & HEALTH */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-sm shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-850 dark:text-white font-display">
                  Active Connected Accounts
                </h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Verify credential buffers, expiration timers, and execute quick handshakes.
                </p>
              </div>
              <button
                onClick={loadAccounts}
                className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-sm text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800 cursor-pointer text-[10px] font-bold flex items-center gap-1"
                title="Synchronize vault"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Sync
              </button>
            </div>

            {loading && accounts.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-450 font-mono">
                <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin mx-auto mb-2" />
                Querying SOC2 security tokens list...
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800/80 bg-slate-50/20 dark:bg-slate-950/20 rounded-sm">
                <Link className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase mb-1">No channels currently linked</h4>
                <p className="text-[11px] text-slate-450 dark:text-slate-500 max-w-sm mx-auto leading-normal">
                  You have not authorized any organic social media channels inside this workspace yet. Link your Instagram, TikTok, or LinkedIn to begin.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {accounts.map((acc) => {
                  const style = getPlatformStyling(acc.platform);
                  const isExpired = acc.status === 'expired';
                  const expiryDate = acc.expires_at ? new Date(acc.expires_at) : null;
                  const daysToExpiry = expiryDate 
                    ? Math.round((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) 
                    : 0;
                  
                  return (
                    <div
                      key={acc.id}
                      className={`border ${style.border} ${style.bg} rounded-sm p-4 transition duration-250 flex flex-col md:flex-row md:items-center justify-between gap-4`}
                    >
                      {/* Left: Avatar & account label */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={acc.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'}
                            alt={acc.account_name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-900 shadow-md shadow-slate-200/50 dark:shadow-none"
                          />
                          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-sm p-1 shadow-sm border border-slate-100 dark:border-slate-800">
                            {getPlatformIcon(acc.platform)}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {acc.account_name}
                            </h4>
                            <span className={`text-[8.5px] px-1.5 py-0.5 rounded-sm font-semibold tracking-wider font-mono border uppercase flex items-center gap-1 ${
                              isExpired 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-505 dark:text-amber-450' 
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isExpired ? <AlertTriangle className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                              {isExpired ? 'Expired' : 'Active'}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                              {acc.handle}
                            </span>
                            <span className="text-[10px] text-slate-350 dark:text-slate-650">•</span>
                            <span className="text-[10px] text-slate-450 dark:text-slate-450">
                              Connected {new Date(acc.connected_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Connection Health Description Label */}
                      <div className="bg-white/40 dark:bg-slate-950/50 border border-slate-200/20 dark:border-slate-850 px-3 py-2 rounded-sm max-w-sm w-full md:w-auto shrink-0 space-y-1 font-sans">
                        <div className="flex items-center gap-1.5">
                          {isExpired ? (
                            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span className="text-[9.5px] uppercase font-bold tracking-wider text-slate-550 dark:text-slate-400">
                            {isExpired ? 'Handshake Expired' : 'Secure Token Valid'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal font-medium">
                          {isExpired ? (
                            <span className="text-amber-550 dark:text-amber-450">
                              OAuth verification timed out {Math.abs(daysToExpiry)} days ago. Please reconfirm permissions.
                            </span>
                          ) : (
                            <span>
                              Next automated token rotation check-in in <strong className="text-slate-800 dark:text-white font-mono">{daysToExpiry} days</strong>.
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        {isExpired ? (
                          <button
                            onClick={() => handleReconnect(acc)}
                            className="bg-amber-505 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase px-3 py-2 rounded-sm cursor-pointer shadow-xs border border-amber-500/20 transition flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3 h-3 animate-spin duration-3000" />
                            Reconnect
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReconnect(acc)}
                            className="bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-350 font-extrabold text-[10px] uppercase px-3 py-2 rounded-sm cursor-pointer shadow-xs border border-slate-200 dark:border-slate-800 transition flex items-center gap-1.2"
                            title="Reset 30-day credential window"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDisconnect(acc.id)}
                          className="bg-rose-50/10 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 p-2 rounded-sm border border-rose-100/30 cursor-pointer transition"
                          title="Revoke and unlink OAuth tokens"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PRIVACY SHIELD FOOTER CARD */}
          <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200/50 dark:border-slate-850 p-4 rounded-sm flex items-start gap-3">
            <Shield className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
            <div className="space-y-1 text-slate-500 dark:text-slate-400">
              <h4 className="text-[10px] uppercase font-mono tracking-widest font-extrabold text-indigo-650 dark:text-indigo-400">
                Lusso Sync Security Shield
              </h4>
              <p className="text-[10px] leading-normal font-sans">
                Our application does not store your direct login passwords. Platform handshakes occur via TLS-isolated OAuth 2.0 PKCE protocol tunnels. Disconnecting any channel immediately flushes its token buffers from all our container nodes.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
