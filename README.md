# NoteVault + Knowledge Vault — Personal Knowledge & Second Brain PWA

A unified personal knowledge base and productivity ecosystem that combines **OneNote-style Markdown notes** with **Supabase-powered Workspace Panels and productivity modules**, secured entirely by **Supabase Auth & PostgreSQL**.

Built with **React 18 + TypeScript + Vite + Tailwind CSS + Dexie (IndexedDB v5) + CodeMirror 6 + Supabase**. Designed with the **Tactile Productivity** design system via Stitch MCP.

---

## 🏛️ Cloud & Offline-First Architecture: Supabase + Dexie

NoteVault & Knowledge Vault uses a unified **Supabase Cloud + local Dexie (IndexedDB)** architecture:

| Domain | Cloud Backend | Local Cache | Storage Format |
|---|---|---|---|
| **User Identity & Login** | **Supabase Auth** | LocalStorage / Session | JWT tokens, secure session |
| **Notes & Notebooks** | **Supabase** (`notebooks`, `sections`, `pages`) | Dexie (`notebooks`, `sections`, `pages`) | Relational rows + Markdown + YAML front-matter |
| **Note Media & Attachments** | **Supabase Storage** (`notevault-attachments`) | Dexie (`attachments`) | Binary blobs + CDN storage URLs |
| **Workspace Custom Panels** | **Supabase** (`panels`, `panel_fields`, `panel_entries`) | Dexie (`panels`, `panel_fields`, `panel_entries`) | Relational JSON schema & custom fields |
| **Directory Entities** | **Supabase** (`people`, `companies`, `projects`, `technologies`) | Dexie (`people`, `companies`, `projects`, `technologies`) | Relational entities with bi-directional links |
| **Tasks & Eisenhower Matrix** | **Supabase** (`todos`) | Dexie (`todos`) | Relational rows |
| **Habits & Daily Streaks** | **Supabase** (`habits`, `habit_logs`) | Dexie (`habits`, `habit_logs`) | Relational rows + dynamic streak calculation |
| **Finance Ledger** | **Supabase** (`expenses`) | Dexie (`expenses`) | Relational rows + ₹ INR formatting |
| **Intel & Policy Feeds** | **Supabase** (`news_items`) | Dexie (`news_items`) | Relational rows + read status |
| **Preferences & Settings** | **Supabase** (`user_settings`) | Dexie (`user_settings`) | SMTP, notifications, currency, news config |

---

## 🌟 Key Features

### 🔐 Supabase Authentication (Unified Identity)
- **Email & Password Sign-In & Sign-Up**: Powered by Supabase Auth with session persistence and automatic token refresh.
- **Password Recovery**: Built-in email reset flow directly from the auth modal.
- **Guest / Offline Mode**: Instant one-click access without logging in; works 100% offline via local Dexie IndexedDB.
- **Row Level Security (RLS)**: Fine-grained PostgreSQL security policies ensure every user only accesses their own notes and data.

### 📓 NoteVault (Notes & Knowledge Base via Supabase)
- 📓 **OneNote Mental Model**: Organizes notes hierarchically into **Notebooks &rarr; Sections (colored tabs) &rarr; Pages**.
- ✍️ **Markdown-First Editing**: CodeMirror 6 editor with live split preview, GFM checklists, syntax code blocks with copy buttons, GitHub-style alerts (`> [!NOTE]`), and Wiki links `[[Page Title]]`.
- ⚡ **Full Offline Read/Write**: Dexie (IndexedDB v5) caches all notes and media attachments locally. Changes are debounced and queued in a local outbox.
- 🔄 **Safe Supabase Background Sync**: Automatic synchronization with Supabase Cloud. If a conflict occurs, both versions are kept (`Title (conflict YYYY-MM-DD HH-mm).md`) with a side-by-side reconciliation dialog.
- 🛡️ **Zero-Loss Data Safety Guarantee**: Soft deletion (`trashed: true`) prevents accidental data loss; items can be restored anytime from Trash.
- 🔍 **Instant Full-Text Search**: Offline MiniSearch index with query operator support (`tag:cooking`, `in:Recipes`, `is:favorite`) and highlighted search snippets.
- 🖼️ **Attachments**: Drag-and-drop or paste images directly into notes. Media files sync with Supabase Storage bucket (`notevault-attachments`).

### 🗂️ Workspace Panels & Directory
- **Dynamic Custom Panels**: Create custom tracking boards (e.g. Active Projects, Research & Reading, Key Contacts, Inventory, Meeting Notes).
- **Custom Schema Builder**: Define custom fields per panel (`Text`, `Textarea`, `Date`, `URL`, `Select`, `Tags`, `Person Link`, `Project Link`, `Rating`).
- **Directory Entities Management**:
  - 👥 **People**: Contact records, roles, organizations, linked projects & tech.
  - 🏢 **Companies**: Organization profiles, industries, websites, key contacts.
  - 💼 **Projects**: Status tracking, descriptions, linked team members and companies.
  - ⚡ **Technologies**: Tech stack directory, categorizations, and active usages.

### 🧠 Knowledge Vault Integrated Productivity Modules
- 🎯 **Tasks & Eisenhower Decision Matrix**: 4-Quadrant prioritization (Q1: Do First, Q2: Schedule & Focus, Q3: Delegate, Q4: Eliminate) with category filtering and overdue tracking.
- 🔥 **Habit Tracker & Daily Streaks**: Interactive 7-day checklist grid, dynamic streak calculation, best streak history, and completion progress bars.
- 💳 **Finance & Expense Ledger**: Cashflow summary cards (Net balance, Total Income, Total Expenses, Reimbursable claims) with ₹ INR formatting.
- 🌐 **Intel & Policy Aggregator**: Curated news feeds, search, and category filters.
- 📱 **Responsive PWA**: Full desktop multi-pane layout, top navigation switcher, and mobile stack drill-down with installable PWA service worker.

---

## 🛠️ Tech Stack

- **Framework:** React 18, TypeScript (Strict Mode), Vite 5
- **Styling:** Tailwind CSS, Lucide Icons, Plus Jakarta Sans / Inter / JetBrains Mono typography
- **Cloud Database & Auth:** Supabase (`@supabase/supabase-js`, PostgreSQL, Row Level Security, Storage)
- **Local Data Layer:** Dexie.js (IndexedDB v5) with 15 tables
- **Editor:** CodeMirror 6 (`@codemirror/lang-markdown`, `@codemirror/theme-one-dark`)
- **Search:** MiniSearch (local full-text index persisted to IndexedDB)
- **PWA:** `vite-plugin-pwa` (Workbox offline precaching of app shell)
- **Testing:** Vitest + `fake-indexeddb`

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- A [Supabase account & project](https://supabase.com)

### 2. Installation
```bash
git clone https://github.com/your-username/notevault.git
cd notevault
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:
```env
# Supabase Configuration (Authentication, Notebooks & Workspace)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Database Setup (Supabase SQL Editor)

Run the SQL migration files in the **Supabase Dashboard > SQL Editor**:
- `supabase/schema_notebooks.sql` (Creates `notebooks`, `sections`, `pages`, `note_attachments` tables, RLS policies, and storage bucket)

### 5. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

Run the automated test suite with Vitest:
```bash
npm test
```

Build the production PWA bundle (type-checks with `tsc` and bundles with Vite):
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 📄 License

MIT License. Designed and engineered for personal data ownership and peace of mind.
