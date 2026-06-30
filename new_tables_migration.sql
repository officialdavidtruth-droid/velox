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
