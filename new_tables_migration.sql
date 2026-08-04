-- Run this in Supabase SQL Editor to add new tables for VeloxSpace v3

create table if not exists public.campaigns (
  id           uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  platform     text default 'Meta Ads',
  status       text default 'active',
  budget       numeric default 0,
  spend        numeric default 0,
  impressions  bigint default 0,
  clicks       bigint default 0,
  conversions  bigint default 0,
  revenue      numeric default 0,
  start_date   date,
  end_date     date,
  notes        text default '',
  created_at   timestamptz default now()
);

create table if not exists public.site_pageviews (
  id           uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  path         text default '/',
  referrer     text default '',
  visitor_id   text default '',
  user_agent   text default '',
  created_at   timestamptz default now()
);
create index if not exists idx_pageviews_workspace on public.site_pageviews(workspace_id, created_at);

create table if not exists public.utm_links (
  id           uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  label        text default '',
  original_url text default '',
  utm_url      text not null,
  source       text default '',
  medium       text default '',
  campaign     text default '',
  clicks       integer default 0,
  created_at   timestamptz default now()
);

create table if not exists public.inbox_items (
  id           uuid default gen_random_uuid() primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform     text not null,
  type         text default 'comment',
  external_id  text unique,
  from_name    text default '',
  from_avatar  text default '',
  text         text default '',
  post_caption text default '',
  created_at   timestamptz default now()
);
create index if not exists idx_inbox_workspace on public.inbox_items(workspace_id);

-- Needed for campaign sync-from-API upsert to work without duplicates
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaigns_workspace_name_unique'
  ) then
    alter table public.campaigns add constraint campaigns_workspace_name_unique unique (workspace_id, name);
  end if;
end $$;

-- Admin sessions
create table if not exists public.admin_sessions (
  token       text primary key,
  created_at  timestamptz default now(),
  expires_at  timestamptz default now() + interval '8 hours'
);

-- App settings (key/value store for maintenance mode, pricing, payment keys)
create table if not exists public.app_settings (
  key        text primary key,
  value      text default ''
);

-- Chat sessions (one per user)
create table if not exists public.chat_sessions (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid not null references public.velox_users(id) on delete cascade unique,
  updated_at  timestamptz default now(),
  created_at  timestamptz default now()
);

-- Chat messages
create table if not exists public.chat_messages (
  id            uuid default gen_random_uuid() primary key,
  session_id    uuid not null references public.chat_sessions(id) on delete cascade,
  sender        text not null,
  message       text not null,
  read_by_admin boolean default false,
  read_by_user  boolean default false,
  created_at    timestamptz default now()
);
create index if not exists idx_chat_messages_session on public.chat_messages(session_id);

-- Audit log (if not already created)
create table if not exists public.audit_logs (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid,
  workspace_id uuid,
  action       text not null,
  ip_address   text default '',
  created_at   timestamptz default now()
);

-- Contact form messages
create table if not exists public.contact_messages (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz default now()
);

-- Add phone column to velox_users if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='velox_users' and column_name='phone') then
    alter table public.velox_users add column phone text default '';
  end if;
end $$;

-- Add social media columns to leads table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='leads' and column_name='social_facebook') then
    alter table public.leads
      add column social_facebook  text default '',
      add column social_instagram text default '',
      add column social_twitter   text default '',
      add column social_linkedin  text default '',
      add column social_youtube   text default '',
      add column social_tiktok    text default '';
  end if;
end $$;
