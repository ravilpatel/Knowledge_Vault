# NoteVault + Knowledge Vault — User & Recovery Guide

NoteVault + Knowledge Vault is a personal knowledge and productivity Progressive Web App (PWA) that blends two specialized cloud tiers:
1. **Google Drive** for Markdown notes, OneNote hierarchy (**Notebooks &rarr; Sections &rarr; Pages**), and media attachments.
2. **Supabase** for user authentication and relational Workspace Panels & productivity modules (Tasks, Habits, Finance, Intel).

---

## 0. Authentication & Account Management

### 0.1 Primary Login via Supabase Auth
- **Email & Password**: Create an account or sign in securely with your email and password. Your session is securely preserved across browser visits.
- **Forgot Password**: Use the built-in password reset link in the login dialog to receive a reset email.
- **Guest / Offline Mode**: Click **"Continue as Guest (Offline)"** to use the application immediately without signing in. All notes and workspace records remain fully functional and saved to your local browser storage (IndexedDB).

### 0.2 Connecting Google Drive
- Notes synchronization requires a Google account with Drive permissions.
- In **Settings &rarr; Preferences** or via the note sync banner, click **"Connect Google Drive"** to authorize access.
- Once connected, your Google token coordinates background synchronization directly with your personal Google Drive (`My Drive/NoteVault/`).

---

## 1. Core Mental Model: Google Drive Notes

```
My Drive/
└── NoteVault/                         ← Root folder created by the app
    ├── .notevault.json                ← Root order manifest
    ├── Personal/                      ← Notebook folder
    │   ├── .notevault.json            ← Notebook metadata (section order, color)
    │   ├── _attachments/              ← Images, PDFs, and binary attachments
    │   │   └── 20260103-a1b2c3-diagram.png
    │   ├── Recipes/                   ← Section folder (colored tab)
    │   │   ├── Pasta Notes.md         ← Page (.md with YAML front-matter)
    │   │   └── Dosa Batter.md
    │   └── Travel/                    ← Section folder
    └── Work/                          ← Notebook folder
        └── Architecture/
            └── System Spec.md
```

### Hierarchy Breakdown

1. **Notebooks**: Top-level directory folders under the `NoteVault/` root folder in Google Drive.
2. **Sections**: Subfolders inside a notebook, represented in the workspace as colorful pastel tabs (Peach, Sage, Lavender, Sky, Butter, Rose).
3. **Pages**: Plain text Markdown (`.md`) files stored inside section folders.
4. **Attachments**: All images and dropped files are placed in the notebook's `_attachments/` directory and referenced using relative Markdown links (e.g. `![diagram](../_attachments/20260103-a1b2c3-diagram.png)`).

---

## 2. Page Format (Standard Markdown + YAML Front-Matter)

Every note is stored as human-readable standard Markdown with YAML front-matter:

```markdown
---
id: 7f3c2a9e-1d4b-4c6e-9a10-3b5d8e2f1a77
title: Pasta Notes
tags: [cooking, italian]
favorite: true
created: '2026-01-03T10:15:00.000Z'
updated: '2026-01-05T08:02:11.000Z'
---

# Pasta Notes

Body in normal Markdown. Image: ![diagram](../_attachments/20260103-a1b2c3-diagram.png)
```

### Critical Data Rules:
- **No Data Lock-In**: Even if NoteVault stops existing, your notes are plain text `.md` files that can be opened in Obsidian, VS Code, Typora, MarkText, or any text editor.
- **Relative Attachments**: Relative links ensure images render properly on your local desktop when downloading the Drive folder.
- **Unknown Front-Matter Preservation**: If you add custom YAML attributes (`author:`, `status:`, `rating:`), NoteVault preserves them without stripping user data.

---

## 3. Offline Capabilities & Sync Engine

NoteVault is built offline-first using **Dexie (IndexedDB)**:
- **Immediate Write Path**: When you type, changes are saved locally to IndexedDB within 300 ms.
- **Outbox Queue**: A local outbox records creates, updates, renames, moves, and attachment uploads.
- **Debounced Cloud Sync**: When connected to the internet, pending changes automatically flush to Google Drive (1.5s debounce after typing, and periodic checks every 60s).
- **Offline Indicator**: When offline, the app displays an offline status pill indicating the number of pending changes. All read/write features continue working.

---

## 4. Conflict Handling (Zero Data Loss)

If a note was modified on Google Drive while you were editing it locally offline:
1. NoteVault compares the local base version with the remote `headRevisionId` / `modifiedTime`.
2. When a conflict occurs, NoteVault **never silently overwrites**.
3. A **Conflict Resolution Dialog** displays a side-by-side comparison of:
   - **Local Version** (your device's edits)
   - **Remote Version** (Google Drive version)
4. Choose from:
   - **Keep Both (Recommended)**: Keeps the remote version on the main note and creates a sibling note named `Title (conflict YYYY-MM-DD HH-mm).md` with your local edits.
   - **Keep Local**: Overwrites Google Drive with your local version.
   - **Keep Remote**: Discards local edits and takes Drive's version.

---

## 5. Recovery Guarantee (Acceptance Test 4.6)

If you wipe your browser cache or IndexedDB database:
1. Open NoteVault and sign into your Google account.
2. Go to **Settings &rarr; Preferences &rarr; Cloud Sync & Recovery**.
3. Click **Rebuild Local DB from Drive (Test 4.6)**.
4. NoteVault scans your Google Drive `NoteVault` folder, reconstructs the Notebook and Section tree, downloads page front-matter and content, re-indexes full-text search, and re-caches attachments.

---

## 6. Trash & Deletion Safety

NoteVault adheres to a strict data safety rule:
- **Permanent Deletes Are Forbidden**: NoteVault never calls `files.delete`.
- **Soft Deletion**: Moving a note, section, or notebook to trash sets `trashed: true` in Google Drive.
- **Restoration**: You can view and restore any deleted item at any time from **Settings &rarr; Trash & Recovery**.

---

## 7. Knowledge Vault Modules (Second Brain Ecosystem)

In addition to the Google Drive Markdown notebook hierarchy, NoteVault integrates the core personal management modules from Knowledge Vault:

### 🗂️ 7.1 Workspace Panels (Custom Relational Database via Supabase)
- **Custom Panel Creation**: Create custom boards for Active Projects, Key Contacts, Research & Reading, Meeting Notes, or Inventory.
- **Custom Schema Builder**: Define custom fields per panel:
  - `Text`: Short single-line input.
  - `Textarea`: Multi-line text for detailed notes or rich content.
  - `Date`: Calendar dates for milestones and deadlines.
  - `URL`: Clickable links for resources and external references.
  - `Select`: Predefined single-select options.
  - `Tags`: Categorization badges.
- **Real-Time Sync**: Backed by Supabase tables (`panels`, `panel_fields`, `panel_entries`) with instant local Dexie v3 caching so the UI remains instantaneous even without an internet connection.

### 🎯 7.2 Eisenhower Decision Matrix & Tasks
- **Q1 (Urgent & Important - Do First)**: High impact deadlines and critical bugs.
- **Q2 (Not Urgent & Important - Schedule & Focus)**: Strategic architecture, deep work, health, learning.
- **Q3 (Urgent & Not Important - Delegate)**: Routine reviews, minor requests.
- **Q4 (Not Urgent & Not Important - Eliminate / Backlog)**: Distractions and long-term bucket list items.
- **Features**: Toggle completion, category filtering, overdue badges, quick quadrant reassignment dropdown, and dual layout (4-Quadrant Matrix or Linear List).

### 🔥 7.3 Habits & Daily Streaks
- **7-Day Dynamic Window**: Visual checkoff circles for the past week up to today.
- **Dynamic Streaks**: Automatically computes consecutive streak days and tracks personal all-time best streaks.
- **Category & Color Coding**: Distinguish between Fitness, Productivity, Mindset, and Learning.
- **Daily Progress**: Real-time progress bar showing today's completion percentage.

### 💳 7.4 Finance & Expense Ledger
- **Cashflow Metrics**: Instant calculation of Total Income, Total Expenses, and Net Balance formatted in ₹ INR.
- **Reimbursable Claims**: Track business/consulting expenses marked for reimbursement with pending totals.
- **Ledger & Filters**: Filter transactions by type (All / Income / Expense) and by Category.

### 🌐 7.5 Intel & Policy Aggregator
- **Curated Feeds**: Centralizes news from PIB India (Government notifications), Startup India, Policy Gazette, and AI/Tech publications.
- **Search & Filter**: Keyword search across titles and summaries, plus category filtering.
- **Read / Bookmark Status**: One-click toggling of read status to curate your personal intelligence digest.

### 💾 7.6 Backup & Portability
- All Knowledge Vault modules store data locally in **IndexedDB (Dexie v3)** for instant zero-latency offline access.
- Use **Settings &rarr; Export JSON Backup** to download your complete Second Brain (Workspace Panels, Custom Fields, Panel Entries, Notebooks, Sections, Pages, Tasks, Habits, Expenses, and Intel bookmarks) in a single portable JSON file (Schema Version 3).

