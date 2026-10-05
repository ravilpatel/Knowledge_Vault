import React, { useState, useMemo } from 'react';
import { useNoteStore } from '../features/notes/noteStore';
import {
  buildNotebookMarkdown,
  downloadMarkdownFile,
  buildNotebookPrintHtml,
  printHtmlDocument,
  buildPageMarkdown,
  buildPagePrintHtml,
} from '../lib/exportUtils';
import {
  Download,
  FileText,
  Printer,
  Check,
  Copy,
  Book,
  X,
  Sparkles,
  Calendar,
  Tag,
} from 'lucide-react';


interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialNotebookId?: string | null;
  initialPageId?: string | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  initialNotebookId,
  initialPageId,
}) => {
  const { notebooks, sections, pages, activeNotebookId, activePageId } = useNoteStore();

  const [selectedNotebookId, setSelectedNotebookId] = useState<string>(
    initialNotebookId || activeNotebookId || notebooks[0]?.id || ''
  );
  const [exportMode, setExportMode] = useState<'notebook' | 'page'>(
    initialPageId ? 'page' : 'notebook'
  );
  const [selectedPageId, setSelectedPageId] = useState<string>(
    initialPageId || activePageId || pages[0]?.id || ''
  );

  const [includeToc, setIncludeToc] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialNotebookId) {
        setSelectedNotebookId(initialNotebookId);
      } else if (activeNotebookId) {
        setSelectedNotebookId(activeNotebookId);
      }

      if (initialPageId) {
        setSelectedPageId(initialPageId);
        setExportMode('page');
      } else {
        setExportMode('notebook');
      }
      setActionSuccess(null);
    }
  }, [isOpen, initialNotebookId, initialPageId, activeNotebookId]);

  const activeNotebook = useMemo(() => {
    return notebooks.find((n) => n.id === selectedNotebookId && !n.trashed) || notebooks[0];
  }, [notebooks, selectedNotebookId]);

  const notebookSections = useMemo(() => {
    if (!activeNotebook) return [];
    return sections
      .filter((s) => s.notebookId === activeNotebook.id && !s.trashed)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [sections, activeNotebook]);

  const activePage = useMemo(() => {
    return pages.find((p) => p.id === selectedPageId && !p.trashed) || pages[0];
  }, [pages, selectedPageId]);

  // Default select all sections when notebook changes
  React.useEffect(() => {
    if (notebookSections.length > 0) {
      setSelectedSectionIds(notebookSections.map((s) => s.id));
    }
  }, [notebookSections]);

  const notebookStats = useMemo(() => {
    if (!activeNotebook) return { pageCount: 0, wordCount: 0 };
    const validPages = pages.filter(
      (p) =>
        p.notebookId === activeNotebook.id &&
        !p.trashed &&
        (selectedSectionIds.length === 0 || selectedSectionIds.includes(p.sectionId))
    );
    const words = validPages.reduce((acc, p) => {
      return acc + (p.content ? p.content.trim().split(/\s+/).length : 0);
    }, 0);
    return {
      pageCount: validPages.length,
      wordCount: words,
    };
  }, [activeNotebook, pages, selectedSectionIds]);

  if (!isOpen) return null;

  const handleDownloadMarkdown = () => {
    if (exportMode === 'notebook' && activeNotebook) {
      const mdContent = buildNotebookMarkdown(activeNotebook, sections, pages, {
        includeToc,
        includeMetadata,
        includeTimestamps,
        sectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
      });
      downloadMarkdownFile(activeNotebook.name, mdContent);
      setActionSuccess('Markdown file downloaded successfully!');
      setTimeout(() => setActionSuccess(null), 3000);
    } else if (exportMode === 'page' && activePage) {
      const mdContent = buildPageMarkdown(activePage, {
        includeMetadata,
        includeTimestamps,
      });
      downloadMarkdownFile(activePage.title || 'Untitled-Note', mdContent);
      setActionSuccess('Note Markdown downloaded successfully!');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleDownloadPdf = () => {
    if (exportMode === 'notebook' && activeNotebook) {
      const htmlContent = buildNotebookPrintHtml(activeNotebook, sections, pages, {
        includeToc,
        includeMetadata,
        includeTimestamps,
        sectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
      });
      printHtmlDocument(htmlContent, activeNotebook.name);
      setActionSuccess('Print & Save as PDF dialog opened!');
      setTimeout(() => setActionSuccess(null), 3000);
    } else if (exportMode === 'page' && activePage) {
      const parentSec = sections.find((s) => s.id === activePage.sectionId);
      const parentNb = notebooks.find((n) => n.id === activePage.notebookId);
      const htmlContent = buildPagePrintHtml(activePage, parentNb?.name, parentSec?.name);
      printHtmlDocument(htmlContent, activePage.title || 'Note');
      setActionSuccess('Print & Save as PDF dialog opened!');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleCopyMarkdown = async () => {
    let md = '';
    if (exportMode === 'notebook' && activeNotebook) {
      md = buildNotebookMarkdown(activeNotebook, sections, pages, {
        includeToc,
        includeMetadata,
        includeTimestamps,
        sectionIds: selectedSectionIds.length > 0 ? selectedSectionIds : undefined,
      });
    } else if (exportMode === 'page' && activePage) {
      md = buildPageMarkdown(activePage, {
        includeMetadata,
        includeTimestamps,
      });
    }

    try {
      await navigator.clipboard.writeText(md);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  const toggleSectionSelection = (secId: string) => {
    setSelectedSectionIds((prev) => {
      if (prev.includes(secId)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((id) => id !== secId);
      } else {
        return [...prev, secId];
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-100 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-light dark:bg-brand-primary/15 text-brand-primary dark:text-brand-darkPrimary flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink-primary dark:text-ink-darkPrimary">
                Export Notebook & Notes
              </h3>
              <p className="text-xs text-ink-muted dark:text-ink-darkMuted">
                Download structured Markdown (.md) or formatted PDF (.pdf)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle text-xs font-semibold">
            <button
              onClick={() => setExportMode('notebook')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
                exportMode === 'notebook'
                  ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink-primary dark:hover:text-ink-darkPrimary'
              }`}
            >
              <Book className="w-4 h-4" />
              <span>Export Entire Notebook</span>
            </button>
            <button
              onClick={() => setExportMode('page')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
                exportMode === 'page'
                  ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink-primary dark:hover:text-ink-darkPrimary'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Export Current Note</span>
            </button>
          </div>

          {/* Notebook / Note Selection */}
          {exportMode === 'notebook' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink-primary dark:text-ink-darkPrimary mb-1.5">
                  Select Notebook to Export
                </label>
                <select
                  value={selectedNotebookId}
                  onChange={(e) => setSelectedNotebookId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-ink-primary dark:text-ink-darkPrimary text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {notebooks
                    .filter((nb) => !nb.trashed)
                    .map((nb) => (
                      <option key={nb.id} value={nb.id}>
                        {nb.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Notebook Info Card */}
              {activeNotebook && (
                <div className="p-4 rounded-xl bg-brand-light/40 dark:bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-xs">
                      <Book className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary">
                        {activeNotebook.name}
                      </h4>
                      <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted">
                        {notebookSections.length} {notebookSections.length === 1 ? 'section' : 'sections'} &bull;{' '}
                        {notebookStats.pageCount} {notebookStats.pageCount === 1 ? 'note' : 'notes'} &bull;{' '}
                        ~{notebookStats.wordCount.toLocaleString()} words
                      </p>
                    </div>
                  </div>
                  <Sparkles className="w-5 h-5 text-brand-primary/60 hidden sm:block" />
                </div>
              )}

              {/* Section Filters */}
              {notebookSections.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">
                      Sections to Include:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSectionIds.length === notebookSections.length) {
                          setSelectedSectionIds([notebookSections[0].id]);
                        } else {
                          setSelectedSectionIds(notebookSections.map((s) => s.id));
                        }
                      }}
                      className="text-[11px] text-brand-primary dark:text-brand-darkPrimary hover:underline font-semibold"
                    >
                      {selectedSectionIds.length === notebookSections.length
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {notebookSections.map((sec) => {
                      const isChecked = selectedSectionIds.includes(sec.id);
                      const secPagesCount = pages.filter(
                        (p) => p.sectionId === sec.id && !p.trashed
                      ).length;

                      return (
                        <div
                          key={sec.id}
                          onClick={() => toggleSectionSelection(sec.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                            isChecked
                              ? 'border-brand-primary/40 bg-brand-light/30 dark:bg-brand-primary/10 text-brand-primary font-semibold'
                              : 'border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSectionSelection(sec.id)}
                              className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary/20 pointer-events-none"
                            />
                            <span className="text-xs truncate">{sec.name}</span>
                          </div>
                          <span className="text-[10px] opacity-70 ml-1">{secPagesCount}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-ink-primary dark:text-ink-darkPrimary mb-1.5">
                  Select Note to Export
                </label>
                <select
                  value={selectedPageId}
                  onChange={(e) => setSelectedPageId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-ink-primary dark:text-ink-darkPrimary text-xs font-semibold outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  {pages
                    .filter((p) => !p.trashed)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || 'Untitled Note'}
                      </option>
                    ))}
                </select>
              </div>

              {activePage && (
                <div className="p-4 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle space-y-2">
                  <h4 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary truncate">
                    {activePage.title || 'Untitled Note'}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-ink-muted">
                    {activePage.tags && activePage.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        {activePage.tags.map((t) => `#${t}`).join(', ')}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(activePage.updated || activePage.created).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Options Customization */}
          <div className="pt-2 border-t border-border-subtle dark:border-border-darkSubtle space-y-2.5">
            <span className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary block">
              Export Formatting Options
            </span>

            <div className="space-y-2 text-xs text-ink-secondary dark:text-ink-darkSecondary">
              {exportMode === 'notebook' && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeToc}
                    onChange={(e) => setIncludeToc(e.target.checked)}
                    className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary/20"
                  />
                  <span>Generate Table of Contents with section links</span>
                </label>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                  className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary/20"
                />
                <span>Include note tags & metadata headers</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTimestamps}
                  onChange={(e) => setIncludeTimestamps(e.target.checked)}
                  className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary/20"
                />
                <span>Include creation and update dates</span>
              </label>
            </div>
          </div>

          {/* Success Banner */}
          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Download Actions */}
        <div className="px-6 py-4 border-t border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-200/60 dark:hover:bg-slate-700 transition active:scale-95"
          >
            {copySuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied MD!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Markdown</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5">
            {/* Download as Markdown Button */}
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-indigo-300" />
              <span>Download as MD</span>
            </button>

            {/* Download as PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Download as PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
