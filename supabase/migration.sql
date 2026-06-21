-- ═══════════════════════════════════════════════════════════════════════════════
-- VELOXSPACE FINAL — SUPABASE MIGRATION
-- NO RLS: Express server uses service_role key and handles all authorization
-- Run in Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════════

create table if not exists public.velox_users (
  id           text primary key default 'usr_' || substr(md5(random()::text), 1, 8),
  email        text not null unique,
  name         text not null default '',
  role         text not null default 'agency',
  country      text default 'Nigeria',
  avatar_url   text default '',
  created_at   timestamptz default now()
);

create table if not exists public.velox_sessions (
  token       text primary key,
  user_id     text not null references public.velox_users(id) on delete cascade,
  created_at  timestamptz default now(),
  expires_at  timestamptz default now() + interval '30 days'
);

create table if not exists public.workspaces (
  id              text primary key default 'ws_' || substr(md5(random()::text), 1, 8),
  name            text not null,
  owner_id        text not null references public.velox_users(id) on delete cascade,
  referral_code   text default '',
  portal_token    text default '',
  portal_enabled  boolean default false,
  created_at      timestamptz default now()
);

create table if not exists public.workspace_members (
  workspace_id  text not null references public.workspaces(id) on delete cascade,
  user_id       text not null references public.velox_users(id) on delete cascade,
  role          text default 'admin',
  created_at    timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.subscriptions (
  user_id              text primary key references public.velox_users(id) on delete cascade,
  plan_type            text default 'starter',
  billing_cycle        text default 'monthly',
  status               text default 'active',
  current_period_end   timestamptz default now() + interval '30 days',
  created_at           timestamptz default now()
);

create table if not exists public.credit_balances (
  user_id                  text primary key references public.velox_users(id) on delete cascade,
  remaining_credits        integer default 150,
  total_credits_available  integer default 500,
  last_updated             timestamptz default now()
);

create table if not exists public.credit_transactions (
  id           text primary key default 'ctx_' || substr(md5(random()::text), 1, 8),
  user_id      text not null,
  amount       integer not null,
  description  text default '',
  type         text default 'charge',
  created_at   timestamptz default now()
);

create table if not exists public.social_accounts (
  id            text primary key default 'sa_' || substr(md5(random()::text), 1, 8),
  workspace_id  text not null references public.workspaces(id) on delete cascade,
  platform      text not null,
  account_name  text default '',
  handle        text default '',
  avatar_url    text default '',
  connected_at  timestamptz default now(),
  status        text default 'active',
  expires_at    timestamptz default now() + interval '30 days'
);

create table if not exists public.scheduled_posts (
  id            text primary key default 'post_' || substr(md5(random()::text), 1, 8),
  workspace_id  text not null references public.workspaces(id) on delete cascade,
  title         text not null,
  description   text default '',
  platforms     text[] default '{}',
  cta           text default 'None',
  publish_date  timestamptz,
  status        text default 'scheduled',
  ai_generated  boolean default false,
  created_at    timestamptz default now()
);

create table if not exists public.content_calendar (
  id                  text primary key default 'ev_' || substr(md5(random()::text), 1, 8),
  workspace_id        text not null references public.workspaces(id) on delete cascade,
  scheduled_post_id   text references public.scheduled_posts(id) on delete set null,
  start_time          timestamptz,
  end_time            timestamptz,
  title               text default '',
  description         text default '',
  color               text default '#4f46e5',
  created_at          timestamptz default now()
);

create table if not exists public.analytics (
  workspace_id   text not null references public.workspaces(id) on delete cascade,
  platform       text not null,
  followers      bigint default 0,
  reach          bigint default 0,
  impressions    bigint default 0,
  engagement     bigint default 0,
  clicks         bigint default 0,
  profile_visits bigint default 0,
  growth_rate    numeric default 0,
  last_updated   timestamptz default now(),
  primary key (workspace_id, platform)
);

create table if not exists public.analytics_history (
  id             text primary key default 'h_' || substr(md5(random()::text), 1, 8),
  workspace_id   text not null,
  platform       text not null,
  date           date not null,
  followers      bigint default 0,
  reach          bigint default 0,
  impressions    bigint default 0,
  engagement     bigint default 0,
  clicks         bigint default 0,
  profile_visits bigint default 0,
  growth_rate    numeric default 0
);

create table if not exists public.notifications (
  id          text primary key default 'not_' || substr(md5(random()::text), 1, 8),
  user_id     text not null,
  workspace_id text,
  title       text not null,
  message     text default '',
  type        text default 'info',
  is_read     boolean default false,
  created_at  timestamptz default now()
);

create table if not exists public.referrals (
  id                  text primary key default 'ref_' || substr(md5(random()::text), 1, 8),
  referrer_user_id    text not null,
  referred_email      text not null,
  status              text default 'pending',
  reward_granted      boolean default false,
  created_at          timestamptz default now()
);

create table if not exists public.referral_rewards (
  id           text primary key default 'rew_' || substr(md5(random()::text), 1, 8),
  user_id      text not null,
  referral_id  text not null,
  reward_type  text default 'subscription_ext',
  reward_value integer default 14,
  granted_at   timestamptz default now()
);

create table if not exists public.client_portals (
  workspace_id  text primary key references public.workspaces(id) on delete cascade,
  share_token   text not null unique,
  is_enabled    boolean default true,
  created_at    timestamptz default now()
);

create table if not exists public.properties (
  id              text primary key default 'prop_' || substr(md5(random()::text), 1, 8),
  workspace_id    text not null references public.workspaces(id) on delete cascade,
  name            text not null,
  description     text default '',
  rate_per_night  numeric default 0,
  status          text default 'Available',
  image_url       text default '',
  monthly_bookings integer default 0,
  created_at      timestamptz default now()
);

create table if not exists public.bookings (
  id           text primary key default 'bk_' || substr(md5(random()::text), 1, 8),
  property_id  text not null references public.properties(id) on delete cascade,
  guest_name   text not null,
  check_in     date,
  check_out    date,
  status       text default 'Confirmed',
  created_at   timestamptz default now()
);

create table if not exists public.ad_connections (
  workspace_id     text not null references public.workspaces(id) on delete cascade,
  platform_name    text not null,
  connected        boolean default false,
  client_id        text default '',
  developer_token  text default '',
  ad_account_id    text default '',
  primary key (workspace_id, platform_name)
);

create table if not exists public.pms_clients (
  id               text primary key default 'cl_' || substr(md5(random()::text), 1, 8),
  workspace_id     text not null references public.workspaces(id) on delete cascade,
  business_name    text not null,
  contact_name     text default '',
  email            text default '',
  phone            text default '',
  website          text default '',
  industry         text default '',
  status           text default 'active',
  monthly_retainer numeric default 0,
  currency         text default 'USD',
  contract_start   date,
  contract_end     date,
  notes            text default '',
  created_at       timestamptz default now()
);

create table if not exists public.pms_projects (
  id           text primary key default 'proj_' || substr(md5(random()::text), 1, 8),
  workspace_id text not null,
  client_id    text references public.pms_clients(id) on delete cascade,
  name         text not null,
  status       text default 'planning',
  type         text default '',
  budget       numeric default 0,
  spent        numeric default 0,
  start_date   date,
  end_date     date,
  notes        text default '',
  created_at   timestamptz default now()
);

create table if not exists public.pms_invoices (
  id             text primary key default 'inv_' || substr(md5(random()::text), 1, 8),
  workspace_id   text not null,
  client_id      text references public.pms_clients(id) on delete cascade,
  invoice_number text default '',
  amount         numeric default 0,
  currency       text default 'USD',
  status         text default 'draft',
  due_date       date,
  paid_at        timestamptz,
  description    text default '',
  created_at     timestamptz default now()
);

create table if not exists public.leads (
  id               text primary key default 'lead_' || substr(md5(random()::text), 1, 8),
  workspace_id     text not null,
  business_name    text not null,
  email            text default '',
  phone            text default '',
  website          text default '',
  address          text default '',
  category         text default '',
  location         text default '',
  rating           numeric default 0,
  has_website      boolean default true,
  source           text default 'manual',
  place_id         text default '',
  status           text default 'new',
  ai_score         integer default 0,
  ai_tier          text default '',
  ai_pitch         text default '',
  confidence_score numeric default 0,
  created_at       timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- NO RLS — server uses service_role key, handles all authorization
-- ═══════════════════════════════════════════════════════════════════════════════
