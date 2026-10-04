import React, { useState, useMemo } from 'react';
import { useNoteStore } from '../features/notes/noteStore';
import { formatRelativeTime } from '../lib/date';
import { PageListSkeleton } from './SkeletonLoader';
import {
  Plus,
  Star,
  Search,
  ArrowUpDown,
  MoreVertical,
  Trash2,
  FileText,
} from 'lucide-react';

type SortOption = 'updated' | 'created' | 'title';

export const PageList: React.FC = () => {
  const {
    pages,
    sections,
    notebooks,
    activeNotebookId,
    activeSectionId,
    activePageId,
    showFavoritesOnly,
    selectedTag,
    isLoading,
    setActivePage,
    createPage,
    togglePageFavorite,
    trashPage,
  } = useNoteStore();

  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [menuPageId, setMenuPageId] = useState<string | null>(null);

  const activeSection = sections.find((s) => s.id === activeSectionId && !s.trashed);
  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId && !n.trashed);

  // Filtered pages based on context (Section / Favorites / Tag / Search query)
  const displayedPages = useMemo(() => {
    let result = pages.filter((p) => !p.trashed);

    if (showFavoritesOnly) {
      result = result.filter((p) => p.favorite);
    } else if (selectedTag) {
      result = result.filter((p) => (p.tags || []).includes(selectedTag));
    } else if (activeSectionId) {
      result = result.filter((p) => p.sectionId === activeSectionId);
    } else if (activeNotebookId) {
      result = result.filter((p) => p.notebookId === activeNotebookId);
    }

    if (filterText.trim()) {
      const q = filterText.toLowerCase();
      result = result.filter(
        (p) =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updated).getTime() - new Date(a.updated).getTime();
      }
      if (sortBy === 'created') {
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [pages, activeSectionId, activeNotebookId, showFavoritesOnly, selectedTag, filterText, sortBy]);

  const handleCreatePage = async () => {
    if (!activeNotebookId) return;
    const secId = activeSectionId || 'general';
    const newPage = await createPage(activeNotebookId, secId, 'Untitled Note', '');
    setActivePage(newPage.id);
  };

  const getPageSnippet = (content: string) => {
    if (!content) return 'No additional text';
    const lines = content.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    return lines[0]?.slice(0, 80) || 'No additional text';
  };

  const getHeaderTitle = () => {
    if (showFavoritesOnly) return 'Favorites';
    if (selectedTag) return `#${selectedTag}`;
    if (activeSection) return activeSection.name;
    if (activeNotebook) return activeNotebook.name;
    return 'All Notes';
  };

  if (isLoading) {
    return (
      <div className="w-80 flex-shrink-0 border-r border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark flex flex-col h-full">
        <PageListSkeleton />
      </div>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 border-r border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-border-subtle dark:border-border-darkSubtle space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary truncate max-w-[180px]">
              {getHeaderTitle()}
            </h2>
            <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted">
              {displayedPages.length} {displayedPages.length === 1 ? 'page' : 'pages'}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {/* Sort Menu Button */}
            <div className="relative">
              <button
                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Sort notes"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>

              {isSortMenuOpen && (
                <div className="absolute right-0 top-8 z-50 w-36 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-lg py-1 text-xs">
                  <button
                    onClick={() => {
                      setSortBy('updated');
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left transition ${
                      sortBy === 'updated'
                        ? 'font-bold text-brand-primary bg-brand-light dark:bg-brand-primary/10'
                        : 'text-ink-primary dark:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Recently Updated
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('created');
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left transition ${
                      sortBy === 'created'
                        ? 'font-bold text-brand-primary bg-brand-light dark:bg-brand-primary/10'
                        : 'text-ink-primary dark:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Date Created
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('title');
                      setIsSortMenuOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left transition ${
                      sortBy === 'title'
                        ? 'font-bold text-brand-primary bg-brand-light dark:bg-brand-primary/10'
                        : 'text-ink-primary dark:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Title (A-Z)
                  </button>
                </div>
              )}
            </div>

            {/* New Page Button */}
            <button
              onClick={handleCreatePage}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
              title="Add New Page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Page</span>
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted dark:text-ink-darkMuted" />
          <input
            type="text"
            placeholder="Filter pages..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary placeholder-ink-muted focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Pages Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/50 dark:divide-border-darkSubtle/50">
        {displayedPages.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 mx-auto text-ink-muted/50 mb-2" />
            <p className="text-xs font-medium text-ink-muted dark:text-ink-darkMuted">
              {filterText ? 'No matching pages' : 'No pages in this view'}
            </p>
            {!filterText && activeNotebookId && (
              <button
                onClick={handleCreatePage}
                className="mt-3 text-xs text-brand-primary hover:underline font-semibold"
              >
                + Create a page
              </button>
            )}
          </div>
        ) : (
          displayedPages.map((page) => {
            const isSelected = page.id === activePageId;

            return (
              <div
                key={page.id}
                onClick={() => setActivePage(page.id)}
                className={`group relative p-3 transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-brand-light/60 dark:bg-brand-primary/10 border-l-4 border-l-brand-primary'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h3
                    className={`text-xs font-semibold truncate ${
                      isSelected
                        ? 'text-brand-primary dark:text-brand-darkPrimary'
                        : 'text-ink-primary dark:text-ink-darkPrimary'
                    }`}
                  >
                    {page.title || 'Untitled Note'}
                  </h3>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Local dirty indicator */}
                    {page.localDirty && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-500"
                        title="Unsynced local changes"
                      />
                    )}

                    {/* Star Favorite */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageFavorite(page.id);
                      }}
                      className={`p-0.5 rounded transition ${
                        page.favorite
                          ? 'text-amber-500'
                          : 'text-slate-300 dark:text-slate-600 hover:text-amber-500 opacity-0 group-hover:opacity-100'
                      }`}
                      title={page.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star className={`w-3.5 h-3.5 ${page.favorite ? 'fill-amber-500' : ''}`} />
                    </button>

                    {/* Menu Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuPageId(menuPageId === page.id ? null : page.id);
                      }}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition"
                      title="Page options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Excerpt */}
                <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted line-clamp-2 leading-relaxed mb-2">
                  {getPageSnippet(page.content)}
                </p>

                {/* Footer: Date & Tags */}
                <div className="flex items-center justify-between text-[10px] text-ink-muted dark:text-ink-darkMuted">
                  <span>{formatRelativeTime(page.updated)}</span>

                  {(page.tags || []).length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden max-w-[140px]">
                      {(page.tags || []).slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-medium text-ink-secondary dark:text-ink-darkSecondary truncate"
                        >
                          #{t}
                        </span>
                      ))}
                      {(page.tags || []).length > 2 && (
                        <span className="text-[9px] font-medium text-ink-muted">
                          +{(page.tags || []).length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Dropdown Menu */}
                {menuPageId === page.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-2 top-8 z-50 w-36 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-lg py-1 text-xs"
                  >
                    <button
                      onClick={() => {
                        togglePageFavorite(page.id);
                        setMenuPageId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-ink-primary dark:text-ink-darkPrimary transition text-left"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>{page.favorite ? 'Unfavorite' : 'Favorite'}</span>
                    </button>
                    <button
                      onClick={() => {
                        trashPage(page.id);
                        setMenuPageId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Move to Trash</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
