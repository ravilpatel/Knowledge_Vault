# NoteVault — Technical Architecture & Design Document

## 1. Architectural Overview

NoteVault is a **client-only Progressive Web App (PWA)** that operates with **zero proprietary backends**. Google Drive REST API v3 is the exclusive remote persistence layer, and Dexie (IndexedDB) acts as the local offline data store.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface (React 18)                       │
│  ┌──────────────────┬─────────────────┬──────────────────────────────┐ │
│  │  NotebookRail    │    PageList     │          EditorPane          │ │
│  │ (Notebook Tree,  │ (Filter, Sort,  │ (CodeMirror 6, Live Preview, │ │
│  │  Tags, Favorites)│  Star Toggle)   │  FormattingToolbar, Attach)  │ │
│  └──────────────────┴─────────────────┴──────────────────────────────┘ │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
     ┌───────────────────────┐               ┌───────────────────────┐
     │  Zustand Note Store   │               │   MiniSearch Engine   │
     │   (UI & Active State) │               │ (Full-text & Ops)     │
     └───────────┬───────────┘               └───────────┬───────────┘
                 │                                       │
                 ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Dexie.js (IndexedDB v4)                         │
│  ┌───────────────┬──────────────┬──────────────┬────────────────────┐  │
│  │   notebooks   │   sections   │    pages     │    attachments     │  │
│  ├───────────────┼──────────────┼──────────────┼────────────────────┤  │
│  │    outbox     │  syncState   │  searchIndex │                    │  │
│  └───────────────┴──────────────┴──────────────┴────────────────────┘  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                      ┌──────────────┴──────────────┐
                      │    Sync Engine & Outbox     │
                      │  (Debounce 1.5s, Backoff)   │
                      └──────────────┬──────────────┘
                                     │ HTTPS
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Google Drive REST API v3                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ My Drive / NoteVault / Notebook / Section / Page.md              │  │
│  │ Scope: drive.file (app-created) or drive (full access)           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Modules & Responsibilities

| Module | Location | Description |
|---|---|---|
| **Data Layer (Dexie)** | `src/db/db.ts` | Multi-table IndexedDB storage with indexed keys for fast local reads, offline caching, and outbox persistence. |
| **Data Contracts** | `src/types/index.ts` | Strictly-typed TypeScript interfaces for Notebooks, Sections, Pages, Attachments, Outbox items, and Sync conflicts. |
| **Markdown Front-Matter** | `src/lib/frontmatter.ts` | Parser and serializer ensuring round-trip integrity and 100% preservation of unknown custom YAML front-matter attributes. |
| **Authentication** | `src/features/auth/` | Google Identity Services token client with guest offline mode fallback. |
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
