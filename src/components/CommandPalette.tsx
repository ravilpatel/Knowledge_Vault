import React, { useState, useEffect, useRef } from 'react';
import { useNoteStore } from '../features/notes/noteStore';
import { searchEngine } from '../features/search/searchIndex';
import { SearchResultItem } from '../types';
import {
  Search,
  FileText,
  Book,
  Star,
  Tag,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { syncEngine } from '../features/sync/syncEngine';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const {
    pages,
    activeNotebookId,
    activeSectionId,
    setActiveNotebook,
    setActiveSection,
    setActivePage,
    createPage,
    createNotebook,
  } = useNoteStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pages' | 'favorites' | 'tags'>('all');

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      searchEngine.buildIndex().then(() => {
        setResults([]);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Execute search when query or activeFilter changes
  useEffect(() => {
    if (!isOpen) return;

    let effectiveQuery = query;
    if (activeFilter === 'favorites' && !effectiveQuery.includes('is:favorite')) {
      effectiveQuery = `${effectiveQuery} is:favorite`.trim();
    }

    if (effectiveQuery.trim()) {
      const hits = searchEngine.search(effectiveQuery);
      setResults(hits);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setSelectedIndex(0);
    }
  }, [query, activeFilter, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const max = results.length > 0 ? results.length - 1 : defaultCommands.length - 1;
      setSelectedIndex((prev) => (prev < max ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const max = results.length > 0 ? results.length - 1 : defaultCommands.length - 1;
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : max));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelectPage(results[selectedIndex]);
      } else if (defaultCommands[selectedIndex]) {
        defaultCommands[selectedIndex].action();
      }
    }
  };

  const handleSelectPage = (item: SearchResultItem) => {
    const page = pages.find((p) => p.id === item.id);
    if (page) {
      setActiveNotebook(page.notebookId);
      setActiveSection(page.sectionId);
      setActivePage(page.id);
      onClose();
    }
  };

  // Quick action commands when query is empty
  const defaultCommands = [
    {
      id: 'new_page',
      title: 'New Page',
      description: 'Create a new markdown note in the current section',
      icon: Plus,
      action: async () => {
        if (activeNotebookId) {
          const secId = activeSectionId || 'general';
          const p = await createPage(activeNotebookId, secId, 'Untitled Note', '');
          setActivePage(p.id);
          onClose();
        }
      },
    },
    {
      id: 'new_notebook',
      title: 'New Notebook',
      description: 'Create a new high-level notebook folder',
      icon: Book,
      action: async () => {
        const name = prompt('Enter notebook name:');
        if (name && name.trim()) {
          const nb = await createNotebook(name.trim());
          setActiveNotebook(nb.id);
          onClose();
        }
      },
    },
    {
      id: 'force_sync',
      title: 'Sync with Google Drive',
      description: 'Flush pending edits and pull latest changes',
      icon: RefreshCw,
      action: async () => {
        onClose();
        await syncEngine.flushOutbox();
      },
    },
    {
      id: 'open_settings',
      title: 'Open Settings & Trash',
      description: 'Vault configuration, storage, and deleted item recovery',
      icon: Settings,
      action: () => {
        onClose();
        if (onOpenSettings) onOpenSettings();
      },
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/50 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border-subtle dark:border-border-darkSubtle gap-3">
          <Search className="w-5 h-5 text-brand-primary dark:text-brand-darkPrimary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes, tags (#work), or type operator (tag:cooking, is:favorite)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full text-sm bg-transparent border-none outline-none text-ink-primary dark:text-ink-darkPrimary placeholder-ink-muted dark:placeholder-ink-darkMuted"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-border-subtle dark:border-border-darkSubtle text-ink-muted">
              ESC
            </span>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-surface-subtle dark:bg-surface-subtleDark border-b border-border-subtle dark:border-border-darkSubtle text-xs">
          <span className="text-[11px] font-medium text-ink-muted mr-1">Filter:</span>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
              activeFilter === 'all'
                ? 'bg-brand-primary text-white'
                : 'text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Notes
          </button>
          <button
            onClick={() => setActiveFilter('favorites')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
              activeFilter === 'favorites'
                ? 'bg-amber-500 text-white'
                : 'text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            Favorites
          </button>
          <button
            onClick={() => {
              setActiveFilter('tags');
              setQuery('tag:');
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
              activeFilter === 'tags'
                ? 'bg-indigo-600 text-white'
                : 'text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Tag className="w-3 h-3" />
            Tags
          </button>
        </div>

        {/* Results Area */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto divide-y divide-border-subtle/50 dark:divide-border-darkSubtle/50 p-2"
        >
          {query.trim() ? (
            results.length === 0 ? (
              <div className="p-8 text-center text-ink-muted dark:text-ink-darkMuted">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-[11px] mt-1 text-ink-muted/80">
                  Try checking your spelling or searching for a partial word.
                </p>
              </div>
            ) : (
              results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectPage(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-brand-light dark:bg-brand-primary/15 text-brand-primary dark:text-brand-darkPrimary'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-ink-primary dark:text-ink-darkPrimary'
                    }`}
                  >
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs truncate">{item.title}</span>
                        <span className="text-[10px] text-ink-muted dark:text-ink-darkMuted flex-shrink-0">
                          {item.notebookName} &rsaquo; {item.sectionName}
                        </span>
                      </div>
                      <p
                        className="text-[11px] text-ink-muted dark:text-ink-darkMuted line-clamp-2 mt-0.5 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: item.bodySnippet }}
                      />
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {item.tags.map((t) => (
                            <span
                              key={t}
                              className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[9px] font-medium text-ink-secondary dark:text-ink-darkSecondary"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <ArrowRight className="w-4 h-4 self-center flex-shrink-0 text-brand-primary dark:text-brand-darkPrimary" />
                    )}
                  </div>
                );
              })
            )
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                Quick Actions
              </div>
              {defaultCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                      isSelected
                        ? 'bg-brand-light dark:bg-brand-primary/15 text-brand-primary dark:text-brand-darkPrimary'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-ink-primary dark:text-ink-darkPrimary'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-brand-primary dark:text-brand-darkPrimary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold">{cmd.title}</div>
                      <div className="text-[11px] text-ink-muted dark:text-ink-darkMuted">
                        {cmd.description}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-medium text-brand-primary dark:text-brand-darkPrimary px-1.5 py-0.5 rounded border border-brand-primary/20">
                        Enter &crarr;
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-surface-subtle dark:bg-surface-subtleDark border-t border-border-subtle dark:border-border-darkSubtle flex items-center justify-between text-[11px] text-ink-muted">
          <div className="flex items-center gap-3">
            <span>&uarr;&darr; to navigate</span>
            <span>&crarr; to select</span>
            <span>ESC to close</span>
          </div>
          <span className="flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-brand-primary" /> Full-text local search
          </span>
        </div>
      </div>
    </div>
  );
};
