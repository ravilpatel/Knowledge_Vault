import React, { useState } from 'react';
import { useNoteStore } from '../features/notes/noteStore';
import {
  Book,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  Tag,
  Trash2,
  Settings,
  MoreVertical,
  FolderPlus,
  Search,
} from 'lucide-react';

interface NotebookRailProps {
  onOpenSettings?: () => void;
  onOpenSearch?: () => void;
}

export const NotebookRail: React.FC<NotebookRailProps> = ({ onOpenSettings, onOpenSearch }) => {
  const {
    notebooks,
    sections,
    pages,
    activeNotebookId,
    setActiveNotebook,
    createNotebook,
    renameNotebook,
    showFavoritesOnly,
    setShowFavoritesOnly,
    selectedTag,
    setSelectedTag,
    showTrashView,
    setShowTrashView,
  } = useNoteStore();

  const [expandedNbs, setExpandedNbs] = useState<Record<string, boolean>>({
    default: true,
  });
  const [editingNbId, setEditingNbId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewNbModal, setShowNewNbModal] = useState(false);
  const [newNbName, setNewNbName] = useState('');

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNbs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNbId(id);
    setEditName(currentName);
  };

  const handleSaveRename = async (id: string) => {
    if (editName.trim()) {
      await renameNotebook(id, editName);
    }
    setEditingNbId(null);
  };

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newNbName.trim()) {
      await createNotebook(newNbName.trim());
      setNewNbName('');
      setShowNewNbModal(false);
    }
  };

  // Collect all unique tags and counts
  const tagCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    pages
      .filter((p) => !p.trashed)
      .forEach((p) => {
        p.tags.forEach((t) => {
          counts[t] = (counts[t] || 0) + 1;
        });
      });
    return counts;
  }, [pages]);

  const favoritesCount = pages.filter((p) => p.favorite && !p.trashed).length;
  const trashedCount = pages.filter((p) => p.trashed).length + notebooks.filter((n) => n.trashed).length;

  return (
    <aside className="w-64 h-full flex flex-col bg-surface-subtle dark:bg-surface-subtleDark border-r border-border-subtle dark:border-border-darkSubtle select-none">
      {/* Notebooks Header */}
      <div className="p-3.5 flex items-center justify-between border-b border-border-subtle dark:border-border-darkSubtle">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-ink-darkMuted">
          Notebooks
        </span>
        <button
          onClick={() => setShowNewNbModal(true)}
          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition text-ink-secondary dark:text-ink-darkSecondary"
          title="New Notebook"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Notebook List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {notebooks
          .filter((nb) => !nb.trashed)
          .map((nb) => {
            const isExpanded = expandedNbs[nb.id] !== false;
            const isActive = activeNotebookId === nb.id && !showFavoritesOnly && !selectedTag && !showTrashView;
            const nbPageCount = pages.filter((p) => p.notebookId === nb.id && !p.trashed).length;

            return (
              <div key={nb.id} className="group">
                <div
                  onClick={() => setActiveNotebook(nb.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-800 text-brand-primary dark:text-brand-darkPrimary font-semibold shadow-sm border border-slate-200/80 dark:border-slate-700'
                      : 'text-ink-primary dark:text-ink-darkPrimary hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={(e) => toggleExpand(nb.id, e)}
                      className="p-0.5 hover:bg-slate-300/60 dark:hover:bg-slate-700 rounded text-ink-muted"
                    >
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                    <Book className="w-4 h-4 text-brand-primary dark:text-brand-darkPrimary shrink-0" />
                    {editingNbId === nb.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleSaveRename(nb.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(nb.id)}
                        autoFocus
                        className="px-1 py-0.5 text-xs bg-white dark:bg-slate-700 border border-brand-primary rounded outline-none w-full"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate text-xs font-medium">{nb.name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700 text-ink-muted dark:text-ink-darkMuted font-mono">
                      {nbPageCount}
                    </span>
                    <button
                      onClick={(e) => handleStartRename(nb.id, nb.name, e)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-ink-muted"
                      title="Rename"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-tree of sections if expanded */}
                {isExpanded && (
                  <div className="pl-6 pr-1 py-0.5 space-y-0.5">
                    {sections
                      .filter((s) => s.notebookId === nb.id && !s.trashed)
                      .map((sec) => {
                        const secPagesCount = pages.filter((p) => p.sectionId === sec.id && !p.trashed).length;
                        return (
                          <div
                            key={sec.id}
                            onClick={() => {
                              setActiveNotebook(nb.id);
                              useNoteStore.getState().setActiveSection(sec.id);
                            }}
                            className="flex items-center justify-between px-2 py-1 rounded text-xs text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-200/40 dark:hover:bg-slate-800/40 cursor-pointer"
                          >
                            <span className="truncate">{sec.name}</span>
                            <span className="text-[10px] text-ink-muted font-mono">{secPagesCount}</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}

        <div className="pt-3 pb-1">
          <div className="h-[1px] bg-border-subtle dark:bg-border-darkSubtle mx-2" />
        </div>

        {/* Quick Access items */}
        <div
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition ${
            showFavoritesOnly
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium'
              : 'text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500/30" />
            <span className="text-xs">Favorites</span>
          </div>
          <span className="text-[11px] font-mono text-ink-muted">{favoritesCount}</span>
        </div>

        {/* Tags accordion */}
        <div className="pt-1">
          <div className="px-2.5 py-1 text-[11px] font-semibold text-ink-muted uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3 h-3" />
            <span>Tags</span>
          </div>
          <div className="flex flex-wrap gap-1 px-2.5 py-1">
            {Object.entries(tagCounts).map(([tag, count]) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`px-2 py-0.5 text-xs rounded-full transition ${
                    isSelected
                      ? 'bg-brand-primary text-white font-medium'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-300/60'
                  }`}
                >
                  #{tag} <span className="opacity-70 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trash View Toggle */}
        <div
          onClick={() => setShowTrashView(true)}
          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm cursor-pointer transition ${
            showTrashView
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-medium'
              : 'text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-ink-muted" />
            <span className="text-xs">Trash</span>
          </div>
          {trashedCount > 0 && (
            <span className="text-[11px] font-mono text-rose-500">{trashedCount}</span>
          )}
        </div>
      </div>

      {/* Footer / Settings & Search */}
      <div className="p-3 border-t border-border-subtle dark:border-border-darkSubtle bg-white dark:bg-slate-900/50 flex items-center justify-between">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 text-xs text-ink-secondary dark:text-ink-darkSecondary hover:text-ink-primary dark:hover:text-ink-darkPrimary transition"
        >
          <Settings className="w-4 h-4 text-ink-muted" />
          <span>Settings & Trash</span>
        </button>

        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            className="p-1 rounded text-ink-muted hover:text-ink-primary dark:hover:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Search (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Notebook Modal */}
      {showNewNbModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100 mb-3">
              <FolderPlus className="w-5 h-5 text-brand-primary" />
              <span>Create New Notebook</span>
            </div>
            <form onSubmit={handleCreateNotebook}>
              <input
                type="text"
                placeholder="Notebook Name (e.g. Work, Study)"
                value={newNbName}
                onChange={(e) => setNewNbName(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-primary mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewNbModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newNbName.trim()}
                  className="px-3 py-1.5 text-xs bg-brand-primary hover:bg-brand-hover text-white font-medium rounded-lg disabled:opacity-50 transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
