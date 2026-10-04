import React from 'react';
import { useSyncStore } from '../features/sync/syncStore';
import { useNoteStore } from '../features/notes/noteStore';
import { db } from '../db/db';
import { syncEngine } from '../features/sync/syncEngine';
import { formatRelativeTime } from '../lib/date';
import { AlertTriangle, HardDrive, Cloud, X } from 'lucide-react';
import { serializePageMarkdown } from '../lib/frontmatter';

export const ConflictModal: React.FC = () => {
  const { activeConflict, setActiveConflict } = useSyncStore();
  const { createPage } = useNoteStore();

  if (!activeConflict) return null;

  const handleKeepLocal = async () => {
    // Re-queue upload with current local content
    const page = await db.pages.get(activeConflict.pageId);
    if (page) {
      page.localDirty = true;
      await db.pages.put(page);
      await syncEngine.queueOutbox('update_page', page.id, page.notebookId, page.sectionId, {
        rawMarkdown: page.rawMarkdown,
        title: page.title,
      });
      syncEngine.flushOutbox();
    }
    setActiveConflict(null);
  };

  const handleKeepRemote = async () => {
    // Overwrite local with remote content
    const page = await db.pages.get(activeConflict.pageId);
    if (page) {
      page.content = activeConflict.remoteContent;
      page.updated = activeConflict.remoteUpdated || new Date().toISOString();
      page.localDirty = false;
      page.rawMarkdown = serializePageMarkdown(
        {
          id: page.id,
          title: page.title,
          tags: page.tags,
          favorite: page.favorite,
          created: page.created,
          updated: page.updated,
        },
        page.content
      );
      await db.pages.put(page);
      useNoteStore.setState((state) => ({
        pages: state.pages.map((p) => (p.id === page.id ? page : p)),
      }));
    }
    setActiveConflict(null);
  };

  const handleKeepBoth = async () => {
    // Remote stays on original page, local gets saved as a conflict sibling
    const page = await db.pages.get(activeConflict.pageId);
    if (page) {
      const now = new Date();
      const dateTag = now.toISOString().replace(/[:T]/g, '-').slice(0, 16);
      const conflictTitle = `${page.title} (conflict ${dateTag})`;

      // 1. Create sibling with local content
      await createPage(
        page.notebookId,
        page.sectionId,
        conflictTitle,
        activeConflict.localContent
      );

      // 2. Set original page to remote content
      await handleKeepRemote();
    }
    setActiveConflict(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={() => setActiveConflict(null)}
    >
      <div
        className="relative w-full max-w-4xl bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle dark:border-border-darkSubtle bg-amber-500/10 text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Sync Conflict Detected: {activeConflict.title}</h3>
              <p className="text-xs opacity-90">
                This note was modified both locally and on Supabase Cloud. Choose how to resolve it.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveConflict(null)}
            className="p-1 rounded-lg hover:bg-black/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Side-by-side comparison */}
        <div className="flex-1 grid grid-cols-2 divide-x divide-border-subtle dark:divide-border-darkSubtle overflow-hidden">
          {/* Local Column */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-3 bg-surface-subtle dark:bg-surface-subtleDark border-b border-border-subtle dark:border-border-darkSubtle flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary">
                <HardDrive className="w-3.5 h-3.5 text-brand-primary" /> Local Version (This Device)
              </span>
              <span className="text-[11px] text-ink-muted">
                Edited {formatRelativeTime(activeConflict.localUpdated)}
              </span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-ink-primary dark:text-ink-darkPrimary whitespace-pre-wrap leading-relaxed select-text bg-slate-50/50 dark:bg-slate-900/50">
              {activeConflict.localContent || '(Empty document)'}
            </div>
          </div>

          {/* Remote Column */}
          <div className="flex flex-col h-full overflow-hidden">
            <div className="p-3 bg-surface-subtle dark:bg-surface-subtleDark border-b border-border-subtle dark:border-border-darkSubtle flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary">
                <Cloud className="w-3.5 h-3.5 text-indigo-500" /> Supabase Cloud Remote Version
              </span>
              <span className="text-[11px] text-ink-muted">
                Edited {formatRelativeTime(activeConflict.remoteUpdated)}
              </span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-ink-primary dark:text-ink-darkPrimary whitespace-pre-wrap leading-relaxed select-text bg-slate-50/50 dark:bg-slate-900/50">
              {activeConflict.remoteContent || '(Empty document)'}
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-surface-subtle dark:bg-surface-subtleDark border-t border-border-subtle dark:border-border-darkSubtle flex items-center justify-between gap-3">
          <p className="text-xs text-ink-muted hidden sm:block">
            &ldquo;Keep Both&rdquo; prevents any accidental data loss.
          </p>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleKeepLocal}
              className="px-3.5 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Overwrite Supabase Cloud with your local version"
            >
              Keep Local Only
            </button>

            <button
              onClick={handleKeepRemote}
              className="px-3.5 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Discard your local edits and keep Supabase's version"
            >
              Keep Remote Only
            </button>

            <button
              onClick={handleKeepBoth}
              className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-sm"
              title="Keep both by creating a conflict copy"
            >
              Keep Both (Recommended)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
