-- ============================================================================
-- NOTEVAULT & KNOWLEDGE VAULT: COMPLETE DATABASE SCHEMA FOR SUPABASE
-- Run this script in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ============================================================================

-- ─── 1. EXPENSES & FINANCE TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  reimbursable BOOLEAN DEFAULT false,
  receipt_url TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- If expenses already exists from earlier migrations, ensure missing columns are added:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'type') THEN
    ALTER TABLE public.expenses ADD COLUMN type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'reimbursable') THEN
    ALTER TABLE public.expenses ADD COLUMN reimbursable BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'receipt_url') THEN
    ALTER TABLE public.expenses ADD COLUMN receipt_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'user_id') THEN
    ALTER TABLE public.expenses ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 2. TODOS & TASKS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.todos (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  urgent BOOLEAN DEFAULT false,
  important BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date TEXT,
  due_time TEXT,
  category TEXT DEFAULT 'General',
  scope TEXT DEFAULT 'daily',
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done', 'cancelled')),
  priority TEXT DEFAULT 'p3' CHECK (priority IN ('p1', 'p2', 'p3', 'p4', 'high', 'medium', 'low')),
  project_id TEXT,
  panel_id TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  subtasks JSONB DEFAULT '[]'::jsonb,
  estimated_minutes INTEGER,
  recurrence TEXT DEFAULT 'none',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 3. HABITS & HABIT LOGS TABLES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habits (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  title TEXT,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'Personal',
  frequency TEXT DEFAULT 'daily',
  color TEXT DEFAULT '#4F46E5',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id TEXT PRIMARY KEY,
  habit_id TEXT NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed BOOLEAN DEFAULT true,
  count INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_habit_date UNIQUE (habit_id, date)
);

-- ─── 4. WORKSPACE PANELS (CUSTOM KNOWLEDGE VAULT BOARDS) ─────────────────────
CREATE TABLE IF NOT EXISTS public.panels (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'FolderKanban',
  color TEXT DEFAULT '#4F46E5',
  sort_order INTEGER DEFAULT 0,
  dashboard_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.panel_fields (
  id TEXT PRIMARY KEY,
  panel_id TEXT NOT NULL REFERENCES public.panels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.panel_entries (
  id TEXT PRIMARY KEY,
  panel_id TEXT NOT NULL REFERENCES public.panels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 5. DIRECTORY ENTITIES (PEOPLE, COMPANIES, TECH, PROJECTS) ───────────────
CREATE TABLE IF NOT EXISTS public.people (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  organisation TEXT,
  designation TEXT,
  contact_info TEXT,
  notes TEXT,
  related_companies JSONB DEFAULT '[]'::jsonb,
  related_projects JSONB DEFAULT '[]'::jsonb,
  related_technologies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  website TEXT,
  description TEXT,
  related_people JSONB DEFAULT '[]'::jsonb,
  related_projects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.technologies (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  website TEXT,
  description TEXT,
  related_projects JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  description TEXT,
  related_technologies JSONB DEFAULT '[]'::jsonb,
  related_companies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 6. USER SETTINGS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Expenses
DROP POLICY IF EXISTS "Users can manage their expenses" ON public.expenses;
CREATE POLICY "Users can manage their expenses"
  ON public.expenses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Todos
DROP POLICY IF EXISTS "Users can manage their todos" ON public.todos;
CREATE POLICY "Users can manage their todos"
  ON public.todos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Habits
DROP POLICY IF EXISTS "Users can manage their habits" ON public.habits;
CREATE POLICY "Users can manage their habits"
  ON public.habits FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Habit Logs
DROP POLICY IF EXISTS "Users can manage their habit logs" ON public.habit_logs;
CREATE POLICY "Users can manage their habit logs"
  ON public.habit_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Panels
DROP POLICY IF EXISTS "Users can manage their panels" ON public.panels;
CREATE POLICY "Users can manage their panels"
  ON public.panels FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Panel Fields
DROP POLICY IF EXISTS "Users can manage their panel fields" ON public.panel_fields;
CREATE POLICY "Users can manage their panel fields"
  ON public.panel_fields FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Panel Entries
DROP POLICY IF EXISTS "Users can manage their panel entries" ON public.panel_entries;
CREATE POLICY "Users can manage their panel entries"
  ON public.panel_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- People
DROP POLICY IF EXISTS "Users can manage their people directory" ON public.people;
CREATE POLICY "Users can manage their people directory"
  ON public.people FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Companies
DROP POLICY IF EXISTS "Users can manage their companies directory" ON public.companies;
CREATE POLICY "Users can manage their companies directory"
  ON public.companies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Technologies
DROP POLICY IF EXISTS "Users can manage their technologies directory" ON public.technologies;
CREATE POLICY "Users can manage their technologies directory"
  ON public.technologies FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Projects
DROP POLICY IF EXISTS "Users can manage their projects directory" ON public.projects;
CREATE POLICY "Users can manage their projects directory"
  ON public.projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User Settings
DROP POLICY IF EXISTS "Users can manage their settings" ON public.user_settings;
CREATE POLICY "Users can manage their settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_status ON public.todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON public.habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON public.habit_logs(date);
CREATE INDEX IF NOT EXISTS idx_panels_user_id ON public.panels(user_id);
CREATE INDEX IF NOT EXISTS idx_panel_fields_panel_id ON public.panel_fields(panel_id);
CREATE INDEX IF NOT EXISTS idx_panel_fields_user_id ON public.panel_fields(user_id);
CREATE INDEX IF NOT EXISTS idx_panel_entries_panel_id ON public.panel_entries(panel_id);
CREATE INDEX IF NOT EXISTS idx_panel_entries_user_id ON public.panel_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_people_user_id ON public.people(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_technologies_user_id ON public.technologies(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
