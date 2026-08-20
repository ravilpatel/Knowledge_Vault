-- ============================================================
-- Knowledge Vault — New Features Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ─── Expenses Table ───
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  amount numeric not null,
  description text,
  category text default 'Other',
  reimbursable boolean default false,
  reimbursable_note text,
  date date default current_date,
  created_at timestamptz default now()
);
alter table expenses enable row level security;
drop policy if exists "user expenses" on expenses;
create policy "user expenses" on expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Todos Table (Eisenhower Matrix) ───
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  urgent boolean default false,
  important boolean default false,
  due_date date,
  completed boolean default false,
  completed_at timestamptz,
  notify_telegram boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table todos enable row level security;
drop policy if exists "user todos" on todos;
create policy "user todos" on todos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── News Items Table ───
create table if not exists news_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  summary text,
  source text,
  url text,
  category text, -- 'gazette' | 'pib' | 'startup' | 'market'
  published_at timestamptz,
  fetched_at timestamptz default now(),
  is_read boolean default false
);
alter table news_items enable row level security;
drop policy if exists "user news" on news_items;
create policy "user news" on news_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── User Settings Table ───
create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users unique not null,
  smtp_host text,
  smtp_port integer default 587,
  smtp_user text,
  smtp_pass text,
  smtp_from text,
  notify_email text,
  telegram_bot_token text,
  telegram_chat_id text,
  finance_currency text default 'INR',
  news_enabled boolean default true,
  news_topics text default 'Indian policy, startups, technology',
  finance_report_day integer default 1,
  updated_at timestamptz default now()
);
alter table user_settings enable row level security;
drop policy if exists "user settings" on user_settings;
create policy "user settings" on user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Indexes ───
create index if not exists expenses_user_date on expenses(user_id, date desc);
create index if not exists todos_user_completed on todos(user_id, completed);
create index if not exists news_user_fetched on news_items(user_id, fetched_at desc);

-- ============================================================
-- pg_cron Scheduled Jobs (run these separately in SQL editor
-- after enabling pg_cron extension in your Supabase project:
-- Dashboard > Database > Extensions > enable pg_cron)
-- ============================================================

-- Enable pg_cron (run once):
-- create extension if not exists pg_cron;

-- Fetch news every alternate day at 8 AM IST (2:30 AM UTC):
-- select cron.schedule('fetch-news-cron', '30 2 */2 * *',
--   $$select net.http_post(
--     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/fetch-news',
--     headers := '{"Authorization":"Bearer YOUR_ANON_KEY","Content-Type":"application/json"}'::jsonb,
--     body := '{"userId":"ALL"}'::jsonb
--   )$$
-- );

-- Send monthly finance report on 1st of each month at 8 AM IST (2:30 AM UTC):
-- select cron.schedule('finance-report-cron', '30 2 1 * *',
--   $$select net.http_post(
--     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-finance-report',
--     headers := '{"Authorization":"Bearer YOUR_ANON_KEY","Content-Type":"application/json"}'::jsonb,
--     body := '{"userId":"ALL"}'::jsonb
--   )$$
-- );
