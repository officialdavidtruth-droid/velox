-- Adds columns needed for full per-platform engagement metrics (posts, likes,
-- dislikes, comments, shares) that the sync code writes but the original
-- schema never had — this was silently breaking the YouTube/Instagram
-- analytics upsert (Supabase rejects unknown columns in the payload).
-- Run this in Supabase SQL Editor.

alter table public.analytics
  add column if not exists posts     bigint default 0,
  add column if not exists likes     bigint default 0,
  add column if not exists dislikes  bigint default 0,
  add column if not exists comments  bigint default 0,
  add column if not exists shares    bigint default 0;

alter table public.analytics_history
  add column if not exists posts     bigint default 0,
  add column if not exists likes     bigint default 0,
  add column if not exists dislikes  bigint default 0,
  add column if not exists comments  bigint default 0,
  add column if not exists shares    bigint default 0;
