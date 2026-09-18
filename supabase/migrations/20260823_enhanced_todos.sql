-- ============================================================
-- Knowledge Vault — Enhanced Todo / Task Management Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add enhanced columns to todos table (safe with IF NOT EXISTS)
ALTER TABLE todos 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'p3',
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recurrence text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS due_time text,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- 2. Backfill existing data safely:
-- Map completed -> 'done' status
UPDATE todos
SET status = 'done'
WHERE completed = true AND (status IS NULL OR status = 'todo');

-- Map legacy urgent/important flags to P1-P4 priorities
UPDATE todos
SET priority = CASE 
    WHEN urgent = true AND important = true THEN 'p1'
    WHEN urgent = false AND important = true THEN 'p2'
    WHEN urgent = true AND important = false THEN 'p3'
    ELSE 'p4'
  END
WHERE priority IS NULL OR priority = 'p3';

-- 3. Create high-performance indexes
CREATE INDEX IF NOT EXISTS todos_user_status_idx ON todos(user_id, status);
CREATE INDEX IF NOT EXISTS todos_user_priority_idx ON todos(user_id, priority);
CREATE INDEX IF NOT EXISTS todos_user_due_date_idx ON todos(user_id, due_date);
CREATE INDEX IF NOT EXISTS todos_user_proj_idx ON todos(user_id, project_id);
