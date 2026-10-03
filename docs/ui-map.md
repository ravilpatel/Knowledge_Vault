# NoteVault — UI Screen Mapping

This document maps all generated Stitch MCP designs to the corresponding React components implemented in the application codebase.

Stitch Project: **NoteVault** (`projects/425993547239346799`)
Design System: **Tactile Productivity** (`assets/9371d459285c446ab73cfeae67552ecd`)

---

## Screen Mapping Table

| # | Screen Name | Device & Theme | Stitch Screen ID | React Component(s) | Description |
|---|-------------|----------------|------------------|--------------------|-------------|
| 1 | Main Workspace | Desktop (Light) | `6b43c6c4c6e249e0892f10a097264223` | `src/app/WorkspaceLayout.tsx`<br>`src/components/NotebookRail.tsx`<br>`src/components/SectionTabs.tsx`<br>`src/components/PageList.tsx`<br>`src/components/EditorPane.tsx`<br>`src/components/PreviewPane.tsx` | Full 3-pane OneNote-inspired desktop workspace with section tabs and top header |
| 2 | Main Workspace | Desktop (Dark) | `a87851b595ce465b874b763f0643d4bd` | `src/app/WorkspaceLayout.tsx` (dark mode classes & theme provider) | Slate obsidian dark theme with syntax highlighting and dark preview |
| 3 | Mobile Stack: Notebooks | Mobile (Light) | `40527bb2c7e74abba8b40ff84c55c762` | `src/components/mobile/MobileNotebooks.tsx` | Mobile root view with notebook cards, search, and bottom navigation |
| 3b | Mobile Stack: Sections | Mobile (Light) | `27b150d0888f4298923ce5734ce2e142` | `src/components/mobile/MobileSections.tsx` | Mobile pastel section cards inside selected notebook |
| 3c | Mobile Stack: Pages | Mobile (Light) | `3ba6d7f4f15641d4845f3a6629e38692` | `src/components/mobile/MobilePages.tsx` | Mobile page cards inside selected section with FAB button |
| 3d | Mobile Stack: Editor | Mobile (Light) | `3821148a2c374f7dbee92576eb35ad45` | `src/components/mobile/MobileEditor.tsx` | Mobile editor with Edit/Preview toggle and sticky keyboard formatting toolbar |
| 4 | Search & Command Palette | Desktop (Modal) | `908d5b2b795c40cdaab2869f37af03df` | `src/components/CommandPalette.tsx` | `Ctrl+K` omnibar search modal with filters, operators, snippets, and keyboard navigation |
| 5 | Editor Details & Upload | Desktop (Detail) | `4a331a0bfac14d069965cf4548c04f6a` | `src/features/editor/MarkdownEditor.tsx`<br>`src/components/FormattingToolbar.tsx`<br>`src/features/editor/AttachmentUploadBanner.tsx` | Full formatting toolbar, CodeMirror 6 markdown editor, image upload progress bar, copyable code blocks |
| 6 | Sign-in & Onboarding | Desktop (Light) | `ff29df21760f42759a52fa1dfa6cace7` | `src/features/auth/SignInModal.tsx`<br>`src/features/auth/OnboardingCard.tsx` | Connect Google Drive onboarding card, value propositions, folder selection |
| 7 | Sync States & Conflict Dialog | Desktop (Modal) | `f445295e0cf049c59bfed80b231a2773` | `src/components/StatusPill.tsx`<br>`src/components/OfflineBanner.tsx`<br>`src/features/sync/ConflictModal.tsx` | Persistent status indicator (Synced/Syncing/Offline/Error) and side-by-side version conflict reconciliation modal |
| 8 | Settings & Trash | Desktop (Modal) | `8b77c6e99ec04144b641285801ac4f21` | `src/components/SettingsModal.tsx`<br>`src/components/TrashView.tsx` | Two-tab settings dialog with Drive trash recovery, theme selector, editor preferences, rebuild local data, and storage meter |
| 9 | Empty & Loading States | Desktop (Canvas) | `360ebb06996444faa463cedd8dafe053` | `src/components/EmptyNotebook.tsx`<br>`src/components/EmptySection.tsx`<br>`src/components/SkeletonLoader.tsx` | Empty notebook and section states with quick action CTAs, plus pulse shimmer skeletons |
