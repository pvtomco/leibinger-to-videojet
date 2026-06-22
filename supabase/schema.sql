-- ============================================================================
-- Leibinger → VideoJet converter — Supabase schema
-- Run this once in the Supabase dashboard:  SQL Editor → New query → paste → Run
-- It creates the shared "team library" table + file storage, locked to
-- @tomco.co.th accounts via Row Level Security (RLS).
-- ============================================================================

-- ---- table: one row per saved conversion (shared across all tomco users) ----
create table if not exists public.conversions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_by_email text not null default (auth.jwt() ->> 'email'),
  source_filename text not null,
  out_filename    text not null,
  width           int,
  height          int,
  raster          int,
  mfg_date        text,
  include_text    boolean,
  include_code    boolean,
  include_date    boolean,
  msb             boolean,
  barcode         text,
  barcode_ok      boolean,
  bmp_path        text not null,
  preview_path    text not null,
  job_path        text
);

alter table public.conversions enable row level security;

-- Helper: is the signed-in user a @tomco.co.th account?
create or replace function public.is_tomco()
returns boolean
language sql stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) like '%@tomco.co.th'
$$;

-- Any tomco user can SEE every saved conversion (shared team library).
drop policy if exists "tomco can read" on public.conversions;
create policy "tomco can read" on public.conversions
  for select using ( public.is_tomco() );

-- Any tomco user can ADD conversions (must be stamped as themselves).
drop policy if exists "tomco can insert" on public.conversions;
create policy "tomco can insert" on public.conversions
  for insert with check ( public.is_tomco() and created_by = auth.uid() );

-- Only the person who saved a conversion can DELETE it.
drop policy if exists "owner can delete" on public.conversions;
create policy "owner can delete" on public.conversions
  for delete using ( created_by = auth.uid() );

-- ---- storage: private bucket holding the bmp / preview / original .job -------
insert into storage.buckets (id, name, public)
values ('library', 'library', false)
on conflict (id) do nothing;

drop policy if exists "tomco can read files" on storage.objects;
create policy "tomco can read files" on storage.objects
  for select using ( bucket_id = 'library' and public.is_tomco() );

drop policy if exists "tomco can upload files" on storage.objects;
create policy "tomco can upload files" on storage.objects
  for insert with check ( bucket_id = 'library' and public.is_tomco() );

drop policy if exists "owner can delete files" on storage.objects;
create policy "owner can delete files" on storage.objects
  for delete using ( bucket_id = 'library' and owner = auth.uid() );
