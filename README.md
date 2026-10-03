# NoteVault + Knowledge Vault — Personal Knowledge & Second Brain PWA

A unified personal knowledge base and productivity ecosystem that combines **OneNote-style Google Drive Markdown notes** with **Supabase-powered Workspace Panels and productivity modules**, secured by **Supabase Auth**.

Built with **React 18 + TypeScript + Vite + Tailwind CSS + Dexie (IndexedDB v3) + CodeMirror 6 + Supabase + Google Drive REST API v3**. Designed with the **Tactile Productivity** design system via Stitch MCP.

---

## 🏛️ Architectural Split: Google Drive + Supabase

NoteVault & Knowledge Vault uses a purpose-built **hybrid cloud architecture** with zero proprietary server lock-in:

| Domain | Cloud Backend | Local Cache | Storage Format |
|---|---|---|---|
| **User Identity & Login** | **Supabase Auth** | LocalStorage / Session | JWT tokens, secure session |
| **Notes & Notebooks** | **Google Drive** (`My Drive/NoteVault/`) | Dexie (`notebooks`, `sections`, `pages`) | Plain `.md` + YAML front-matter, relative attachments |
| **Workspace Custom Panels** | **Supabase** (`panels`, `panel_fields`, `panel_entries`) | Dexie (`panels`, `panel_fields`, `panel_entries`) | Relational JSON schema & custom fields |
| **Tasks & Eisenhower Matrix** | **Supabase** (`todos`) / Local DB | Dexie (`todos`) | Relational rows |
| **Habits & Daily Streaks** | **Supabase** (`habits`, `habit_logs`) / Local DB | Dexie (`habits`, `habit_logs`) | Relational rows + 7-day log grid |
| **Finance Ledger** | **Supabase** (`expenses`) / Local DB | Dexie (`expenses`) | Relational rows + ₹ INR formatting |
| **Intel & Policy Feeds** | **Supabase** (`news_items`) / Local DB | Dexie (`news_items`) | Relational rows + read status |

---

## 🌟 Key Features

### 🔐 Supabase Authentication (Primary Login)
- **Email & Password Sign-In & Sign-Up**: Powered by Supabase Auth with session persistence and automatic token refresh.
- **Password Recovery**: Built-in email reset flow directly from the auth modal.
- **Guest / Offline Mode**: Instant one-click access without logging in; works 100% offline via local Dexie IndexedDB.
- **Linked Google Account**: Connect your Google account anytime to unlock seamless background sync to Google Drive.

### 🗂️ Workspace Panels (Custom Relational Database via Supabase)
- **Dynamic Custom Panels**: Create custom tracking boards (e.g. Active Projects, Research & Reading, Key Contacts, Inventory, Meeting Notes).
- **Custom Schema Builder**: Define custom fields per panel:
  - `Text` (single line text)
  - `Textarea` (multi-line notes / markdown)
  - `Date` (due dates, milestones)
  - `URL` (clickable web links)
  - `Select` (custom single-choice dropdowns)
  - `Tags` (multi-tag badges)
- **Instant Local + Cloud Sync**: Powered by Dexie IndexedDB v3 for instant zero-latency UI updates with background syncing to Supabase tables.

### 📓 NoteVault (Notes & Knowledge Base via Google Drive)
- 📓 **OneNote Mental Model**: Organizes notes hierarchically into **Notebooks &rarr; Sections (colored tabs) &rarr; Pages**.
- ✍️ **Markdown-First Editing**: CodeMirror 6 editor with live split preview, GFM checklists, syntax code blocks with copy buttons, GitHub-style alerts (`> [!NOTE]`), and Wiki links `[[Page Title]]`.
- 📁 **Zero Proprietary Lock-In**: Notes are plain `.md` files with YAML front-matter stored in standard folders in your personal Google Drive (`My Drive/NoteVault/`). Even without NoteVault, your notes open in any text editor or Markdown app.
- ⚡ **Full Offline Read/Write**: Dexie (IndexedDB) caches all notes and media attachments locally. Changes are debounced and queued in a local outbox.
- 🔄 **Safe Background Sync & Conflict Reconciliation**: Bi-directional sync with Google Drive. If a conflict occurs, both versions are kept (`Title (conflict YYYY-MM-DD HH-mm).md`) and a side-by-side reconciliation dialog is provided.
- 🛡️ **Zero-Loss Data Safety Guarantee**: Permanent file deletion is forbidden (`files.delete` is never called); deleted items move to Drive Trash (`trashed: true`) and can be restored anytime.
- 🔍 **Instant Full-Text Search**: Offline MiniSearch index with query operator support (`tag:cooking`, `in:Recipes`, `is:favorite`) and highlighted search snippets.
- 🖼️ **Attachments**: Drag-and-drop or paste images directly into notes. Files are saved in the notebook's `_attachments/` folder and linked with relative paths (`../_attachments/...`).

### 🧠 Knowledge Vault Integrated Productivity Modules
- 🎯 **Tasks & Eisenhower Decision Matrix**: 4-Quadrant prioritization (Q1: Do First, Q2: Schedule & Focus, Q3: Delegate, Q4: Eliminate) with category filtering, overdue tracking, and fast dual-view (Matrix / Kanban List).
- 🔥 **Habit Tracker & Daily Streaks**: Interactive 7-day checklist grid, dynamic streak calculation, best streak history, category grouping, and daily progress completion bars.
- 💳 **Finance & Expense Ledger**: Cashflow summary cards (Net balance, Total Income, Total Expenses, Reimbursable claims), ₹ INR formatting, category tagging, and receipt claim tracking.
- 🌐 **Intel & Policy Aggregator**: Curated news feeds (PIB India, Startup India, Gazette policies, AI/Tech), full-text search, category filters, and read/unread bookmark state.
- 📱 **Responsive PWA**: Full desktop multi-pane layout, top navigation switcher, and mobile stack drill-down with installable PWA service worker.

---

## 🛠️ Tech Stack

- **Framework:** React 18, TypeScript (Strict Mode), Vite 5
- **Styling:** Tailwind CSS, Lucide Icons, Plus Jakarta Sans / Inter / JetBrains Mono typography
- **Identity & Relational Cloud:** Supabase (`@supabase/supabase-js`, PostgreSQL, Row Level Security)
- **Note Cloud Storage:** Google Identity Services (token model) + Google Drive REST API v3 + Google Picker API
- **Local Data Layer:** Dexie.js (IndexedDB v3) with 11 tables
- **Editor:** CodeMirror 6 (`@codemirror/lang-markdown`, `@codemirror/theme-one-dark`)
- **Search:** MiniSearch (local full-text index persisted to IndexedDB)
- **PWA:** `vite-plugin-pwa` (Workbox offline precaching of app shell)
- **Testing:** Vitest + `fake-indexeddb`

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- A [Supabase account & project](https://supabase.com) (configured automatically via `.env`)
- A Google Cloud account (for Google Drive sync) or test offline in **Guest Mode**

### 2. Installation
```bash
git clone https://github.com/your-username/notevault.git
cd notevault
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:
```env
# Supabase Configuration (Authentication & Workspace Panels)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Drive Configuration (Notes & Attachments)
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

### 4. Configure Google Cloud Console (OAuth 2.0 Client for Notes)

To sync NoteVault Markdown notes with your personal Google Drive:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `NoteVault-Personal`).
3. Enable the following APIs in **APIs & Services &rarr; Library**:
   - **Google Drive API**
   - **Google Picker API**
4. Configure the **OAuth consent screen**:
   - User Type: **External**
   - App name: `NoteVault`
   - Scopes: add `https://www.googleapis.com/auth/drive.file` and `userinfo.profile`
   - **Test users:** Add your Google email address under **Test users**.
5. Create OAuth Credentials in **APIs & Services &rarr; Credentials**:
   - Click **Create Credentials &rarr; OAuth client ID**.
   - Application type: **Web application**.
   - Name: `NoteVault Web Client`.
   - **Authorized JavaScript origins:**
     - `http://localhost:5173`
     - `http://localhost:4173`
6. Copy your **Client ID** into `VITE_GOOGLE_CLIENT_ID` in `.env`.

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

## 📖 Documentation & Architecture

- [UI Screen Mapping (Stitch MCP)](docs/ui-map.md)
- [Design Decisions Log](docs/DECISIONS.md)
- [User & Recovery Guide](docs/USER_GUIDE.md)
- [Technical Architecture](docs/architecture.md)

---

## 📄 License

MIT License. Designed and engineered for personal data ownership and peace of mind.
