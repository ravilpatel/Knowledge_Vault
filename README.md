# NoteVault — Google Drive Markdown Notebook PWA

A OneNote-style, Markdown-first notebook Progressive Web App (PWA) that stores all notes and attachments directly in your own Google Drive account.

Built with **React 18 + TypeScript + Vite + Tailwind CSS + Dexie (IndexedDB) + CodeMirror 6 + Google Drive REST API v3**. Designed with the **Tactile Productivity** design system via Stitch MCP.

---

## 🌟 Key Features

- 📓 **OneNote Mental Model**: Organizes notes hierarchically into **Notebooks &rarr; Sections (colored tabs) &rarr; Pages**.
- ✍️ **Markdown-First Editing**: CodeMirror 6 editor with live split preview, GFM checklists, syntax code blocks with copy buttons, GitHub-style alerts (`> [!NOTE]`), and Wiki links `[[Page Title]]`.
- 📁 **Zero Proprietary Lock-In**: Notes are plain `.md` files with YAML front-matter stored in standard folders in your personal Google Drive. Even without NoteVault, your notes open in any text editor or Markdown app.
- ⚡ **Full Offline Read/Write**: Dexie (IndexedDB v4) caches all notes and media attachments locally. Changes are debounced and queued in a local outbox.
- 🔄 **Safe Background Sync & Conflict Reconciliation**: Bi-directional sync with Google Drive. If a conflict occurs, both versions are kept (`Title (conflict YYYY-MM-DD HH-mm).md`) and a side-by-side reconciliation dialog is provided.
- 🛡️ **Zero-Loss Data Safety Guarantee**: Permanent file deletion is forbidden (`files.delete` is never called); deleted items move to Drive Trash (`trashed: true`) and can be restored anytime.
- 🔍 **Instant Full-Text Search**: Offline MiniSearch index with query operator support (`tag:cooking`, `in:Recipes`, `is:favorite`) and highlighted search snippets.
- 🖼️ **Attachments**: Drag-and-drop or paste images directly into notes. Files are saved in the notebook's `_attachments/` folder and linked with relative paths (`../_attachments/...`).
- 📱 **Responsive PWA**: Full desktop 3-pane layout and mobile stack drill-down with installable PWA service worker.

---

## 🛠️ Tech Stack

- **Framework:** React 18, TypeScript (Strict Mode), Vite 5
- **Styling:** Tailwind CSS, Lucide Icons, Plus Jakarta Sans / Inter / JetBrains Mono typography
- **Local Data Layer:** Dexie.js (IndexedDB v4)
- **Editor:** CodeMirror 6 (`@codemirror/lang-markdown`, `@codemirror/theme-one-dark`)
- **Search:** MiniSearch (local full-text index persisted to IndexedDB)
- **Cloud Storage:** Google Identity Services (token model) + Google Drive REST API v3 + Google Picker API
- **PWA:** `vite-plugin-pwa` (Workbox offline precaching of app shell)
- **Testing:** Vitest + `fake-indexeddb`

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ and npm
- A Google Cloud account (for Google Drive sync) or test offline immediately in **Guest Mode**.

### 2. Installation
```bash
git clone https://github.com/your-username/notevault.git
cd notevault
npm install
```

### 3. Configure Google Cloud Console (OAuth 2.0 Client)

To connect NoteVault with your personal Google Drive:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `NoteVault-Personal`).
3. Enable the following APIs in **APIs & Services &rarr; Library**:
   - **Google Drive API**
   - **Google Picker API**
4. Configure the **OAuth consent screen**:
   - User Type: **External**
   - App name: `NoteVault`
   - User support email: your email
   - Scopes: add `https://www.googleapis.com/auth/drive.file` and `userinfo.profile`
   - **Test users:** Add your Google email address under **Test users** (important for apps in Testing mode).
5. Create OAuth Credentials in **APIs & Services &rarr; Credentials**:
   - Click **Create Credentials &rarr; OAuth client ID**.
   - Application type: **Web application**.
   - Name: `NoteVault Web Client`.
   - **Authorized JavaScript origins:**
     - `http://localhost:5173`
     - `http://localhost:4173` (for production preview)
     - `https://your-production-domain.com` (if deployed)
6. Copy your **Client ID** (it looks like `123456789-abc.apps.googleusercontent.com`).

### 4. Set Environment Variables

Create a `.env` file in the root directory:
```env
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
```

> **Guest Mode**: If you do not configure a Client ID immediately, you can click **Continue Offline in Guest Mode** on the login screen to write and organize notes locally using IndexedDB.

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
