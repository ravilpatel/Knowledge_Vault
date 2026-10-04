-- ============================================================================
-- NOTEVAULT & KNOWLEDGE VAULT: NOTEBOOK TABLES FOR SUPABASE
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- 1. Create Notebooks Table
CREATE TABLE IF NOT EXISTS public.notebooks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4F7CAC',
  icon TEXT DEFAULT 'book',
  sort_order INTEGER DEFAULT 0,
  section_order JSONB DEFAULT '[]'::jsonb,
  trashed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Sections Table
CREATE TABLE IF NOT EXISTS public.sections (
  id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'peach',
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  page_order JSONB DEFAULT '[]'::jsonb,
  trashed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Pages Table
CREATE TABLE IF NOT EXISTS public.pages (
  id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  favorite BOOLEAN DEFAULT false,
  content TEXT DEFAULT '',
  raw_markdown TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  trashed BOOLEAN DEFAULT false,
  custom_front_matter JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Note Attachments Table (Optional / Storage Metadata)
CREATE TABLE IF NOT EXISTS public.note_attachments (
  id TEXT PRIMARY KEY,
  notebook_id TEXT NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

-- Notebooks RLS Policy
DROP POLICY IF EXISTS "Users can manage their notebooks" ON public.notebooks;
CREATE POLICY "Users can manage their notebooks"
  ON public.notebooks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sections RLS Policy
DROP POLICY IF EXISTS "Users can manage their sections" ON public.sections;
CREATE POLICY "Users can manage their sections"
  ON public.sections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Pages RLS Policy
DROP POLICY IF EXISTS "Users can manage their pages" ON public.pages;
CREATE POLICY "Users can manage their pages"
  ON public.pages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note Attachments RLS Policy
DROP POLICY IF EXISTS "Users can manage their note attachments" ON public.note_attachments;
CREATE POLICY "Users can manage their note attachments"
  ON public.note_attachments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_sections_notebook_id ON public.sections(notebook_id);
CREATE INDEX IF NOT EXISTS idx_sections_user_id ON public.sections(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_section_id ON public.pages(section_id);
CREATE INDEX IF NOT EXISTS idx_pages_notebook_id ON public.pages(notebook_id);
CREATE INDEX IF NOT EXISTS idx_pages_user_id ON public.pages(user_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_notebook_id ON public.note_attachments(notebook_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_user_id ON public.note_attachments(user_id);

-- ============================================================================
-- STORAGE BUCKET CREATION (FOR ATTACHMENTS & IMAGES)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('notevault-attachments', 'notevault-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload their note attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notevault-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view note attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notevault-attachments');

CREATE POLICY "Users can delete note attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'notevault-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
