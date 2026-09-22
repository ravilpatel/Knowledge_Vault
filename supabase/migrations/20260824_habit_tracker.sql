-- ============================================================
-- Knowledge Vault — Habit Tracker & Streak Counter Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create Habits Table
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  category text DEFAULT 'Personal',
  color text DEFAULT '#1aae39',
  icon text DEFAULT 'fa-check',
  frequency text DEFAULT 'daily', -- 'daily', 'weekdays', 'weekends', 'weekly'
  target_days jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb, -- 0=Sun, 1=Mon, ..., 6=Sat
  target_count integer DEFAULT 1,
  unit text DEFAULT 'times',
  reminder_time text DEFAULT '09:00',
  reminder_enabled boolean DEFAULT true,
  archived boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create Habit Logs Table (Completions)
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date text NOT NULL, -- 'YYYY-MM-DD'
  completed boolean DEFAULT true,
  count integer DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT habit_logs_habit_date_unique UNIQUE (habit_id, date)
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS habits_user_id_idx ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS habits_user_archived_idx ON public.habits(user_id, archived);
CREATE INDEX IF NOT EXISTS habit_logs_user_date_idx ON public.habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS habit_logs_habit_date_idx ON public.habit_logs(habit_id, date);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies
DROP POLICY IF EXISTS "users can manage their own habits" ON public.habits;
CREATE POLICY "users can manage their own habits"
  ON public.habits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users can manage their own habit logs" ON public.habit_logs;
CREATE POLICY "users can manage their own habit logs"
  ON public.habit_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
