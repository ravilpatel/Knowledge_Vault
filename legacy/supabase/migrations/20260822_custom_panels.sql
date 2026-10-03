-- ============================================================
-- Knowledge Vault — Custom Panels and EAV Redesign Migration
-- Run this in your Supabase SQL Editor or push via CLI
-- ============================================================

-- 1. Create Field Type Enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'field_type_enum') then
    create type field_type_enum as enum ('text', 'textarea', 'tags', 'people_link', 'url', 'date', 'select');
  end if;
end $$;

-- 2. Create Panels Table
create table if not exists public.panels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text,
  color text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 3. Create Panel Fields Table
create table if not exists public.panel_fields (
  id uuid primary key default gen_random_uuid(),
  panel_id uuid references public.panels(id) on delete cascade not null,
  field_key text not null,
  field_label text not null,
  field_type field_type_enum not null,
  field_order integer default 0,
  is_required boolean default false,
  options jsonb default '[]'::jsonb,
  constraint panel_fields_panel_key_unique unique (panel_id, field_key)
);

-- 4. Create Panel Entries Table
create table if not exists public.panel_entries (
  id uuid primary key default gen_random_uuid(),
  panel_id uuid references public.panels(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Create Performance & Search Indexes
create index if not exists panels_user_id_idx on public.panels(user_id);
create index if not exists panel_fields_panel_id_idx on public.panel_fields(panel_id);
create index if not exists panel_entries_panel_id_idx on public.panel_entries(panel_id);
create index if not exists panel_entries_user_id_idx on public.panel_entries(user_id);
create index if not exists panel_entries_data_gin_idx on public.panel_entries using gin (data);

-- 6. Enable Row Level Security (RLS)
alter table public.panels enable row level security;
alter table public.panel_fields enable row level security;
alter table public.panel_entries enable row level security;

-- 7. Define RLS Policies
drop policy if exists "users can manage their own panels" on public.panels;
create policy "users can manage their own panels"
  on public.panels
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users can manage fields of their own panels" on public.panel_fields;
create policy "users can manage fields of their own panels"
  on public.panel_fields
  for all
  using (
    exists (
      select 1 from public.panels
      where public.panels.id = public.panel_fields.panel_id
      and public.panels.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.panels
      where public.panels.id = public.panel_fields.panel_id
      and public.panels.user_id = auth.uid()
    )
  );

drop policy if exists "users can manage their own panel entries" on public.panel_entries;
create policy "users can manage their own panel entries"
  on public.panel_entries
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id 
    and exists (
      select 1 from public.panels 
      where public.panels.id = public.panel_entries.panel_id 
      and public.panels.user_id = auth.uid()
    )
  );

-- 8. Setup Auto-Creation Trigger for New Users
create or replace function public.handle_new_user_setup()
returns trigger as $$
begin
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user_setup();

-- 9. Existing Notes Data Migration Block (Removed default Notes panel seeding/migration)
do $$
begin
  -- No default panels are auto-created
end $$;
