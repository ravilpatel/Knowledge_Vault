# NoteVault — Architectural & Technical Decisions Log

This document records architectural, design, and technical decisions made during the implementation of NoteVault in accordance with the build specification.

---

## 1. Locked Decisions Enforced
- **Client-only Architecture:** Zero custom backend servers. All state is held in IndexedDB (via Dexie) and synchronized directly with Google Drive REST API v3 using Google Identity Services (GIS) token model.
- **Data Safety:** Never permanently delete user data (`files.delete` is never called; deletion moves items to Drive trash `trashed: true`). Never overwrite remote changes without checking `headRevisionId` / `modifiedTime`.
- **OneNote Mental Model:** Notebooks = root folders; Sections = subfolders with pastel colored tabs; Pages = `.md` files in sections with YAML front matter.
- **Recoverability Source of Truth:** Google Drive folder is the authoritative source of truth. Clearing local IndexedDB and signing in completely rebuilds all notebooks, sections, pages, tags, favorites, and search indexes.
- **Offline-First:** All read/write operations execute instantly against Dexie IndexedDB with an asynchronous outbox queue that flushes to Google Drive when online.

---

## 2. Milestone Execution Decisions
- **M1 Foundation:**
  - Build toolchain: Vite + React 18 + TypeScript strict mode + Tailwind CSS.
  - PWA: `vite-plugin-pwa` with Workbox caching app shell and static fonts, strictly avoiding caching dynamic Google Drive REST API responses in service worker (Dexie owns data caching).
  - Stitch MCP UI generation: Generated 9 required screens across desktop, dark theme, mobile stack, modals, and empty/loading states under Stitch Project ID `425993547239346799` and design system `Tactile Productivity`.
- **M2 Data Layer & Structure:**
  - Dexie database schema includes: `notebooks`, `sections`, `pages`, `attachments`, `outbox`, `syncState`, `searchIndex`, and `settings`.
  - `.notevault.json` metadata files store ordering and cosmetic preferences (e.g. section tab colors). If missing or corrupted, the system falls back gracefully to alphabetical sorting and default colors without throwing errors.
- **M3 Editor & Markdown Pipeline:**
  - CodeMirror 6 with `@codemirror/lang-markdown` for syntax highlighting, keybindings, auto-close brackets, and task-list support.
  - Markdown rendering pipeline: `unified` + `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-sanitize` (or DOMPurify) ensuring strict XSS protection.
  - Front-matter parser: `gray-matter` or custom safe YAML parser that preserves unknown metadata keys on save.
- **M4 Attachments:**
  - Placed inside `_attachments/` within the notebook directory.
  - Links use relative paths: `../_attachments/YYYYMMDD-<hash>-<name>.<ext>` so notes open correctly in any external markdown viewer (e.g. Obsidian or VS Code).
  - Preview renders cached Blobs via `URL.createObjectURL` for fast offline loading.
- **M5 Sync Engine & Conflicts:**
  - Pull sync uses `drive.changes.list` with a stored `startPageToken`.
  - On concurrent modifications with divergent content: keeps both versions! Remote version is saved, and local version is preserved as `Title (conflict YYYY-MM-DD HH-mm).md`. Side-by-side diff UI allows reviewing and picking the preferred version.
- **M6 Full-Text Search:**
  - Client-side search engine (`MiniSearch`) indexing title (weight 3), tags (weight 2), and body (weight 1).
  - Search operators supported: `tag:<tag>`, `in:<notebook>`, `is:favorite`.
- **M7 Polish & Accessibility:**
  - Dark mode support toggle with system preference sync.
  - Full keyboard shortcuts (`Ctrl/Cmd+K` for search, `Ctrl/Cmd+B` for sidebar toggle, etc.).

---

## 3. Hybrid Integration: Supabase Auth & Relational Workspace Panels + Google Drive Notes
- **Context & Requirement:**
  - User requested that the overall login feature be handled by Supabase.
  - All notes must remain strictly stored and configured through Google Drive in the NoteVault OneNote hierarchy (`My Drive/NoteVault/` Markdown files).
  - All custom workspace panels and previous Knowledge Vault features (Tasks, Habits, Finance, Intel) must connect to Supabase.
- **Decision:**
  - **Authentication:** Supabase Auth is adopted as the primary application gate, supporting Email/Password sign-in, account creation, password recovery, and Guest/Offline fallback.
  - **Drive Token Connection:** Google Identity Services token is used to authorize Google Drive sync independently, preserving the locked decision of zero proprietary format or lock-in for notes.
  - **Workspace Panels in Supabase:** Dynamic panels (`panels`), custom schema fields (`panel_fields`), and entries (`panel_entries`) are persisted directly to Supabase with PostgreSQL Row Level Security (RLS) while caching in Dexie IndexedDB (v3 schema) for instant offline responsiveness.
  - **Strict Boundary:** Notes are NEVER written to Supabase; Workspace panel records are stored in Supabase with local Dexie caching.

