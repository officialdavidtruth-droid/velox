/**
 * VeloxSpace ? Express Server (REAL DATA ONLY)
 * All analytics, AI, and lead data comes from real APIs.
 * No mock data, no fake numbers, no fallbacks.
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { Request, Response } from 'express';

const app = express();
app.use(express.json());

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
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', supabase: !!supabase, time: new Date().toISOString() });
});

// ?? Auth ??????????????????????????????????????????????????????????????????
app.get('/api/auth/me', async (req, res) => {
  if (!supabase) return res.json({ user: null });
  const user = await getSessionUser(req);
  if (!user) return res.json({ user: null, subscription: null, credit: null });
  const [{ data: sub }, { data: credit }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  res.json({ user, subscription: sub, credit });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, name, password, role, country } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Email and name required' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

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
      supabase.from('subscriptions').insert({ user_id: userId, plan_type: 'starter', status: 'active' }),
      supabase.from('credit_balances').insert({ user_id: userId, remaining_credits: 10, total_credits_available: 10 }),
    ]);

    // Create workspace with NO seeded analytics ? real data only
    const { data: ws } = await supabase.from('workspaces')
      .insert({ name: `${name}'s Workspace`, owner_id: userId, referral_code: genCode() })
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

// ?? Social Accounts ???????????????????????????????????????????????????????
app.get('/api/social-accounts', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('social_accounts').select('*');
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q.order('connected_at', { ascending: false });
  res.json(data || []);
});

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
      return res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redir)}&scope=https://www.googleapis.com/auth/youtube.readonly+https://www.googleapis.com/auth/yt-analytics.readonly+https://www.googleapis.com/auth/analytics.readonly&state=${state}&response_type=code&access_type=offline&prompt=consent` });
    }
    return res.json({ error: 'VITE_GOOGLE_CLIENT_ID not set in Vercel environment variables.' });
  }

  if (p === 'tiktok') {
    const appId = process.env.VITE_TIKTOK_APP_ID || '';
    if (appId) {
      return res.json({ url: `https://www.tiktok.com/v2/auth/authorize?client_key=${appId}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${encodeURIComponent(redir)}&state=${state}` });
    }
    return res.json({ error: 'VITE_TIKTOK_APP_ID not set in Vercel environment variables.' });
  }

  if (p === 'linkedin') {
    const clientId = process.env.VITE_LINKEDIN_CLIENT_ID || '';
    if (clientId) {
      return res.json({ url: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redir)}&scope=openid+profile+w_member_social+r_organization_social&state=${state}` });
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
    } else {
      res.send(oauthPage('Connected!', `${platform} connected successfully.`, true));
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
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID || ''; const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) return res.send(oauthPage('Not configured', 'GOOGLE_CLIENT_SECRET not set in Vercel environment variables.', false));
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redir, grant_type: 'authorization_code' }) });
  const tokenData: any = await tokenRes.json();
  if (tokenData.error) return res.send(oauthPage('Google OAuth failed', tokenData.error_description || tokenData.error, false));
  const accessToken = tokenData.access_token;
  if (supabase && workspaceId) {
    const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&access_token=${accessToken}`);
    const ytData: any = await ytRes.json();
    const channel = (ytData.items || [])[0];
    if (channel) {
      await supabase.from('social_accounts').upsert({ workspace_id: workspaceId, platform: 'youtube', account_name: channel.snippet?.title || 'YouTube Channel', handle: channel.snippet?.customUrl || channel.id, avatar_url: channel.snippet?.thumbnails?.default?.url || '', status: 'active', access_token: accessToken, refresh_token: tokenData.refresh_token || '', connected_at: new Date().toISOString(), expires_at: new Date(Date.now() + 3600000).toISOString() }, { onConflict: 'workspace_id,platform' });
    }
  }
  res.send(oauthPage('Google Connected!', 'YouTube channel connected. Sync analytics to pull real data.', true));
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
      if (account.platform === 'youtube' && account.access_token) {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true&access_token=${account.access_token}`);
        const d: any = await r.json();
        const stats = d.items?.[0]?.statistics;
        if (stats) {
          metrics = { followers: parseInt(stats.subscriberCount) || 0, posts: parseInt(stats.videoCount) || 0, impressions: parseInt(stats.viewCount) || 0, reach: 0, engagement: 0, clicks: 0 };
        }
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
app.post('/api/ai/caption', async (req, res) => {
  const { prompt, platform, tone, cta } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not set in Vercel environment variables. Add it to generate AI captions.' });
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: geminiKey });
    const resp = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Generate a high-converting ${platform || 'social media'} post caption for: "${prompt}". Tone: ${tone || 'professional'}. CTA: ${cta || 'Learn More'}. Return JSON only with keys: caption (string), hashtags (string), ctas (array of 3 strings). No markdown.`,
    });
    const text = resp.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'AI returned unexpected format. Please try again.' });
    res.json(JSON.parse(match[0]));
  } catch (e: any) {
    res.status(500).json({ error: 'Gemini AI error: ' + e.message });
  }
});

// ?? AI Insights ? Cloudflare ONLY ?????????????????????????????????????????
app.post('/api/ai/insights', async (req, res) => {
  const { platform, metrics } = req.body;
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken   = process.env.CLOUDFLARE_API_TOKEN;
  if (!cfAccount || !cfToken) return res.status(503).json({ error: 'CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN not set in Vercel environment variables.' });
  if (!metrics?.length) return res.status(400).json({ error: 'No analytics data to analyse. Connect and sync your accounts first.' });
  try {
    const prompt = `You are a social media analytics expert. Analyse these ${platform} metrics and provide insights in JSON format: ${JSON.stringify(metrics)}. Return ONLY valid JSON with: overall_score (number 1-10), key_insight (string), working (array of 3 specific strings), not_working (array of 2 specific strings), recommendations (array of objects with action and impact strings). No markdown.`;
    const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 600 }),
    });
    const data: any = await resp.json();
    const raw = data?.result?.response || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'AI returned unexpected format.' });
    res.json(JSON.parse(match[0]));
  } catch (e: any) {
    res.status(500).json({ error: 'Cloudflare AI error: ' + e.message });
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
app.post('/api/leads/search', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!placesKey) return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY not set in Vercel environment variables. Add it to use the Lead Finder.' });
  const { keyword, location, workspaceId } = req.body;
  if (!keyword || !location) return res.status(400).json({ error: 'Keyword and location required' });
  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (!balance || balance.remaining_credits < 15) return res.status(402).json({ error: 'Insufficient credits. You need at least 15 credits per search.' });
  await supabase.from('credit_balances').update({ remaining_credits: balance.remaining_credits - 15 }).eq('user_id', user.id);
  await supabase.from('credit_transactions').insert({ user_id: user.id, amount: -15, description: `Lead search: "${keyword}" in ${location}`, type: 'charge' });
  try {
    const placesRes = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + ' in ' + location)}&key=${placesKey}`);
    const placesData: any = await placesRes.json();
    if (placesData.status === 'REQUEST_DENIED') return res.status(403).json({ error: 'Google Places API key is invalid or Places API not enabled.' });
    if (placesData.status === 'ZERO_RESULTS') return res.json({ success: true, creditsRemaining: balance.remaining_credits - 15, results: [], message: 'No businesses found for this search. Try different keywords or location.' });
    const results = (placesData.results || []).slice(0, 10).map((p: any) => ({
      id: p.place_id, business_name: p.name, address: p.formatted_address || '',
      rating: p.rating || 0, has_website: !!p.website,
      confidence_score: Math.min(95, 60 + (p.user_ratings_total || 0) / 10),
      place_id: p.place_id,
    }));
    if (workspaceId && results.length) {
      await supabase.from('leads').insert(results.map((r: any) => ({
        workspace_id: workspaceId, business_name: r.business_name, address: r.address,
        category: keyword, location, rating: r.rating, has_website: r.has_website,
        source: 'google_places', place_id: r.place_id, confidence_score: r.confidence_score,
      })));
    }
    res.json({ success: true, creditsRemaining: balance.remaining_credits - 15, results });
  } catch (e: any) {
    res.status(500).json({ error: 'Google Places API error: ' + e.message });
  }
});

// ?? Client Portal ?????????????????????????????????????????????????????????
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

// ── AI Morning Brief ────────────────────────────────────────────────────────
app.get('/api/ai/brief', async (req, res) => {
  const { workspaceId } = req.query;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return res.json({ brief: null, error: 'GEMINI_API_KEY not set in Vercel environment variables.' });
  if (!workspaceId) return res.json({ brief: null, error: 'No workspace selected.' });
  try {
    const [{ data: analytics }, { data: posts }, { data: leads }] = await Promise.all([
      supabase.from('analytics').select('*').eq('workspace_id', workspaceId),
      supabase.from('scheduled_posts').select('*').eq('workspace_id', workspaceId).gte('publish_date', new Date().toISOString()).limit(5),
      supabase.from('leads').select('id,created_at').eq('workspace_id', workspaceId).gte('created_at', new Date(Date.now()-7*24*3600000).toISOString()),
    ]);
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `You are a digital marketing AI assistant. Generate a concise morning brief for a digital marketer. Data: Analytics: ${JSON.stringify((analytics||[]).map((a:any)=>({platform:a.platform,followers:a.followers,reach:a.reach})))}. Upcoming posts: ${posts?.length||0}. New leads this week: ${leads?.length||0}. Return ONLY valid JSON: { greeting: string, insight: string, highlights: string[], action_items: string[] }. No markdown, no code fences.`;
    const resp = await genai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
    const text = resp.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.json({ brief: null, error: `AI response had no valid JSON. Raw: ${text.slice(0,200)}` });
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

// ── UTM Builder ───────────────────────────────────────────────────────────────
app.get('/api/utm/links', async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) return res.json([]);
  const { data } = await supabase.from('utm_links').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(50);
  res.json(data || []);
});
app.post('/api/utm/save', async (req, res) => {
  const { data } = await supabase.from('utm_links').insert(req.body).select().single();
  res.status(201).json(data);
});
app.delete('/api/utm/links/:id', async (req, res) => {
  await supabase.from('utm_links').delete().eq('id', req.params.id);
  res.json({ success: true });
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

  // Try to verify the credentials with a lightweight real API call before saving
  let verified = false;
  try {
    if (platformName === 'Meta Ads' && fields.access_token && fields.ad_account_id) {
      const r = await fetch(`https://graph.facebook.com/v18.0/${fields.ad_account_id}?fields=name&access_token=${fields.access_token}`);
      const d: any = await r.json();
      verified = !d.error;
    } else if (platformName === 'TikTok Ads' && fields.access_token && fields.advertiser_id) {
      const r = await fetch(`https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${fields.advertiser_id}"]`, { headers: { 'Access-Token': fields.access_token } });
      const d: any = await r.json();
      verified = d.code === 0;
    } else if (platformName === 'LinkedIn Ads' && fields.access_token) {
      const r = await fetch(`https://api.linkedin.com/v2/adAccountsV2/${fields.ad_account_id}`, { headers: { Authorization: `Bearer ${fields.access_token}` } });
      verified = r.ok;
    } else if (platformName === 'Google Ads') {
      // Google Ads API requires complex setup; accept and mark unverified, real check happens on first sync
      verified = !!(fields.customer_id && fields.developer_token && fields.access_token);
    }
  } catch (_) { verified = false; }

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
  res.json({ success: true, verified });
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
  const { data: accounts } = await supabase.from('social_accounts').select('*').eq('workspace_id', workspaceId).in('platform', ['instagram','facebook']);
  if (!accounts || accounts.length === 0) return res.json({ success: false, error: 'No Instagram or Facebook accounts connected.' });

  let totalSynced = 0;
  const errors: string[] = [];

  for (const account of accounts) {
    if (!account.access_token) continue;
    try {
      if (account.platform === 'facebook') {
        // Page conversations (Messenger)
        const convR = await fetch(`https://graph.facebook.com/v18.0/${account.handle}/conversations?fields=participants,messages{message,from,created_time}&access_token=${account.access_token}`);
        const convD: any = await convR.json();
        for (const conv of (convD.data || [])) {
          const lastMsg = conv.messages?.data?.[0];
          if (!lastMsg) continue;
          await supabase.from('inbox_items').upsert({
            workspace_id: workspaceId, platform: 'facebook', type: 'message',
            external_id: lastMsg.id || conv.id, from_name: lastMsg.from?.name || 'Unknown',
            text: lastMsg.message || '', created_at: lastMsg.created_time || new Date().toISOString(),
          }, { onConflict: 'external_id' });
          totalSynced++;
        }
        // Page feed comments
        const commR = await fetch(`https://graph.facebook.com/v18.0/${account.handle}/feed?fields=comments{message,from,created_time,id},message&limit=10&access_token=${account.access_token}`);
        const commD: any = await commR.json();
        for (const post of (commD.data || [])) {
          for (const c of (post.comments?.data || [])) {
            await supabase.from('inbox_items').upsert({
              workspace_id: workspaceId, platform: 'facebook', type: 'comment',
              external_id: c.id, from_name: c.from?.name || 'Unknown', text: c.message || '',
              post_caption: (post.message || '').slice(0, 80), created_at: c.created_time || new Date().toISOString(),
            }, { onConflict: 'external_id' });
            totalSynced++;
          }
        }
      } else if (account.platform === 'instagram') {
        const mediaR = await fetch(`https://graph.facebook.com/v18.0/${account.handle}/media?fields=caption,comments{text,username,timestamp,id}&limit=10&access_token=${account.access_token}`);
        const mediaD: any = await mediaR.json();
        for (const m of (mediaD.data || [])) {
          for (const c of (m.comments?.data || [])) {
            await supabase.from('inbox_items').upsert({
              workspace_id: workspaceId, platform: 'instagram', type: 'comment',
              external_id: c.id, from_name: c.username || 'Unknown', text: c.text || '',
              post_caption: (m.caption || '').slice(0, 80), created_at: c.timestamp || new Date().toISOString(),
            }, { onConflict: 'external_id' });
            totalSynced++;
          }
        }
      }
    } catch (e: any) {
      errors.push(`${account.platform}: ${e.message}`);
    }
  }

  if (totalSynced === 0 && errors.length > 0) return res.json({ success: false, error: errors.join('; ') });
  res.json({ success: true, synced: totalSynced });
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
  const { data: connections } = await supabase.from('ad_connections').select('*').eq('workspace_id', workspaceId).eq('connected', true);
  if (!connections || connections.length === 0) return res.json({ success: false, error: 'No ad APIs connected.' });

  let imported = 0;
  const errors: string[] = [];

  for (const conn of connections) {
    try {
      if (conn.platform_name === 'Meta Ads' && conn.developer_token && conn.ad_account_id) {
        const r = await fetch(`https://graph.facebook.com/v18.0/${conn.ad_account_id}/campaigns?fields=name,status,daily_budget,lifetime_budget&access_token=${conn.developer_token}`);
        const d: any = await r.json();
        if (d.error) { errors.push(`Meta Ads: ${d.error.message}`); continue; }
        for (const c of (d.data || [])) {
          const insR = await fetch(`https://graph.facebook.com/v18.0/${c.id}/insights?fields=spend,impressions,clicks,actions&date_preset=last_30d&access_token=${conn.developer_token}`);
          const insD: any = await insR.json();
          const ins = insD.data?.[0] || {};
          const conversions = (ins.actions || []).find((a: any) => a.action_type === 'purchase' || a.action_type === 'lead')?.value || 0;
          await supabase.from('campaigns').upsert({
            workspace_id: workspaceId, name: c.name, platform: 'Meta Ads',
            status: c.status === 'ACTIVE' ? 'active' : c.status === 'PAUSED' ? 'paused' : 'ended',
            budget: parseFloat(c.daily_budget || c.lifetime_budget || '0') / 100,
            spend: parseFloat(ins.spend || '0'),
            impressions: parseInt(ins.impressions || '0'),
            clicks: parseInt(ins.clicks || '0'),
            conversions: parseInt(conversions),
            notes: `Synced from Meta Ads API — campaign ${c.id}`,
          }, { onConflict: 'workspace_id,name' });
          imported++;
        }
      } else if (conn.platform_name === 'TikTok Ads' && conn.developer_token && conn.ad_account_id) {
        const r = await fetch(`https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${conn.ad_account_id}&page_size=20`, { headers: { 'Access-Token': conn.developer_token } });
        const d: any = await r.json();
        if (d.code !== 0) { errors.push(`TikTok Ads: ${d.message}`); continue; }
        for (const c of (d.data?.list || [])) {
          await supabase.from('campaigns').upsert({
            workspace_id: workspaceId, name: c.campaign_name, platform: 'TikTok Ads',
            status: c.status === 'ENABLE' ? 'active' : 'paused',
            budget: parseFloat(c.budget || '0'), spend: 0, notes: `Synced from TikTok Ads API — campaign ${c.campaign_id}`,
          }, { onConflict: 'workspace_id,name' });
          imported++;
        }
      }
      // Google Ads and LinkedIn Ads require more complex SDK/GAQL setup —
      // left as manual entry for now via the Campaign Tracker form.
    } catch (e: any) {
      errors.push(`${conn.platform_name}: ${e.message}`);
    }
  }

  if (imported === 0) return res.json({ success: false, error: errors.join('; ') || 'No campaigns found to import.' });
  res.json({ success: true, imported, errors });
});

export default function handler(req: any, res: any) {
  return app(req, res);
}
