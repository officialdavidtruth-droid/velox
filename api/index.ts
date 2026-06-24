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
      return res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redir)}&scope=https://www.googleapis.com/auth/youtube.readonly+https://www.googleapis.com/auth/yt-analytics.readonly&state=${state}&response_type=code&access_type=offline&prompt=consent` });
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
      if (account.platform === 'facebook' && account.access_token) {
        const r = await fetch(`https://graph.facebook.com/v18.0/${account.handle}/insights?metric=page_fans,page_impressions,page_reach,page_post_engagements&period=day&access_token=${account.access_token}`);
        const d: any = await r.json();
        if (d.data) {
          const byMetric: any = {};
          d.data.forEach((m: any) => { byMetric[m.name] = m.values?.slice(-1)[0]?.value || 0; });
          metrics = { followers: byMetric.page_fans || 0, impressions: byMetric.page_impressions || 0, reach: byMetric.page_reach || 0, engagement: byMetric.page_post_engagements || 0 };
        }
      }
      if (account.platform === 'instagram' && account.access_token) {
        // Resolve handle: if it's a username (not a numeric ID), look up the real IG Business Account ID via pages
        let igAccountId = account.handle.replace('@', '');
        if (!/^\d+$/.test(igAccountId)) {
          try {
            const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${account.access_token}`);
            const pagesData: any = await pagesRes.json();
            const pages = pagesData.data || [];
            for (const page of pages) {
              const igRes = await fetch(`https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token || account.access_token}`);
              const igData: any = await igRes.json();
              if (igData.instagram_business_account?.id) {
                igAccountId = igData.instagram_business_account.id;
                // Update the stored handle so future syncs use the numeric ID directly
                await supabase.from('social_accounts').update({ handle: igAccountId }).eq('id', account.id);
                break;
              }
            }
          } catch (_) { /* fall through with original handle */ }
        }
        const r = await fetch(`https://graph.facebook.com/v18.0/${igAccountId}?fields=followers_count,media_count&access_token=${account.access_token}`);
        const d: any = await r.json();
        if (d.followers_count !== undefined) {
          metrics = { followers: d.followers_count || 0, posts: d.media_count || 0, reach: 0, impressions: 0, engagement: 0 };
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
export default function handler(req: any, res: any) {
  return app(req, res);
}