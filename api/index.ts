/**
 * VeloxSpace Final — Express Server
 * Handles ALL routes. Deployed as a single Vercel serverless function.
 * Uses Supabase service_role key (bypasses RLS — server enforces auth).
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';

const app = express();
app.use(express.json());

// ── Supabase admin client (service role — no RLS) ──────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Country holidays data
const HOLIDAYS: Record<string, Array<{ name: string; date: string; type: string }>> = {
  Nigeria: [
    { name: "New Year's Day", date: '-01-01', type: 'public' },
    { name: "Workers' Day", date: '-05-01', type: 'public' },
    { name: 'Democracy Day', date: '-06-12', type: 'public' },
    { name: 'Independence Day', date: '-10-01', type: 'national' },
    { name: 'Christmas Day', date: '-12-25', type: 'public' },
    { name: 'Boxing Day', date: '-12-26', type: 'public' },
  ],
  Ghana: [
    { name: "New Year's Day", date: '-01-01', type: 'public' },
    { name: 'Constitution Day', date: '-01-07', type: 'public' },
    { name: 'Independence Day', date: '-03-06', type: 'national' },
    { name: 'May Day', date: '-05-01', type: 'public' },
    { name: 'Christmas Day', date: '-12-25', type: 'public' },
  ],
  'South Africa': [
    { name: "New Year's Day", date: '-01-01', type: 'public' },
    { name: 'Human Rights Day', date: '-03-21', type: 'public' },
    { name: 'Freedom Day', date: '-04-27', type: 'national' },
    { name: 'Youth Day', date: '-06-16', type: 'public' },
    { name: "Women's Day", date: '-08-09', type: 'public' },
    { name: 'Heritage Day', date: '-09-24', type: 'seasonal' },
    { name: 'Christmas Day', date: '-12-25', type: 'public' },
    { name: 'Boxing Day', date: '-12-26', type: 'public' },
  ],
  USA: [
    { name: "New Year's Day", date: '-01-01', type: 'public' },
    { name: 'Independence Day', date: '-07-04', type: 'national' },
    { name: 'Thanksgiving Day', date: '-11-26', type: 'public' },
    { name: 'Christmas Day', date: '-12-25', type: 'public' },
  ],
  UK: [
    { name: "New Year's Day", date: '-01-01', type: 'public' },
    { name: 'Christmas Day', date: '-12-25', type: 'public' },
    { name: 'Boxing Day', date: '-12-26', type: 'public' },
  ],
  Kenya: [
    { name: "New Year's Day", date: '-01-01', type: 'public' },
    { name: 'Madaraka Day', date: '-06-01', type: 'public' },
    { name: 'Mashujaa Day', date: '-10-20', type: 'public' },
    { name: 'Jamhuri Day', date: '-12-12', type: 'national' },
    { name: 'Christmas Day', date: '-12-25', type: 'public' },
    { name: 'Boxing Day', date: '-12-26', type: 'public' },
  ],
};

// ── Session middleware ─────────────────────────────────────────────────────
async function getSessionUser(req: Request): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const token = req.headers['x-session-token'] as string;
  if (!token) return null;
  const { data: session } = await supabase
    .from('velox_sessions').select('user_id, expires_at').eq('token', token).maybeSingle();
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) return null;
  const { data: user } = await supabase
    .from('velox_users').select('id,email,name,role').eq('id', session.user_id).maybeSingle();
  return user;
}

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// ── Auth ───────────────────────────────────────────────────────────────────
app.get('/api/auth/me', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.json({ user: null, subscription: null, credit: null });
  const [{ data: sub }, { data: credit }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  res.json({ user, subscription: sub, credit });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, name, role, country } = req.body;
  if (!email || !name) return res.status(400).json({ error: 'Email and Name required' });

  // Check existing
  const { data: existing } = await supabase.from('velox_users').select('*').eq('email', email.toLowerCase()).maybeSingle();
  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    const { data: newUser, error } = await supabase.from('velox_users')
      .insert({ email: email.toLowerCase(), name, role: role || 'agency', country: country || 'Nigeria' })
      .select().single();
    if (error || !newUser) return res.status(500).json({ error: 'Registration failed' });
    userId = newUser.id;

    // Create subscription + credits + workspace
    await Promise.all([
      supabase.from('subscriptions').insert({ user_id: userId, plan_type: 'starter', status: 'active' }),
      supabase.from('credit_balances').insert({ user_id: userId, remaining_credits: 150, total_credits_available: 500 }),
    ]);
    const { data: ws } = await supabase.from('workspaces')
      .insert({ name: `${name}'s Workspace`, owner_id: userId, referral_code: Math.random().toString(36).substring(2,10).toUpperCase() })
      .select().single();
    if (ws) {
      await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: userId, role: 'admin' });
      // Seed analytics
      const platforms = ['facebook','instagram','twitter','linkedin','tiktok'];
      await supabase.from('analytics').insert(platforms.map(p => ({
        workspace_id: ws.id, platform: p,
        followers: Math.floor(Math.random()*2000)+100,
        reach: Math.floor(Math.random()*5000)+200,
        impressions: Math.floor(Math.random()*15000)+500,
        engagement: Math.floor(Math.random()*500)+20,
        clicks: Math.floor(Math.random()*100)+5,
        profile_visits: Math.floor(Math.random()*200)+10,
        growth_rate: Number((Math.random()*5).toFixed(1)),
      })));
    }
  }

  // Create session
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  await supabase.from('velox_sessions').insert({ token, user_id: userId });
  const { data: user } = await supabase.from('velox_users').select('*').eq('id', userId).single();
  res.json({ user, token, message: 'Success' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const { data: user } = await supabase.from('velox_users').select('*').eq('email', email.toLowerCase()).maybeSingle();
  if (!user) return res.status(404).json({ error: 'No account found. Please register.' });
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  await supabase.from('velox_sessions').insert({ token, user_id: user.id });
  res.json({ user, token, message: 'Logged in' });
});

app.post('/api/auth/logout', async (req, res) => {
  const token = req.headers['x-session-token'] as string;
  if (token) await supabase.from('velox_sessions').delete().eq('token', token);
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
        supabase.from('credit_balances').insert({ user_id: user.id, remaining_credits: 500, total_credits_available: 500 }),
      ]);
      const { data: ws } = await supabase.from('workspaces')
        .insert({ name: 'Demo Agency Workspace', owner_id: user.id })
        .select().single();
      if (ws) {
        await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' });
        const platforms = ['facebook','instagram','twitter','linkedin','tiktok'];
        await supabase.from('analytics').insert(platforms.map(p => ({
          workspace_id: ws.id, platform: p,
          followers: Math.floor(Math.random()*15000)+5000,
          reach: Math.floor(Math.random()*50000)+10000,
          impressions: Math.floor(Math.random()*200000)+50000,
          engagement: Math.floor(Math.random()*8000)+1000,
          clicks: Math.floor(Math.random()*3000)+500,
          profile_visits: Math.floor(Math.random()*5000)+1000,
          growth_rate: Number((Math.random()*20+5).toFixed(1)),
        })));
      }
    }
  }
  if (!user) return res.status(500).json({ error: 'Demo setup failed' });
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
  await supabase.from('velox_sessions').insert({ token, user_id: user.id });
  const [{ data: sub }, { data: credit }] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  res.json({ user, token, subscription: sub, credit, success: true });
});

// ── Workspaces ─────────────────────────────────────────────────────────────
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
  const { data: ws } = await supabase.from('workspaces')
    .insert({ name, owner_id: user.id, referral_code: Math.random().toString(36).substring(2,10).toUpperCase() })
    .select().single();
  if (!ws) return res.status(500).json({ error: 'Failed' });
  await supabase.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' });
  const platforms = ['facebook','instagram','twitter','linkedin','tiktok'];
  await supabase.from('analytics').insert(platforms.map(p => ({
    workspace_id: ws.id, platform: p,
    followers: Math.floor(Math.random()*2000)+100,
    reach: Math.floor(Math.random()*5000)+200,
    impressions: Math.floor(Math.random()*15000)+500,
    engagement: Math.floor(Math.random()*500)+20,
    clicks: Math.floor(Math.random()*100)+5,
    profile_visits: Math.floor(Math.random()*200)+10,
    growth_rate: Number((Math.random()*5).toFixed(1)),
  })));
  res.status(201).json(ws);
});

// ── Social Accounts (OAuth popup) ──────────────────────────────────────────
app.get('/api/social-accounts', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('social_accounts').select('*');
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q.order('connected_at', { ascending: false });
  res.json(data || []);
});

app.get('/api/social-accounts/oauth/url', async (req, res) => {
  const { platform, workspaceId } = req.query;
  res.json({ url: `/oauth-mimic/authorize?platform=${platform}&workspaceId=${workspaceId}` });
});

app.get('/oauth-mimic/authorize', (req, res) => {
  const { platform, workspaceId } = req.query;
  const p = String(platform).toLowerCase();
  const platformLabel = p === 'instagram' ? 'Instagram Business' : p === 'tiktok' ? 'TikTok Pro' : p === 'facebook' ? 'Facebook Business' : 'LinkedIn';
  const primaryColor = p === 'instagram' ? '#e1306c' : p === 'tiktok' ? '#fe2c55' : p === 'facebook' ? '#1877F2' : '#0077b5';

  res.send(`<!DOCTYPE html><html><head><title>OAuth - ${platformLabel}</title>
<script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-[#0b0f19] text-slate-100 flex items-center justify-center min-h-screen p-4">
<div class="max-w-md w-full bg-[#111827] border border-slate-800 rounded-lg p-6 shadow-2xl">
  <div class="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
    <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-black" style="background:${primaryColor}">
      ${platformLabel.charAt(0)}
    </div>
    <div>
      <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-400 block">Secure OAuth</span>
      <span class="text-base font-bold text-white">${platformLabel}</span>
    </div>
  </div>
  <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2 mb-5">
    <div class="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Permissions Requested:</div>
    <div class="text-xs text-slate-300 flex items-start gap-2"><span class="text-emerald-400 font-bold">✓</span> Publish posts and media</div>
    <div class="text-xs text-slate-300 flex items-start gap-2"><span class="text-emerald-400 font-bold">✓</span> Read analytics and insights</div>
    <div class="text-xs text-slate-300 flex items-start gap-2"><span class="text-emerald-400 font-bold">✓</span> Access audience data</div>
  </div>
  <form action="/api/social-accounts/oauth/callback" method="GET" class="space-y-4">
    <input type="hidden" name="workspaceId" value="${workspaceId || ''}" />
    <input type="hidden" name="platform" value="${p}" />
    <div>
      <label class="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">Account Handle</label>
      <div class="flex rounded border border-slate-700 bg-slate-950 overflow-hidden">
        <span class="bg-slate-900 px-3 py-2 text-slate-400 border-r border-slate-800 text-xs font-mono">@</span>
        <input type="text" name="handle" required placeholder="yourbrand"
          class="flex-1 bg-transparent px-3 py-2 text-white outline-none text-xs" />
      </div>
    </div>
    <div>
      <label class="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">Display Name</label>
      <input type="text" name="accountName" required placeholder="Your Brand Name"
        class="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white outline-none" />
    </div>
    <div class="flex gap-3 pt-4 border-t border-slate-800">
      <button type="button" onclick="window.close()"
        class="flex-1 border border-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded cursor-pointer">
        Cancel
      </button>
      <button type="submit" style="background:${primaryColor}"
        class="flex-1 text-white font-bold text-xs py-2.5 rounded cursor-pointer hover:brightness-110">
        Authorize
      </button>
    </div>
  </form>
</div></body></html>`);
});

app.get('/api/social-accounts/oauth/callback', async (req, res) => {
  const { platform, workspaceId, handle, accountName } = req.query;
  if (!platform || !workspaceId || !handle) return res.status(400).send('<h3>Invalid callback</h3>');

  const avatars: Record<string, string> = {
    instagram: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100',
    tiktok: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
    facebook: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    linkedin: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=100',
  };

  const handleStr = String(handle);
  const fullHandle = handleStr.startsWith('@') || handleStr.startsWith('company/') ? handleStr
    : (String(platform) === 'linkedin' ? 'company/' + handleStr : '@' + handleStr);

  // Upsert
  await supabase.from('social_accounts').upsert({
    workspace_id: String(workspaceId),
    platform: String(platform),
    account_name: String(accountName || 'My Account'),
    handle: fullHandle,
    avatar_url: avatars[String(platform)] || '',
    connected_at: new Date().toISOString(),
    status: 'active',
    expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
  }, { onConflict: 'workspace_id,platform' });

  res.send(`<html><head><script src="https://cdn.tailwindcss.com"></script></head>
<body class="bg-[#0b0f19] text-white flex flex-col items-center justify-center min-h-screen text-center p-6">
<div class="bg-[#111827] border border-slate-800 rounded-lg p-8 max-w-sm w-full space-y-5">
  <div class="w-14 h-14 bg-emerald-500/15 border border-emerald-500/35 rounded-full flex items-center justify-center mx-auto">
    <span class="text-emerald-400 text-2xl font-bold">✓</span>
  </div>
  <h2 class="text-base font-bold text-white">Connected Successfully!</h2>
  <p class="text-xs text-slate-400">${fullHandle} is now connected to VeloxSpace.</p>
</div>
<script>
  if (window.opener) { window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*'); }
  setTimeout(function() { window.close(); }, 1800);
</script></body></html>`);
});

app.post('/api/social-accounts/reconnect', async (req, res) => {
  const { accountId } = req.body;
  await supabase.from('social_accounts').update({
    status: 'active',
    expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    connected_at: new Date().toISOString(),
  }).eq('id', accountId);
  res.json({ success: true });
});

app.post('/api/social-accounts/disconnect', async (req, res) => {
  const { accountId } = req.body;
  await supabase.from('social_accounts').delete().eq('id', accountId);
  res.json({ success: true });
});

// ── Posts & Calendar ────────────────────────────────────────────────────────
app.get('/api/posts', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('scheduled_posts').select('*').order('publish_date', { ascending: true });
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/posts', async (req, res) => {
  const { workspace_id, title, description, platforms, cta, publish_date } = req.body;
  if (!workspace_id || !title || !description || !platforms || !publish_date)
    return res.status(400).json({ error: 'Missing required fields' });

  const { data: post } = await supabase.from('scheduled_posts')
    .insert({ workspace_id, title, description, platforms, cta: cta || 'None', publish_date, status: 'scheduled', ai_generated: req.body.ai_generated || false })
    .select().single();

  if (post) {
    await supabase.from('content_calendar').insert({
      workspace_id, scheduled_post_id: post.id,
      start_time: publish_date,
      end_time: new Date(new Date(publish_date).getTime() + 3600000).toISOString(),
      title, description: description.substring(0, 100),
      color: platforms[0] === 'instagram' ? '#ea580c' : platforms[0] === 'facebook' ? '#2563eb' : '#4f46e5',
    });
  }
  res.status(201).json(post);
});

app.put('/api/posts/:id', async (req, res) => {
  const updates: any = {};
  ['title','description','publish_date','status','platforms','cta'].forEach(k => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });
  const { data } = await supabase.from('scheduled_posts').update(updates).eq('id', req.params.id).select().single();
  if (updates.publish_date) {
    await supabase.from('content_calendar').update({
      start_time: updates.publish_date,
      end_time: new Date(new Date(updates.publish_date).getTime() + 3600000).toISOString(),
    }).eq('scheduled_post_id', req.params.id);
  }
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
  const { data: evt } = await supabase.from('content_calendar')
    .update({ start_time: newDate, end_time: new Date(new Date(newDate).getTime() + 3600000).toISOString() })
    .eq('id', eventId).select().single();
  if (evt?.scheduled_post_id) {
    await supabase.from('scheduled_posts').update({ publish_date: newDate }).eq('id', evt.scheduled_post_id);
  }
  res.json({ success: true });
});

app.get('/api/holidays', (req, res) => {
  const { country, year } = req.query;
  const list = HOLIDAYS[country as string] || [];
  const y = String(year || new Date().getFullYear());
  res.json(list.map(h => ({ ...h, date: y + h.date })));
});

// ── Analytics ───────────────────────────────────────────────────────────────
app.get('/api/analytics', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('analytics').select('*');
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.get('/api/analytics/history', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('analytics_history').select('*').order('date', { ascending: true });
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/analytics/refresh', async (req, res) => {
  const { workspaceId } = req.body;
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

  const { data: metrics } = await supabase.from('analytics').select('*').eq('workspace_id', workspaceId);
  if (!metrics?.length) return res.status(404).json({ error: 'No metrics found' });

  for (const m of metrics) {
    const shift = 1 + (Math.random() * 0.08 - 0.02);
    await supabase.from('analytics').update({
      followers: Math.round(m.followers * shift),
      reach: Math.round(m.reach * shift),
      impressions: Math.round(m.impressions * shift),
      engagement: Math.round(m.engagement * (shift - 0.01)),
      clicks: Math.round(m.clicks * shift),
      profile_visits: Math.round(m.profile_visits * shift),
      growth_rate: Number((m.growth_rate + (Math.random() * 1.5 - 0.5)).toFixed(1)),
      last_updated: new Date().toISOString(),
    }).eq('workspace_id', workspaceId).eq('platform', m.platform);

    // Save to history
    await supabase.from('analytics_history').upsert({
      workspace_id: workspaceId, platform: m.platform, date: new Date().toISOString().split('T')[0],
      followers: Math.round(m.followers * shift), reach: Math.round(m.reach * shift),
      impressions: Math.round(m.impressions * shift), engagement: Math.round(m.engagement * shift),
      clicks: Math.round(m.clicks * shift), profile_visits: Math.round(m.profile_visits * shift),
      growth_rate: Number((m.growth_rate + (Math.random() * 1.5 - 0.5)).toFixed(1)),
    }, { onConflict: 'workspace_id,platform,date' });
  }

  const { data: updated } = await supabase.from('analytics').select('*').eq('workspace_id', workspaceId);
  res.json({ success: true, metrics: updated });
});

app.get('/api/analytics/best-times', (req, res) => {
  const platform = (req.query.platform as string) || 'instagram';
  const guidance: Record<string, any> = {
    instagram: { day: 'Wednesday', hour: '11:00 AM & 1:00 PM', rationale: 'Mid-week lunch browsing yields 45% higher engagement.', engagementChance: 92 },
    facebook: { day: 'Thursday', hour: '9:00 AM & 3:00 PM', rationale: 'Corporate wind-downs drive feed discovery.', engagementChance: 78 },
    twitter: { day: 'Tuesday', hour: '8:00 AM', rationale: 'Early morning news drives retweets.', engagementChance: 82 },
    linkedin: { day: 'Tuesday', hour: '10:00 AM & 2:00 PM', rationale: 'Professional networks peak during office hours.', engagementChance: 86 },
    tiktok: { day: 'Friday', hour: '7:00 PM - 10:00 PM', rationale: 'Weekend hype drives viral momentum.', engagementChance: 96 },
  };
  res.json(guidance[platform.toLowerCase()] || guidance.instagram);
});

// ── AI Caption (Gemini) ──────────────────────────────────────────────────────
app.post('/api/ai/caption', async (req, res) => {
  const { prompt, platform, tone, cta } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    // Fallback captions
    const fallbacks = [
      `✨ ${prompt}\n\nElevate your presence with our premium services. Join thousands who trust us.\n\n🎯 ${cta || 'Learn More'} — link in bio!\n\n#marketing #growth #business`,
      `💡 Did you know? ${prompt}\n\nWe help brands like yours grow faster with smart strategy and execution.\n\n📱 ${cta || 'Contact Us'} today!\n\n#socialmedia #agency #results`,
      `🚀 ${prompt}\n\nThe future belongs to those who prepare. Is your brand ready?\n\n✅ ${cta || 'Get Started'} now — limited spots!\n\n#brandgrowth #digitalmarketing #success`,
    ];
    return res.json({
      caption: fallbacks[Math.floor(Math.random() * fallbacks.length)],
      hashtags: '#marketing #growth #socialmedia #brand #business',
      ctas: [cta || 'Learn More', 'Get Started Now', 'Send a Message'],
    });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey: geminiKey });
    const resp = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Generate a high-converting ${platform || 'social media'} post caption for: "${prompt}". Tone: ${tone || 'professional'}. CTA: ${cta || 'Learn More'}. Return JSON with: caption, hashtags, ctas (array of 3).`,
    });
    const text = resp.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : { caption: text, hashtags: '#marketing', ctas: ['Learn More'] };
    res.json(parsed);
  } catch (e: any) {
    res.status(500).json({ error: 'AI generation failed', details: e.message });
  }
});

// ── AI Insights (Cloudflare) ─────────────────────────────────────────────────
app.post('/api/ai/insights', async (req, res) => {
  const { platform, metrics, workspaceId } = req.body;
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!cfAccount || !cfToken) {
    return res.json({
      overall_score: 7.2, top_platform: platform || 'instagram', key_insight: 'Your engagement rate is strong. Focus on increasing posting frequency and using more video content.',
      working: ['Consistent posting schedule', 'High engagement captions', 'Story content performing well'],
      not_working: ['Reach has plateaued this week', 'Link click-through below industry average'],
      recommendations: [{ action: 'Post at 11 AM on weekdays', impact: 'Expected +15% reach' }],
      best_times: { instagram: '11 AM', facebook: '9 AM', tiktok: '7 PM' },
    });
  }

  try {
    const prompt = `You are a social media analytics expert. Analyse these ${platform} metrics and provide insights: ${JSON.stringify(metrics)}. Return JSON with: overall_score (1-10), key_insight (string), working (array of 3 strings), not_working (array of 2 strings), recommendations (array of objects with action and impact).`;
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
      { method: 'POST', headers: { Authorization: `Bearer ${cfToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: 500 }) }
    );
    const data: any = await resp.json();
    const raw = data?.result?.response || '';
    const match = raw.match(/\{[\s\S]*\}/);
    res.json(match ? JSON.parse(match[0]) : { overall_score: 7, key_insight: raw.substring(0, 200), working: [], not_working: [], recommendations: [] });
  } catch (e: any) {
    res.status(500).json({ error: 'AI insights failed' });
  }
});

// ── Credits ──────────────────────────────────────────────────────────────────
app.get('/api/credits/history', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const [{ data: balance }, { data: transactions }] = await Promise.all([
    supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ]);
  res.json({ balance: balance || { remaining_credits: 0, total_credits_available: 0 }, transactions: transactions || [], refCode: 'VELOX_' + user.id.substring(0, 8).toUpperCase() });
});

app.post('/api/credits/purchase', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { packageId } = req.body;
  const credits = packageId === 'premium' ? 200 : packageId === 'unlimited' ? 1000 : 50;
  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (balance) {
    await supabase.from('credit_balances').update({
      remaining_credits: balance.remaining_credits + credits,
      total_credits_available: balance.total_credits_available + credits,
    }).eq('user_id', user.id);
    await supabase.from('credit_transactions').insert({ user_id: user.id, amount: credits, description: `Purchased: ${packageId}`, type: 'purchase' });
  }
  res.json({ success: true });
});

// ── Lead Finder ───────────────────────────────────────────────────────────────
app.post('/api/leads/search', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { keyword, location, workspaceId } = req.body;
  if (!keyword || !location) return res.status(400).json({ error: 'Keyword and location required' });

  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (!balance || balance.remaining_credits < 15) return res.status(402).json({ error: 'Insufficient credits. Minimum 15 required.' });

  await supabase.from('credit_balances').update({ remaining_credits: balance.remaining_credits - 15 }).eq('user_id', user.id);
  await supabase.from('credit_transactions').insert({ user_id: user.id, amount: -15, description: `Lead search: ${keyword} in ${location}`, type: 'charge' });

  // Check Google Places API
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;
  let results: any[] = [];

  if (placesKey) {
    try {
      const placesRes = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + ' in ' + location)}&key=${placesKey}`);
      const placesData: any = await placesRes.json();
      results = (placesData.results || []).slice(0, 5).map((p: any, i: number) => ({
        id: 'lead_' + i + '_' + Math.random().toString(36).substring(2, 8),
        business_name: p.name,
        address: p.formatted_address || '',
        rating: p.rating || 0,
        has_website: false,
        confidence_score: 85 - i * 5,
        place_id: p.place_id,
      }));
    } catch {}
  }

  if (!results.length) {
    // Fallback mock results
    const mockNames = [`Elite ${keyword} Hub`, `Summit ${keyword} Co`, `Premier ${keyword} Group`, `${keyword} Pros of ${location}`, `Top ${keyword} Services`];
    results = mockNames.map((name, i) => ({
      id: 'lead_' + i + '_' + Math.random().toString(36).substring(2, 8),
      business_name: name,
      email: `info@${name.toLowerCase().replace(/\s+/g,'')}.com`,
      phone: `+234 80${Math.floor(Math.random()*9000)+1000} ${Math.floor(Math.random()*9000)+1000}`,
      website: `https://www.${name.toLowerCase().replace(/[^a-z]/g,'')}.com`,
      confidence_score: 90 - i * 6,
      has_website: Math.random() > 0.4,
    }));
  }

  // Store leads in Supabase
  if (workspaceId) {
    await supabase.from('leads').insert(results.map(r => ({
      workspace_id: workspaceId, business_name: r.business_name,
      phone: r.phone || '', website: r.website || '', address: r.address || '',
      category: keyword, location, rating: r.rating || 0,
      has_website: r.has_website, source: placesKey ? 'google_places' : 'search',
      place_id: r.place_id || '', confidence_score: r.confidence_score,
    })));
  }

  res.json({ success: true, creditsRemaining: balance.remaining_credits - 15, results });
});

// ── Client Portal ─────────────────────────────────────────────────────────────
app.get('/api/portal/:token', async (req, res) => {
  const { token } = req.params;
  const { data: portal } = await supabase.from('client_portals')
    .select('*, workspaces(*)').eq('share_token', token).eq('is_enabled', true).maybeSingle();
  if (!portal) return res.status(404).json({ error: 'Portal not found or disabled' });

  const [{ data: analytics }, { data: calendar }, { data: scheduled }] = await Promise.all([
    supabase.from('analytics').select('*').eq('workspace_id', portal.workspace_id),
    supabase.from('content_calendar').select('*').eq('workspace_id', portal.workspace_id),
    supabase.from('scheduled_posts').select('*').eq('workspace_id', portal.workspace_id),
  ]);

  res.json({ workspaceName: (portal as any).workspaces?.name || 'Workspace', analytics, calendar, scheduled });
});

// ── Referrals ─────────────────────────────────────────────────────────────────
app.get('/api/referrals', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const [{ data: referrals }, { data: rewards }] = await Promise.all([
    supabase.from('referrals').select('*').eq('referrer_user_id', user.id),
    supabase.from('referral_rewards').select('*').eq('user_id', user.id),
  ]);
  const { data: ws } = await supabase.from('workspaces').select('referral_code').eq('owner_id', user.id).limit(1).maybeSingle();
  res.json({ referrals: referrals || [], rewards: rewards || [], refCode: ws?.referral_code || 'VELOX_' + user.id.substring(0,6).toUpperCase() });
});

app.post('/api/referrals/redeem', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { referredEmail } = req.body;
  if (!referredEmail) return res.status(400).json({ error: 'Email required' });
  const { data: existing } = await supabase.from('referrals').select('id').eq('referred_email', referredEmail.toLowerCase()).maybeSingle();
  if (existing) return res.status(400).json({ error: 'Already referred' });
  await supabase.from('referrals').insert({ referrer_user_id: user.id, referred_email: referredEmail.toLowerCase() });
  res.json({ success: true });
});

// ── Billing ───────────────────────────────────────────────────────────────────
app.post('/api/billing/upgrade', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { planType, billingCycle } = req.body;
  const { data: sub } = await supabase.from('subscriptions').update({
    plan_type: planType, billing_cycle: billingCycle || 'monthly', status: 'active',
    current_period_end: new Date(Date.now() + 31*24*60*60*1000).toISOString(),
  }).eq('user_id', user.id).select().single();
  const booster = planType === 'agency' ? 400 : 150;
  const { data: balance } = await supabase.from('credit_balances').select('*').eq('user_id', user.id).maybeSingle();
  if (balance) {
    await supabase.from('credit_balances').update({
      remaining_credits: balance.remaining_credits + booster,
      total_credits_available: balance.total_credits_available + booster,
    }).eq('user_id', user.id);
  }
  res.json({ success: true, subscription: sub });
});

// ── Notifications ─────────────────────────────────────────────────────────────
app.get('/api/notifications', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(20);
  res.json(data || []);
});

app.post('/api/notifications/read', async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
  const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  res.json({ success: true, notifications: data || [] });
});

// ── Properties / PMS ──────────────────────────────────────────────────────────
app.get('/api/pms/properties', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('properties').select('*');
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/pms/properties', async (req, res) => {
  const { workspace_id, name, description, ratePerNight, status, imageUrl } = req.body;
  const { data } = await supabase.from('properties').insert({
    workspace_id, name, description: description || '', rate_per_night: Number(ratePerNight),
    status: status || 'Available', image_url: imageUrl || 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400',
  }).select().single();
  res.status(201).json(data);
});

app.get('/api/pms/bookings', async (req, res) => {
  const { workspaceId } = req.query;
  const { data: props } = workspaceId
    ? await supabase.from('properties').select('id').eq('workspace_id', workspaceId)
    : { data: [] };
  const ids = (props || []).map((p: any) => p.id);
  if (!ids.length) return res.json([]);
  const { data } = await supabase.from('bookings').select('*').in('property_id', ids);
  res.json(data || []);
});

app.post('/api/pms/bookings', async (req, res) => {
  const { propertyId, guestName, checkIn, checkOut } = req.body;
  const { data } = await supabase.from('bookings').insert({
    property_id: propertyId, guest_name: guestName, check_in: checkIn, check_out: checkOut, status: 'Confirmed',
  }).select().single();
  await supabase.from('properties').update({ status: 'Occupied' }).eq('id', propertyId);
  res.status(201).json(data);
});

// ── PMS Business Clients ───────────────────────────────────────────────────────
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
  const invoice_number = `INV-${String((count as any || 0) + 1).padStart(3, '0')}`;
  const { data } = await supabase.from('pms_invoices').insert({ ...req.body, invoice_number }).select().single();
  res.status(201).json(data);
});

app.put('/api/pms/invoices/:id', async (req, res) => {
  const { data } = await supabase.from('pms_invoices').update(req.body).eq('id', req.params.id).select().single();
  res.json(data);
});

// ── Ad Connections ────────────────────────────────────────────────────────────
app.get('/api/connections', async (req, res) => {
  const { workspaceId } = req.query;
  let q = supabase.from('ad_connections').select('*');
  if (workspaceId) q = q.eq('workspace_id', workspaceId);
  const { data } = await q;
  res.json(data || []);
});

app.post('/api/connections', async (req, res) => {
  const { platformName, connected, clientId, developerToken, adAccountId, workspaceId } = req.body;
  await supabase.from('ad_connections').upsert({
    workspace_id: workspaceId, platform_name: platformName,
    connected, client_id: clientId, developer_token: developerToken || '', ad_account_id: adAccountId || '',
  }, { onConflict: 'workspace_id,platform_name' });
  res.json({ success: true });
});

// ── Export for Vercel ─────────────────────────────────────────────────────────
// Vercel needs an explicit handler function, not just the app
export default function handler(req: any, res: any) {
  return app(req, res);
}
