# NoteVault + Knowledge Vault — Technical Architecture & Design Document

## 1. Architectural Overview

NoteVault + Knowledge Vault employs a **hybrid client-first architecture**:
1. **Google Drive REST API v3**: Authoritative remote persistence for Markdown notes (`My Drive/NoteVault/`), `.notevault.json` manifests, and binary media attachments.
2. **Supabase (PostgreSQL + Auth)**: Cloud backend for user authentication (JWT session management) and relational Workspace Panels (`panels`, `panel_fields`, `panel_entries`) as well as productivity modules (`todos`, `habits`, `expenses`, `news_items`).
3. **Dexie.js (IndexedDB v3)**: Local client-side database caching all 11 tables for zero-latency instant offline capability.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface (React 18)                       │
│  ┌───────────────┬───────────────────────────────┬───────────────────┐ │
│  │ Top Nav Bar   │ Notes / Workspace / Tasks /   │ Supabase User &   │ │
│  │ Module Switch │ Habits / Finance / Intel      │ Drive Sync Status │ │
│  └───────────────┴───────────────────────────────┴───────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
     ┌───────────────────────┐               ┌───────────────────────┐
     │  Zustand State Stores │               │   MiniSearch Engine   │
     │  (Notes, Vault/Panels,│               │ (Full-text & Ops for  │
     │   Auth, Habits, etc.) │               │  Drive Notes)         │
     └───────────┬───────────┘               └───────────┬───────────┘
                 │                                       │
                 ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Dexie.js (IndexedDB v3)                         │
│  ┌───────────────┬──────────────┬──────────────┬────────────────────┐  │
│  │   notebooks   │   sections   │    pages     │    attachments     │  │
│  ├───────────────┼──────────────┼──────────────┼────────────────────┤  │
│  │    outbox     │  syncState   │  searchIndex │      settings      │  │
│  ├───────────────┼──────────────┼──────────────┼────────────────────┤  │
│  │    panels     │ panel_fields │panel_entries │ todos/habits/etc.  │  │
│  └───────────────┴──────────────┴──────────────┴────────────────────┘  │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
     ┌──────────────┴──────────────┐  ┌──────────────┴──────────────┐
     │  Drive Sync Engine & Outbox │  │  Supabase Client & Auth     │
     │  (Debounce 1.5s, Backoff)   │  │  (PostgREST, RLS, Session)  │
     └──────────────┬──────────────┘  └──────────────┬──────────────┘
                    │ HTTPS                          │ HTTPS / WSS
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Google Drive REST API v3       │  │     Supabase Cloud Backend   │
│ ┌──────────────────────────────────┐ │  │ ┌──────────────────────────┐ │
│ │ My Drive / NoteVault / Notebooks │ │  │ │ Auth (Users, Sessions)   │ │
│ │ Sections, Pages.md, Attachments  │ │  │ │ panels, panel_fields     │ │
│ │ Scope: drive.file or drive       │ │  │ │ panel_entries, todos...  │ │
│ └──────────────────────────────────┘ │  │ └──────────────────────────┘ │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

---

## 2. Key Modules & Responsibilities

| Module | Location | Description |
|---|---|---|
| **Data Layer (Dexie)** | `src/db/db.ts` | Multi-table IndexedDB storage (11 tables, v3) with indexed keys for fast local reads, offline caching, and outbox persistence. |
| **Data Contracts** | `src/types/index.ts` | Strictly-typed TypeScript interfaces for Panels, PanelFields, PanelEntries, Notebooks, Sections, Pages, Attachments, Outbox items, and Sync conflicts. |
| **Markdown Front-Matter** | `src/lib/frontmatter.ts` | Parser and serializer ensuring round-trip integrity and 100% preservation of unknown custom YAML front-matter attributes. |
| **Authentication** | `src/features/auth/` | Supabase Auth (email/password, token refresh, guest mode) + Google OAuth token client for Drive permissions. |
| **Supabase Client** | `src/lib/supabaseClient.ts` | Configured `@supabase/supabase-js` client connecting to PostgreSQL with localStorage fallback. |
| **Workspace Store** | `src/features/vault/vaultStore.ts` | State store for dynamic panels, custom fields, and entries with bi-directional Supabase sync. |
| **Drive Client** | `src/features/drive/driveClient.ts` | Direct browser-to-Drive REST API v3 client handling multipart uploads, version checks, binary file attachments, and trashed flags. |
| **Sync Engine** | `src/features/sync/syncEngine.ts` | Bi-directional synchronization worker: queues local mutations to the outbox, flushes on online / visibility / interval, detects version conflicts, and performs full rebuilds from Drive. |
| **Editor** | `src/features/editor/MarkdownEditor.tsx` | CodeMirror 6 markdown editor with syntax styling, line wrapping, dark theme, and drag-and-drop attachment upload. |
| **Renderer** | `src/features/markdown/markdownRenderer.ts` | GFM renderer supporting task lists (`- [ ]`), callout alerts (`> [!NOTE]`), copyable code blocks, tables, and wiki links (`[[Page]]`). |
| **Full-Text Search** | `src/features/search/searchIndex.ts` | MiniSearch index supporting operator queries (`tag:`, `in:`, `is:favorite`) and highlighted snippets. |

---

## 3. Data Integrity & Safety Invariants

1. **Non-Destructive Deletions**:
   - The app never invokes `files.delete`.
   - Deleted entities update `trashed: true`, moving items to the Google Drive trash can.
   - Any trashed item can be restored from the Trash view.
2. **Drive is Source of Truth**:
   - Local IndexedDB is rebuildable from scratch purely by listing the `NoteVault/` folder in Google Drive.
3. **Optimistic Updates & Outbox**:
   - UI reflects page edits immediately.
   - Mutations are captured in the Dexie `outbox` table and retried with exponential backoff until acknowledged by Google Drive.
4. **Conflict Resolution**:
   - Version checking compares stored `remoteVersion` before write.
   - If a collision occurs while local is dirty, both copies are preserved and a resolution dialog is presented.
