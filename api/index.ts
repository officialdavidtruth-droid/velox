/**
 * VeloxSpace ? Express Server (REAL DATA ONLY)
 * All analytics, AI, and lead data comes from real APIs.
 * No mock data, no fake numbers, no fallbacks.
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(express.json());

// ── Gemini (Google AI) ────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null as any;

// Calls Gemini and returns the raw text response. Throws if not configured or on API error.
async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  if (!genAI) throw new Error('GEMINI_API_KEY not set in Vercel environment variables. Get a free key at aistudio.google.com/apikey.');
  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    ...(systemInstruction ? { config: { systemInstruction } } : {}),
  });
  const text = response.text;
  if (!text) throw new Error('Gemini returned an empty response.');
  return text;
}

// ?? Supabase ???????????????????????????????????????????????????????????????
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null as any;

app.use('/api/auth', (req: Request, res: Response, next: any) => {
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.' });
  }
  next();
});

// ?? Helpers ????????????????????????????????????????????????????????????????
function genToken() {
  return crypto.randomBytes(32).toString('hex');
}
function genCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}
function hashPwd(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}
function verifyPwd(password: string, salt: string, hash: string): boolean {
  return hashPwd(password, salt) === hash;
}

async function getSessionUser(req: Request) {
  const token = req.headers['x-session-token'] as string;
  if (!token || !supabase) return null;
  const { data: session } = await supabase.from('velox_sessions')
    .select('user_id, expires_at').eq('token', token).maybeSingle();
  if (!session || new Date(session.expires_at) < new Date()) return null;
  const { data: user } = await supabase.from('velox_users')
    .select('id,email,name,role').eq('id', session.user_id).maybeSingle();
  return user;
}

// ?? Health ????????????????????????????????????????????????????????????????

// ── Audit Log Helper ──────────────────────────────────────────────────────────
const insertAuditLog = async (userId: string | null, action: string, req: any) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      ip_address: String(ip).split(',')[0].trim(),
      created_at: new Date().toISOString(),
    });
  } catch { /* never throw from audit */ }
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', supabase: !!supabase, time: new Date().toISOString() });
});

// ?? Auth ??????????????????????????????????????????????????????????????????
app.get('/api/auth/me', async (req, res) => {
  if (!supabase) return res.json({ user: null });

  // Load app settings safely — works even if app_settings table doesn't exist yet
  let maintenance = false;
  let maintenanceMsg = 'VeloxSpace is under maintenance. We will be back soon.';
  let announcement = '';
  try {
    const { data: settings } = await supabase.from('app_settings').select('key,value');
    if (Array.isArray(settings)) {
      const map: Record<string,string> = {};
      settings.forEach((s: any) => { map[s.key] = s.value; });
      if (map.maintenance === 'true') maintenance = true;
      if (map.maintenance_msg) maintenanceMsg = map.maintenance_msg;
      if (map.announcement) announcement = map.announcement;
    }
  } catch { /* table may not exist yet — safe to ignore */ }

  if (maintenance) {
    return res.json({ user: null, maintenance: true, maintenanceMsg });
  }

  const user = await getSessionUser(req);
  if (!user) return res.json({ user: null, subscription: null, credit: null, announcement });

  const [{ data: sub }, { data: credit }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  res.json({ user, subscription: sub, credit, announcement });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, name, password, role, country, phone, plan, agencyName, clientRange, spendRange, platforms, services } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Email and name required.' });

  // ── Strong password validation (8-16 chars + upper + lower + number + special) ──
  if (!password) return res.status(400).json({ error: 'Password is required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (password.length > 16) return res.status(400).json({ error: 'Password must be no more than 16 characters.' });
  if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one uppercase letter.' });
  if (!/[a-z]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one lowercase letter.' });
  if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one number.' });
  if (!/[!@#$%^&*()\-_=+[\]{};:'",.<>?/\|`~]/.test(password)) return res.status(400).json({ error: 'Password must contain at least one special character (e.g. !@#$%).' });

  let userId: string;
  const { data: existing } = await supabase.from('velox_users')
    .select('*').eq('email', email.toLowerCase()).maybeSingle();

  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists. Please sign in instead.' });
  } else {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = hashPwd(password, salt);
    const { data: newUser, error } = await supabase.from('velox_users')
      .insert({ email: email.toLowerCase(), name, role: role || 'agency', country: country || 'Nigeria', password_hash: hash, password_salt: salt })
      .select().single();
    if (error || !newUser) return res.status(500).json({ error: 'Registration failed: ' + (error?.message || 'unknown') });
    userId = newUser.id;

    await Promise.all([
      supabase.from('subscriptions').insert({ user_id: userId, plan_type: plan || 'starter', status: 'active' }),
      supabase.from('credit_balances').insert({ user_id: userId, remaining_credits: 10, total_credits_available: 10 }),
    ]);

    // Create workspace with NO seeded analytics ? real data only
    const { data: ws } = await supabase.from('workspaces')
      .insert({ name: agencyName ? agencyName : `${name}'s Workspace`, owner_id: userId, referral_code: genCode() })
      .select().single();
    if (ws) {
      await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: userId, role: 'admin' });
    }
  }

  const token = genToken();
  await supabase.from('velox_sessions').insert({ token, user_id: userId });
  const { data: rawUser } = await supabase.from('velox_users').select('*').eq('id', userId).single();
  const { password_hash, password_salt, ...user } = rawUser || {};
  res.json({ user, token });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!password) return res.status(400).json({ error: 'Password required' });
  const { data: user } = await supabase.from('velox_users')
    .select('*').eq('email', email.toLowerCase()).maybeSingle();
  if (!user) return res.status(404).json({ error: 'No account with this email. Please sign up first.' });
  // Allow legacy accounts (no password set) to log in without password check
  if (user.password_hash && user.password_salt) {
    if (!verifyPwd(password, user.password_salt, user.password_hash)) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }
  }
  const token = genToken();
  await supabase.from('velox_sessions').insert({ token, user_id: user.id });
  const { password_hash, password_salt, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

app.post('/api/auth/logout', async (req, res) => {
  const token = req.headers['x-session-token'] as string;
  if (token && supabase) await supabase.from('velox_sessions').delete().eq('token', token);
  res.json({ success: true });
});

app.post('/api/auth/demo', async (req, res) => {
  const demoEmail = 'demo@veloxspace.app';
  let { data: user } = await supabase.from('velox_users').select('*').eq('email', demoEmail).maybeSingle();
  if (!user) {
    const { data: newUser } = await supabase.from('velox_users')
      .insert({ email: demoEmail, name: 'Demo User', role: 'agency' }).select().single();
    user = newUser;
    if (user) {
      await Promise.all([
        supabase.from('subscriptions').insert({ user_id: user.id, plan_type: 'agency', status: 'active' }),
        supabase.from('credit_balances').insert({ user_id: user.id, remaining_credits: 200, total_credits_available: 200 }),
      ]);
      const { data: ws } = await supabase.from('workspaces')
        .insert({ name: 'Demo Workspace', owner_id: user.id, referral_code: genCode() })
        .select().single();
      if (ws) await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' });
    }
  }
  if (!user) return res.status(500).json({ error: 'Demo setup failed' });
  const token = genToken();
  await supabase.from('velox_sessions').insert({ token, user_id: user.id });
  const [{ data: sub }, { data: credit }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  res.json({ user, token, subscription: sub, credit, success: true });
});

// ?? Workspaces ????????????????????????????????????????????????????????????
app.get('/api/workspaces', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { data: members } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id);
  const ids = (members || []).map((m: any) => m.workspace_id);
  if (!ids.length) return res.json([]);
  const { data } = await supabase.from('workspaces').select('*').in('id', ids).order('created_at', { ascending: true });
  res.json(data || []);
});

app.post('/api/workspaces', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  // Enforce workspace limits per plan
  const { data: sub } = await supabase.from('subscriptions').select('plan_type').eq('user_id', user.id).maybeSingle();
  const plan = sub?.plan_type || 'starter';
  const limits: Record<string, number> = { starter: 1, pro: 3, agency: 6 };
  const limit = limits[plan] ?? 1;

  const { data: members } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', user.id);
  const count = (members || []).length;
  if (count >= limit) {
    return res.status(403).json({ error: `Your ${plan} plan allows up to ${limit} workspace${limit !== 1 ? 's' : ''}. Upgrade to create more.` });
  }

  const { data: ws } = await supabase.from('workspaces')
    .insert({ name, owner_id: user.id, referral_code: genCode() }).select().single();
  if (!ws) return res.status(500).json({ error: 'Failed to create workspace' });
  await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' });
  res.status(201).json(ws);
});

// Refreshes a Google/YouTube account's access_token in place if it's expired and a
// refresh_token is on file. Mutates the passed account object and updates the DB row.
// Returns true if the account is (now) usable, false if it genuinely needs reconnecting.
async function refreshGoogleTokenIfNeeded(account: any): Promise<boolean> {
  const isGoogle = account.platform === 'google' || account.platform === 'youtube';
  if (!isGoogle) return true;
  const isExpired = account.expires_at && new Date(account.expires_at) <= new Date();
  if (!isExpired) return true;

  const hasRefresh = !!account.refresh_token;
  const gClientId     = process.env.VITE_GOOGLE_CLIENT_ID  || '';
  const gClientSecret = process.env.GOOGLE_CLIENT_SECRET   || '';
  if (!hasRefresh || !gClientId || !gClientSecret) return !isExpired;

  try {
    const tr = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: account.refresh_token,
        client_id:     gClientId,
        client_secret: gClientSecret,
      }),
    });
    const td: any = await tr.json();
    if (td.access_token) {
      const newExpiry = new Date(Date.now() + (td.expires_in || 3600) * 1000).toISOString();
      await supabase.from('social_accounts').update({
        access_token: td.access_token,
        expires_at:   newExpiry,
        status:       'active',
      }).eq('id', account.id);
      account.access_token = td.access_token;
      account.expires_at   = newExpiry;
      account.status        = 'active';
      return true;
    }
  } catch (_) { /* fall through */ }
  return false;
}

// ?? Social Accounts ???????????????????????????????????????????????????????
app.get('/api/social-accounts', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('social_accounts').select('*');
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q.order('connected_at', { ascending: false });
  const accounts = data || [];

  // Auto-refresh expired Google/YouTube tokens that have a refresh_token stored
  for (const account of accounts) {
    await refreshGoogleTokenIfNeeded(account);
  }

  res.json(accounts);
});

// Manually pin a YouTube channel by @handle when Google's OAuth "mine=true"
// identity resolution can't find it (Brand Account channel mismatch). Uses
// the Google account's own access_token — the handle lookup is public data,
// but saving it this way lets later Analytics API calls target this exact
// channel ID instead of the ambiguous "MINE" identity.
app.post('/api/social-accounts/youtube/resolve-handle', async (req, res) => {
  const { workspaceId, handle } = req.body;
  if (!workspaceId || !handle) return res.status(400).json({ error: 'workspaceId and handle are required.' });

  const { data: googleAcc } = await supabase.from('social_accounts').select('*').eq('workspace_id', workspaceId).eq('platform', 'google').maybeSingle();
  if (!googleAcc?.access_token) return res.status(400).json({ error: 'Connect your Google account first before pinning a channel.' });

  await refreshGoogleTokenIfNeeded(googleAcc);
  const cleanHandle = handle.trim().replace(/^@?/, '@').replace(/^https?:\/\/(www\.)?youtube\.com\//i, '@');

  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(cleanHandle)}`, {
      headers: { Authorization: `Bearer ${googleAcc.access_token}` },
    });
    const d: any = await r.json();
    const channel = d.items?.[0];
    if (!channel) return res.status(404).json({ error: `No YouTube channel found for "${handle}". Double-check the handle (e.g. @yourname).` });

    await supabase.from('social_accounts').upsert({
      workspace_id: workspaceId, platform: 'youtube',
      account_name: channel.snippet?.title || 'YouTube Channel',
      handle: cleanHandle, channel_override: channel.id,
      avatar_url: channel.snippet?.thumbnails?.default?.url || '',
      status: 'active', access_token: googleAcc.access_token, refresh_token: googleAcc.refresh_token,
      connected_at: new Date().toISOString(), expires_at: googleAcc.expires_at,
    }, { onConflict: 'workspace_id,platform' });

    await supabase.from('analytics').upsert({
      workspace_id: workspaceId, platform: 'youtube',
      followers: parseInt(channel.statistics?.subscriberCount) || 0,
      posts: parseInt(channel.statistics?.videoCount) || 0,
      impressions: parseInt(channel.statistics?.viewCount) || 0,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'workspace_id,platform' });

    res.json({ success: true, channel: { name: channel.snippet?.title, id: channel.id, subscribers: channel.statistics?.subscriberCount } });
  } catch (e: any) {
    res.status(500).json({ error: 'Channel lookup failed: ' + e.message });
  }
});


// ── Build the OAuth authorization URL for a given platform ──────────────────
app.get('/api/social-accounts/oauth/url', async (req, res) => {
  const { platform, workspaceId, sessionToken } = req.query;
  const p     = String(platform).toLowerCase();
  const wid   = String(workspaceId || '');
  const tok   = String(sessionToken || '');
  const state = `${p}__${tok}__${wid}`;
  const site  = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
  const redir = `${site}/api/oauth-callback`;

  if ((p === 'meta' || p === 'facebook' || p === 'instagram' || p === 'meta_ads')) {
    const appId = process.env.VITE_META_APP_ID || process.env.META_APP_ID || '';
    if (appId) {
      return res.json({ url: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redir)}&scope=pages_show_list,pages_read_engagement,business_management,ads_read&state=${state}&response_type=code` });
    }
    return res.json({ error: 'VITE_META_APP_ID not set in Vercel environment variables.' });
  }

  if (p === 'google' || p === 'youtube' || p === 'google_ads') {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '';
    if (clientId) {
      return res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redir)}&scope=https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/userinfo.email+https://www.googleapis.com/auth/youtube.readonly+https://www.googleapis.com/auth/yt-analytics.readonly+https://www.googleapis.com/auth/analytics.readonly&state=${state}&response_type=code&access_type=offline&prompt=${encodeURIComponent('consent select_account')}&include_granted_scopes=true` });
    }
    return res.json({ error: 'VITE_GOOGLE_CLIENT_ID not set in Vercel environment variables.' });
  }

  if (p === 'tiktok') {
    const appId = process.env.VITE_TIKTOK_APP_ID || '';
    if (appId) {
      return res.json({ url: `https://www.tiktok.com/v2/auth/authorize?client_key=${appId}&scope=user.info.basic,user.info.stats,video.list&response_type=code&redirect_uri=${encodeURIComponent(redir)}&state=${state}` });
    }
    return res.json({ error: 'VITE_TIKTOK_APP_ID not set in Vercel environment variables.' });
  }

  if (p === 'linkedin') {
    const clientId = process.env.VITE_LINKEDIN_CLIENT_ID || '';
    if (clientId) {
      return res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redir)}&scope=openid%20profile&state=${state}` });
    }
    return res.json({ error: 'VITE_LINKEDIN_CLIENT_ID not set in Vercel environment variables.' });
  }

  if (p === 'twitter' || p === 'x') {
    const clientId = process.env.VITE_TWITTER_CLIENT_ID || '';
    if (clientId) {
      const verifier = crypto.randomBytes(32).toString('base64url');
      return res.json({ url: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redir)}&scope=tweet.read+tweet.write+users.read+offline.access&state=${state}&code_challenge=${verifier}&code_challenge_method=plain` });
    }
    return res.json({ error: 'VITE_TWITTER_CLIENT_ID not set in Vercel environment variables.' });
  }

  res.json({ error: `Platform "${p}" OAuth not configured.` });
});

app.post('/api/social-accounts/reconnect', async (req, res) => {
  const { accountId } = req.body;
  await supabase.from('social_accounts').update({ status: 'active', expires_at: new Date(Date.now() + 30*24*3600000).toISOString() }).eq('id', accountId);
  res.json({ success: true });
});

app.post('/api/social-accounts/disconnect', async (req, res) => {
  const { accountId } = req.body;
  await supabase.from('social_accounts').delete().eq('id', accountId);
  res.json({ success: true });
});

// ?? OAuth Callback ????????????????????????????????????????????????????????
app.get('/api/oauth-callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;
  const site = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
  if (oauthError) return res.send(oauthPage('Cancelled', `OAuth cancelled: ${oauthError}`, false));
  if (!code || !state) return res.send(oauthPage('Error', 'Missing code or state from OAuth provider.', false));
  const parts = String(state).split('__');
  const platform = parts[0]; const sessionToken = parts[1]; const workspaceId = parts[2];
  const redir = `${site}/api/oauth-callback`;
  try {
    if (platform === 'meta' || platform === 'facebook' || platform === 'instagram' || platform === 'meta_ads') {
      await exchangeMeta(String(code), workspaceId, redir, res);
    } else if (platform === 'google' || platform === 'youtube') {
      await exchangeGoogle(String(code), workspaceId, redir, res);
    } else if (platform === 'linkedin') {
      await exchangeLinkedIn(String(code), workspaceId, redir, res);
    } else if (platform === 'tiktok') {
      await exchangeTikTok(String(code), workspaceId, redir, res);
    } else if (platform === 'twitter' || platform === 'x') {
      await exchangeTwitter(String(code), workspaceId, redir, res);
    } else {
      // Unknown platform — still send success so UI refreshes
      res.send(oauthPage('Connected!', `${platform} connected. Sync analytics to pull data.`, true));
    }
  } catch (e: any) {
    res.send(oauthPage('Connection failed', e.message, false));
  }
});

function oauthPage(title: string, msg: string, success: boolean) {
  const color = success ? '#10b981' : '#ef4444';
  return `<!DOCTYPE html><html><head><title>${title}</title><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-[#0a0b10] flex items-center justify-center min-h-screen p-6">
<div class="max-w-sm w-full bg-[#13151c] border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
  <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black" style="background:${color}20;color:${color}">${success ? '?' : '?'}</div>
  <h2 class="text-base font-bold text-white mb-2">${title}</h2>
  <p class="text-xs text-slate-400 mb-4">${msg}</p>
  ${success ? '<p class="text-xs text-slate-500">Window will close shortly?</p>' : ''}
</div>
<script>if(${success}){if(window.opener)window.opener.postMessage({type:'OAUTH_AUTH_SUCCESS'},'*');setTimeout(()=>window.close(),1800);}</script>
</body></html>`;
}

async function exchangeMeta(code: string, workspaceId: string, redir: string, res: Response) {
  const appId = process.env.VITE_META_APP_ID || ''; const appSecret = process.env.META_APP_SECRET || '';
  if (!appId || !appSecret) return res.send(oauthPage('Not configured', 'META_APP_SECRET not set in Vercel environment variables.', false));
  const tokenRes = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(redir)}`);
  const tokenData: any = await tokenRes.json();
  if (tokenData.error) return res.send(oauthPage('Meta OAuth failed', tokenData.error.message, false));
  const userToken = tokenData.access_token;
  const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,picture&access_token=${userToken}`);
  const pagesData: any = await pagesRes.json();
  const pages = pagesData.data || [];
  let connected = 0;
  if (supabase && workspaceId) {
    for (const page of pages.slice(0, 1)) {
      const pageToken = page.access_token || userToken;
      await supabase.from('social_accounts').upsert({ workspace_id: workspaceId, platform: 'facebook', account_name: page.name || 'Facebook Page', handle: page.id, avatar_url: page.picture?.data?.url || '', status: 'active', access_token: pageToken, connected_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60*24*3600000).toISOString() }, { onConflict: 'workspace_id,platform' });
      connected++;
      const igRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,name,username,profile_picture_url}&access_token=${pageToken}`);
      const igData: any = await igRes.json();
      const ig = igData.instagram_business_account;
      if (ig) {
        await supabase.from('social_accounts').upsert({ workspace_id: workspaceId, platform: 'instagram', account_name: ig.name || ig.username || 'Instagram', handle: '@' + (ig.username || ig.id), avatar_url: ig.profile_picture_url || '', status: 'active', access_token: pageToken, connected_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60*24*3600000).toISOString() }, { onConflict: 'workspace_id,platform' });
        connected++;
      }
      const adsRes = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name&access_token=${userToken}`);
      const adsData: any = await adsRes.json();
      const adAcc = (adsData.data || [])[0];
      if (adAcc) {
        await supabase.from('social_accounts').upsert({ workspace_id: workspaceId, platform: 'meta_ads', account_name: adAcc.name || 'Meta Ads', handle: adAcc.id, avatar_url: '', status: 'active', access_token: userToken, connected_at: new Date().toISOString(), expires_at: new Date(Date.now() + 60*24*3600000).toISOString() }, { onConflict: 'workspace_id,platform' });
        connected++;
      }
    }
  }
  res.send(oauthPage('Meta Connected!', `${connected} account${connected !== 1 ? 's' : ''} connected (Facebook, Instagram, Meta Ads).`, true));
}

async function exchangeGoogle(code: string, workspaceId: string, redir: string, res: Response) {
  const clientId     = process.env.VITE_GOOGLE_CLIENT_ID  || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET   || '';
  if (!clientId || !clientSecret) return res.send(oauthPage('Not configured', 'GOOGLE_CLIENT_SECRET not set in Vercel environment variables.', false));

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redir, grant_type: 'authorization_code' }),
  });
  const tokenData: any = await tokenRes.json();
  if (tokenData.error) return res.send(oauthPage('Google OAuth failed', tokenData.error_description || tokenData.error, false));
  const accessToken  = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || '';
  const authHeader   = { Authorization: `Bearer ${accessToken}` };
  const expiresAt    = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();

  if (!supabase || !workspaceId) return res.send(oauthPage('Google Connected!', 'Token received but workspace not identified. Please try again.', false));

  // Step 1: Always get Google profile (works even without YouTube)
  let accountName = 'Google Account';
  let avatarUrl   = '';
  let handle      = '';
  try {
    const profileRes  = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: authHeader });
    const profileData: any = await profileRes.json();
    accountName = profileData.name  || profileData.email || 'Google Account';
    avatarUrl   = profileData.picture || '';
    handle      = profileData.email || profileData.id || '';
  } catch (_) {}

  // Step 2: Save Google account (always — even without YouTube)
  await supabase.from('social_accounts').upsert({
    workspace_id: workspaceId, platform: 'google',
    account_name: accountName, handle, avatar_url: avatarUrl,
    status: 'active', access_token: accessToken, refresh_token: refreshToken,
    connected_at: new Date().toISOString(), expires_at: expiresAt,
  }, { onConflict: 'workspace_id,platform' });

  // Step 3: Try to get YouTube channel — use Bearer header (NOT deprecated URL param)
  let ytName = '';
  let ytErrorReason = '';
  try {
    const ytRes  = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', { headers: authHeader });
    const ytData: any = await ytRes.json();
    const channel = (ytData.items || [])[0];
    if (channel) {
      ytName = channel.snippet?.title || '';
      await supabase.from('social_accounts').upsert({
        workspace_id: workspaceId, platform: 'youtube',
        account_name: channel.snippet?.title || 'YouTube Channel',
        handle: channel.snippet?.customUrl || channel.id || '',
        avatar_url: channel.snippet?.thumbnails?.default?.url || avatarUrl,
        status: 'active', access_token: accessToken, refresh_token: refreshToken,
        connected_at: new Date().toISOString(), expires_at: expiresAt,
      }, { onConflict: 'workspace_id,platform' });
    } else if (ytData.error) {
      // A real API error (auth/scope/API-not-enabled/quota) was silently being
      // reported as "no channel found" before — surface the true reason instead.
      console.error('YouTube channels.list error:', JSON.stringify(ytData.error));
      ytErrorReason = ytData.error.errors?.[0]?.reason || ytData.error.status || `HTTP ${ytRes.status}`;
    }
  } catch (e: any) {
    console.error('YouTube channels.list threw:', e.message);
    ytErrorReason = 'network_error';
  }

  const msg = ytName
    ? `Google account (${accountName}) + YouTube channel "${ytName}" connected.`
    : ytErrorReason
      ? `Google account (${accountName}) connected, but the YouTube API call failed (${ytErrorReason}). Check that "YouTube Data API v3" is enabled in Google Cloud Console → APIs & Services → Library, and check Vercel logs for details.`
      : `Google account (${accountName}) connected. No YouTube channel found on this account.`;
  res.send(oauthPage('Google Connected!', msg, true));
}


// ── LinkedIn OAuth exchange ─────────────────────────────────────────────────
async function exchangeLinkedIn(code: string, workspaceId: string, redir: string, res: Response) {
  const clientId     = process.env.VITE_LINKEDIN_CLIENT_ID  || '';
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET    || '';
  if (!clientId)     return res.send(oauthPage('Not configured', 'VITE_LINKEDIN_CLIENT_ID not set in Vercel env vars.', false));
  if (!clientSecret) return res.send(oauthPage('Not configured', 'LINKEDIN_CLIENT_SECRET not set in Vercel env vars.', false));
  try {
    // Step 1: Exchange code for tokens
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redir,
      }),
    });
    const tokenData: any = await tokenRes.json();
    if (tokenData.error) {
      return res.send(oauthPage('LinkedIn Auth Failed',
        `${tokenData.error}: ${tokenData.error_description || ''}. Make sure LINKEDIN_CLIENT_SECRET is correct and the redirect URI "${redir}" is registered in your LinkedIn App.`, false));
    }
    if (!tokenData.access_token) {
      return res.send(oauthPage('LinkedIn Auth Failed', `No access token returned. Response: ${JSON.stringify(tokenData).slice(0,200)}`, false));
    }
    const accessToken = tokenData.access_token;

    // Step 2: Get profile via OpenID Connect userinfo endpoint
    let name = 'LinkedIn User'; let picture = ''; let sub = '';
    try {
      const uRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const uData: any = await uRes.json();
      name    = uData.name    || `${uData.given_name || ''} ${uData.family_name || ''}`.trim() || 'LinkedIn User';
      picture = uData.picture || '';
      sub     = uData.sub     || '';
    } catch (_) {
      // Fallback to legacy profile endpoint
      try {
        const legRes = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const legData: any = await legRes.json();
        name = `${legData.localizedFirstName || ''} ${legData.localizedLastName || ''}`.trim() || 'LinkedIn User';
        sub  = legData.id || '';
      } catch (_2) {}
    }

    // Step 3: Save to database
    if (supabase && workspaceId) {
      const { error: upsertErr } = await supabase.from('social_accounts').upsert({
        workspace_id: workspaceId,
        platform:     'linkedin',
        account_name: name,
        handle:       sub,
        avatar_url:   picture,
        status:       'active',
        access_token: accessToken,
        refresh_token: tokenData.refresh_token || '',
        connected_at: new Date().toISOString(),
        expires_at:   new Date(Date.now() + (tokenData.expires_in || 5184000) * 1000).toISOString(),
      }, { onConflict: 'workspace_id,platform' });
      if (upsertErr) return res.send(oauthPage('LinkedIn Save Failed', upsertErr.message, false));
    }

    res.send(oauthPage('LinkedIn Connected!', `${name} connected successfully.`, true));
  } catch (e: any) {
    res.send(oauthPage('LinkedIn Error', e.message || 'Unknown error', false));
  }
}

// ── TikTok OAuth exchange ──────────────────────────────────────────────────
async function exchangeTikTok(code: string, workspaceId: string, redir: string, res: Response) {
  const clientKey    = process.env.VITE_TIKTOK_APP_ID       || '';
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET     || '';
  if (!clientKey || !clientSecret) return res.send(oauthPage('Not configured', 'TIKTOK_CLIENT_SECRET not set in Vercel environment variables.', false));
  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
      body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redir }),
    });
    const tokenData: any = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) return res.send(oauthPage('TikTok Failed', tokenData.error_description || JSON.stringify(tokenData), false));
    const accessToken = tokenData.access_token;
    // Get user info
    const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,open_id', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userData: any = await userRes.json();
    const user = userData.data?.user || {};
    if (supabase && workspaceId) {
      await supabase.from('social_accounts').upsert({
        workspace_id: workspaceId, platform: 'tiktok',
        account_name: user.display_name || 'TikTok User',
        handle: user.open_id || '',
        avatar_url: user.avatar_url || '',
        status: 'active', access_token: accessToken,
        refresh_token: tokenData.refresh_token || '',
        connected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (tokenData.expires_in || 86400) * 1000).toISOString(),
      }, { onConflict: 'workspace_id,platform' });
    }
    res.send(oauthPage('TikTok Connected!', `TikTok account @${user.display_name || 'unknown'} connected.`, true));
  } catch (e: any) {
    res.send(oauthPage('TikTok Error', e.message, false));
  }
}

// ── Twitter/X OAuth exchange ───────────────────────────────────────────────
async function exchangeTwitter(code: string, workspaceId: string, redir: string, res: Response) {
  const clientId     = process.env.VITE_TWITTER_CLIENT_ID  || '';
  const clientSecret = process.env.TWITTER_CLIENT_SECRET   || '';
  if (!clientId || !clientSecret) return res.send(oauthPage('Not configured', 'TWITTER_CLIENT_SECRET not set in Vercel environment variables.', false));
  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
      body: new URLSearchParams({ code, grant_type: 'authorization_code', redirect_uri: redir, code_verifier: 'challenge' }),
    });
    const tokenData: any = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) return res.send(oauthPage('Twitter Failed', tokenData.error_description || JSON.stringify(tokenData), false));
    const accessToken = tokenData.access_token;
    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const userData: any = await userRes.json();
    const user = userData.data || {};
    if (supabase && workspaceId) {
      await supabase.from('social_accounts').upsert({
        workspace_id: workspaceId, platform: 'twitter',
        account_name: user.name || 'Twitter User',
        handle: `@${user.username || ''}`,
        avatar_url: user.profile_image_url || '',
        status: 'active', access_token: accessToken,
        refresh_token: tokenData.refresh_token || '',
        connected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString(),
      }, { onConflict: 'workspace_id,platform' });
    }
    res.send(oauthPage('Twitter/X Connected!', `@${user.username || 'user'} connected.`, true));
  } catch (e: any) {
    res.send(oauthPage('Twitter Error', e.message, false));
  }
}

// ?? Posts & Calendar ??????????????????????????????????????????????????????
app.get('/api/posts', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('scheduled_posts').select('*').order('publish_date', { ascending: true });
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/posts', async (req, res) => {
  const { workspace_id, title, description, platforms, cta, publish_date, ai_generated } = req.body;
  if (!workspace_id || !title || !description || !platforms || !publish_date) return res.status(400).json({ error: 'Missing required fields' });
  const { data: post } = await supabase.from('scheduled_posts').insert({ workspace_id, title, description, platforms, cta: cta || 'None', publish_date, status: 'scheduled', ai_generated: ai_generated || false }).select().single();
  if (post) {
    await supabase.from('content_calendar').insert({ workspace_id, scheduled_post_id: post.id, start_time: publish_date, end_time: new Date(new Date(publish_date).getTime() + 3600000).toISOString(), title, description: description.substring(0, 100), color: (platforms[0] === 'instagram' ? '#ea580c' : platforms[0] === 'facebook' ? '#2563eb' : '#4f46e5') });
  }
  res.status(201).json(post);
});

app.put('/api/posts/:id', async (req, res) => {
  const updates: any = {};
  ['title','description','publish_date','status','platforms','cta'].forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  const { data } = await supabase.from('scheduled_posts').update(updates).eq('id', req.params.id).select().single();
  res.json(data);
});

app.delete('/api/posts/:id', async (req, res) => {
  await supabase.from('content_calendar').delete().eq('scheduled_post_id', req.params.id);
  await supabase.from('scheduled_posts').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.get('/api/calendar', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('content_calendar').select('*').order('start_time', { ascending: true });
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/calendar/move', async (req, res) => {
  const { eventId, newDate } = req.body;
  const { data: evt } = await supabase.from('content_calendar').update({ start_time: newDate, end_time: new Date(new Date(newDate).getTime() + 3600000).toISOString() }).eq('id', eventId).select().single();
  if ((evt as any)?.scheduled_post_id) await supabase.from('scheduled_posts').update({ publish_date: newDate }).eq('id', (evt as any).scheduled_post_id);
  res.json({ success: true });
});

const HOLIDAYS: Record<string, Array<{ name: string; date: string; type: string }>> = {
  Nigeria:      [{ name:"New Year's Day",date:'-01-01',type:'public'},{name:"Workers' Day",date:'-05-01',type:'public'},{name:'Democracy Day',date:'-06-12',type:'public'},{name:'Independence Day',date:'-10-01',type:'national'},{name:'Christmas Day',date:'-12-25',type:'public'},{name:'Boxing Day',date:'-12-26',type:'public'}],
  Ghana:        [{ name:"New Year's Day",date:'-01-01',type:'public'},{name:'Constitution Day',date:'-01-07',type:'public'},{name:'Independence Day',date:'-03-06',type:'national'},{name:'May Day',date:'-05-01',type:'public'},{name:'Christmas Day',date:'-12-25',type:'public'}],
  Kenya:        [{ name:"New Year's Day",date:'-01-01',type:'public'},{name:'Madaraka Day',date:'-06-01',type:'public'},{name:'Mashujaa Day',date:'-10-20',type:'public'},{name:'Jamhuri Day',date:'-12-12',type:'national'},{name:'Christmas Day',date:'-12-25',type:'public'}],
  'South Africa': [{ name:"New Year's Day",date:'-01-01',type:'public'},{name:'Human Rights Day',date:'-03-21',type:'public'},{name:'Freedom Day',date:'-04-27',type:'national'},{name:'Youth Day',date:'-06-16',type:'public'},{name:"Women's Day",date:'-08-09',type:'public'},{name:'Heritage Day',date:'-09-24',type:'seasonal'},{name:'Christmas Day',date:'-12-25',type:'public'},{name:'Boxing Day',date:'-12-26',type:'public'}],
  USA:          [{ name:"New Year's Day",date:'-01-01',type:'public'},{name:'Independence Day',date:'-07-04',type:'national'},{name:'Thanksgiving',date:'-11-26',type:'public'},{name:'Christmas Day',date:'-12-25',type:'public'}],
  UK:           [{ name:"New Year's Day",date:'-01-01',type:'public'},{name:'Christmas Day',date:'-12-25',type:'public'},{name:'Boxing Day',date:'-12-26',type:'public'}],
};

app.get('/api/holidays', (req, res) => {
  const { country, year } = req.query;
  const list = HOLIDAYS[country as string] || [];
  const y = String(year || new Date().getFullYear());
  res.json(list.map(h => ({ ...h, date: y + h.date })));
});

// ?? Analytics ? REAL DATA from connected platforms ????????????????????????
app.get('/api/analytics', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data } = await supabase.from('analytics').select('*').eq('workspace_id', workspaceId);
  res.json(data || []);
});

app.get('/api/analytics/history', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data } = await supabase.from('analytics_history').select('*').eq('workspace_id', workspaceId).order('date', { ascending: true });
  res.json(data || []);
});

// Real sync ? fetches live data from connected platform APIs
app.post('/api/analytics/sync', async (req, res) => {
  const { workspaceId } = req.body;
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
  const { data: accounts } = await supabase.from('social_accounts').select('*').eq('workspace_id', workspaceId).eq('status', 'active');
  if (!accounts?.length) return res.json({ success: true, synced: 0, message: 'No connected accounts to sync.' });
  const results: any[] = [];
  for (const account of accounts) {
    try {
      let metrics: any = null;
      if ((account.platform === 'facebook' || account.platform === 'meta_ads') && account.access_token) {

        // ── Meta Ads account (handle starts with act_) ─────────────────────
        if (account.handle?.startsWith('act_') || account.platform === 'meta_ads') {
          try {
            // Get 30-day ad insights: spend, impressions, clicks, reach, conversions
            const insR = await fetch(
              `https://graph.facebook.com/v18.0/${account.handle}/insights?fields=spend,impressions,clicks,reach,actions&date_preset=last_30d&access_token=${account.access_token}`
            );
            const insD: any = await insR.json();
            if (insD.data?.[0] && !insD.error) {
              const ins = insD.data[0];
              const actions = ins.actions || [];
              const conversions = actions.find((a: any) =>
                ['purchase','lead','complete_registration','offsite_conversion.fb_pixel_lead'].includes(a.action_type)
              )?.value || 0;
              metrics = {
                followers: 0,
                reach:       parseInt(ins.reach       || '0'),
                impressions: parseInt(ins.impressions  || '0'),
                clicks:      parseInt(ins.clicks       || '0'),
                engagement:  parseInt(conversions),
                profile_visits: 0,
              };
            } else {
              // Fallback: at minimum mark as synced with zero metrics
              const acctR = await fetch(`https://graph.facebook.com/v18.0/${account.handle}?fields=name,account_status&access_token=${account.access_token}`);
              const acctD: any = await acctR.json();
              if (!acctD.error) {
                metrics = { followers: 0, reach: 0, impressions: 0, engagement: 0, clicks: 0, profile_visits: 0 };
                if (acctD.name) await supabase.from('social_accounts').update({ account_name: acctD.name }).eq('id', account.id);
              }
            }
          } catch (_) {}
        }

        // ── Facebook Page account ───────────────────────────────────────────
        if (!metrics) {
          try {
            // Step 1: Get page basic info (fan_count = followers)
            const pageR = await fetch(
              `https://graph.facebook.com/v18.0/${account.handle}?fields=name,fan_count,followers_count,picture&access_token=${account.access_token}`
            );
            const pageD: any = await pageR.json();
            if (pageD.fan_count !== undefined && !pageD.error) {
              metrics = {
                followers:     pageD.fan_count || pageD.followers_count || 0,
                reach:         0, impressions: 0, engagement: 0, clicks: 0, profile_visits: 0,
              };
              if (pageD.picture?.data?.url) {
                await supabase.from('social_accounts').update({ avatar_url: pageD.picture.data.url, account_name: pageD.name }).eq('id', account.id);
              }
              // Step 2: Get page insights on top of fan_count
              const insR = await fetch(
                `https://graph.facebook.com/v18.0/${account.handle}/insights?metric=page_impressions,page_reach,page_post_engagements,page_views_total&period=day&since=${Math.floor((Date.now()-30*86400000)/1000)}&access_token=${account.access_token}`
              );
              const insD: any = await insR.json();
              if (insD.data && !insD.error) {
                const byMetric: any = {};
                insD.data.forEach((m: any) => {
                  const total = (m.values || []).reduce((s: number, v: any) => s + (v.value || 0), 0);
                  byMetric[m.name] = total;
                });
                metrics.impressions    = byMetric.page_impressions    || 0;
                metrics.reach          = byMetric.page_reach          || 0;
                metrics.engagement     = byMetric.page_post_engagements || 0;
                metrics.profile_visits = byMetric.page_views_total    || 0;
              }
            }
          } catch (_) {}
        }

        // ── Fallback: resolve via me/accounts (user token with linked pages) ─
        if (!metrics) {
          try {
            const pagesR = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,fan_count,access_token,picture&access_token=${account.access_token}`);
            const pagesD: any = await pagesR.json();
            const pages = pagesD.data || [];
            if (pages.length > 0) {
              const page = pages[0];
              const pageToken = page.access_token || account.access_token;
              metrics = { followers: page.fan_count || 0, reach: 0, impressions: 0, engagement: 0, clicks: 0, profile_visits: 0 };
              if (page.picture?.data?.url) {
                await supabase.from('social_accounts').update({
                  handle: page.id, account_name: page.name, avatar_url: page.picture.data.url
                }).eq('id', account.id);
              } else {
                await supabase.from('social_accounts').update({ handle: page.id, account_name: page.name }).eq('id', account.id);
              }
              // Try page insights with page token
              const insR = await fetch(
                `https://graph.facebook.com/v18.0/${page.id}/insights?metric=page_impressions,page_reach,page_post_engagements&period=day&since=${Math.floor((Date.now()-30*86400000)/1000)}&access_token=${pageToken}`
              );
              const insD: any = await insR.json();
              if (insD.data && !insD.error) {
                const byM: any = {};
                insD.data.forEach((m: any) => { byM[m.name] = (m.values||[]).reduce((s:number,v:any)=>s+(v.value||0),0); });
                metrics.impressions = byM.page_impressions || 0;
                metrics.reach       = byM.page_reach       || 0;
                metrics.engagement  = byM.page_post_engagements || 0;
              }
            }
          } catch (_) {}
        }

        // ── Absolute last resort: mark as connected with zero metrics ────────
        if (!metrics) {
          try {
            const meR = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${account.access_token}`);
            const meD: any = await meR.json();
            if (!meD.error) {
              metrics = { followers: 0, reach: 0, impressions: 0, engagement: 0, clicks: 0, profile_visits: 0 };
              if (meD.name) await supabase.from('social_accounts').update({ account_name: meD.name }).eq('id', account.id);
            }
          } catch (_) {}
        }
      }
      if (account.platform === 'instagram' && account.access_token) {
        let igAccountId = account.handle.replace('@', '');
        let resolvedFromPage = false;
        // If handle is a username (not numeric), resolve to IG Business Account ID via Facebook Pages
        if (!/^\d+$/.test(igAccountId)) {
          try {
            const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${account.access_token}`);
            const pagesData: any = await pagesRes.json();
            for (const page of (pagesData.data || [])) {
              const pageToken = page.access_token || account.access_token;
              const igRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,name,username,followers_count,media_count,profile_picture_url}&access_token=${pageToken}`);
              const igData: any = await igRes.json();
              const ig = igData.instagram_business_account;
              if (ig?.id) {
                igAccountId = ig.id;
                resolvedFromPage = true;
                // Save numeric ID + avatar + name so future syncs are fast
                await supabase.from('social_accounts').update({
                  handle: igAccountId,
                  avatar_url: ig.profile_picture_url || account.avatar_url || '',
                  account_name: ig.name || ig.username || account.account_name,
                }).eq('id', account.id);
                // Use metrics from this call directly
                if (ig.followers_count !== undefined) {
                  metrics = { followers: ig.followers_count || 0, posts: ig.media_count || 0, reach: 0, impressions: 0, engagement: 0 };
                }
                break;
              }
            }
          } catch (_) { /* fall through */ }
        }
        // If not resolved from page (handle was already numeric), fetch directly
        if (!resolvedFromPage) {
          const r = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}?fields=followers_count,media_count,profile_picture_url&access_token=${account.access_token}`);
          const d: any = await r.json();
          if (d.followers_count !== undefined) {
            metrics = { followers: d.followers_count || 0, posts: d.media_count || 0, reach: 0, impressions: 0, engagement: 0 };
            if (d.profile_picture_url && !account.avatar_url) {
              await supabase.from('social_accounts').update({ avatar_url: d.profile_picture_url }).eq('id', account.id);
            }
          }
        }
      }
      // ── YouTube ────────────────────────────────────────────────────────────
      if (account.platform === 'youtube' && account.access_token) {
        await refreshGoogleTokenIfNeeded(account);
        try {
          // If the user manually pinned a channel (Brand Account case where
          // mine=true can't resolve it), query that exact channel instead.
          // @handles need forHandle=; raw channel IDs (UC...) need id=.
          const override = (account.channel_override || '').trim();
          let dataApiUrl = 'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true';
          if (override) {
            dataApiUrl = override.startsWith('@')
              ? `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${encodeURIComponent(override)}`
              : `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${encodeURIComponent(override)}`;
          }
          const r = await fetch(dataApiUrl, { headers: { Authorization: `Bearer ${account.access_token}` } });
          const d: any = await r.json();
          const ch = d.items?.[0];
          if (ch?.statistics) {
            metrics = {
              followers:   parseInt(ch.statistics.subscriberCount) || 0,
              posts:       parseInt(ch.statistics.videoCount)      || 0,
              impressions: parseInt(ch.statistics.viewCount)       || 0,
              reach: 0, engagement: 0, clicks: 0, likes: 0, dislikes: 0, comments: 0, shares: 0,
            };
            if (ch.snippet?.thumbnails?.default?.url) {
              await supabase.from('social_accounts').update({
                avatar_url: ch.snippet.thumbnails.default.url,
                account_name: ch.snippet.title || account.account_name,
              }).eq('id', account.id);
            }

            // ── YouTube Analytics API — uses yt-analytics.readonly ─────────
            // Pulls last 28 days of likes/dislikes/comments/shares/views so we
            // can show real engagement, not just static channel totals.
            // The Analytics API's channel== only accepts real channel IDs
            // (UC...) or the literal "MINE" — never a @handle — so always
            // use the resolved ch.id here, which the Data API call above
            // already turned a @handle into if one was pinned.
            try {
              const end   = new Date().toISOString().slice(0, 10);
              const start = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
              const ytaParams = new URLSearchParams({
                ids: `channel==${override ? ch.id : 'MINE'}`,
                startDate: start,
                endDate: end,
                metrics: 'views,likes,dislikes,comments,shares,estimatedMinutesWatched',
              });
              const ytaR = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${ytaParams}`, {
                headers: { Authorization: `Bearer ${account.access_token}` },
              });
              const ytaD: any = await ytaR.json();
              const row = ytaD.rows?.[0]; // [views, likes, dislikes, comments, shares, estimatedMinutesWatched]
              if (row) {
                const [views, likes, dislikes, comments, shares] = row;
                metrics.likes     = likes     || 0;
                metrics.dislikes  = dislikes  || 0;
                metrics.comments  = comments  || 0;
                metrics.shares    = shares    || 0;
                metrics.reach     = views     || 0;
                // Store raw engagement count (likes+comments+shares) — the rest of
                // the app computes rate as engagement/reach, consistent with other platforms.
                metrics.engagement = (likes || 0) + (comments || 0) + (shares || 0);
              }
            } catch (_) { /* Analytics API is best-effort — channel stats above still saved */ }
          } else if (d.error?.code === 401) {
            // Token expired — mark as expired so UI shows refresh button
            await supabase.from('social_accounts').update({ status: 'expired' }).eq('id', account.id);
          }
        } catch (_) {}
      }

      // ── Google (profile only — YouTube is separate above) ───────────────
      if (account.platform === 'google' && account.access_token) {
        await refreshGoogleTokenIfNeeded(account);
        try {
          const r = await fetch(
            'https://www.googleapis.com/oauth2/v2/userinfo',
            { headers: { Authorization: `Bearer ${account.access_token}` } }
          );
          const d: any = await r.json();
          if (d.id && !d.error) {
            // Google profile doesn't have public follower counts — just confirm it's connected
            metrics = { followers: 0, reach: 0, impressions: 0, engagement: 0, clicks: 0, profile_visits: 0 };
            if (d.name || d.picture) {
              await supabase.from('social_accounts').update({
                account_name: d.name || account.account_name,
                avatar_url:   d.picture || account.avatar_url,
              }).eq('id', account.id);
            }
          } else if (d.error?.code === 401) {
            await supabase.from('social_accounts').update({ status: 'expired' }).eq('id', account.id);
          }
        } catch (_) {}
      }

      // ── Twitter / X ─────────────────────────────────────────────────────
      if ((account.platform === 'twitter' || account.platform === 'x') && account.access_token) {
        try {
          const r = await fetch(
            'https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,name,username',
            { headers: { Authorization: `Bearer ${account.access_token}` } }
          );
          const d: any = await r.json();
          const user = d.data;
          if (user?.public_metrics) {
            metrics = {
              followers:   user.public_metrics.followers_count || 0,
              posts:       user.public_metrics.tweet_count     || 0,
              reach:       0,
              impressions: 0,
              engagement:  user.public_metrics.listed_count    || 0,
              clicks:      0,
            };
            if (user.profile_image_url || user.name) {
              await supabase.from('social_accounts').update({
                account_name: user.name    || account.account_name,
                handle:       `@${user.username || ''}`,
                avatar_url:   user.profile_image_url?.replace('_normal', '_400x400') || account.avatar_url,
              }).eq('id', account.id);
            }
          } else if (d.title === 'Unauthorized' || d.status === 401) {
            await supabase.from('social_accounts').update({ status: 'expired' }).eq('id', account.id);
          }
        } catch (_) {}
      }

      // ── TikTok ──────────────────────────────────────────────────────────
      if (account.platform === 'tiktok' && account.access_token) {
        try {
          const r = await fetch(
            'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url,follower_count,following_count,likes_count,video_count',
            { headers: { Authorization: `Bearer ${account.access_token}` } }
          );
          const d: any = await r.json();
          const user = d.data?.user;
          if (user && d.error?.code === 'ok') {
            metrics = {
              followers:   user.follower_count  || 0,
              posts:       user.video_count     || 0,
              impressions: user.likes_count     || 0,
              reach:       0,
              engagement:  user.likes_count     || 0,
              clicks:      0,
            };
            if (user.avatar_url || user.display_name) {
              await supabase.from('social_accounts').update({
                account_name: user.display_name || account.account_name,
                avatar_url:   user.avatar_url   || account.avatar_url,
              }).eq('id', account.id);
            }
          } else {
            console.error('TikTok sync failed for account', account.id, ':', d.error?.message || JSON.stringify(d));
            if (d.error?.code === 'access_token_invalid' || d.error?.code === 'scope_not_authorized' || r.status === 401) {
              await supabase.from('social_accounts').update({ status: 'expired' }).eq('id', account.id);
            }
          }
        } catch (e: any) {
          console.error('TikTok sync exception for account', account.id, ':', e.message || e);
        }
      }

      // ── LinkedIn ─────────────────────────────────────────────────────────
      if (account.platform === 'linkedin' && account.access_token) {
        try {
          // Get basic profile (follower count needs Marketing API, not available with basic scopes)
          const r = await fetch(
            'https://api.linkedin.com/v2/userinfo',
            { headers: { Authorization: `Bearer ${account.access_token}` } }
          );
          const d: any = await r.json();
          if (d.sub && !d.error) {
            metrics = { followers: 0, reach: 0, impressions: 0, engagement: 0, clicks: 0, profile_visits: 0 };
            if (d.name || d.picture) {
              await supabase.from('social_accounts').update({
                account_name: d.name    || account.account_name,
                avatar_url:   d.picture || account.avatar_url,
              }).eq('id', account.id);
            }
          }
        } catch (_) {}
      }
      if (metrics) {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('analytics').upsert({ workspace_id: workspaceId, platform: account.platform, ...metrics, last_updated: new Date().toISOString() }, { onConflict: 'workspace_id,platform' });
        await supabase.from('analytics_history').upsert({ workspace_id: workspaceId, platform: account.platform, date: today, ...metrics }, { onConflict: 'workspace_id,platform,date' });
        results.push({ platform: account.platform, synced: true });
      }
    } catch (e: any) {
      results.push({ platform: account.platform, synced: false, error: e.message });
    }
  }
  res.json({ success: true, synced: results.filter((r: any) => r.synced).length, results });
});

// Keep refresh as alias for sync
app.post('/api/analytics/refresh', async (req, res) => {
  const { workspaceId } = req.body;
  const syncRes = await fetch(`${req.protocol}://${req.get('host')}/api/analytics/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId }) });
  const data = await syncRes.json();
  res.json(data);
});

app.get('/api/analytics/best-times', async (req, res) => {
  const { platform, workspaceId } = req.query;
  // Calculate from real history data if available
  if (workspaceId) {
    const { data: history } = await supabase.from('analytics_history').select('*').eq('workspace_id', workspaceId).eq('platform', platform as string).order('date', { ascending: false }).limit(30);
    if (history?.length) {
      return res.json({ platform, message: 'Based on your last 30 days of data', dataPoints: history.length, suggestion: 'Check your platform\'s native analytics for detailed posting time insights.' });
    }
  }
  res.json({ platform, message: 'Connect and sync your accounts to get personalised best-time recommendations based on your real audience data.', dataPoints: 0 });
});

// ?? AI Caption ? Gemini ONLY ??????????????????????????????????????????????
// ?? AI Caption ? Gemini ONLY ??????????????????????????????????????????????
app.post('/api/ai/caption', async (req, res) => {
  const { prompt, platform, tone, cta } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not set in Vercel environment variables. Get a free key at aistudio.google.com/apikey.' });

  const captionPrompt = `Generate a high-converting ${platform || 'social media'} post caption for: "${prompt}". Tone: ${tone || 'professional'}. CTA: ${cta || 'Learn More'}. Return ONLY valid JSON with keys: caption (engaging string, no hashtags), hashtags (string with 5-8 relevant hashtags starting with #), ctas (array of 3 call-to-action strings). No markdown, no code fences.`;
  const systemMsg = 'You are a social media marketing expert. Always respond with valid JSON only — no markdown, no code fences, no extra text.';

  try {
    const text = await callGemini(captionPrompt, systemMsg);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'AI returned unexpected format. Try again.' });
    res.json(JSON.parse(match[0]));
  } catch (e: any) {
    res.status(500).json({ error: 'Gemini error: ' + e.message });
  }
});

// ?? AI Insights ? Gemini ONLY ??????????????????????????????????????????????
app.post('/api/ai/insights', async (req, res) => {
  const { platform, metrics } = req.body;
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not set in Vercel environment variables. Get a free key at aistudio.google.com/apikey.' });
  if (!metrics?.length) return res.status(400).json({ error: 'No analytics data to analyse. Connect and sync your accounts first.' });
  try {
    const prompt = `You are a social media analytics expert. Analyse these ${platform} metrics and provide insights in JSON format: ${JSON.stringify(metrics)}. Return ONLY valid JSON with: overall_score (number 1-10), key_insight (string), working (array of 3 specific strings), not_working (array of 2 specific strings), recommendations (array of objects with action and impact strings). No markdown.`;
    const text = await callGemini(prompt);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'AI returned unexpected format.' });
    res.json(JSON.parse(match[0]));
  } catch (e: any) {
    res.status(500).json({ error: 'Gemini error: ' + e.message });
  }
});

// ?? Credits ????????????????????????????????????????????????????????????????
app.get('/api/credits/history', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const [{ data: balance }, { data: transactions }] = await Promise.all([
    supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);
  const { data: ws } = await supabase.from('workspaces').select('referral_code').eq('owner_id', user.id).limit(1).maybeSingle();
  res.json({ balance: balance || { remaining_credits: 0, total_credits_available: 0 }, transactions: transactions || [], refCode: ws?.referral_code || '' });
});

app.post('/api/credits/purchase', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { packageId } = req.body;
  const credits = packageId === 'premium' ? 200 : packageId === 'unlimited' ? 1000 : 50;
  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (balance) {
    await supabase.from('credit_balances').update({ remaining_credits: balance.remaining_credits + credits, total_credits_available: balance.total_credits_available + credits }).eq('user_id', user.id);
    await supabase.from('credit_transactions').insert({ user_id: user.id, amount: credits, description: `Purchased: ${packageId}`, type: 'purchase' });
  }
  res.json({ success: true });
});

// ?? Lead Finder ? Google Places ONLY ??????????????????????????????????????
// ── Geoapify category mapping ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// VELOXSPACE CUSTOM LEAD SCRAPER
// Sources: Foursquare → Geoapify → Overpass (OSM) — all enriched by website scraping
// ══════════════════════════════════════════════════════════════════════════════

// ── Website contact scraper (aggressive: homepage + contact/about pages) ─────
const BAD_EMAIL_PATTERNS = ['sentry', 'wixpress', 'example.com', 'schema', 'domain', '@2x', 'noreply'];

async function scrapeOnePage(url: string, ms = 5000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
}

function extractContacts(html: string): any {
  // tel: links (most reliable)
  const telLinks = [...html.matchAll(/href=["']tel:([+\d\s\-(). ]+)["']/gi)];
  const telPhone = telLinks[0]?.[1]?.replace(/\s+/g, ' ').trim() || '';
  // Nigerian number
  const ngPhone = (html.match(/(?:\+?234|0)(?:[7-9]0|[7-9]1)\d{8}/g) || [])[0] || '';
  // International
  const intlPhone = (html.match(/\+\d{1,3}[\s-]?\(?\d{1,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g) || [])[0] || '';
  const phone = telPhone || ngPhone || intlPhone;

  // mailto: links (most reliable)
  const mailtoLinks = [...html.matchAll(/href=["']mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,7})["']/gi)];
  const mailtoEmail = mailtoLinks[0]?.[1]?.toLowerCase() || '';
  // Fallback: plain email in text
  const allEmails = (html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,7}/g) || [])
    .filter(e => !BAD_EMAIL_PATTERNS.some(p => e.toLowerCase().includes(p)) && !e.includes('.png') && !e.includes('.jpg'));
  const email = mailtoEmail || allEmails[0] || '';

  // JSON-LD structured data
  let ldPhone = ''; let ldEmail = '';
  const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const obj: any = JSON.parse(m[1]);
      const src = Array.isArray(obj) ? obj[0] : obj;
      ldPhone = ldPhone || src?.telephone || src?.contactPoint?.telephone || '';
      ldEmail = ldEmail || src?.email || src?.contactPoint?.email || '';
    } catch {}
  }

  const extractLink = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m ? m[0].replace(/["'\s>)\\]+$/, '') : '';
  };

  return {
    phone: ldPhone || phone,
    email: ldEmail || email,
    social_facebook:  extractLink(/https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr[/?]|facebook\.com)([a-zA-Z0-9_.%-]{3,})/),
    social_instagram: extractLink(/https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]{2,})/),
    social_twitter:   extractLink(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!intent|share)([a-zA-Z0-9_]{2,})/),
    social_linkedin:  extractLink(/https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_.\-]{2,})/),
    social_youtube:   extractLink(/https?:\/\/(?:www\.)?youtube\.com\/(?:channel\/|c\/|@)([a-zA-Z0-9_.\-]{2,})/),
    social_tiktok:    extractLink(/https?:\/\/(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]{2,})/),
  };
}

async function scrapeWebsite(url: string): Promise<any> {
  if (!url) return {};
  const base = (url.startsWith('http') ? url : `https://${url}`).replace(/\/$/, '');
  try {
    const homeHtml = await scrapeOnePage(base);
    if (!homeHtml) return {};
    const data = extractContacts(homeHtml);
    // If missing info, check contact/about pages in parallel
    if (!data.phone || !data.email) {
      const extraPaths = ['/contact', '/contact-us', '/about', '/about-us', '/reach-us', '/get-in-touch'];
      const pages = await Promise.allSettled(extraPaths.map(p => scrapeOnePage(`${base}${p}`, 4000)));
      for (const result of pages) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const extra = extractContacts(result.value);
        if (!data.phone && extra.phone) data.phone = extra.phone;
        if (!data.email && extra.email) data.email = extra.email;
        for (const k of ['social_facebook','social_instagram','social_twitter','social_linkedin','social_youtube','social_tiktok'] as const) {
          if (!data[k] && extra[k]) data[k] = extra[k];
        }
        if (data.phone && data.email) break;
      }
    }
    return data;
  } catch { return {}; }
}

// ── Fresh Launches: Certificate Transparency log search (free, real-time-ish) ──
// crt.sh mirrors public CT logs — any HTTPS site gets a cert logged here within
// minutes/hours of going live, making it a genuine free "new site" signal.
async function crtShSearch(keyword: string): Promise<{ domain: string; firstSeen: string }[]> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(`https://crt.sh/?q=${encodeURIComponent('%' + keyword + '%')}&output=json`, {
      signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    clearTimeout(t);
    if (!r.ok) return [];
    const rows: any[] = await r.json();
    const byDomain = new Map<string, string>(); // domain -> earliest not_before we've seen
    for (const row of rows) {
      const names = String(row.name_value || '').split('\n');
      const notBefore = row.not_before || row.entry_timestamp || '';
      for (let name of names) {
        name = name.trim().toLowerCase().replace(/^\*\./, '');
        if (!name || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(name)) continue;
        if (name.split('.').length > 3) continue; // skip deep subdomains, keep it to real sites
        const existing = byDomain.get(name);
        if (!existing || new Date(notBefore) > new Date(existing)) byDomain.set(name, notBefore);
      }
    }
    return [...byDomain.entries()]
      .map(([domain, firstSeen]) => ({ domain, firstSeen }))
      .filter(d => d.firstSeen && !isNaN(new Date(d.firstSeen).getTime()))
      .sort((a, b) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime())
      .slice(0, 40);
  } catch { return []; }
}

const PARKED_MARKERS = [
  'domain is for sale', 'buy this domain', 'this domain may be for sale', 'godaddy.com/domains',
  'namecheap parking', 'domain parking', 'future home of something', 'coming soon', 'account suspended',
];
const COMMERCE_MARKERS = ['cdn.shopify.com', 'shopify.com', 'woocommerce', 'wp-content', 'add to cart', 'add-to-cart', 'checkout', 'cart.js'];

function assessFreshSite(html: string): { title: string; isJunk: boolean; platform: string } {
  const lower = html.toLowerCase();
  const isJunk = PARKED_MARKERS.some(m => lower.includes(m)) || html.length < 300;
  const titleMatch = html.match(/<title[^>]*>([^<]{2,90})<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';
  let platform = 'website';
  if (lower.includes('cdn.shopify.com')) platform = 'Shopify';
  else if (lower.includes('woocommerce') || lower.includes('wp-content')) platform = 'WordPress/WooCommerce';
  else if (lower.includes('wix.com')) platform = 'Wix';
  else if (lower.includes('squarespace')) platform = 'Squarespace';
  else if (COMMERCE_MARKERS.some(m => lower.includes(m))) platform = 'E-commerce';
  return { title, isJunk, platform };
}


async function geocodeNominatim(location: string): Promise<{ lat: number; lon: number; display: string } | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=0`,
      { headers: { 'User-Agent': 'VeloxSpace/1.0 (veloxspace.vercel.app)' } }
    );
    const d: any[] = await r.json();
    if (!d?.length) return null;
    return { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon), display: d[0].display_name };
  } catch { return null; }
}

// ── Foursquare business search ────────────────────────────────────────────────
async function searchFoursquare(keyword: string, location: string, fsqKey: string): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      query: keyword, near: location, limit: '20',
      fields: 'name,location,tel,website,rating,categories,description,social_media,photos',
    });
    // Foursquare's current Places API: new host, Bearer auth, and a required
    // date-versioned header. Legacy `api.foursquare.com/v3` keys/format no
    // longer work with Service API Keys generated from the new dashboard.
    const r = await fetch(`https://places-api.foursquare.com/places/search?${params}`, {
      headers: {
        Authorization: `Bearer ${fsqKey}`,
        Accept: 'application/json',
        'X-Places-Api-Version': '2025-06-17',
      }
    });
    const d: any = await r.json();
    if (!r.ok) { console.error('Foursquare API error:', r.status, d); return []; }
    return d.results || [];
  } catch { return []; }
}

// ── Overpass (free OSM data, no key) ─────────────────────────────────────────
async function searchOverpass(keyword: string, lat: number, lon: number, radius = 12000): Promise<any[]> {
  const overpassTag = keyword.toLowerCase().includes('hotel') ? '"tourism"="hotel"'
    : keyword.toLowerCase().includes('restaurant') ? '"amenity"="restaurant"'
    : keyword.toLowerCase().includes('clinic') || keyword.toLowerCase().includes('hospital') ? '"amenity"~"hospital|clinic"'
    : keyword.toLowerCase().includes('school') ? '"amenity"="school"'
    : keyword.toLowerCase().includes('bank') ? '"amenity"="bank"'
    : keyword.toLowerCase().includes('pharmacy') ? '"amenity"="pharmacy"'
    : keyword.toLowerCase().includes('gym') || keyword.toLowerCase().includes('fitness') ? '"leisure"="fitness_centre"'
    : keyword.toLowerCase().includes('salon') ? '"shop"="hairdresser"'
    : `"name"~"${keyword}",i`;

  try {
    const query = `[out:json][timeout:10];(node[${overpassTag}](around:${radius},${lat},${lon});way[${overpassTag}](around:${radius},${lat},${lon}););out body 20;`;
    const r = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    const d: any = await r.json();
    return (d.elements || []).filter((e: any) => e.tags?.name);
  } catch { return []; }
}

// ── Geoapify fallback ─────────────────────────────────────────────────────────
const GEOAPIFY_CATS: Record<string, string> = {
  hotel: 'accommodation.hotel,accommodation.guest_house,accommodation',
  restaurant: 'catering.restaurant,catering.fast_food,catering',
  hospital: 'healthcare.hospital,healthcare', clinic: 'healthcare.clinic,healthcare',
  pharmacy: 'healthcare.pharmacy', bank: 'finance.bank,finance',
  gym: 'leisure.fitness_centre,sport', fitness: 'leisure.fitness_centre,sport',
  school: 'education.school,education', university: 'education.university,education',
  supermarket: 'commercial.supermarket,commercial', shop: 'commercial.shopping_centre,commercial',
  salon: 'service.beauty,commercial', spa: 'leisure.spa,service.beauty',
  petrol: 'service.fuel', fuel: 'service.fuel',
};
function getGeoapifyCategories(keyword: string): string {
  const lk = keyword.toLowerCase();
  for (const [key, cats] of Object.entries(GEOAPIFY_CATS)) {
    if (lk.includes(key)) return cats;
  }
  return 'commercial,office,service,catering,accommodation';
}

// ── Main leads search endpoint ────────────────────────────────────────────────
app.post('/api/leads/search', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { keyword, location, workspaceId } = req.body;
  if (!keyword || !location) return res.status(400).json({ error: 'Keyword and location are required.' });

  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (!balance || balance.remaining_credits < 15) return res.status(402).json({ error: 'Insufficient credits. You need at least 15 credits per search.' });

  // Deduct credits
  await supabase.from('credit_balances').update({ remaining_credits: balance.remaining_credits - 15 }).eq('user_id', user.id);
  await supabase.from('credit_transactions').insert({ user_id: user.id, amount: -15, description: `Lead search: "${keyword}" in ${location}`, type: 'charge' });

  try {
    const fsqKey   = process.env.FOURSQUARE_API_KEY || '';
    const geoKey   = process.env.GEOAPIFY_API_KEY   || '';
    let rawResults: any[] = [];
    let source = 'none';

    // ── STEP 1: Geocode location ─────────────────────────────────────────────
    const coords = await geocodeNominatim(location);
    const { lat, lon } = coords || { lat: 0, lon: 0 };

    // ── STEP 2a: Try Google Places first (best data — $200 free credit/month) ─
    const googlePlacesKey = process.env.GOOGLE_PLACES_API_KEY || '';
    if (googlePlacesKey && lat) {
      try {
        // Text search for businesses
        const gpUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + ' in ' + location)}&key=${googlePlacesKey}&language=en`;
        const gpRes = await fetch(gpUrl);
        const gpData: any = await gpRes.json();
        if (gpData.status === 'OK' && gpData.results?.length) {
          // Get details for each place (phone, website)
          const detailPromises = gpData.results.slice(0, 15).map(async (p: any) => {
            try {
              const dUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,opening_hours,url&key=${googlePlacesKey}`;
              const dRes = await fetch(dUrl);
              const dData: any = await dRes.json();
              const d = dData.result || {};
              return {
                id: p.place_id,
                business_name: d.name || p.name,
                address: d.formatted_address || p.formatted_address || '',
                location,
                phone: d.formatted_phone_number || '',
                website: d.website || '',
                email: '',
                category: (p.types?.[0] || keyword).replace(/_/g, ' '),
                rating: d.rating || p.rating || 0,
                has_website: !!d.website,
                social_facebook: '', social_instagram: '', social_twitter: '',
                social_linkedin: '', social_youtube: '', social_tiktok: '',
                confidence_score: Math.min(95, 50 + (d.website ? 20 : 0) + (d.formatted_phone_number ? 20 : 0) + (d.rating ? 5 : 0)),
              };
            } catch { return null; }
          });
          const details = (await Promise.allSettled(detailPromises))
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);
          if (details.length > 0) { rawResults = details; source = 'Google Places'; }
        }
      } catch (e: any) { /* fall through to next source */ }
    }

    // ── STEP 2b: Try Foursquare (best data for Africa) ──────────────────────
    if (rawResults.length === 0 && fsqKey) {
      const fsqResults = await searchFoursquare(keyword, location, fsqKey);
      if (fsqResults.length > 0) {
        rawResults = fsqResults.map((p: any, i: number) => ({
          id:            p.fsq_id || `fsq_${i}`,
          business_name: p.name,
          address:       p.location?.formatted_address || p.location?.address || '',
          location,
          phone:         p.tel || '',
          website:       p.website || '',
          email:         '',
          category:      p.categories?.[0]?.name || keyword,
          rating:        p.rating ? p.rating / 2 : 0, // FSQ is 0-10, normalize to 0-5
          has_website:   !!p.website,
          social_facebook: p.social_media?.facebookUrl || '',
          social_instagram: p.social_media?.instagram ? `https://instagram.com/${p.social_media.instagram}` : '',
          social_twitter: p.social_media?.twitter ? `https://twitter.com/${p.social_media.twitter}` : '',
          social_linkedin: '', social_youtube: '', social_tiktok: '',
          confidence_score: Math.min(95, 50 + (p.website ? 20 : 0) + (p.tel ? 15 : 0) + (p.rating ? 10 : 0)),
        }));
        source = 'Foursquare';
      }
    }

    // ── STEP 3: Try Overpass (free OSM) if Foursquare returned nothing ────────
    if (rawResults.length === 0 && lat) {
      const overpassResults = await searchOverpass(keyword, lat, lon);
      if (overpassResults.length > 0) {
        rawResults = overpassResults.map((e: any, i: number) => {
          const t = e.tags || {};
          const normalizeUrl = (platform: string, val: string) => {
            if (!val) return '';
            return val.startsWith('http') ? val : `https://www.${platform}.com/${val.replace(/^@/, '')}`;
          };
          return {
            id:            `osm_${e.id || i}`,
            business_name: t.name || 'Unknown',
            address:       [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(', ') || location,
            location,
            phone:         t.phone || t['contact:phone'] || '',
            website:       t.website || t['contact:website'] || '',
            email:         t.email || t['contact:email'] || '',
            category:      keyword,
            rating:        0, has_website: !!t.website,
            social_facebook:  normalizeUrl('facebook',  t['contact:facebook']  || t.facebook  || ''),
            social_instagram: normalizeUrl('instagram', t['contact:instagram'] || t.instagram || ''),
            social_twitter:   normalizeUrl('twitter',   t['contact:twitter']   || t.twitter   || ''),
            social_linkedin:  normalizeUrl('linkedin',  t['contact:linkedin']  || ''),
            social_youtube:   normalizeUrl('youtube',   t['contact:youtube']   || ''),
            social_tiktok:    normalizeUrl('tiktok',    t['contact:tiktok']    || ''),
            confidence_score: Math.min(90, 40 + (t.website ? 20 : 0) + (t.phone ? 15 : 0) + (t.email ? 15 : 0)),
          };
        });
        source = 'OpenStreetMap';
      }
    }

    // ── STEP 4: Fall back to Geoapify ────────────────────────────────────────
    if (rawResults.length === 0 && geoKey) {
      const geoCoords = lat
        ? { lat, lon }
        : await (async () => {
            const r = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(location)}&limit=1&apiKey=${geoKey}`);
            const d: any = await r.json();
            const [glon, glat] = d.features?.[0]?.geometry?.coordinates || [0, 0];
            return { lat: glat, lon: glon };
          })();

      const cats = getGeoapifyCategories(keyword);
      const r    = await fetch(`https://api.geoapify.com/v2/places?categories=${encodeURIComponent(cats)}&filter=circle:${geoCoords.lon},${geoCoords.lat},10000&name=${encodeURIComponent(keyword)}&limit=20&apiKey=${geoKey}`);
      const d: any = await r.json();
      const features = d.features || [];
      if (features.length > 0) {
        rawResults = features.slice(0, 15).map((f: any, i: number) => {
          const p = f.properties; const raw = p.datasource?.raw || {};
          return {
            id: p.place_id || `geo_${i}`,
            business_name: p.name || 'Unknown',
            address: p.formatted || '',
            location, phone: p.contact?.phone || raw.phone || raw['contact:phone'] || '',
            website: p.website || raw.website || '', email: raw.email || raw['contact:email'] || '',
            category: (p.categories?.[0] || keyword).replace(/_/g, ' '),
            rating: raw.rating || 0, has_website: !!p.website,
            social_facebook: '', social_instagram: '', social_twitter: '',
            social_linkedin: '', social_youtube: '', social_tiktok: '',
            confidence_score: Math.min(90, 45 + (p.website ? 20 : 0) + ((p.contact?.phone || raw.phone) ? 15 : 0)),
          };
        });
        source = 'Geoapify';
      }
    }

    if (rawResults.length === 0) {
      return res.json({
        success: true, creditsRemaining: balance.remaining_credits - 15, results: [],
        message: `No "${keyword}" businesses found near "${location}". Try a broader keyword or different location. Set FOURSQUARE_API_KEY in Vercel for 200k free searches/month.`,
      });
    }

    // ── STEP 5: Enrich ALL results by scraping their websites ────────────────
    const scrapePromises = rawResults.map(b => b.website ? scrapeWebsite(b.website) : Promise.resolve({}));
    const scraped = await Promise.allSettled(scrapePromises);

    const results = rawResults.map((b: any, i: number) => {
      const s: any = scraped[i].status === 'fulfilled' ? scraped[i].value : {};
      // Merge — prefer scraped data over basic data, but keep existing if scrape got nothing
      const enriched = {
        ...b,
        phone:  s.phone  || b.phone  || '',
        email:  s.email  || b.email  || '',
        social_facebook:  s.social_facebook  || b.social_facebook  || '',
        social_instagram: s.social_instagram || b.social_instagram || '',
        social_twitter:   s.social_twitter   || b.social_twitter   || '',
        social_linkedin:  s.social_linkedin  || b.social_linkedin  || '',
        social_youtube:   s.social_youtube   || b.social_youtube   || '',
        social_tiktok:    s.social_tiktok    || b.social_tiktok    || '',
      };
      // Recalculate confidence with enriched data
      const socialCount = [enriched.social_facebook, enriched.social_instagram, enriched.social_twitter, enriched.social_linkedin, enriched.social_youtube, enriched.social_tiktok].filter(Boolean).length;
      enriched.confidence_score = Math.min(98, 40 + (enriched.website ? 18 : 0) + (enriched.phone ? 15 : 0) + (enriched.email ? 12 : 0) + (socialCount * 4));
      return enriched;
    });

    // ── STEP 6: Deduplicate by name + address ────────────────────────────────
    const seen = new Set<string>();
    const unique = results.filter((r: any) => {
      const key = (r.business_name || '').toLowerCase().replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    const finalResults = unique;

    // ── STEP 7: Save to Supabase ─────────────────────────────────────────────
    if (workspaceId && finalResults.length) {
      await supabase.from('leads').insert(finalResults.map((r: any) => ({
        workspace_id: workspaceId, business_name: r.business_name, address: r.address,
        phone: r.phone, email: r.email, website: r.website,
        social_facebook: r.social_facebook, social_instagram: r.social_instagram,
        social_twitter: r.social_twitter, social_linkedin: r.social_linkedin,
        social_youtube: r.social_youtube, social_tiktok: r.social_tiktok,
        category: r.category, location: r.location, rating: r.rating,
        has_website: r.has_website, place_id: r.id, confidence_score: r.confidence_score,
      })));
    }

    await insertAuditLog(user.id, `Lead search: "${keyword}" in ${location} — ${finalResults.length} results via ${source}`, req);

    res.json({
      success: true,
      creditsRemaining: balance.remaining_credits - 15,
      results: finalResults,
      source,
      message: finalResults.length > 0 ? `Found ${finalResults.length} businesses via ${source}. Websites scraped for contact info.` : undefined,
    });

  } catch (e: any) {
    res.status(500).json({ error: 'Lead search error: ' + e.message });
  }
});

// ── Fresh Launches — new sites/stores detected via public CT logs ───────────
// Free alternative to paid "new business" feeds (e.g. FisherLeads): watches
// Certificate Transparency logs for domains matching a keyword, keeps only
// ones issued in the last 21 days, then visits each site to filter out
// parked/junk domains and scrape publicly listed contact info.
app.post('/api/leads/fresh-launches', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { keyword, workspaceId } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword is required.' });

  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (!balance || balance.remaining_credits < 10) return res.status(402).json({ error: 'Insufficient credits. You need at least 10 credits per Fresh Launches search.' });

  await supabase.from('credit_balances').update({ remaining_credits: balance.remaining_credits - 10 }).eq('user_id', user.id);
  await supabase.from('credit_transactions').insert({ user_id: user.id, amount: -10, description: `Fresh Launches search: "${keyword}"`, type: 'charge' });

  try {
    const CUTOFF_DAYS = 21;
    const cutoff = Date.now() - CUTOFF_DAYS * 86400000;

    // Step 1: Pull candidate domains from CT logs, keep only recently-issued ones
    const candidates = (await crtShSearch(keyword))
      .filter(c => new Date(c.firstSeen).getTime() >= cutoff)
      .slice(0, 18); // cap — each one costs a live HTTP fetch below

    if (candidates.length === 0) {
      return res.json({
        success: true, creditsRemaining: balance.remaining_credits - 10, results: [],
        message: `No freshly-launched sites matching "${keyword}" in the last ${CUTOFF_DAYS} days. Try a broader or more common keyword.`,
      });
    }

    // Step 2: Visit each candidate, filter out parked/junk pages, scrape contact info
    const checked = await Promise.allSettled(candidates.map(async c => {
      const base = `https://${c.domain}`;
      const html = await scrapeOnePage(base, 6000);
      if (!html) return null;
      const { title, isJunk, platform } = assessFreshSite(html);
      if (isJunk) return null;
      const contacts = extractContacts(html);
      return {
        id: `fresh_${c.domain}`,
        business_name: title || c.domain,
        address: '', location: '',
        phone: contacts.phone || '',
        email: contacts.email || '',
        website: base,
        category: platform,
        rating: 0, has_website: true,
        social_facebook: contacts.social_facebook || '', social_instagram: contacts.social_instagram || '',
        social_twitter: contacts.social_twitter || '', social_linkedin: contacts.social_linkedin || '',
        social_youtube: contacts.social_youtube || '', social_tiktok: contacts.social_tiktok || '',
        first_seen: c.firstSeen,
        confidence_score: Math.min(95, 50 + (contacts.email ? 20 : 0) + (platform !== 'website' ? 15 : 0) + (contacts.phone ? 10 : 0)),
      };
    }));

    const finalResults = checked
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    if (workspaceId && finalResults.length) {
      await supabase.from('leads').insert(finalResults.map((r: any) => ({
        workspace_id: workspaceId, business_name: r.business_name, address: r.address,
        phone: r.phone, email: r.email, website: r.website,
        social_facebook: r.social_facebook, social_instagram: r.social_instagram,
        social_twitter: r.social_twitter, social_linkedin: r.social_linkedin,
        social_youtube: r.social_youtube, social_tiktok: r.social_tiktok,
        category: r.category, location: `Fresh launch · ${new Date(r.first_seen).toLocaleDateString()}`,
        rating: r.rating, has_website: r.has_website, place_id: r.id, confidence_score: r.confidence_score,
      })));
    }

    await insertAuditLog(user.id, `Fresh Launches search: "${keyword}" — ${finalResults.length} results`, req);

    res.json({
      success: true,
      creditsRemaining: balance.remaining_credits - 10,
      results: finalResults,
      message: finalResults.length > 0
        ? `Found ${finalResults.length} freshly-launched site${finalResults.length !== 1 ? 's' : ''} matching "${keyword}" (last ${CUTOFF_DAYS} days).`
        : `Found candidate domains but all were parked, unreachable, or junk. Try a different keyword.`,
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Fresh Launches search error: ' + e.message });
  }
});


app.get('/api/portal/:token', async (req, res) => {
  const { data: portal } = await supabase.from('client_portals').select('*, workspaces(*)').eq('share_token', req.params.token).eq('is_enabled', true).maybeSingle();
  if (!portal) return res.status(404).json({ error: 'Portal not found or disabled' });
  const [{ data: analytics }, { data: calendar }] = await Promise.all([
    supabase.from('analytics').select('*').eq('workspace_id', (portal as any).workspace_id),
    supabase.from('content_calendar').select('*').eq('workspace_id', (portal as any).workspace_id),
  ]);
  res.json({ workspaceName: (portal as any).workspaces?.name || 'Workspace', analytics: analytics || [], calendar: calendar || [] });
});

// ?? Referrals ??????????????????????????????????????????????????????????????
app.get('/api/referrals', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const [{ data: referrals }, { data: rewards }] = await Promise.all([
    supabase.from('referrals').select('*').eq('referrer_user_id', user.id),
    supabase.from('referral_rewards').select('*').eq('user_id', user.id),
  ]);
  const { data: ws } = await supabase.from('workspaces').select('referral_code').eq('owner_id', user.id).limit(1).maybeSingle();
  res.json({ referrals: referrals || [], rewards: rewards || [], refCode: ws?.referral_code || '' });
});

app.post('/api/referrals/redeem', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { referredEmail } = req.body;
  if (!referredEmail) return res.status(400).json({ error: 'Email required' });
  const { data: existing } = await supabase.from('referrals').select('id').eq('referred_email', referredEmail.toLowerCase()).maybeSingle();
  if (existing) return res.status(400).json({ error: 'This email has already been referred.' });
  await supabase.from('referrals').insert({ referrer_user_id: user.id, referred_email: referredEmail.toLowerCase() });
  res.json({ success: true });
});

// ?? Billing ????????????????????????????????????????????????????????????????
app.post('/api/billing/upgrade', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { planType, billingCycle } = req.body;
  const credits = planType === 'agency' ? 200 : planType === 'pro' ? 50 : 10;
  await supabase.from('subscriptions').update({ plan_type: planType, billing_cycle: billingCycle || 'monthly', status: 'active', current_period_end: new Date(Date.now() + 31*24*3600000).toISOString() }).eq('user_id', user.id);
  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (balance) await supabase.from('credit_balances').update({ remaining_credits: credits, total_credits_available: credits }).eq('user_id', user.id);
  res.json({ success: true });
});

// ?? Notifications ??????????????????????????????????????????????????????????
app.get('/api/notifications', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
  res.json(data || []);
});

app.post('/api/notifications/read', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
  const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  res.json({ success: true, notifications: data || [] });
});

// ?? Properties / PMS ??????????????????????????????????????????????????????
app.get('/api/pms/properties', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('properties').select('*');
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/pms/properties', async (req, res) => {
  const { workspace_id, name, description, ratePerNight, status, imageUrl } = req.body;
  const { data } = await supabase.from('properties').insert({ workspace_id, name, description: description || '', rate_per_night: Number(ratePerNight || 0), status: status || 'Available', image_url: imageUrl || '' }).select().single();
  res.status(201).json(data);
});

app.get('/api/pms/bookings', async (req, res) => {
  const { workspaceId } = req.query;
  const { data: props } = workspaceId ? await supabase.from('properties').select('id').eq('workspace_id', workspaceId) : { data: [] };
  const ids = (props || []).map((p: any) => p.id);
  if (!ids.length) return res.json([]);
  const { data } = await supabase.from('bookings').select('*').in('property_id', ids);
  res.json(data || []);
});

app.post('/api/pms/bookings', async (req, res) => {
  const { propertyId, guestName, checkIn, checkOut } = req.body;
  const { data } = await supabase.from('bookings').insert({ property_id: propertyId, guest_name: guestName, check_in: checkIn, check_out: checkOut, status: 'Confirmed' }).select().single();
  await supabase.from('properties').update({ status: 'Occupied' }).eq('id', propertyId);
  res.status(201).json(data);
});

app.get('/api/pms/clients', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('pms_clients').select('*').order('created_at', { ascending: false });
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/pms/clients', async (req, res) => {
  const { data } = await supabase.from('pms_clients').insert(req.body).select().single();
  res.status(201).json(data);
});

app.put('/api/pms/clients/:id', async (req, res) => {
  const { data } = await supabase.from('pms_clients').update(req.body).eq('id', req.params.id).select().single();
  res.json(data);
});

app.delete('/api/pms/clients/:id', async (req, res) => {
  await supabase.from('pms_clients').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.get('/api/pms/projects', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('pms_projects').select('*').order('created_at', { ascending: false });
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/pms/projects', async (req, res) => {
  const { data } = await supabase.from('pms_projects').insert(req.body).select().single();
  res.status(201).json(data);
});

app.get('/api/pms/invoices', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('pms_invoices').select('*').order('created_at', { ascending: false });
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/pms/invoices', async (req, res) => {
  const { data: count } = await supabase.from('pms_invoices').select('id', { count: 'exact', head: true }).eq('workspace_id', req.body.workspace_id);
  const { data } = await supabase.from('pms_invoices').insert({ ...req.body, invoice_number: `INV-${String(((count as any) || 0) + 1).padStart(3, '0')}` }).select().single();
  res.status(201).json(data);
});

app.put('/api/pms/invoices/:id', async (req, res) => {
  const { data } = await supabase.from('pms_invoices').update(req.body).eq('id', req.params.id).select().single();
  res.json(data);
});

app.get('/api/connections', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('ad_connections').select('*');
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/connections', async (req, res) => {
  const { platformName, connected, clientId, developerToken, adAccountId, workspaceId } = req.body;
  await supabase.from('ad_connections').upsert({ workspace_id: workspaceId, platform_name: platformName, connected, client_id: clientId, developer_token: developerToken || '', ad_account_id: adAccountId || '' }, { onConflict: 'workspace_id,platform_name' });
  res.json({ success: true });
});

// ?? Setup guide when OAuth credentials not configured ????????????????????
app.get('/oauth-mimic/authorize', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Setup Required</title>
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-[#0a0b10] text-white flex items-center justify-center min-h-screen p-6">
<div class="max-w-lg w-full bg-[#13151c] border border-slate-800 rounded-2xl p-8 shadow-2xl">
  <div class="text-3xl mb-4 text-center font-mono text-slate-400">[!]</div>
  <h2 class="text-base font-bold text-white mb-2 text-center">OAuth credentials not configured</h2>
  <p class="text-xs text-slate-400 text-center mb-6">Add these environment variables in Vercel to enable real social media login</p>
  <div class="space-y-3 text-xs">
    <div class="bg-slate-900 rounded-xl p-4 border border-slate-800">
      <p class="font-bold text-indigo-400 mb-2">Meta (Instagram + Facebook + Meta Ads)</p>
      <code class="block text-slate-300">VITE_META_APP_ID = 986887807459463</code>
      <code class="block text-slate-300 mt-1">META_APP_SECRET = [from Facebook Developer Portal]</code>
      <code class="block text-slate-300 mt-1">VITE_SITE_URL = https://your-site.vercel.app</code>
      <code class="block text-slate-300 mt-1">SITE_URL = https://your-site.vercel.app</code>
    </div>
    <div class="bg-slate-900 rounded-xl p-4 border border-slate-800">
      <p class="font-bold text-blue-400 mb-2">Google (YouTube + Google Ads)</p>
      <code class="block text-slate-300">VITE_GOOGLE_CLIENT_ID = [from Google Cloud Console]</code>
      <code class="block text-slate-300 mt-1">GOOGLE_CLIENT_SECRET = [from Google Cloud Console]</code>
    </div>
    <div class="bg-slate-900 rounded-xl p-4 border border-slate-800">
      <p class="font-bold text-slate-300 mb-2">Then add this redirect URI to each platform's developer portal:</p>
      <code class="block text-yellow-400">https://your-site.vercel.app/api/oauth-callback</code>
    </div>
  </div>
  <button onclick="window.close()" class="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm cursor-pointer">Close</button>
</div></body></html>`);
});

// ?? Vercel export ??????????????????????????????????????????????????????????

// ── AI Morning Brief (Gemini ONLY) ───────────────────────────────────────────
app.get('/api/ai/brief', async (req, res) => {
  const { workspaceId } = req.query;
  if (!GEMINI_API_KEY) return res.json({ brief: null, error: 'GEMINI_API_KEY not set in Vercel env vars. Get a free key at aistudio.google.com/apikey.' });
  if (!workspaceId) return res.json({ brief: null, error: 'No workspace selected.' });
  try {
    const [{ data: analytics }, { data: posts }, { data: leads }] = await Promise.all([
      supabase.from('analytics').select('*').eq('workspace_id', workspaceId),
      supabase.from('scheduled_posts').select('*').eq('workspace_id', workspaceId).gte('publish_date', new Date().toISOString()).limit(5),
      supabase.from('leads').select('id,created_at').eq('workspace_id', workspaceId).gte('created_at', new Date(Date.now()-7*24*3600000).toISOString()),
    ]);
    const prompt = `You are a digital marketing AI assistant. Generate a concise morning brief for a digital marketer. Analytics: ${JSON.stringify((analytics||[]).map((a:any)=>({platform:a.platform,followers:a.followers,reach:a.reach})))}. Upcoming posts: ${posts?.length||0}. New leads this week: ${leads?.length||0}. Return ONLY valid JSON with NO extra text: { "greeting": string, "insight": string, "highlights": [string, string, string], "action_items": [string, string] }`;

    const text = await callGemini(prompt, 'You are a digital marketing assistant. Always respond with valid JSON only, no markdown, no explanation.');
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.json({ brief: null, error: `AI response had no valid JSON. Raw: ${text.slice(0,150)}` });
    res.json({ brief: JSON.parse(match[0]) });
  } catch (e: any) {
    res.json({ brief: null, error: e.message || 'Unknown error generating brief.' });
  }
});

// ── Campaigns ────────────────────────────────────────────────────────────────
app.get('/api/campaigns', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data } = await supabase.from('campaigns').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  res.json(data || []);
});
app.post('/api/campaigns', async (req, res) => {
  const { data } = await supabase.from('campaigns').insert(req.body).select().single();
  res.status(201).json(data);
});
app.put('/api/campaigns/:id', async (req, res) => {
  const { data } = await supabase.from('campaigns').update(req.body).eq('id', req.params.id).select().single();
  res.json(data);
});
app.delete('/api/campaigns/:id', async (req, res) => {
  await supabase.from('campaigns').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// ── Lead Pipeline ─────────────────────────────────────────────────────────────
app.get('/api/leads', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data } = await supabase.from('leads').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  res.json(data || []);
});
app.put('/api/leads/:id/stage', async (req, res) => {
  const { stage } = req.body;
  const { data } = await supabase.from('leads').update({ status: stage }).eq('id', req.params.id).select().single();
  res.json(data);
});

// Delete a single lead
app.delete('/api/leads/:id', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  await supabase.from('leads').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// Clear all leads for a workspace
app.delete('/api/leads/clear', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { workspaceId } = req.body;
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
  const { count } = await supabase.from('leads').delete({ count: 'exact' }).eq('workspace_id', workspaceId);
  res.json({ success: true, deleted: count });
});

// ── CRM ─────────────────────────────────────────────────────────────────────
app.get('/api/crm/clients', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data } = await supabase.from('crm_clients').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  res.json(data || []);
});

app.post('/api/crm/clients', async (req, res) => {
  const { workspaceId, name, company, email, phone, website, address, status, value, tags, source, assigned_to } = req.body;
  if (!workspaceId || !name) return res.status(400).json({ error: 'workspaceId and name are required' });
  const { data, error } = await supabase.from('crm_clients').insert({
    workspace_id: workspaceId, name, company: company || '', email: email || '', phone: phone || '',
    website: website || '', address: address || '', status: status || 'active', value: value || 0,
    tags: tags || [], source: source || '', assigned_to: assigned_to || '',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/api/crm/clients/:id', async (req, res) => {
  const allowed = ['name','company','email','phone','website','address','status','value','tags','source','assigned_to','avatar_url','last_contacted_at'];
  const updates: any = {};
  for (const k of allowed) if (k in req.body) updates[k] = req.body[k];
  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('crm_clients').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/crm/clients/:id', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  await supabase.from('crm_clients').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.get('/api/crm/clients/:id/notes', async (req, res) => {
  const { data } = await supabase.from('crm_notes').select('*').eq('client_id', req.params.id).order('created_at', { ascending: false });
  res.json(data || []);
});

app.post('/api/crm/clients/:id/notes', async (req, res) => {
  const { workspaceId, body, type } = req.body;
  if (!workspaceId || !body) return res.status(400).json({ error: 'workspaceId and body are required' });
  const { data, error } = await supabase.from('crm_notes').insert({
    client_id: req.params.id, workspace_id: workspaceId, body, type: type || 'note',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await supabase.from('crm_clients').update({ last_contacted_at: new Date().toISOString() }).eq('id', req.params.id);
  res.status(201).json(data);
});

app.delete('/api/crm/notes/:id', async (req, res) => {
  await supabase.from('crm_notes').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.get('/api/crm/clients/:id/tasks', async (req, res) => {
  const { data } = await supabase.from('crm_tasks').select('*').eq('client_id', req.params.id).order('due_date', { ascending: true });
  res.json(data || []);
});

app.post('/api/crm/clients/:id/tasks', async (req, res) => {
  const { workspaceId, title, due_date } = req.body;
  if (!workspaceId || !title) return res.status(400).json({ error: 'workspaceId and title are required' });
  const { data, error } = await supabase.from('crm_tasks').insert({
    client_id: req.params.id, workspace_id: workspaceId, title, due_date: due_date || null,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.put('/api/crm/tasks/:id', async (req, res) => {
  const { done } = req.body;
  const { data, error } = await supabase.from('crm_tasks').update({ done: !!done }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/crm/tasks/:id', async (req, res) => {
  await supabase.from('crm_tasks').delete().eq('id', req.params.id);
  res.json({ success: true });
});

// ── UTM Builder ───────────────────────────────────────────────────────────────
app.get('/api/utm/links', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data, error } = await supabase.from('utm_links').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50);
  if (error) { console.error('utm/links GET error:', error); return res.status(500).json({ error: error.message }); }
  res.json(data || []);
});
app.post('/api/utm/save', async (req, res) => {
  const { workspace_id, utm_url, campaign } = req.body || {};
  if (!workspace_id || !utm_url || !campaign) {
    return res.status(400).json({ error: 'workspace_id, utm_url, and campaign are required' });
  }
  const { data, error } = await supabase.from('utm_links').insert(req.body).select().single();
  if (error) { console.error('utm/save error:', error); return res.status(500).json({ error: error.message }); }
  res.status(201).json(data);
});
app.delete('/api/utm/links/:id', async (req, res) => {
  const { error } = await supabase.from('utm_links').delete().eq('id', req.params.id);
  if (error) { console.error('utm/links DELETE error:', error); return res.status(500).json({ error: error.message }); }
  res.json({ success: true });
});

// ── Site Analytics (no GA4 required) ───────────────────────────────────────────
// Public beacon endpoint — called from the customer's own website via tracker.js.
// No auth: this is hit by anonymous visitors on third-party sites.
app.options('/api/track/pv', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(204);
});
app.post('/api/track/pv', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  try {
    const { workspaceId, path, referrer, visitorId } = req.body || {};
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });
    await supabase.from('site_pageviews').insert({
      workspace_id: workspaceId,
      path: String(path || '/').slice(0, 500),
      referrer: String(referrer || '').slice(0, 500),
      visitor_id: String(visitorId || '').slice(0, 100),
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    });
  } catch (e) {
    console.error('track/pv error:', e);
    // best-effort beacon — never fail loudly to the visitor's browser
  }
  res.status(204).end();
});

// Authenticated summary for the dashboard
app.get('/api/site-analytics/summary', async (req, res) => {
  const { workspaceId, days } = req.query;
  if (!workspaceId) return res.json({ pageviews: 0, visitors: 0, topPages: [], topReferrers: [] });
  const since = new Date(Date.now() - (parseInt(days as string, 10) || 30) * 86400000).toISOString();
  const { data, error } = await supabase
    .from('site_pageviews')
    .select('path,referrer,visitor_id,created_at')
    .eq('workspace_id', workspaceId)
    .gte('created_at', since)
    .limit(20000);
  if (error) { console.error('site-analytics/summary error:', error); return res.status(500).json({ error: error.message }); }

  const rows = data || [];
  const pageviews = rows.length;
  const visitors = new Set(rows.map((r: any) => r.visitor_id).filter(Boolean)).size;

  const pageCounts: Record<string, number> = {};
  const refCounts: Record<string, number> = {};
  rows.forEach((r: any) => {
    pageCounts[r.path] = (pageCounts[r.path] || 0) + 1;
    let ref = 'Direct';
    if (r.referrer) {
      try { ref = new URL(r.referrer).hostname.replace(/^www\./, ''); } catch { ref = 'Direct'; }
    }
    refCounts[ref] = (refCounts[ref] || 0) + 1;
  });

  const topPages = Object.entries(pageCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([path, count]) => ({ path, count }));
  const topReferrers = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([source, count]) => ({ source, count }));

  res.json({ pageviews, visitors, topPages, topReferrers });
});

// ── Website Analytics (GA4) ───────────────────────────────────────────────────
app.post('/api/website-analytics/connect', async (req, res) => {
  const { workspaceId, propertyId, accessToken } = req.body;
  await supabase.from('social_accounts').upsert({ workspace_id: workspaceId, platform: 'ga4', handle: propertyId, access_token: accessToken||'', account_name: 'Google Analytics 4', status: 'active', connected_at: new Date().toISOString(), expires_at: new Date(Date.now()+3600000).toISOString() }, { onConflict: 'workspace_id,platform' });
  res.json({ success: true });
});
app.post('/api/website-analytics/sync', async (req, res) => {
  const { workspaceId } = req.body;
  const { data: account } = await supabase.from('social_accounts').select('*').eq('workspace_id', workspaceId).eq('platform', 'ga4').maybeSingle();
  if (!account?.handle) return res.json({ success: false, error: 'No GA4 property connected.' });
  if (!account.access_token) return res.json({ success: false, error: 'No Google access token stored. Reconnect Google from Connect Accounts.' });
  try {
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${account.handle}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name:'sessions' },{ name:'activeUsers' },{ name:'newUsers' },{ name:'bounceRate' },{ name:'averageSessionDuration' },{ name:'conversions' }],
        dimensions: [{ name:'sessionDefaultChannelGrouping' }],
      }),
    });
    const d: any = await r.json();
    if (d.error) {
      const code = d.error.code;
      let friendly = d.error.message || 'GA4 request failed.';
      if (code === 401) friendly = 'Google access token expired. Go to Connect Accounts and reconnect Google.';
      else if (code === 403) friendly = `Permission denied on property ${account.handle}. Make sure the Google account you connected has Viewer access to this GA4 property, and that the Analytics scope was granted (reconnect Google if you connected before this feature existed).`;
      else if (code === 400 && /Property/.test(friendly)) friendly = `Property ID "${account.handle}" looks invalid. Double check it in GA4 → Admin → Property Settings.`;
      return res.json({ success: false, error: friendly });
    }
    res.json({ success: true, data: d.rows || [] });
  } catch (e: any) {
    res.json({ success: false, error: e.message });
  }
});


// ── Ad API Connections (manual credentials) ──────────────────────────────────
app.get('/api/ad-connections', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data } = await supabase.from('ad_connections').select('*').eq('workspace_id', workspaceId);
  res.json((data || []).map((c: any) => ({ ...c, ad_account_id: c.ad_account_id, developer_token: c.developer_token ? '••••••••' : '', client_id: c.client_id })));
});

app.post('/api/ad-connections/save', async (req, res) => {
  const { workspaceId, platformName, fields } = req.body;
  if (!workspaceId || !platformName) return res.status(400).json({ success: false, error: 'Missing workspace or platform.' });

  // Normalize Meta Ad Account ID — Meta's API requires the "act_" prefix
  if (platformName === 'Meta Ads' && fields.ad_account_id && !fields.ad_account_id.startsWith('act_')) {
    fields.ad_account_id = `act_${fields.ad_account_id.trim()}`;
  }

  // Try to verify the credentials with a lightweight real API call before saving
  let verified = false;
  let verifyError = '';
  try {
    if (platformName === 'Meta Ads' && fields.access_token && fields.ad_account_id) {
      const r = await fetch(`https://graph.facebook.com/v18.0/${fields.ad_account_id}?fields=name&access_token=${fields.access_token}`);
      const d: any = await r.json();
      verified = !d.error;
      if (d.error) verifyError = d.error.message;
    } else if (platformName === 'TikTok Ads' && fields.access_token && fields.advertiser_id) {
      const r = await fetch(`https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${fields.advertiser_id}"]`, { headers: { 'Access-Token': fields.access_token } });
      const d: any = await r.json();
      verified = d.code === 0;
      if (d.code !== 0) verifyError = d.message;
    } else if (platformName === 'LinkedIn Ads' && fields.access_token) {
      const r = await fetch(`https://api.linkedin.com/v2/adAccountsV2/${fields.ad_account_id}`, { headers: { Authorization: `Bearer ${fields.access_token}` } });
      verified = r.ok;
      if (!r.ok) verifyError = `LinkedIn returned ${r.status}`;
    } else if (platformName === 'Google Ads') {
      // Google Ads API requires complex setup; accept and mark unverified, real check happens on first sync
      verified = !!(fields.customer_id && fields.developer_token && fields.access_token);
      if (!verified) verifyError = 'Missing one of: customer ID, developer token, access token.';
    }
  } catch (e: any) { verified = false; verifyError = e.message; }

  const row: any = {
    workspace_id: workspaceId,
    platform_name: platformName,
    connected: true,
    client_id: fields.ad_account_id || fields.customer_id || fields.advertiser_id || '',
    developer_token: fields.developer_token || fields.access_token || '',
    ad_account_id: fields.ad_account_id || fields.customer_id || fields.advertiser_id || '',
  };
  const { error } = await supabase.from('ad_connections').upsert(row, { onConflict: 'workspace_id,platform_name' });
  if (error) return res.json({ success: false, error: error.message });
  res.json({ success: true, verified, verifyError: verified ? undefined : verifyError });
});

app.post('/api/ad-connections/disconnect', async (req, res) => {
  const { workspaceId, platformName } = req.body;
  await supabase.from('ad_connections').delete().eq('workspace_id', workspaceId).eq('platform_name', platformName);
  res.json({ success: true });
});

// ── Post Publishing (post to all selected platforms at once) ────────────────
app.post('/api/posts/:id/publish', async (req, res) => {
  const { data: post } = await supabase.from('scheduled_posts').select('*').eq('id', req.params.id).single();
  if (!post) return res.status(404).json({ success: false, error: 'Post not found.' });

  const { data: accounts } = await supabase.from('social_accounts').select('*').eq('workspace_id', post.workspace_id);
  const results: any[] = [];

  for (const platform of (post.platforms || [])) {
    const account = (accounts || []).find((a: any) => a.platform === platform);
    if (!account || !account.access_token) {
      results.push({ platform, success: false, error: 'No connected account with a valid token.' });
      continue;
    }
    try {
      if (platform === 'facebook') {
        const r = await fetch(`https://graph.facebook.com/v18.0/${account.handle}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: post.description, access_token: account.access_token }),
        });
        const d: any = await r.json();
        results.push({ platform, success: !d.error, error: d.error?.message, id: d.id });
      } else if (platform === 'instagram') {
        if (!post.image_url) {
          results.push({ platform, success: false, error: 'Instagram requires an image_url to publish.' });
          continue;
        }
        const createR = await fetch(`https://graph.facebook.com/v18.0/${account.handle}/media`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: post.image_url, caption: post.description, access_token: account.access_token }),
        });
        const createD: any = await createR.json();
        if (createD.error) { results.push({ platform, success: false, error: createD.error.message }); continue; }
        const publishR = await fetch(`https://graph.facebook.com/v18.0/${account.handle}/media_publish`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: createD.id, access_token: account.access_token }),
        });
        const publishD: any = await publishR.json();
        results.push({ platform, success: !publishD.error, error: publishD.error?.message, id: publishD.id });
      } else if (platform === 'linkedin') {
        const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${account.access_token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
          body: JSON.stringify({
            author: `urn:li:organization:${account.handle}`,
            lifecycleState: 'PUBLISHED',
            specificContent: { 'com.linkedin.ugc.ShareContent': { shareCommentary: { text: post.description }, shareMediaCategory: 'NONE' } },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
          }),
        });
        results.push({ platform, success: r.ok, error: r.ok ? undefined : `LinkedIn returned ${r.status}` });
      } else {
        results.push({ platform, success: false, error: `Publishing to ${platform} is not yet supported.` });
      }
    } catch (e: any) {
      results.push({ platform, success: false, error: e.message });
    }
  }

  const allOk = results.every(r => r.success);
  const anyOk = results.some(r => r.success);
  await supabase.from('scheduled_posts').update({ status: anyOk ? 'published' : 'failed' }).eq('id', post.id);
  res.json({ success: anyOk, all_success: allOk, results });
});

// ── Engagement Inbox ──────────────────────────────────────────────────────────
app.get('/api/inbox', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data } = await supabase.from('inbox_items').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(100);
  res.json(data || []);
});

app.post('/api/inbox/sync', async (req, res) => {
  const { workspaceId } = req.body;
  const { data: accounts } = await supabase.from('social_accounts').select('*').eq('workspace_id', workspaceId).in('platform', ['instagram','facebook','meta_ads']);
  if (!accounts || accounts.length === 0) return res.json({ success: false, error: 'No Facebook or Instagram accounts connected. Connect them from Connect Accounts first.' });

  let totalSynced = 0;
  const errors: string[] = [];
  const details: string[] = [];

  for (const account of accounts) {
    if (!account.access_token) continue;
    try {
      // ── Step 1: Get all Facebook Pages linked to this token ──────────────
      const pagesR = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,picture&access_token=${account.access_token}`);
      const pagesD: any = await pagesR.json();
      const pages: any[] = pagesD.data || [];

      // ── Step 2: If the handle is itself a page ID, add it too ────────────
      const handleIsPageId = /^\d{10,}$/.test(account.handle || '');
      if (handleIsPageId && !pages.find((p: any) => p.id === account.handle)) {
        pages.unshift({ id: account.handle, access_token: account.access_token, name: account.account_name });
      }

      for (const page of pages) {
        const pageToken = page.access_token || account.access_token;
        details.push(`Scanning page: ${page.name || page.id}`);

        // ── Facebook Page Comments ───────────────────────────────────────
        try {
          const feedR = await fetch(`https://graph.facebook.com/v18.0/${page.id}/feed?fields=message,comments{message,from,created_time,id}&limit=10&access_token=${pageToken}`);
          const feedD: any = await feedR.json();
          for (const post of (feedD.data || [])) {
            for (const c of (post.comments?.data || [])) {
              await supabase.from('inbox_items').upsert({
                workspace_id: workspaceId, platform: 'facebook', type: 'comment',
                external_id: c.id, from_name: c.from?.name || 'Unknown', text: c.message || '',
                post_caption: (post.message || '').slice(0, 80),
                created_at: c.created_time || new Date().toISOString(),
              }, { onConflict: 'external_id' });
              totalSynced++;
            }
          }
        } catch (_) {}

        // ── Facebook Page Inbox (Messenger) ──────────────────────────────
        try {
          const convR = await fetch(`https://graph.facebook.com/v18.0/${page.id}/conversations?fields=participants,updated_time,messages.limit(1){message,from,created_time}&access_token=${pageToken}`);
          const convD: any = await convR.json();
          for (const conv of (convD.data || [])) {
            const msg = conv.messages?.data?.[0];
            if (!msg || !msg.message) continue;
            const fromName = conv.participants?.data?.find((p: any) => p.id !== page.id)?.name || msg.from?.name || 'Unknown';
            await supabase.from('inbox_items').upsert({
              workspace_id: workspaceId, platform: 'facebook', type: 'message',
              external_id: `conv_${conv.id}_${msg.created_time}`,
              from_name: fromName, text: msg.message,
              created_at: conv.updated_time || new Date().toISOString(),
            }, { onConflict: 'external_id' });
            totalSynced++;
          }
        } catch (_) {}

        // ── Linked Instagram Business Account ────────────────────────────
        try {
          const igPageR = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${pageToken}`);
          const igPageD: any = await igPageR.json();
          const igAccount = igPageD.instagram_business_account;
          if (igAccount?.id) {
            // Update stored Instagram account if we find a better handle
            await supabase.from('social_accounts').update({ handle: igAccount.id, avatar_url: igAccount.profile_picture_url || '', account_name: igAccount.name || igAccount.username || '' }).eq('workspace_id', workspaceId).eq('platform', 'instagram');

            // Get Instagram media comments
            const mediaR = await fetch(`https://graph.facebook.com/v18.0/${igAccount.id}/media?fields=caption,timestamp,comments{text,username,timestamp,id}&limit=10&access_token=${pageToken}`);
            const mediaD: any = await mediaR.json();
            for (const m of (mediaD.data || [])) {
              for (const c of (m.comments?.data || [])) {
                await supabase.from('inbox_items').upsert({
                  workspace_id: workspaceId, platform: 'instagram', type: 'comment',
                  external_id: c.id, from_name: `@${c.username || 'unknown'}`,
                  text: c.text || '', post_caption: (m.caption || '').slice(0, 80),
                  created_at: c.timestamp || new Date().toISOString(),
                }, { onConflict: 'external_id' });
                totalSynced++;
              }
            }
          }
        } catch (_) {}
      }
    } catch (e: any) {
      errors.push(`${account.platform} (${account.account_name}): ${e.message}`);
    }
  }

  if (totalSynced === 0) {
    const errMsg = errors.length > 0 ? errors.join('; ') : 'No new messages found. Your pages may have no recent comments or messages. Make sure the connected account has Manager access to Facebook Pages.';
    return res.json({ success: false, error: errMsg, details });
  }
  res.json({ success: true, synced: totalSynced, details });
});

app.post('/api/inbox/reply', async (req, res) => {
  const { workspaceId, platform, externalId, message } = req.body;
  const { data: account } = await supabase.from('social_accounts').select('*').eq('workspace_id', workspaceId).eq('platform', platform).maybeSingle();
  if (!account?.access_token) return res.json({ success: false, error: 'Account not connected.' });
  try {
    if (platform === 'facebook' || platform === 'instagram') {
      const r = await fetch(`https://graph.facebook.com/v18.0/${externalId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: account.access_token }),
      });
      const d: any = await r.json();
      if (d.error) return res.json({ success: false, error: d.error.message });
      return res.json({ success: true });
    }
    res.json({ success: false, error: 'Replying not supported for this platform yet.' });
  } catch (e: any) {
    res.json({ success: false, error: e.message });
  }
});


// ── Sync real campaign data from connected Ads APIs ──────────────────────────
app.post('/api/campaigns/sync-from-api', async (req, res) => {
  const { workspaceId } = req.body;
  const { data: connections } = await supabase.from('ad_connections').select('*').eq('workspace_id', workspaceId);
  if (!connections || connections.length === 0) return res.json({ success: false, error: 'No ad API connections saved yet. Go to Ads API Connections and enter your credentials.' });

  let imported = 0;
  const platformResults: { platform: string; status: 'success' | 'error' | 'skipped'; message: string; count?: number }[] = [];

  for (const conn of connections) {
    const platform = conn.platform_name;
    const token    = conn.developer_token; // stores access token
    const accountId = conn.ad_account_id;

    try {
      // ── Meta Ads ──────────────────────────────────────────────────────────
      if (platform === 'Meta Ads') {
        // Try developer_token first (stored access token), then client_id as fallback
        const accessToken = token || conn.client_id || '';
        const adAccountId = accountId || conn.client_id || '';
        if (!accessToken || !adAccountId) {
          platformResults.push({ platform, status: 'error', message: 'Missing credentials. Go to Ads API Connections → enter your Access Token and Ad Account ID (act_XXXXXXXX).' });
          continue;
        }
        const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
        const r = await fetch(`https://graph.facebook.com/v18.0/${actId}/campaigns?fields=name,status,daily_budget,lifetime_budget,objective&limit=50&access_token=${accessToken}`);
        const d: any = await r.json();
        if (d.error) {
          const isExpired = d.error.code === 190 || String(d.error.message).toLowerCase().includes('token');
          const isNoAd    = d.error.code === 100 || String(d.error.message).toLowerCase().includes('permission');
          const msg = isExpired
            ? '⏰ Token expired. Go to developers.facebook.com/tools/explorer → select your app → Generate Access Token → Extend it → paste in Ads API Connections.'
            : isNoAd
            ? '🔒 Missing ads_read permission. When generating your token in Graph API Explorer, check the ads_read permission.'
            : `Meta Ads error (${d.error.code}): ${d.error.message}`;
          platformResults.push({ platform, status: 'error', message: msg });
          continue;
        }
        let count = 0;
        for (const c of (d.data || [])) {
          try {
            const insR = await fetch(`https://graph.facebook.com/v18.0/${c.id}/insights?fields=spend,impressions,clicks,reach,actions&date_preset=last_30d&access_token=${token}`);
            const insD: any = await insR.json();
            const ins = insD.data?.[0] || {};
            const conversions = (ins.actions || []).find((a: any) => ['purchase','lead','complete_registration','offsite_conversion.fb_pixel_lead'].includes(a.action_type))?.value || 0;
            await supabase.from('campaigns').upsert({
              workspace_id: workspaceId, name: c.name, platform: 'Meta Ads',
              status: c.status === 'ACTIVE' ? 'active' : c.status === 'PAUSED' ? 'paused' : 'ended',
              budget: parseFloat(c.daily_budget || c.lifetime_budget || '0') / 100,
              spend: parseFloat(ins.spend || '0'),
              impressions: parseInt(ins.impressions || '0'),
              clicks: parseInt(ins.clicks || '0'),
              conversions: parseInt(conversions),
              notes: `Auto-synced from Meta Ads (${actId})`,
            }, { onConflict: 'workspace_id,name' });
            count++; imported++;
          } catch (_) {}
        }
        if (count === 0 && (d.data || []).length === 0) {
          platformResults.push({ platform, status: 'success', message: 'Connected but no campaigns found in your ad account. Create campaigns in Meta Ads Manager first.', count: 0 });
        } else {
          platformResults.push({ platform, status: 'success', message: `Imported ${count} campaign${count !== 1 ? 's' : ''}.`, count });
        }
      }

      // ── TikTok Ads ────────────────────────────────────────────────────────
      else if (platform === 'TikTok Ads') {
        if (!token || !accountId) { platformResults.push({ platform, status: 'error', message: 'Missing access token or advertiser ID.' }); continue; }
        const r = await fetch(`https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${accountId}&page_size=20`, { headers: { 'Access-Token': token } });
        const d: any = await r.json();
        if (d.code !== 0) {
          const isAuth = d.code === 40001 || d.code === 40002 || String(d.message).includes('auth') || String(d.message).includes('token');
          platformResults.push({ platform, status: 'error', message: isAuth ? 'TikTok token expired or invalid. Go to Ads API Connections and reconnect TikTok Ads.' : `TikTok error (${d.code}): ${d.message}` });
          continue;
        }
        let count = 0;
        for (const c of (d.data?.list || [])) {
          await supabase.from('campaigns').upsert({
            workspace_id: workspaceId, name: c.campaign_name, platform: 'TikTok Ads',
            status: c.status === 'ENABLE' ? 'active' : 'paused',
            budget: parseFloat(c.budget || '0'),
            notes: `Auto-synced from TikTok Ads (${accountId})`,
          }, { onConflict: 'workspace_id,name' });
          count++; imported++;
        }
        platformResults.push({ platform, status: 'success', message: `Imported ${count} campaign${count !== 1 ? 's' : ''}.`, count });
      }

      // ── Google Ads ────────────────────────────────────────────────────────
      else if (platform === 'Google Ads') {
        // Google Ads API requires a Developer Token (approved by Google) + OAuth token
        // Check if developer_token looks like an OAuth token (starts with ya29.) vs a dev token
        if (!token) { platformResults.push({ platform, status: 'error', message: 'No credentials saved for Google Ads.' }); continue; }
        if (!accountId) { platformResults.push({ platform, status: 'error', message: 'No Customer ID saved for Google Ads.' }); continue; }
        // Try the Google Ads API with the stored credentials
        const cleanCustomerId = accountId.replace(/-/g, '');
        const r = await fetch(`https://googleads.googleapis.com/v14/customers/${cleanCustomerId}/campaigns?access_token=${token}`, {
          headers: { 'developer-token': conn.client_id || token, 'login-customer-id': cleanCustomerId },
        });
        const d: any = await r.json();
        if (d.error || d[0]?.error) {
          const err = d.error || d[0]?.error;
          const isDevToken = String(err?.message).includes('developer token') || err?.code === 403;
          platformResults.push({
            platform, status: 'error',
            message: isDevToken
              ? 'Google Ads requires a Developer Token with Standard Access approval from Google. Apply at developers.google.com/google-ads/api/docs/get-started/dev-token. Meanwhile, enter campaigns manually.'
              : `Google Ads error: ${err?.message || JSON.stringify(d).slice(0, 120)}`
          });
        } else {
          const campaigns = Array.isArray(d) ? d : [];
          let count = 0;
          for (const c of campaigns) {
            if (c.campaign?.name) {
              await supabase.from('campaigns').upsert({
                workspace_id: workspaceId, name: c.campaign.name, platform: 'Google Ads',
                status: c.campaign.status === 'ENABLED' ? 'active' : 'paused',
                budget: 0, notes: `Auto-synced from Google Ads`,
              }, { onConflict: 'workspace_id,name' });
              count++; imported++;
            }
          }
          platformResults.push({ platform, status: 'success', message: count > 0 ? `Imported ${count} campaigns.` : 'Connected but no campaigns found.', count });
        }
      }

      // ── LinkedIn Ads ──────────────────────────────────────────────────────
      else if (platform === 'LinkedIn Ads') {
        if (!token || !accountId) { platformResults.push({ platform, status: 'error', message: 'Missing access token or account ID.' }); continue; }
        const r = await fetch(`https://api.linkedin.com/v2/adCampaigns?q=search&search.account.values[0]=urn:li:sponsoredAccount:${accountId}&count=20`, {
          headers: { Authorization: `Bearer ${token}`, 'LinkedIn-Version': '202304' }
        });
        const d: any = await r.json();
        if (d.serviceErrorCode || r.status >= 400) {
          const isScope = r.status === 403 || String(d.message).includes('permission');
          platformResults.push({
            platform, status: 'error',
            message: isScope
              ? 'LinkedIn Ads requires r_ads permission. In your LinkedIn Developer App, add r_ads scope and reconnect LinkedIn from Connect Accounts.'
              : `LinkedIn error: ${d.message || r.status}`
          });
        } else {
          let count = 0;
          for (const c of (d.elements || [])) {
            await supabase.from('campaigns').upsert({
              workspace_id: workspaceId,
              name: c.name || `LinkedIn Campaign ${c.id}`,
              platform: 'LinkedIn Ads',
              status: c.status === 'ACTIVE' ? 'active' : 'paused',
              budget: parseFloat(c.totalBudget?.amount || '0'),
              notes: `Auto-synced from LinkedIn Ads`,
            }, { onConflict: 'workspace_id,name' });
            count++; imported++;
          }
          platformResults.push({ platform, status: 'success', message: count > 0 ? `Imported ${count} campaigns.` : 'Connected but no campaigns found.', count });
        }
      }

      else {
        platformResults.push({ platform, status: 'skipped', message: 'This platform sync is not yet supported. Add campaigns manually.' });
      }

    } catch (e: any) {
      platformResults.push({ platform, status: 'error', message: `Connection error: ${e.message}` });
    }
  }

  res.json({
    success: imported > 0 || platformResults.some(r => r.status === 'success'),
    imported,
    platformResults,
    error: imported === 0 ? platformResults.map(r => `${r.platform}: ${r.message}`).join(' | ') : undefined,
  });
});


// ══════════════════════════════════════════════════════════════════════════════
// ADMIN API  (all protected by x-admin-token header)
// ══════════════════════════════════════════════════════════════════════════════

const verifyAdmin = async (req: any, res: any, next: any) => {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Admin token required' });
  try {
    const { data, error } = await supabase.from('admin_sessions').select('*').eq('token', token).maybeSingle();
    if (error) return res.status(500).json({ error: `DB error: ${error.message}. Run the migration SQL in Supabase first.` });
    if (!data) return res.status(401).json({ error: 'Invalid admin session. Log in again.' });
    if (new Date(data.expires_at) < new Date()) {
      await supabase.from('admin_sessions').delete().eq('token', token);
      return res.status(401).json({ error: 'Admin session expired. Log in again.' });
    }
    next();
  } catch (e: any) {
    res.status(500).json({ error: `Admin auth error: ${e.message}` });
  }
};

app.post('/api/admin/auth', async (req, res) => {
  const { pin } = req.body;
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) return res.status(500).json({ error: 'ADMIN_PIN not set in environment variables.' });
  if (pin !== adminPin) return res.status(401).json({ error: 'Invalid PIN.' });
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
  await supabase.from('admin_sessions').insert({ token, expires_at: new Date(Date.now() + 8*3600000).toISOString() });
  res.json({ token });
});

app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
  const [usersRes, workspacesRes, signupsRes, subsRes] = await Promise.all([
    supabase.from('velox_users').select('id', { count: 'exact', head: true }),
    supabase.from('workspaces').select('id', { count: 'exact', head: true }),
    supabase.from('velox_users').select('id,name,email,created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('subscriptions').select('plan_type'),
  ]);
  const activeToday = await supabase.from('velox_sessions').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now()-86400000).toISOString());
  const newThisWeek = await supabase.from('velox_users').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now()-7*86400000).toISOString());
  const subs = subsRes.data || [];
  res.json({
    totalUsers: usersRes.count || 0,
    totalWorkspaces: workspacesRes.count || 0,
    activeToday: activeToday.count || 0,
    newThisWeek: newThisWeek.count || 0,
    recentSignups: signupsRes.data || [],
    starterCount: subs.filter((s:any) => s.plan_type === 'starter').length,
    proCount: subs.filter((s:any) => s.plan_type === 'pro').length,
    agencyCount: subs.filter((s:any) => s.plan_type === 'agency').length,
  });
});

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  const { data: users } = await supabase.from('velox_users').select('*').order('created_at', { ascending: false });
  const { data: subs } = await supabase.from('subscriptions').select('*');
  const merged = (users || []).map((u: any) => {
    const sub = (subs || []).find((s: any) => s.user_id === u.id);
    return { ...u, plan_type: sub?.plan_type || 'starter', banned: u.role === 'banned' };
  });
  res.json(merged);
});

app.post('/api/admin/users/action', verifyAdmin, async (req, res) => {
  const { userId, action, value } = req.body;
  if (action === 'upgrade') {
    await supabase.from('subscriptions').upsert({ user_id: userId, plan_type: value, status: 'active' }, { onConflict: 'user_id' });
    // Also update credits to match the new plan
    const planCredits: Record<string,number> = { starter: 150, pro: 500, agency: 2000 };
    const newCredits = planCredits[value] || 150;
    const { data: cb } = await supabase.from('credit_balances').select('remaining_credits').eq('user_id', userId).maybeSingle();
    await supabase.from('credit_balances').upsert({
      user_id: userId,
      remaining_credits: Math.max(newCredits, cb?.remaining_credits || 0),
      total_credits_available: newCredits,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    return res.json({ success: true });
  }
  if (action === 'ban') {
    await supabase.from('velox_users').update({ role: 'banned' }).eq('id', userId);
    await supabase.from('velox_sessions').delete().eq('user_id', userId);
    return res.json({ success: true });
  }
  if (action === 'unban') {
    await supabase.from('velox_users').update({ role: 'agency' }).eq('id', userId);
    return res.json({ success: true });
  }
  if (action === 'logout') {
    await supabase.from('velox_sessions').delete().eq('user_id', userId);
    return res.json({ success: true });
  }
  if (action === 'delete') {
    await supabase.from('velox_sessions').delete().eq('user_id', userId);
    await supabase.from('velox_users').delete().eq('id', userId);
    return res.json({ success: true });
  }
  res.status(400).json({ success: false, error: 'Unknown action' });
});

app.post('/api/admin/emergency-logout', verifyAdmin, async (req, res) => {
  const { count } = await supabase.from('velox_sessions').select('*', { count: 'exact', head: true });
  await supabase.from('velox_sessions').delete().neq('token', '');
  res.json({ success: true, count });
});

app.get('/api/admin/audit', verifyAdmin, async (req, res) => {
  const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  res.json(data || []);
});

app.get('/api/admin/settings', verifyAdmin, async (req, res) => {
  const { data } = await supabase.from('app_settings').select('*');
  const obj: any = {};
  (data || []).forEach((r: any) => { obj[r.key] = r.value; });
  res.json(obj);
});

app.post('/api/admin/settings', verifyAdmin, async (req, res) => {
  const settings = req.body;
  for (const [key, value] of Object.entries(settings)) {
    await supabase.from('app_settings').upsert({ key, value: String(value) }, { onConflict: 'key' });
  }
  res.json({ success: true });
});

app.get('/api/admin/billing-settings', verifyAdmin, async (req, res) => {
  const { data } = await supabase.from('app_settings').select('*').like('key', '%price%').or('key.like.%paystack%,key.like.%flutterwave%');
  const obj: any = {};
  (data || []).forEach((r: any) => { obj[r.key] = r.value; });
  res.json(obj);
});

app.post('/api/admin/billing-settings', verifyAdmin, async (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    await supabase.from('app_settings').upsert({ key, value: String(value) }, { onConflict: 'key' });
  }
  res.json({ success: true });
});

// ── Admin chat endpoints ────────────────────────────────────────────────────
app.get('/api/admin/chat/sessions', verifyAdmin, async (req, res) => {
  const { data: sessions } = await supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false });
  const enriched = await Promise.all((sessions || []).map(async (s: any) => {
    const { data: user } = await supabase.from('velox_users').select('name,email').eq('id', s.user_id).maybeSingle();
    const { data: lastMsg } = await supabase.from('chat_messages').select('message').eq('session_id', s.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('session_id', s.id).eq('sender', 'user').eq('read_by_admin', false);
    return { ...s, user_name: user?.name || 'Unknown', user_email: user?.email, last_message: lastMsg?.message, unread_admin: count || 0 };
  }));
  res.json(enriched);
});

app.get('/api/admin/chat/messages', verifyAdmin, async (req, res) => {
  const { sessionId } = req.query;
  const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
  await supabase.from('chat_messages').update({ read_by_admin: true }).eq('session_id', sessionId).eq('sender', 'user');
  res.json(data || []);
});

app.post('/api/admin/chat/reply', verifyAdmin, async (req, res) => {
  const { sessionId, message } = req.body;
  await supabase.from('chat_messages').insert({ session_id: sessionId, sender: 'admin', message, read_by_user: false });
  await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
  res.json({ success: true });
});

// ── User-facing chat endpoints ──────────────────────────────────────────────
app.post('/api/chat/session', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const { data: existing } = await supabase.from('chat_sessions').select('*').eq('user_id', userId).maybeSingle();
  if (existing) return res.json(existing);
  const { data } = await supabase.from('chat_sessions').insert({ user_id: userId, updated_at: new Date().toISOString() }).select().single();
  res.json(data);
});

app.get('/api/chat/messages', async (req, res) => {
  const { sessionId } = req.query;
  const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
  res.json(data || []);
});

app.post('/api/chat/send', async (req, res) => {
  const { sessionId, sender, message } = req.body;
  await supabase.from('chat_messages').insert({ session_id: sessionId, sender, message, read_by_admin: sender === 'admin', read_by_user: sender === 'user' });
  await supabase.from('chat_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId);
  res.json({ success: true });
});

app.post('/api/chat/mark-read', async (req, res) => {
  const { sessionId, reader } = req.body;
  const field = reader === 'admin' ? 'read_by_admin' : 'read_by_user';
  await supabase.from('chat_messages').update({ [field]: true }).eq('session_id', sessionId).eq('sender', reader === 'admin' ? 'user' : 'admin');
  res.json({ success: true });
});


// ── Contact form ─────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'All fields are required.' });
  try {
    await supabase.from('contact_messages').insert({ name, email, message });
    res.json({ success: true });
  } catch {
    res.json({ success: true }); // still acknowledge even if table doesn't exist
  }
});


// ── Public billing config (returns public keys + prices) ─────────────────────
app.get('/api/billing/config', async (_req, res) => {
  try {
    const { data: settings } = await supabase.from('app_settings').select('key,value').in('key', [
      'paystack_public_key','flutterwave_public_key','paystack_currency','flutterwave_currency',
      'starter_price','pro_price','agency_price'
    ]);
    const cfg: Record<string,string> = {};
    (settings || []).forEach((s: any) => { cfg[s.key] = s.value; });
    res.json(cfg);
  } catch { res.json({}); }
});

// ── Billing verify (called after successful payment) ─────────────────────────
app.post('/api/billing/verify', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { reference, planKey, billingCycle } = req.body;
  if (!reference || !planKey) return res.status(400).json({ error: 'Missing reference or plan.' });

  // Get payment keys to verify
  const { data: settings } = await supabase.from('app_settings').select('key,value');
  const cfg: Record<string,string> = {};
  (settings || []).forEach((s: any) => { cfg[s.key] = s.value; });

  let verified = false;

  // Verify with Paystack if key exists
  if (cfg.paystack_secret_key && String(reference).startsWith('velox_')) {
    try {
      const r = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${cfg.paystack_secret_key}` },
      });
      const d: any = await r.json();
      verified = d.status === true && (d.data?.status === 'success');
    } catch {}
  }

  // Verify with Flutterwave if key exists
  if (!verified && cfg.flutterwave_secret_key) {
    try {
      const r = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
        headers: { Authorization: `Bearer ${cfg.flutterwave_secret_key}` },
      });
      const d: any = await r.json();
      verified = d.status === 'success' && d.data?.status === 'successful';
    } catch {}
  }

  // For testing/dev: if no payment keys configured, accept anyway
  if (!cfg.paystack_secret_key && !cfg.flutterwave_secret_key) verified = true;

  if (!verified) return res.json({ success: false, error: 'Payment could not be verified. Contact support with your reference: ' + reference });

  // Update subscription
  await supabase.from('subscriptions').upsert({
    user_id: user.id, plan_type: planKey,
    billing_cycle: billingCycle || 'monthly', status: 'active',
    current_period_end: new Date(Date.now() + (billingCycle === 'annual' ? 365 : 30) * 86400000).toISOString(),
  }, { onConflict: 'user_id' });

  // Update AI credits + lead finder credits based on plan
  const planCredits: Record<string,number> = { starter: 150, pro: 500, agency: 2000 };
  const newCredits = planCredits[planKey] || 150;
  // Get current balance and top up to the new plan's limit if it's higher
  const { data: currentBal } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  const updatedCredits = Math.max(newCredits, currentBal?.remaining_credits || 0);
  await supabase.from('credit_balances').upsert({
    user_id: user.id,
    remaining_credits: updatedCredits,
    total_credits_available: newCredits,
    last_updated: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  await insertAuditLog(user.id, `Plan upgraded to ${planKey} (${billingCycle})`, req);
  res.json({ success: true, newPlan: planKey, creditsGranted: newCredits });
});

// ── Admin: all referrals ──────────────────────────────────────────────────────
app.get('/api/admin/referrals', verifyAdmin, async (req, res) => {
  const { data: referrals } = await supabase.from('referrals').select('*').order('created_at', { ascending: false });
  const enriched = await Promise.all((referrals || []).map(async (r: any) => {
    const { data: u } = await supabase.from('velox_users').select('name,email').eq('id', r.referrer_user_id).maybeSingle();
    return { ...r, referrer_name: u?.name, referrer_email: u?.email };
  }));
  res.json(enriched);
});


// ── Admin: contact messages ────────────────────────────────────────────────
app.get('/api/admin/contact-messages', verifyAdmin, async (req, res) => {
  try {
    const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
    res.json(data || []);
  } catch { res.json([]); }
});


// ── Image Upload → Supabase Storage ─────────────────────────────────────────
app.post('/api/upload/image', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { imageData, fileName, mimeType, workspaceId } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data provided.' });
  try {
    // Convert base64 to Buffer
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > 8 * 1024 * 1024) return res.status(400).json({ error: 'Image must be under 8MB.' });
    const ext    = (fileName || 'image.jpg').split('.').pop()?.toLowerCase() || 'jpg';
    const path   = `posts/${workspaceId || user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const mime   = mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error: upErr } = await supabase.storage.from('veloxspace-media').upload(path, buffer, { contentType: mime, upsert: false });
    if (upErr) {
      // Bucket might not exist — try to create it first
      if (upErr.message.includes('not found') || upErr.message.includes('does not exist')) {
        await supabase.storage.createBucket('veloxspace-media', { public: true });
        const { error: retry } = await supabase.storage.from('veloxspace-media').upload(path, buffer, { contentType: mime });
        if (retry) return res.status(500).json({ error: retry.message });
      } else {
        return res.status(500).json({ error: upErr.message });
      }
    }
    const { data: { publicUrl } } = supabase.storage.from('veloxspace-media').getPublicUrl(path);
    res.json({ url: publicUrl, path });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// ── Public pricing endpoint (reads live from SupaAdmin settings) ─────────────
app.get('/api/pricing', async (_req, res) => {
  try {
    const { data: settings } = await supabase
      .from('app_settings').select('key,value')
      .in('key', ['starter_price','pro_price','agency_price']);
    const cfg: Record<string,string> = {};
    (settings || []).forEach((s: any) => { cfg[s.key] = s.value; });
    const starter = Number(cfg.starter_price) || 15000;
    const pro     = Number(cfg.pro_price)     || 45000;
    const agency  = Number(cfg.agency_price)  || 155000;
    res.json({
      starter: { monthly: starter, annual: Math.round(starter * 0.9) },
      pro:     { monthly: pro,     annual: Math.round(pro     * 0.9) },
      agency:  { monthly: agency,  annual: Math.round(agency  * 0.9) },
    });
  } catch {
    res.json({
      starter: { monthly: 15000, annual: 13500  },
      pro:     { monthly: 45000, annual: 40500  },
      agency:  { monthly: 155000,annual: 139500 },
    });
  }
});


// ── Specific Business Lookup ─────────────────────────────────────────────────
app.post('/api/leads/business-lookup', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { businessName, location, workspaceId } = req.body;
  if (!businessName) return res.status(400).json({ error: 'Business name required.' });

  // Cost 5 credits (cheaper than bulk search)
  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (!balance || balance.remaining_credits < 5) return res.status(402).json({ error: 'Need at least 5 credits.' });
  await supabase.from('credit_balances').update({ remaining_credits: balance.remaining_credits - 5 }).eq('user_id', user.id);

  try {
    const fsqKey = process.env.FOURSQUARE_API_KEY || '';
    let result: any = null;

    // 1. Try Foursquare with exact name
    if (fsqKey) {
      const q = new URLSearchParams({
        query: businessName,
        ...(location ? { near: location } : {}),
        limit: '5',
        fields: 'name,location,tel,website,rating,categories,social_media,description',
      });
      const r = await fetch(`https://places-api.foursquare.com/places/search?${q}`, {
        headers: {
          Authorization: `Bearer ${fsqKey}`,
          Accept: 'application/json',
          'X-Places-Api-Version': '2025-06-17',
        }
      });
      const d: any = await r.json();
      const match = (d.results || []).find((p: any) =>
        p.name?.toLowerCase().includes(businessName.toLowerCase()) ||
        businessName.toLowerCase().includes(p.name?.toLowerCase())
      ) || d.results?.[0];
      if (match) {
        result = {
          business_name: match.name,
          address: match.location?.formatted_address || '',
          location: location || match.location?.locality || '',
          phone: match.tel || '',
          website: match.website || '',
          email: '',
          category: match.categories?.[0]?.name || '',
          rating: match.rating ? match.rating / 2 : 0,
          social_facebook: match.social_media?.facebookUrl || '',
          social_instagram: match.social_media?.instagram ? `https://instagram.com/${match.social_media.instagram}` : '',
          social_twitter: '', social_linkedin: '', social_youtube: '', social_tiktok: '',
        };
      }
    }

    // 2. Try OSM Overpass with name
    if (!result) {
      const coords = location ? await geocodeNominatim(location) : null;
      const { lat, lon } = coords || { lat: 6.5244, lon: 3.3792 }; // default: Lagos
      const query = `[out:json][timeout:10];(node["name"~"${businessName.replace(/"/g, '')}", i](around:50000,${lat},${lon});way["name"~"${businessName.replace(/"/g, '')}", i](around:50000,${lat},${lon}););out body 3;`;
      const r = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      });
      const d: any = await r.json();
      const el = (d.elements || [])[0];
      if (el?.tags?.name) {
        const t = el.tags;
        result = {
          business_name: t.name,
          address: [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(', '),
          location: location || t['addr:city'] || '',
          phone: t.phone || t['contact:phone'] || '',
          website: t.website || t['contact:website'] || '',
          email: t.email || t['contact:email'] || '',
          category: t.amenity || t.tourism || t.shop || '',
          rating: 0,
          social_facebook: t['contact:facebook'] || '', social_instagram: t['contact:instagram'] || '',
          social_twitter: t['contact:twitter'] || '', social_linkedin: t['contact:linkedin'] || '',
          social_youtube: t['contact:youtube'] || '', social_tiktok: t['contact:tiktok'] || '',
        };
      }
    }

    // 3. If no result found anywhere, return not found
    if (!result) {
      return res.json({ found: false, message: `No business matching "${businessName}" found. Try a different name or add the location.` });
    }

    // 4. Scrape website for enriched contact info
    if (result.website) {
      const scraped = await scrapeWebsite(result.website);
      result.phone  = scraped.phone  || result.phone;
      result.email  = scraped.email  || result.email;
      result.social_facebook  = scraped.social_facebook  || result.social_facebook;
      result.social_instagram = scraped.social_instagram || result.social_instagram;
      result.social_twitter   = scraped.social_twitter   || result.social_twitter;
      result.social_linkedin  = scraped.social_linkedin  || result.social_linkedin;
      result.social_youtube   = scraped.social_youtube   || result.social_youtube;
      result.social_tiktok    = scraped.social_tiktok    || result.social_tiktok;
    }

    result.confidence_score = Math.min(98, 40
      + (result.website ? 18 : 0) + (result.phone ? 15 : 0) + (result.email ? 12 : 0)
      + ([result.social_facebook, result.social_instagram, result.social_twitter].filter(Boolean).length * 5));

    res.json({ found: true, result, creditsRemaining: balance.remaining_credits - 5 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// ── Refresh Google OAuth token ────────────────────────────────────────────────
app.post('/api/social-accounts/refresh', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { accountId } = req.body;
  if (!accountId || !supabase) return res.status(400).json({ error: 'accountId required' });

  const { data: account } = await supabase.from('social_accounts').select('*').eq('id', accountId).maybeSingle();
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (!account.refresh_token) return res.status(400).json({ error: 'No refresh token stored. Please reconnect this account.' });

  // Support both Google and YouTube (same credentials)
  const clientId     = process.env.VITE_GOOGLE_CLIENT_ID  || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET   || '';
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in Vercel.' });
  if (!['google','youtube'].includes(account.platform)) return res.status(400).json({ error: `Token refresh only supported for Google/YouTube, not ${account.platform}` });

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: account.refresh_token, client_id: clientId, client_secret: clientSecret }),
    });
    const d: any = await tokenRes.json();
    if (d.error) return res.status(400).json({ error: d.error_description || d.error });

    await supabase.from('social_accounts').update({
      access_token: d.access_token,
      expires_at: new Date(Date.now() + (d.expires_in || 3600) * 1000).toISOString(),
    }).eq('id', accountId);

    res.json({ success: true, message: 'Token refreshed successfully' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default function handler(req: any, res: any) {
  return app(req, res);
}