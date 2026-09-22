-- ChatCharacters — Supabase/Postgres schema
-- Run this once in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)
-- for your project. Mirrors the shape previously used by the SQLite adapter.

create table if not exists characters (
  id                text primary key,
  name              text not null,
  avatar            text not null default '🤖',
  avatar_color      text not null default '#007AFF',
  avatar_image      text,
  description       text not null default '',
  personality       text not null default '',
  background        text not null default '',
  system_prompt     text not null default '',
  model             text not null default '',
  temperature       double precision not null default 0.7,
  max_tokens        integer not null default 2048,
  context_messages  integer not null default 20,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists messages (
  id            text primary key,
  character_id  text not null references characters(id) on delete cascade,
  role          text not null,
  content       text not null,
  timestamp     timestamptz not null default now(),
  image_url     text,
  image_status  text,
  image_prompt  text
);

create index if not exists idx_messages_char
  on messages (character_id, timestamp);

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- The app is a client-only desktop/browser app with no login system yet, and
-- talks to Supabase using the public "publishable" API key. That key can only
-- do what these policies allow — RLS must be on, and for now everyone holding
-- the publishable key shares the same data (single-user / trusted use only).
--
-- Before letting other people use this app against your project, replace the
-- policies below with per-user ones (e.g. add a `user_id` column defaulting to
-- `auth.uid()` and scope `using`/`with check` to `auth.uid() = user_id`).

alter table characters enable row level security;
alter table messages enable row level security;

create policy "public read characters" on characters
  for select using (true);
create policy "public insert characters" on characters
  for insert with check (true);
create policy "public update characters" on characters
  for update using (true) with check (true);
create policy "public delete characters" on characters
  for delete using (true);

create policy "public read messages" on messages
  for select using (true);
create policy "public insert messages" on messages
  for insert with check (true);
create policy "public update messages" on messages
  for update using (true) with check (true);
create policy "public delete messages" on messages
  for delete using (true);
