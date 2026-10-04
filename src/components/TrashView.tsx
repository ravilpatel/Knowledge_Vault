import React, { useState } from 'react';
import { useNoteStore } from '../features/notes/noteStore';
import { formatRelativeTime } from '../lib/date';
import {
  Trash2,
  RotateCcw,
  Book,
  Folder,
  FileText,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  X,
} from 'lucide-react';

export const TrashView: React.FC = () => {
  const {
    notebooks,
    sections,
    pages,
    restoreNotebook,
    restoreSection,
    restorePage,
    deleteNotebookPermanent,
    deleteSectionPermanent,
    deletePagePermanent,
    emptyTrash,
    setShowTrashView,
  } = useNoteStore();

  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<{ id: string; type: 'notebook' | 'section' | 'page'; title: string } | null>(null);

  const trashedNotebooks = notebooks.filter((n) => n.trashed);
  const trashedSections = sections.filter((s) => s.trashed);
  const trashedPages = pages.filter((p) => p.trashed);

  const totalTrashed = trashedNotebooks.length + trashedSections.length + trashedPages.length;

  const handlePermanentDelete = async () => {
    if (!deletingItemId) return;
    if (deletingItemId.type === 'notebook') {
      await deleteNotebookPermanent(deletingItemId.id);
    } else if (deletingItemId.type === 'section') {
      await deleteSectionPermanent(deletingItemId.id);
    } else if (deletingItemId.type === 'page') {
      await deletePagePermanent(deletingItemId.id);
    }
    setDeletingItemId(null);
  };

  const handleEmptyTrash = async () => {
    await emptyTrash();
    setConfirmEmpty(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle dark:border-border-darkSubtle pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTrashView(false)}
            className="p-1.5 rounded-lg text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Back to Notes"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-ink-primary dark:text-ink-darkPrimary tracking-tight">
                Trash Bin
              </h2>
              {totalTrashed > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  {totalTrashed} {totalTrashed === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-0.5">
              Restore deleted notebooks, sections, and pages, or permanently remove them.
            </p>
          </div>
        </div>

        {totalTrashed > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTrashView(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-border-subtle dark:border-border-darkSubtle text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Back to Notes
            </button>
            <button
              onClick={() => setConfirmEmpty(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-brand-light/60 dark:bg-brand-primary/10 border border-brand-primary/20 flex items-start gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-brand-primary dark:text-brand-darkPrimary flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-ink-primary dark:text-ink-darkPrimary">
            Zero-Loss Data Safety Guarantee
          </h4>
          <p className="text-ink-secondary dark:text-ink-darkSecondary mt-0.5 leading-relaxed">
            NoteVault keeps trashed items safely recoverable. Restoring an item immediately brings it back to your active notebooks and sections.
          </p>
        </div>
      </div>

      {totalTrashed === 0 ? (
        <div className="p-16 text-center text-ink-muted dark:text-ink-darkMuted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface/50 dark:bg-surface-dark/50">
          <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-ink-muted" />
          <p className="text-base font-bold text-ink-primary dark:text-ink-darkPrimary">Trash is empty</p>
          <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto leading-relaxed">
            When you delete notebooks, sections, or pages, they will appear here so you can restore or permanently delete them.
          </p>
          <button
            onClick={() => setShowTrashView(false)}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-brand-primary text-white hover:bg-brand-hover transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Notes</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Trashed Notebooks */}
          {trashedNotebooks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Book className="w-3.5 h-3.5" />
                  <span>Notebooks ({trashedNotebooks.length})</span>
                </h4>
              </div>
              <div className="divide-y divide-border-subtle dark:divide-border-darkSubtle border border-border-subtle dark:border-border-darkSubtle rounded-xl overflow-hidden bg-surface dark:bg-surface-dark shadow-xs">
                {trashedNotebooks.map((nb) => (
                  <div key={nb.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-brand-light dark:bg-brand-primary/15 text-brand-primary flex items-center justify-center flex-shrink-0">
                        <Book className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary block truncate">
                          {nb.name}
                        </span>
                        <span className="text-[10px] text-ink-muted">Notebook and its sections/pages</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => restoreNotebook(nb.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-light dark:bg-brand-primary/15 text-brand-primary hover:bg-brand-primary hover:text-white transition"
                        title="Restore notebook"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => setDeletingItemId({ id: nb.id, type: 'notebook', title: nb.name })}
                        className="p-1.5 rounded-lg text-ink-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trashed Sections */}
          {trashedSections.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" />
                  <span>Sections ({trashedSections.length})</span>
                </h4>
              </div>
              <div className="divide-y divide-border-subtle dark:divide-border-darkSubtle border border-border-subtle dark:border-border-darkSubtle rounded-xl overflow-hidden bg-surface dark:bg-surface-dark shadow-xs">
                {trashedSections.map((sec) => (
                  <div key={sec.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Folder className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary block truncate">
                          {sec.name}
                        </span>
                        <span className="text-[10px] text-ink-muted">Section tab</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => restoreSection(sec.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-light dark:bg-brand-primary/15 text-brand-primary hover:bg-brand-primary hover:text-white transition"
                        title="Restore section"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => setDeletingItemId({ id: sec.id, type: 'section', title: sec.name })}
                        className="p-1.5 rounded-lg text-ink-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trashed Pages */}
          {trashedPages.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Pages ({trashedPages.length})</span>
                </h4>
              </div>
              <div className="divide-y divide-border-subtle dark:divide-border-darkSubtle border border-border-subtle dark:border-border-darkSubtle rounded-xl overflow-hidden bg-surface dark:bg-surface-dark shadow-xs max-h-96 overflow-y-auto">
                {trashedPages.map((page) => (
                  <div key={page.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-ink-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-ink-primary dark:text-ink-darkPrimary block truncate">
                          {page.title || 'Untitled Note'}
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          Deleted {formatRelativeTime(page.updated)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => restorePage(page.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-light dark:bg-brand-primary/15 text-brand-primary hover:bg-brand-primary hover:text-white transition"
                        title="Restore page and open"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => setDeletingItemId({ id: page.id, type: 'page', title: page.title || 'Untitled Note' })}
                        className="p-1.5 rounded-lg text-ink-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Single Permanent Delete */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-surface-dark rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border-subtle dark:border-border-darkSubtle animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setDeletingItemId(null)}
                className="p-1 rounded-lg text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-base font-bold text-ink-primary dark:text-ink-darkPrimary mb-1">
              Delete permanently?
            </h3>
            <p className="text-xs text-ink-secondary dark:text-ink-darkSecondary leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-ink-primary dark:text-ink-darkPrimary">&quot;{deletingItemId.title}&quot;</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setDeletingItemId(null)}
                className="px-4 py-2 text-xs font-semibold text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty Trash */}
      {confirmEmpty && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface dark:bg-surface-dark rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border-subtle dark:border-border-darkSubtle animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                onClick={() => setConfirmEmpty(false)}
                className="p-1 rounded-lg text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-base font-bold text-ink-primary dark:text-ink-darkPrimary mb-1">
              Empty Entire Trash?
            </h3>
            <p className="text-xs text-ink-secondary dark:text-ink-darkSecondary leading-relaxed mb-6">
              This will permanently remove all <strong>{totalTrashed}</strong> trashed notebooks, sections, and pages. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmEmpty(false)}
                className="px-4 py-2 text-xs font-semibold text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEmptyTrash}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
