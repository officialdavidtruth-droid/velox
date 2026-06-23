-- ═══════════════════════════════════════════════════════════════════════════
-- VELOXSPACE — DROP & RECREATE (run this on a fresh Supabase project)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop everything cleanly first
drop table if exists public.leads cascade;
drop table if exists public.pms_invoices cascade;
drop table if exists public.pms_projects cascade;
drop table if exists public.pms_clients cascade;
drop table if exists public.ad_connections cascade;
drop table if exists public.bookings cascade;
drop table if exists public.properties cascade;
drop table if exists public.client_portals cascade;
drop table if exists public.referral_rewards cascade;
drop table if exists public.referrals cascade;
drop table if exists public.notifications cascade;
drop table if exists public.analytics_history cascade;
drop table if exists public.analytics cascade;
drop table if exists public.content_calendar cascade;
drop table if exists public.scheduled_posts cascade;
drop table if exists public.social_accounts cascade;
drop table if exists public.credit_transactions cascade;
drop table if exists public.credit_balances cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.workspace_members cascade;
drop table if exists public.workspaces cascade;
drop table if exists public.velox_sessions cascade;
drop table if exists public.velox_users cascade;

-- Drop old tables from previous migrations
drop table if exists public.metric_history cascade;
drop table if exists public.ad_campaigns cascade;
drop table if exists public.ad_breakdowns cascade;
drop table if exists public.ad_metrics cascade;
drop table if exists public.ai_insights cascade;
drop table if exists public.platform_posts cascade;
drop table if exists public.social_metrics cascade;
drop table if exists public.platform_connections cascade;

-- Drop old functions
drop function if exists public.get_my_workspace_ids cascade;
drop function if exists public.decrement_lead_credits cascade;
drop function if exists public.is_workspace_member cascade;

-- ── Create all tables with consistent uuid types ──────────────────────────

create table public.velox_users (
  id            uuid default gen_random_uuid() primary key,
  email         text not null unique,
  name          text not null default '',
  role          text not null default 'agency',
  country       text default 'Nigeria',
  avatar_url    text default '',
  password_hash text default '',
  password_salt text default '',
  created_at    timestamptz default now()
);

create table public.velox_sessions (
  token      text primary key,
  user_id    uuid not null references public.velox_users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '30 days'
);

create table public.workspaces (
  id             uuid default gen_random_uuid() primary key,
  name           text not null,
  owner_id       uuid not null references public.velox_users(id) on delete cascade,
  referral_code  text default '',
  portal_token   text default '',
  portal_enabled boolean default false,
  created_at     timestamptz default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references public.velox_users(id) on delete cascade,
  role         text default 'admin',
  created_at   timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table public.subscriptions (
  user_id            uuid primary key references public.velox_users(id) on delete cascade,
  plan_type          text default 'starter',
  billing_cycle      text default 'monthly',
  status             text default 'active',
  current_period_end timestamptz default now() + interval '30 days',
  created_at         timestamptz default now()
);

create table public.credit_balances (
  user_id                 uuid primary key references public.velox_users(id) on delete cascade,
  remaining_credits       integer default 150,
  total_credits_available integer default 500,
  last_updated            timestamptz default now()
);

create table public.credit_transactions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null,
  amount      integer not null,
  description text default '',
  type        text default 'charge',
  created_at  timestamptz default now()
);

create table public.social_accounts (
  id            uuid default gen_random_uuid() primary key,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  platform      text not null,
  account_name  text default '',
  handle        text default '',
  avatar_url    text default '',
  access_token  text default '',
  refresh_token text default '',
  connected_at  timestamptz default now(),
  status        text default 'active',
  expires_at    timestamptz default now() + interval '30 days',
  unique(workspace_id, platform)
);

create table public.scheduled_posts (
  id           uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title        text not null,
  description  text default '',
  platforms    text[] default '{}',
  cta          text default 'None',
  publish_date timestamptz,
  status       text default 'scheduled',
  ai_generated boolean default false,
  created_at   timestamptz default now()
);

create table public.content_calendar (
  id                uuid default gen_random_uuid() primary key,
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  scheduled_post_id uuid references public.scheduled_posts(id) on delete set null,
  start_time        timestamptz,
  end_time          timestamptz,
  title             text default '',
  description       text default '',
  color             text default '#4f46e5',
  created_at        timestamptz default now()
);

create table public.analytics (
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
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

create table public.analytics_history (
  id             uuid default gen_random_uuid() primary key,
  workspace_id   uuid not null,
  platform       text not null,
  date           date not null,
  followers      bigint default 0,
  reach          bigint default 0,
  impressions    bigint default 0,
  engagement     bigint default 0,
  clicks         bigint default 0,
  profile_visits bigint default 0,
  growth_rate    numeric default 0,
  unique(workspace_id, platform, date)
);

create table public.notifications (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid not null,
  workspace_id uuid,
  title        text not null,
  message      text default '',
  type         text default 'info',
  is_read      boolean default false,
  created_at   timestamptz default now()
);

create table public.referrals (
  id               uuid default gen_random_uuid() primary key,
  referrer_user_id uuid not null,
  referred_email   text not null,
  status           text default 'pending',
  reward_granted   boolean default false,
  created_at       timestamptz default now()
);

create table public.referral_rewards (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid not null,
  referral_id  uuid not null,
  reward_type  text default 'subscription_ext',
  reward_value integer default 14,
  granted_at   timestamptz default now()
);

create table public.client_portals (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  share_token  text not null unique,
  is_enabled   boolean default true,
  created_at   timestamptz default now()
);

create table public.properties (
  id               uuid default gen_random_uuid() primary key,
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  name             text not null,
  description      text default '',
  rate_per_night   numeric default 0,
  status           text default 'Available',
  image_url        text default '',
  monthly_bookings integer default 0,
  created_at       timestamptz default now()
);

create table public.bookings (
  id          uuid default gen_random_uuid() primary key,
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_name  text not null,
  check_in    date,
  check_out   date,
  status      text default 'Confirmed',
  created_at  timestamptz default now()
);

create table public.ad_connections (
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  platform_name   text not null,
  connected       boolean default false,
  client_id       text default '',
  developer_token text default '',
  ad_account_id   text default '',
  primary key (workspace_id, platform_name)
);

create table public.pms_clients (
  id               uuid default gen_random_uuid() primary key,
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
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

create table public.pms_projects (
  id           uuid default gen_random_uuid() primary key,
  workspace_id uuid not null,
  client_id    uuid references public.pms_clients(id) on delete cascade,
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

create table public.pms_invoices (
  id             uuid default gen_random_uuid() primary key,
  workspace_id   uuid not null,
  client_id      uuid references public.pms_clients(id) on delete cascade,
  invoice_number text default '',
  amount         numeric default 0,
  currency       text default 'USD',
  status         text default 'draft',
  due_date       date,
  paid_at        timestamptz,
  description    text default '',
  created_at     timestamptz default now()
);

create table public.leads (
  id               uuid default gen_random_uuid() primary key,
  workspace_id     uuid not null,
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

-- ═══════════════════════════════════════════════════════════════════════════
-- NO RLS — Express server uses service_role key, handles all authorization
-- ═══════════════════════════════════════════════════════════════════════════
