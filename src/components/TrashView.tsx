import React from 'react';
import { useNoteStore } from '../features/notes/noteStore';
import { formatRelativeTime } from '../lib/date';
import { Trash2, RotateCcw, Book, Folder, FileText, ShieldCheck } from 'lucide-react';

export const TrashView: React.FC = () => {
  const {
    notebooks,
    sections,
    pages,
    restoreNotebook,
    restoreSection,
    restorePage,
  } = useNoteStore();

  const trashedNotebooks = notebooks.filter((n) => n.trashed);
  const trashedSections = sections.filter((s) => s.trashed);
  const trashedPages = pages.filter((p) => p.trashed);

  const totalTrashed = trashedNotebooks.length + trashedSections.length + trashedPages.length;

  return (
    <div className="space-y-6">
      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-brand-light/60 dark:bg-brand-primary/10 border border-brand-primary/20 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-brand-primary dark:text-brand-darkPrimary flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-ink-primary dark:text-ink-darkPrimary">
            Zero-Loss Data Safety Guarantee
          </h4>
          <p className="text-ink-secondary dark:text-ink-darkSecondary mt-0.5 leading-relaxed">
            NoteVault never permanently deletes your notes from Google Drive. Trashed items are moved to Drive&apos;s trash bin (<code className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">trashed: true</code>) and can be restored anytime without losing version history or attachments.
          </p>
        </div>
      </div>

      {totalTrashed === 0 ? (
        <div className="p-12 text-center text-ink-muted dark:text-ink-darkMuted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-xl">
          <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-semibold">Trash is empty</p>
          <p className="text-xs mt-1">Deleted notebooks, sections, and pages will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Trashed Notebooks */}
          {trashedNotebooks.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                Notebooks ({trashedNotebooks.length})
              </h4>
              <div className="divide-y divide-border-subtle dark:divide-border-darkSubtle border border-border-subtle dark:border-border-darkSubtle rounded-xl overflow-hidden bg-surface dark:bg-surface-dark">
                {trashedNotebooks.map((nb) => (
                  <div key={nb.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Book className="w-4 h-4 text-brand-primary" />
                      <span className="text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary">
                        {nb.name}
                      </span>
                    </div>
                    <button
                      onClick={() => restoreNotebook(nb.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-light dark:bg-brand-primary/15 text-brand-primary hover:bg-brand-primary hover:text-white transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trashed Sections */}
          {trashedSections.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                Sections ({trashedSections.length})
              </h4>
              <div className="divide-y divide-border-subtle dark:divide-border-darkSubtle border border-border-subtle dark:border-border-darkSubtle rounded-xl overflow-hidden bg-surface dark:bg-surface-dark">
                {trashedSections.map((sec) => (
                  <div key={sec.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Folder className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary">
                        {sec.name}
                      </span>
                    </div>
                    <button
                      onClick={() => restoreSection(sec.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-light dark:bg-brand-primary/15 text-brand-primary hover:bg-brand-primary hover:text-white transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trashed Pages */}
          {trashedPages.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                Pages ({trashedPages.length})
              </h4>
              <div className="divide-y divide-border-subtle dark:divide-border-darkSubtle border border-border-subtle dark:border-border-darkSubtle rounded-xl overflow-hidden bg-surface dark:bg-surface-dark max-h-60 overflow-y-auto">
                {trashedPages.map((page) => (
                  <div key={page.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-ink-muted flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary block truncate">
                          {page.title || 'Untitled Note'}
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          Deleted {formatRelativeTime(page.updated)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => restorePage(page.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-light dark:bg-brand-primary/15 text-brand-primary hover:bg-brand-primary hover:text-white transition ml-2 flex-shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
