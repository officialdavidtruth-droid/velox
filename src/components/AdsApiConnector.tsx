import React, { useState, useEffect } from 'react';
import { Key, Plug, Trash2, CheckCircle2, AlertTriangle, RefreshCw, Eye, EyeOff, ExternalLink, X } from 'lucide-react';

interface AdsApiConnectorProps { workspaceId: string; }

const AD_PLATFORMS = [
  {
    key: 'Meta Ads',
    color: '#1877f2',
    fields: [
      { name: 'ad_account_id', label: 'Ad Account ID', placeholder: 'act_1234567890', help: 'Meta Ads Manager → Account Overview → top left dropdown' },
      { name: 'access_token', label: 'Access Token', placeholder: 'EAAxxxxxx...', help: 'Generate via Graph API Explorer with ads_read permission', secret: true },
    ],
    docs: 'https://developers.facebook.com/docs/marketing-api/get-started',
  },
  {
    key: 'Google Ads',
    color: '#4285f4',
    fields: [
      { name: 'customer_id', label: 'Customer ID', placeholder: '123-456-7890', help: 'Google Ads → top right, your account number' },
      { name: 'developer_token', label: 'Developer Token', placeholder: 'xxxxxxxxxxxxxxxx', help: 'Google Ads API Center → apply for access', secret: true },
      { name: 'access_token', label: 'OAuth Access Token', placeholder: 'ya29.xxxxx', help: 'Generate via Google OAuth Playground with adwords scope', secret: true },
    ],
    docs: 'https://developers.google.com/google-ads/api/docs/start',
  },
  {
    key: 'TikTok Ads',
    color: '#fe2c55',
    fields: [
      { name: 'advertiser_id', label: 'Advertiser ID', placeholder: '1234567890123456', help: 'TikTok Ads Manager → Account Settings' },
      { name: 'access_token', label: 'Access Token', placeholder: 'xxxxxxxxxxxxxxxx', help: 'TikTok for Business API → App Management', secret: true },
    ],
    docs: 'https://business-api.tiktok.com/portal/docs',
  },
  {
    key: 'LinkedIn Ads',
    color: '#0a66c2',
    fields: [
      { name: 'ad_account_id', label: 'Ad Account ID', placeholder: '123456789', help: 'Campaign Manager → Account Settings' },
      { name: 'access_token', label: 'Access Token', placeholder: 'AQXxxxxxx...', help: 'LinkedIn Developer Portal → generate via OAuth flow', secret: true },
    ],
    docs: 'https://learn.microsoft.com/en-us/linkedin/marketing/',
  },
];

export default function AdsApiConnector({ workspaceId }: AdsApiConnectorProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{type:'success'|'error', text:string} | null>(null);
  const token = localStorage.getItem('velox_token') || '';
  const h = { 'Content-Type': 'application/json', 'x-session-token': token };

  useEffect(() => { load(); }, [workspaceId]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ad-connections?workspaceId=${workspaceId}`, { headers: h });
      const d = await r.json();
      setConnections(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  };

  const openForm = (platform: string) => {
    setActiveForm(platform);
    const existing = connections.find(c => c.platform_name === platform);
    setFormData(existing ? { ...existing } : {});
    setMsg(null);
  };

  const handleSave = async (platform: any) => {
    const required = platform.fields.filter((f: any) => !formData[f.name]);
    if (required.length > 0) {
      setMsg({ type: 'error', text: `Please fill in: ${required.map((f:any)=>f.label).join(', ')}` });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/ad-connections/save', {
        method: 'POST', headers: h,
        body: JSON.stringify({ workspaceId, platformName: platform.key, fields: formData }),
      });
      const d = await r.json();
      if (d.success) {
        setMsg({ type: 'success', text: d.verified ? 'Connected and verified! Real data will sync now.' : 'Saved, but could not verify the credentials — double check them.' });
        load();
        setTimeout(() => { setActiveForm(null); setMsg(null); }, 2000);
      } else {
        setMsg({ type: 'error', text: d.error || 'Failed to save connection.' });
      }
    } catch {
      setMsg({ type: 'error', text: 'Network error.' });
    }
    setSaving(false);
  };

  const handleDisconnect = async (platformName: string) => {
    if (!confirm(`Disconnect ${platformName}?`)) return;
    await fetch('/api/ad-connections/disconnect', {
      method: 'POST', headers: h, body: JSON.stringify({ workspaceId, platformName }),
    });
    load();
  };

  const isConnected = (key: string) => connections.some(c => c.platform_name === key && c.connected);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>Ads API Connections</h2>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Connect your own API credentials from each ad platform to pull real campaign data automatically — no manual entry needed once connected.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {AD_PLATFORMS.map(platform => {
          const connected = isConnected(platform.key);
          return (
            <div key={platform.key} className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: platform.color+'20' }}>
                    <Plug size={14} style={{ color: platform.color }}/>
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{platform.key}</p>
                    {connected ? (
                      <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: 'var(--success)' }}>
                        <CheckCircle2 size={9}/> Connected
                      </span>
                    ) : (
                      <span className="text-[9px]" style={{ color: 'var(--muted)' }}>Not connected</span>
                    )}
                  </div>
                </div>
                <a href={platform.docs} target="_blank" rel="noreferrer"
                  className="text-[9px] flex items-center gap-1 font-semibold" style={{ color: 'var(--primary)' }}>
                  Docs <ExternalLink size={9}/>
                </a>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openForm(platform.key)}
                  className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
                  style={{ background: connected ? 'var(--surface)' : 'var(--primary-soft)', color: connected ? 'var(--text)' : 'var(--primary)', border: '1px solid var(--border)' }}>
                  {connected ? 'Edit Credentials' : 'Connect'}
                </button>
                {connected && (
                  <button onClick={() => handleDisconnect(platform.key)}
                    className="px-3 rounded-lg" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
                    <Trash2 size={12}/>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Credential Form Modal */}
      {activeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            {(() => {
              const platform = AD_PLATFORMS.find(p => p.key === activeForm)!;
              return (
                <>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>Connect {platform.key}</h3>
                    <button onClick={() => setActiveForm(null)} style={{ color: 'var(--muted)' }}><X size={14}/></button>
                  </div>
                  <div className="p-5 space-y-4">
                    {msg && (
                      <div className="text-xs p-3 rounded-lg flex items-start gap-2"
                        style={{ background: msg.type==='success' ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.type==='success' ? 'var(--success)' : 'var(--danger)' }}>
                        {msg.type==='success' ? <CheckCircle2 size={13} className="mt-0.5 shrink-0"/> : <AlertTriangle size={13} className="mt-0.5 shrink-0"/>}
                        {msg.text}
                      </div>
                    )}
                    {platform.fields.map(field => (
                      <div key={field.name}>
                        <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--muted)' }}>
                          {field.label}
                        </label>
                        <div className="relative">
                          <input
                            type={field.secret && !showSecret[field.name] ? 'password' : 'text'}
                            value={formData[field.name] || ''}
                            onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))}
                            placeholder={field.placeholder}
                            className="w-full text-xs rounded-xl px-3 py-2.5 border outline-none pr-9"
                            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          />
                          {field.secret && (
                            <button type="button" onClick={() => setShowSecret(p => ({ ...p, [field.name]: !p[field.name] }))}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }}>
                              {showSecret[field.name] ? <EyeOff size={13}/> : <Eye size={13}/>}
                            </button>
                          )}
                        </div>
                        <p className="text-[9px] mt-1" style={{ color: 'var(--muted)' }}>{field.help}</p>
                      </div>
                    ))}
                    <div className="rounded-lg p-2.5 flex items-start gap-2" style={{ background: 'var(--primary-soft)' }}>
                      <Key size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--primary)' }}/>
                      <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-soft)' }}>
                        Credentials are stored securely server-side and never exposed in the browser. Used only to pull your campaign metrics.
                      </p>
                    </div>
                    <button onClick={() => handleSave(platform)} disabled={saving}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-white gradient-primary disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {saving ? <RefreshCw size={12} className="animate-spin"/> : <Plug size={12}/>}
                      {saving ? 'Verifying…' : 'Save & Connect'}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
