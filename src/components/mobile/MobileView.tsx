import React, { useState } from 'react';
import { useNoteStore } from '../../features/notes/noteStore';
import { useVaultStore } from '../../features/vault/vaultStore';
import { formatRelativeTime } from '../../lib/date';
import { SectionColor } from '../../types';
import { MarkdownEditor } from '../../features/editor/MarkdownEditor';
import { PreviewPane } from '../PreviewPane';
import { StatusPill } from '../StatusPill';
import { TasksView } from '../../features/vault/TasksView';
import { HabitsView } from '../../features/vault/HabitsView';
import { FinanceView } from '../../features/vault/FinanceView';
import { WorkspacePanelsView } from '../../features/vault/WorkspacePanelsView';
import {
  Book,
  Folder,
  ChevronLeft,
  Plus,
  Star,
  Search,
  Settings,
  Edit3,
  Eye,
  CheckSquare,
  Flame,
  Wallet,
  Layers,
} from 'lucide-react';

interface MobileViewProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  isDark: boolean;
}

type MobileLevel = 'notebooks' | 'sections' | 'pages' | 'editor';

const COLOR_MAP: Record<SectionColor, { bg: string; text: string; border: string }> = {
  peach: { bg: 'bg-[#FFE4D6]', text: 'text-[#9A3412]', border: 'border-[#FDBA74]' },
  sage: { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]', border: 'border-[#86EFAC]' },
  lavender: { bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]', border: 'border-[#C4B5FD]' },
  sky: { bg: 'bg-[#E0F2FE]', text: 'text-[#075985]', border: 'border-[#7DD3FC]' },
  butter: { bg: 'bg-[#FEF9C3]', text: 'text-[#854D0E]', border: 'border-[#FDE047]' },
  rose: { bg: 'bg-[#FFE4E6]', text: 'text-[#9F1239]', border: 'border-[#FDA4AF]' },
};

export const MobileView: React.FC<MobileViewProps> = ({
  onOpenSearch,
  onOpenSettings,
  isDark,
}) => {
  const {
    notebooks,
    sections,
    pages,
    activeNotebookId,
    activeSectionId,
    activePageId,
    setActiveNotebook,
    setActiveSection,
    setActivePage,
    createNotebook,
    createSection,
    createPage,
    updatePageTitle,
    updatePageContent,
    togglePageFavorite,
  } = useNoteStore();

  const { currentView, setCurrentView } = useVaultStore();

  const [currentLevel, setCurrentLevel] = useState<MobileLevel>(
    activePageId ? 'editor' : activeSectionId ? 'pages' : activeNotebookId ? 'sections' : 'notebooks'
  );
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId && !n.trashed);
  const activeSection = sections.find((s) => s.id === activeSectionId && !s.trashed);
  const activePage = pages.find((p) => p.id === activePageId && !p.trashed);

  const activeSections = sections
    .filter((s) => s.notebookId === activeNotebookId && !s.trashed)
    .sort((a, b) => a.order - b.order);

  const activePages = pages
    .filter((p) => p.sectionId === activeSectionId && !p.trashed)
    .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

  // Handlers
  const handleSelectNotebook = (id: string) => {
    setActiveNotebook(id);
    const secs = sections.filter((s) => s.notebookId === id && !s.trashed);
    if (secs.length > 0) {
      setActiveSection(secs[0].id);
    }
    setCurrentLevel('sections');
  };

  const handleSelectSection = (id: string) => {
    setActiveSection(id);
    setCurrentLevel('pages');
  };

  const handleSelectPage = (id: string) => {
    setActivePage(id);
    setCurrentLevel('editor');
  };

  const handleBack = () => {
    if (currentLevel === 'editor') setCurrentLevel('pages');
    else if (currentLevel === 'pages') setCurrentLevel('sections');
    else if (currentLevel === 'sections') setCurrentLevel('notebooks');
  };

  // If viewing non-notebook module
  if (currentView !== 'notebooks') {
    return (
      <div className="flex flex-col h-full w-full bg-canvas-light dark:bg-canvas-dark text-ink-primary dark:text-ink-darkPrimary overflow-hidden">
        {/* Module Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'workspace' && <WorkspacePanelsView />}
          {currentView === 'tasks' && <TasksView />}
          {currentView === 'habits' && <HabitsView />}
          {currentView === 'finance' && <FinanceView />}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <div className="flex items-center justify-around py-2.5 bg-surface dark:bg-surface-dark border-t border-border-subtle dark:border-border-darkSubtle text-ink-muted dark:text-ink-darkMuted flex-shrink-0">
          <button
            onClick={() => setCurrentView('notebooks')}
            className="flex flex-col items-center gap-1 text-[10px] font-medium"
          >
            <Book className="w-5 h-5" />
            <span>Notes</span>
          </button>

          <button
            onClick={() => setCurrentView('workspace')}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
              currentView === 'workspace' ? 'text-brand-primary font-bold' : ''
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Workspace</span>
          </button>

          <button
            onClick={() => setCurrentView('tasks')}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
              currentView === 'tasks' ? 'text-brand-primary' : ''
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span>Tasks</span>
          </button>

          <button
            onClick={() => setCurrentView('habits')}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
              currentView === 'habits' ? 'text-brand-primary' : ''
            }`}
          >
            <Flame className="w-5 h-5 text-amber-500" />
            <span>Habits</span>
          </button>

          <button
            onClick={() => setCurrentView('finance')}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
              currentView === 'finance' ? 'text-brand-primary' : ''
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span>Finance</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex flex-col items-center gap-1 text-[10px] font-medium"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-canvas-light dark:bg-canvas-dark text-ink-primary dark:text-ink-darkPrimary overflow-hidden select-none">
      {/* Top Mobile Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface dark:bg-surface-dark border-b border-border-subtle dark:border-border-darkSubtle flex-shrink-0">
        <div className="flex items-center gap-2">
          {currentLevel !== 'notebooks' && (
            <button
              onClick={handleBack}
              className="p-1 rounded-lg text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <h2 className="text-sm font-bold truncate max-w-[200px]">
            {currentLevel === 'notebooks' && 'Notebooks'}
            {currentLevel === 'sections' && (activeNotebook?.name || 'Sections')}
            {currentLevel === 'pages' && (activeSection?.name || 'Pages')}
            {currentLevel === 'editor' && (activePage?.title || 'Untitled Note')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {currentLevel !== 'editor' && (
            <button
              onClick={onOpenSearch}
              className="p-1.5 rounded-lg text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Search notes"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          <StatusPill />
          {currentLevel === 'editor' && (
            <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
              <button
                onClick={() => setEditorTab('edit')}
                className={`p-1.5 rounded-md ${
                  editorTab === 'edit'
                    ? 'bg-surface dark:bg-surface-dark text-brand-primary'
                    : 'text-ink-muted'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setEditorTab('preview')}
                className={`p-1.5 rounded-md ${
                  editorTab === 'preview'
                    ? 'bg-surface dark:bg-surface-dark text-brand-primary'
                    : 'text-ink-muted'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Stack Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Level 1: Notebooks */}
        {currentLevel === 'notebooks' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                My Notebooks
              </span>
              <button
                onClick={async () => {
                  const name = prompt('New notebook name:');
                  if (name && name.trim()) {
                    const nb = await createNotebook(name.trim());
                    setActiveNotebook(nb.id);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="space-y-2">
              {notebooks
                .filter((n) => !n.trashed)
                .map((nb) => (
                  <div
                    key={nb.id}
                    onClick={() => handleSelectNotebook(nb.id)}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-xs cursor-pointer active:scale-98 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-light dark:bg-brand-primary/15 text-brand-primary flex items-center justify-center">
                        <Book className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-ink-primary dark:text-ink-darkPrimary">
                        {nb.name}
                      </span>
                    </div>
                    <span className="text-xs text-ink-muted">
                      {sections.filter((s) => s.notebookId === nb.id && !s.trashed).length} sections
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Level 2: Sections */}
        {currentLevel === 'sections' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                Sections in {activeNotebook?.name}
              </span>
              <button
                onClick={async () => {
                  if (!activeNotebookId) return;
                  const name = prompt('New section name:');
                  if (name && name.trim()) {
                    const sec = await createSection(activeNotebookId, name.trim());
                    setActiveSection(sec.id);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {activeSections.map((sec) => {
                const color = COLOR_MAP[sec.color] || COLOR_MAP.peach;
                return (
                  <div
                    key={sec.id}
                    onClick={() => handleSelectSection(sec.id)}
                    className={`p-4 rounded-2xl border ${color.border} ${color.bg} shadow-xs cursor-pointer active:scale-98 transition flex flex-col justify-between h-28`}
                  >
                    <Folder className={`w-5 h-5 ${color.text}`} />
                    <div>
                      <h4 className={`text-xs font-bold ${color.text} truncate`}>{sec.name}</h4>
                      <span className="text-[10px] opacity-75 font-medium">
                        {pages.filter((p) => p.sectionId === sec.id && !p.trashed).length} notes
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Level 3: Pages */}
        {currentLevel === 'pages' && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                Pages in {activeSection?.name}
              </span>
              <button
                onClick={async () => {
                  if (!activeNotebookId || !activeSectionId) return;
                  const newPage = await createPage(activeNotebookId, activeSectionId, 'Untitled Note', '');
                  setActivePage(newPage.id);
                  setCurrentLevel('editor');
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="space-y-2">
              {activePages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => handleSelectPage(page.id)}
                  className="p-3.5 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-xs cursor-pointer active:scale-98 transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary truncate">
                      {page.title || 'Untitled Note'}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePageFavorite(page.id);
                      }}
                      className="p-1"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          page.favorite ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                    {page.content ? page.content.slice(0, 70) : 'No content'}
                  </p>
                  <span className="text-[10px] text-ink-muted mt-2 block">
                    {formatRelativeTime(page.updated)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Level 4: Editor */}
        {currentLevel === 'editor' && activePage && (
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 border-b border-border-subtle dark:border-border-darkSubtle">
              <input
                type="text"
                value={activePage.title}
                onChange={(e) => updatePageTitle(activePage.id, e.target.value)}
                placeholder="Note Title"
                className="w-full text-base font-bold bg-transparent outline-none border-none text-ink-primary dark:text-ink-darkPrimary"
              />
            </div>

            <div className="flex-1 overflow-hidden">
              {editorTab === 'edit' ? (
                <MarkdownEditor
                  value={activePage.content}
                  onChange={(val) => updatePageContent(activePage.id, val)}
                  notebookId={activePage.notebookId}
                  isDark={isDark}
                />
              ) : (
                <PreviewPane
                  content={activePage.content}
                  notebookId={activePage.notebookId}
                  pageId={activePage.id}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden when editing note) */}
      {currentLevel !== 'editor' && (
        <div className="flex items-center justify-around py-2.5 bg-surface dark:bg-surface-dark border-t border-border-subtle dark:border-border-darkSubtle text-ink-muted dark:text-ink-darkMuted flex-shrink-0">
          <button
            onClick={() => {
              setCurrentView('notebooks');
              setCurrentLevel('notebooks');
            }}
            className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
              currentLevel === 'notebooks' ? 'text-brand-primary' : ''
            }`}
          >
            <Book className="w-5 h-5" />
            <span>Notes</span>
          </button>

          <button
            onClick={() => setCurrentView('workspace')}
            className="flex flex-col items-center gap-1 text-[10px] font-medium"
          >
            <Layers className="w-5 h-5" />
            <span>Workspace</span>
          </button>

          <button
            onClick={() => setCurrentView('tasks')}
            className="flex flex-col items-center gap-1 text-[10px] font-medium"
          >
            <CheckSquare className="w-5 h-5" />
            <span>Tasks</span>
          </button>

          <button
            onClick={() => setCurrentView('habits')}
            className="flex flex-col items-center gap-1 text-[10px] font-medium"
          >
            <Flame className="w-5 h-5 text-amber-500" />
            <span>Habits</span>
          </button>

          <button
            onClick={() => setCurrentView('finance')}
            className="flex flex-col items-center gap-1 text-[10px] font-medium"
          >
            <Wallet className="w-5 h-5" />
            <span>Finance</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex flex-col items-center gap-1 text-[10px] font-medium"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      )}
    </div>
  );
};
