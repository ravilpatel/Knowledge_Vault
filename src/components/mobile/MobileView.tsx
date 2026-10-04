import React, { useState, useRef, useMemo } from 'react';
import { useNoteStore } from '../../features/notes/noteStore';
import { useVaultStore } from '../../features/vault/vaultStore';
import { useAuthStore } from '../../features/auth/authStore';
import { formatRelativeTime } from '../../lib/date';
import { SectionColor } from '../../types';
import { MarkdownEditor, MarkdownEditorRef } from '../../features/editor/MarkdownEditor';
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
  ChevronDown,
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
  Trash2,
  Share2,
  Tag,
  Clock,
  FileText,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Table,
  Undo2,
  Redo2,
  X,
  ArrowUpDown,
  CheckCircle2,
  MoreVertical,
  Calendar as CalendarIcon,
  ArrowUp,
  Inbox,
} from 'lucide-react';

interface MobileViewProps {
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  isDark: boolean;
}

type MobileLevel = 'notebooks' | 'sections' | 'pages' | 'editor';
type SortOption = 'updated' | 'title' | 'favorites';

const COLOR_MAP: Record<
  SectionColor,
  {
    emoji: string;
    bg: string;
    text: string;
    border: string;
    darkBg: string;
    darkText: string;
    darkBorder: string;
    barColor: string;
  }
> = {
  peach: {
    emoji: '🍑',
    bg: 'bg-[#FFE4D6]',
    text: 'text-[#9A3412]',
    border: 'border-[#FDBA74]',
    darkBg: 'dark:bg-[#431407]',
    darkText: 'dark:text-[#FB923C]',
    darkBorder: 'dark:border-[#7C2D12]',
    barColor: '#EA580C',
  },
  sage: {
    emoji: '🌿',
    bg: 'bg-[#DCFCE7]',
    text: 'text-[#166534]',
    border: 'border-[#86EFAC]',
    darkBg: 'dark:bg-[#052E16]',
    darkText: 'dark:text-[#4ADE80]',
    darkBorder: 'dark:border-[#14532D]',
    barColor: '#16A34A',
  },
  lavender: {
    emoji: '🪻',
    bg: 'bg-[#EDE9FE]',
    text: 'text-[#5B21B6]',
    border: 'border-[#C4B5FD]',
    darkBg: 'dark:bg-[#2E1065]',
    darkText: 'dark:text-[#A78BFA]',
    darkBorder: 'dark:border-[#581C87]',
    barColor: '#7C3AED',
  },
  sky: {
    emoji: '☁️',
    bg: 'bg-[#E0F2FE]',
    text: 'text-[#075985]',
    border: 'border-[#7DD3FC]',
    darkBg: 'dark:bg-[#082F49]',
    darkText: 'dark:text-[#38BDF8]',
    darkBorder: 'dark:border-[#075985]',
    barColor: '#0284C7',
  },
  butter: {
    emoji: '🧈',
    bg: 'bg-[#FEF9C3]',
    text: 'text-[#854D0E]',
    border: 'border-[#FDE047]',
    darkBg: 'dark:bg-[#422006]',
    darkText: 'dark:text-[#FACC15]',
    darkBorder: 'dark:border-[#713F12]',
    barColor: '#CA8A04',
  },
  rose: {
    emoji: '🌸',
    bg: 'bg-[#FFE4E6]',
    text: 'text-[#9F1239]',
    border: 'border-[#FDA4AF]',
    darkBg: 'dark:bg-[#4C0519]',
    darkText: 'dark:text-[#FB7185]',
    darkBorder: 'dark:border-[#881337]',
    barColor: '#E11D48',
  },
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
    trashPage,
  } = useNoteStore();

  const {
    currentView,
    setCurrentView,
    todos,
    habits,
    expenses,
    addTodo,
    addExpense,
  } = useVaultStore();

  const { supabaseUser, user } = useAuthStore() as any;

  const editorRef = useRef<MarkdownEditorRef>(null);

  // Mobile navigation & view state
  const [currentLevel, setCurrentLevel] = useState<MobileLevel>(
    activePageId ? 'editor' : 'pages'
  );
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('updated');
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [isNotebookDrawerOpen, setIsNotebookDrawerOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isEditorMenuOpen, setIsEditorMenuOpen] = useState(false);

  // Inline Quick Input
  const [inlineTaskText, setInlineTaskText] = useState('');
  const [inlineTaskScope, setInlineTaskScope] = useState<'work' | 'personal'>('work');
  const [inlineTaskDue, setInlineTaskDue] = useState<'today' | 'tomorrow' | 'none'>('today');

  // Quick form states
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskScope, setQuickTaskScope] = useState<'work' | 'personal'>('work');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
  const [quickExpenseDesc, setQuickExpenseDesc] = useState('');
  const [quickExpenseType, setQuickExpenseType] = useState<'expense' | 'income'>('expense');

  // Active records
  const activeNotebook =
    notebooks.find((n) => n.id === activeNotebookId && !n.trashed) ||
    notebooks.find((n) => !n.trashed);
  const activeSection = sections.find((s) => s.id === activeSectionId && !s.trashed);
  const activePage = pages.find((p) => p.id === activePageId && !p.trashed);

  const notebookSections = useMemo(() => {
    if (!activeNotebook) return [];
    return sections
      .filter((s) => s.notebookId === activeNotebook.id && !s.trashed)
      .sort((a, b) => a.order - b.order);
  }, [sections, activeNotebook]);

  // Filtered and sorted pages
  const visiblePages = useMemo(() => {
    if (!activeNotebook) return [];
    let list = pages.filter((p) => p.notebookId === activeNotebook.id && !p.trashed);

    if (selectedSectionFilter !== 'all') {
      list = list.filter((p) => p.sectionId === selectedSectionFilter);
    }

    return list.sort((a, b) => {
      if (sortOption === 'favorites') {
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
      }
      if (sortOption === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return new Date(b.updated).getTime() - new Date(a.updated).getTime();
    });
  }, [pages, activeNotebook, selectedSectionFilter, sortOption]);

  // Today Date details for greeting & telemetry
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const userName = useMemo(() => {
    const raw =
      supabaseUser?.user_metadata?.full_name ||
      supabaseUser?.user_metadata?.name ||
      user?.name ||
      supabaseUser?.email?.split('@')[0] ||
      'Alex';
    return raw.split(' ')[0];
  }, [supabaseUser, user]);

  const userInitials = useMemo(() => {
    if (userName) return userName.slice(0, 2).toUpperCase();
    return 'KV';
  }, [userName]);

  // Overview metrics calculation (from Stitch Screen 3)
  const dueTasksCount = useMemo(() => {
    return todos.filter((t) => !t.completed && t.status !== 'done' && t.dueDate === todayStr).length ||
      todos.filter((t) => !t.completed && t.status !== 'done').length;
  }, [todos, todayStr]);

  const highPriorityTasksCount = useMemo(() => {
    return todos.filter(
      (t) =>
        !t.completed &&
        t.status !== 'done' &&
        (t.priority === 'p1' || t.priority === 'high' || t.urgent)
    ).length;
  }, [todos]);

  const habitStreakMax = useMemo(() => {
    if (!habits || habits.length === 0) return 0;
    return habits.reduce((max, h) => Math.max(max, h.streak), 0) || habits.length;
  }, [habits]);

  const monthlyBalanceFormatted = useMemo(() => {
    const totalIncome = expenses
      .filter((e) => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = expenses
      .filter((e) => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0);
    const net = totalIncome - totalExpense;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(net);
  }, [expenses]);

  // Handlers
  const handleSelectNotebook = (id: string) => {
    setActiveNotebook(id);
    const secs = sections.filter((s) => s.notebookId === id && !s.trashed);
    if (secs.length > 0) {
      setActiveSection(secs[0].id);
      setSelectedSectionFilter('all');
    }
    setIsNotebookDrawerOpen(false);
  };

  const handleSelectPage = (id: string) => {
    setActivePage(id);
    setCurrentLevel('editor');
  };

  const handleBack = () => {
    if (currentLevel === 'editor') {
      setCurrentLevel('pages');
    } else if (currentLevel === 'sections') {
      setCurrentLevel('pages');
    } else if (currentLevel === 'notebooks') {
      setCurrentLevel('pages');
    }
  };

  const handleCreateNewNote = async () => {
    if (!activeNotebook) return;
    const targetSectionId =
      selectedSectionFilter !== 'all'
        ? selectedSectionFilter
        : notebookSections[0]?.id || (await createSection(activeNotebook.id, 'General')).id;

    const newPage = await createPage(activeNotebook.id, targetSectionId, 'Untitled Note', '');
    setActiveSection(targetSectionId);
    setActivePage(newPage.id);
    setCurrentLevel('editor');
    setIsSpeedDialOpen(false);
  };

  const handleInlineTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTaskText.trim()) return;

    let dueFormatted: string | undefined = undefined;
    if (inlineTaskDue === 'today') {
      dueFormatted = todayStr;
    } else if (inlineTaskDue === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      dueFormatted = d.toISOString().slice(0, 10);
    }

    await addTodo({
      title: inlineTaskText.trim(),
      scope: inlineTaskScope,
      status: 'todo',
      priority: 'medium',
      dueDate: dueFormatted,
      urgent: false,
      important: false,
      completed: false,
    });

    setInlineTaskText('');
  };

  const handleQuickTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;
    await addTodo({
      title: quickTaskTitle.trim(),
      scope: quickTaskScope,
      status: 'todo',
      priority: 'medium',
      urgent: false,
      important: false,
      completed: false,
    });
    setQuickTaskTitle('');
    setIsQuickTaskOpen(false);
  };

  const handleQuickExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(quickExpenseAmount);
    if (isNaN(parsed) || parsed <= 0 || !quickExpenseDesc.trim()) return;
    await addExpense({
      amount: parsed,
      description: quickExpenseDesc.trim(),
      type: quickExpenseType,
      category: 'General',
      date: new Date().toISOString().slice(0, 10),
    });
    setQuickExpenseAmount('');
    setQuickExpenseDesc('');
    setIsQuickExpenseOpen(false);
  };

  // Telemetry helpers
  const getReadTime = (content?: string) => {
    if (!content) return '1 min read';
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const getWordCount = (content?: string) => {
    if (!content || !content.trim()) return 0;
    return content.trim().split(/\s+/).length;
  };

  const extractTags = (content?: string) => {
    if (!content) return [];
    const hashTags = content.match(/#[a-zA-Z0-9_\-]+/g) || [];
    const cleanTags = Array.from(new Set(hashTags.map((t) => t.replace(/^#/, '')))).slice(0, 3);
    return cleanTags;
  };

  const formatText = (prefix: string, suffix: string = '', defaultText: string = '') => {
    editorRef.current?.insertText(prefix, suffix, defaultText);
  };

  // Docked Bottom Navigation Bar (Stitch Design Pattern)
  const renderBottomNav = () => (
    <nav className="flex items-center justify-around py-2.5 bg-surface dark:bg-surface-dark border-t border-border-subtle dark:border-border-darkSubtle text-ink-muted dark:text-ink-darkMuted flex-shrink-0 z-30 shadow-lg">
      <button
        onClick={() => {
          setCurrentView('notebooks');
          setCurrentLevel('pages');
        }}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition active:scale-95 ${
          currentView === 'notebooks'
            ? 'text-brand-primary dark:text-brand-darkPrimary font-bold'
            : 'hover:text-ink-primary dark:hover:text-ink-darkPrimary'
        }`}
      >
        <Book className="w-5 h-5" />
        <span>Notes</span>
      </button>

      <button
        onClick={() => setCurrentView('workspace')}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition active:scale-95 ${
          currentView === 'workspace'
            ? 'text-brand-primary dark:text-brand-darkPrimary font-bold'
            : 'hover:text-ink-primary dark:hover:text-ink-darkPrimary'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span>Workspace</span>
      </button>

      <button
        onClick={() => setCurrentView('tasks')}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition active:scale-95 ${
          currentView === 'tasks'
            ? 'text-brand-primary dark:text-brand-darkPrimary font-bold'
            : 'hover:text-ink-primary dark:hover:text-ink-darkPrimary'
        }`}
      >
        <CheckSquare className="w-5 h-5" />
        <span>Tasks</span>
      </button>

      <button
        onClick={() => setCurrentView('habits')}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition active:scale-95 ${
          currentView === 'habits'
            ? 'text-brand-primary dark:text-brand-darkPrimary font-bold'
            : 'hover:text-ink-primary dark:hover:text-ink-darkPrimary'
        }`}
      >
        <Flame className="w-5 h-5 text-amber-500" />
        <span>Habits</span>
      </button>

      <button
        onClick={() => setCurrentView('finance')}
        className={`flex flex-col items-center gap-1 text-[10px] font-medium transition active:scale-95 ${
          currentView === 'finance'
            ? 'text-brand-primary dark:text-brand-darkPrimary font-bold'
            : 'hover:text-ink-primary dark:hover:text-ink-darkPrimary'
        }`}
      >
        <Wallet className="w-5 h-5" />
        <span>Finance</span>
      </button>

      <button
        onClick={onOpenSettings}
        className="flex flex-col items-center gap-1 text-[10px] font-medium hover:text-ink-primary dark:hover:text-ink-darkPrimary transition active:scale-95"
      >
        <Settings className="w-5 h-5" />
        <span>Settings</span>
      </button>
    </nav>
  );

  // If viewing secondary modules (Workspace, Tasks, Habits, Finance)
  if (currentView !== 'notebooks') {
    return (
      <div className="flex flex-col h-full w-full bg-canvas-light dark:bg-canvas-dark text-ink-primary dark:text-ink-darkPrimary overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {currentView === 'workspace' && <WorkspacePanelsView />}
          {currentView === 'tasks' && <TasksView />}
          {currentView === 'habits' && <HabitsView />}
          {currentView === 'finance' && <FinanceView />}
        </div>
        {renderBottomNav()}
      </div>
    );
  }

  // NOTEBOOK EXPLORER & EDITOR VIEW
  return (
    <div className="flex flex-col h-full w-full bg-canvas-light dark:bg-canvas-dark text-ink-primary dark:text-ink-darkPrimary overflow-hidden select-none relative font-sans">
      {/* ─── 1. TOP APP BAR & GREETING HEADER ─── */}
      <header className="px-4 py-2.5 bg-surface dark:bg-surface-dark border-b border-border-subtle dark:border-border-darkSubtle flex-shrink-0 z-20 shadow-xs flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Leading: Back action or Notebook Switcher */}
          <div className="flex items-center gap-2 min-w-0">
            {currentLevel === 'editor' ? (
              <button
                onClick={handleBack}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
                title="Back to notes"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsNotebookDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-border-subtle dark:border-border-darkSubtle text-xs font-bold text-ink-primary dark:text-ink-darkPrimary hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 max-w-[200px] truncate"
              >
                <Book className="w-3.5 h-3.5 text-brand-primary dark:text-brand-darkPrimary flex-shrink-0" />
                <span className="truncate">{activeNotebook?.name || 'My Vault'}</span>
                <ChevronDown className="w-3 h-3 text-ink-muted flex-shrink-0" />
              </button>
            )}

            {currentLevel === 'editor' && activeSection && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full truncate max-w-[130px] ${
                  COLOR_MAP[activeSection.color]?.bg || 'bg-brand-light'
                } ${COLOR_MAP[activeSection.color]?.text || 'text-brand-primary'}`}
              >
                {activeSection.name}
              </span>
            )}
          </div>

          {/* Trailing: Status + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusPill />

            {currentLevel !== 'editor' ? (
              <>
                <button
                  onClick={onOpenSearch}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition"
                  title="Search notes (Ctrl+K)"
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Profile Chip */}
                <div
                  onClick={onOpenSettings}
                  className="w-8 h-8 rounded-xl bg-brand-primary text-white font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer active:scale-95 transition"
                  title="Settings & Profile"
                >
                  <span>{userInitials}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                {/* Segmented Edit / Preview Mode Switcher */}
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border-subtle dark:border-border-darkSubtle">
                  <button
                    onClick={() => setEditorTab('edit')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      editorTab === 'edit'
                        ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs font-bold'
                        : 'text-ink-muted'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setEditorTab('preview')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      editorTab === 'preview'
                        ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs font-bold'
                        : 'text-ink-muted'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                </div>

                {activePage && (
                  <>
                    <button
                      onClick={() => togglePageFavorite(activePage.id)}
                      className="p-1.5 rounded-xl text-ink-muted hover:text-amber-500 active:scale-90 transition"
                      title="Favorite Note"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          activePage.favorite
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => setIsEditorMenuOpen(!isEditorMenuOpen)}
                      className="p-1.5 rounded-xl text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date context string when in explorer */}
        {currentLevel !== 'editor' && (
          <div className="flex items-center justify-between text-[11px] text-ink-muted dark:text-ink-darkMuted pt-0.5">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
              <span>
                {todayFormatted} • Good day, {userName}
              </span>
            </span>
            <span className="font-semibold text-brand-primary dark:text-brand-darkPrimary">
              {visiblePages.length} {visiblePages.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
        )}
      </header>

      {/* ─── 2. MAIN CONTENT STACK ─── */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {currentLevel !== 'editor' ? (
          <div className="flex-1 flex flex-col overflow-y-auto space-y-3 pb-24">
            {/* Top Stat Carousel & Section Tabs Ribbon */}
            <div className="bg-surface dark:bg-surface-dark border-b border-border-subtle dark:border-border-darkSubtle p-3.5 space-y-3 flex-shrink-0 shadow-2xs">
              {/* Daily Overview Stat Carousel (From Stitch Screen 3) */}
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pt-0.5">
                {/* Card 1: Due Tasks */}
                <div
                  onClick={() => setCurrentView('tasks')}
                  className="min-w-[124px] flex-1 bg-surface-subtle dark:bg-surface-subtleDark p-2.5 rounded-2xl border border-border-subtle dark:border-border-darkSubtle shadow-xs flex flex-col justify-between cursor-pointer active:scale-98 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-brand-primary flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    {highPriorityTasksCount > 0 && (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.2 rounded-md font-bold">
                        {highPriorityTasksCount} High
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-ink-primary dark:text-ink-darkPrimary">
                      {dueTasksCount} Due
                    </div>
                    <div className="text-[10px] text-ink-muted">Tasks scheduled</div>
                  </div>
                </div>

                {/* Card 2: Habit Streaks */}
                <div
                  onClick={() => setCurrentView('habits')}
                  className="min-w-[124px] flex-1 bg-surface-subtle dark:bg-surface-subtleDark p-2.5 rounded-2xl border border-border-subtle dark:border-border-darkSubtle shadow-xs flex flex-col justify-between cursor-pointer active:scale-98 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.2 rounded-md font-bold">
                      Streak
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-ink-primary dark:text-ink-darkPrimary">
                      {habitStreakMax} Days 🔥
                    </div>
                    <div className="text-[10px] text-ink-muted">Daily cadence</div>
                  </div>
                </div>

                {/* Card 3: Finance Progress */}
                <div
                  onClick={() => setCurrentView('finance')}
                  className="min-w-[124px] flex-1 bg-surface-subtle dark:bg-surface-subtleDark p-2.5 rounded-2xl border border-border-subtle dark:border-border-darkSubtle shadow-xs flex flex-col justify-between cursor-pointer active:scale-98 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.2 rounded-md font-bold">
                      Net
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-ink-primary dark:text-ink-darkPrimary truncate max-w-[95px]">
                      {monthlyBalanceFormatted}
                    </div>
                    <div className="text-[10px] text-ink-muted">Cashflow</div>
                  </div>
                </div>
              </div>

              {/* Quick Inline Task Bar (From Stitch Screen 3) */}
              <form
                onSubmit={handleInlineTaskSubmit}
                className="bg-surface-subtle dark:bg-surface-subtleDark rounded-2xl border border-border-subtle dark:border-border-darkSubtle p-2.5 shadow-xs space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-brand-primary flex-shrink-0" />
                  <input
                    type="text"
                    value={inlineTaskText}
                    onChange={(e) => setInlineTaskText(e.target.value)}
                    placeholder="Add a quick task, thought, or link..."
                    className="w-full bg-transparent border-none text-xs font-medium text-ink-primary dark:text-ink-darkPrimary placeholder:text-ink-muted outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 dark:border-border-darkSubtle/50">
                  <div className="flex items-center gap-1.5">
                    {/* Scope Selector */}
                    <button
                      type="button"
                      onClick={() =>
                        setInlineTaskScope(inlineTaskScope === 'work' ? 'personal' : 'work')
                      }
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface dark:bg-surface-dark text-ink-secondary dark:text-ink-darkSecondary text-[10px] font-bold border border-border-subtle dark:border-border-darkSubtle"
                    >
                      <Inbox className="w-3 h-3 text-brand-primary" />
                      <span>{inlineTaskScope === 'work' ? 'Work' : 'Personal'}</span>
                    </button>

                    {/* Due Date Selector */}
                    <button
                      type="button"
                      onClick={() =>
                        setInlineTaskDue(
                          inlineTaskDue === 'today'
                            ? 'tomorrow'
                            : inlineTaskDue === 'tomorrow'
                            ? 'none'
                            : 'today'
                        )
                      }
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface dark:bg-surface-dark text-ink-secondary dark:text-ink-darkSecondary text-[10px] font-bold border border-border-subtle dark:border-border-darkSubtle"
                    >
                      <CalendarIcon className="w-3 h-3 text-amber-600" />
                      <span>
                        {inlineTaskDue === 'today'
                          ? 'Today'
                          : inlineTaskDue === 'tomorrow'
                          ? 'Tomorrow'
                          : 'No Date'}
                      </span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!inlineTaskText.trim()}
                    className="w-6 h-6 rounded-lg bg-brand-primary text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>

              {/* Horizontal Scrollable Pastel Section Explorer Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setSelectedSectionFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 active:scale-95 ${
                    selectedSectionFilter === 'all'
                      ? 'bg-brand-primary text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-200'
                  }`}
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>All</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedSectionFilter === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-ink-muted'
                    }`}
                  >
                    {pages.filter((p) => p.notebookId === activeNotebook?.id && !p.trashed).length}
                  </span>
                </button>

                {notebookSections.map((sec) => {
                  const color = COLOR_MAP[sec.color] || COLOR_MAP.peach;
                  const isSelected = selectedSectionFilter === sec.id;
                  const count = pages.filter((p) => p.sectionId === sec.id && !p.trashed).length;

                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSectionFilter(sec.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border active:scale-95 ${
                        isSelected
                          ? `${color.bg} ${color.text} ${color.border} ring-2 ring-brand-primary/30 shadow-xs ${color.darkBg} ${color.darkText} ${color.darkBorder}`
                          : `bg-surface dark:bg-surface-dark ${color.text} ${color.border} opacity-85 hover:opacity-100 ${color.darkText} ${color.darkBorder}`
                      }`}
                    >
                      <span className="text-[13px]">{color.emoji}</span>
                      <span>{sec.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 font-semibold">
                        {count}
                      </span>
                    </button>
                  );
                })}

                <button
                  onClick={async () => {
                    if (!activeNotebook) return;
                    const name = prompt('New section name:');
                    if (name && name.trim()) {
                      const colors: SectionColor[] = ['peach', 'sage', 'lavender', 'sky', 'butter', 'rose'];
                      const nextColor = colors[notebookSections.length % colors.length];
                      const newSec = await createSection(activeNotebook.id, name.trim(), nextColor);
                      setSelectedSectionFilter(newSec.id);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-brand-primary dark:text-brand-darkPrimary bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 whitespace-nowrap flex items-center gap-1 active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                  <span>Section</span>
                </button>
              </div>

              {/* Sort selector bar */}
              <div className="flex items-center justify-between text-xs text-ink-muted dark:text-ink-darkMuted pt-0.5">
                <span className="font-semibold text-[11px] uppercase tracking-wider text-ink-muted">
                  Notes Feed
                </span>

                <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 px-2 py-1 rounded-lg">
                  <ArrowUpDown className="w-3 h-3 text-ink-muted" />
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="bg-transparent text-[11px] font-semibold text-ink-secondary dark:text-ink-darkSecondary outline-none cursor-pointer"
                  >
                    <option value="updated">Recently Edited</option>
                    <option value="title">Alphabetical</option>
                    <option value="favorites">Favorites First</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Note Cards Feed (Mobile View Pattern) */}
            <div className="px-3.5 space-y-2.5">
              {visiblePages.length === 0 ? (
                <div className="py-14 text-center text-xs text-ink-muted space-y-3 bg-surface dark:bg-surface-dark p-6 rounded-2xl border border-border-subtle dark:border-border-darkSubtle">
                  <div className="w-12 h-12 rounded-2xl bg-brand-light dark:bg-brand-primary/10 text-brand-primary flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-ink-primary dark:text-ink-darkPrimary text-sm">No notes found</p>
                    <p className="text-[11px] mt-0.5 text-ink-muted">
                      Tap the (+) button below to create your first note.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateNewNote}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover transition shadow-sm active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Note</span>
                  </button>
                </div>
              ) : (
                visiblePages.map((page) => {
                  const sec = sections.find((s) => s.id === page.sectionId);
                  const color = sec ? COLOR_MAP[sec.color] || COLOR_MAP.peach : COLOR_MAP.peach;
                  const tags = extractTags(page.content);

                  return (
                    <article
                      key={page.id}
                      onClick={() => handleSelectPage(page.id)}
                      className="group relative p-3.5 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-[0_1px_3px_0_rgba(30,41,59,0.04)] active:scale-[0.99] transition cursor-pointer overflow-hidden flex flex-col justify-between"
                      style={{
                        borderLeft: `4px solid ${color.barColor}`,
                      }}
                    >
                      <div className="pl-0.5">
                        {/* Top row: Title + Star + Read Time */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary leading-snug line-clamp-1 flex-1">
                            {page.title || 'Untitled Note'}
                          </h3>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] font-medium text-ink-muted bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                              {getReadTime(page.content)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePageFavorite(page.id);
                              }}
                              className="p-1 -mr-1 text-slate-300 dark:text-slate-600 hover:text-amber-500 active:scale-90 transition"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  page.favorite
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Snippet preview */}
                        <p className="text-xs text-ink-muted dark:text-ink-darkMuted line-clamp-2 leading-relaxed mb-2.5 font-normal">
                          {page.content
                            ? page.content.replace(/^[#\s\*\>\-]+/gm, '').trim().slice(0, 100)
                            : 'No additional content...'}
                        </p>

                        {/* Bottom row: Time + Tags */}
                        <div className="flex items-center justify-between text-[10px] text-ink-muted pt-1.5 border-t border-border-subtle/50 dark:border-border-darkSubtle/50">
                          <span className="flex items-center gap-1 font-medium text-ink-muted">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(page.updated)}
                          </span>

                          <div className="flex items-center gap-1 flex-wrap">
                            {sec && (
                              <span
                                className={`font-semibold px-2 py-0.5 rounded-full ${color.bg} ${color.text} ${color.darkBg} ${color.darkText}`}
                              >
                                {sec.name}
                              </span>
                            )}
                            {tags.map((t) => (
                              <span
                                key={t}
                                className="bg-slate-100 dark:bg-slate-800 text-ink-secondary dark:text-ink-darkSecondary px-1.5 py-0.5 rounded-md font-medium"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* ─── LEVEL 4: MOBILE NOTE EDITOR CANVAS ─── */
          activePage && (
            <div className="h-full flex flex-col overflow-hidden bg-canvas-light dark:bg-canvas-dark">
              {/* Note Metadata and Title Header */}
              <div className="p-4 border-b border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark space-y-2 flex-shrink-0">
                {/* Meta details */}
                <div className="flex items-center justify-between text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    Edited {formatRelativeTime(activePage.updated)} • {getWordCount(activePage.content)} words • {getReadTime(activePage.content)}
                  </span>
                </div>

                {/* Big Note Title Input */}
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) => updatePageTitle(activePage.id, e.target.value)}
                  placeholder="Note Title..."
                  className="w-full text-xl font-extrabold bg-transparent outline-none border-none text-ink-primary dark:text-ink-darkPrimary placeholder:text-ink-muted/50 font-sans tracking-tight"
                />

                {/* Tags Strip */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {extractTags(activePage.content).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-brand-primary dark:text-brand-darkPrimary border border-border-subtle dark:border-border-darkSubtle"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      #{tag}
                    </span>
                  ))}
                  <button
                    onClick={() => setIsTagModalOpen(true)}
                    className="text-[11px] font-medium text-ink-muted hover:text-brand-primary flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-dashed border-border-subtle dark:border-border-darkSubtle active:scale-95 transition"
                  >
                    <Plus className="w-2.5 h-2.5" /> Add tag
                  </button>
                </div>
              </div>

              {/* Editor / Preview Content Canvas */}
              <div className="flex-1 overflow-y-auto">
                {editorTab === 'edit' ? (
                  <MarkdownEditor
                    ref={editorRef}
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

              {/* Sticky Mobile Formatting Toolbar (Visible in Edit mode) */}
              {editorTab === 'edit' && (
                <div className="flex items-center gap-1 px-2.5 py-2 border-t border-border-subtle dark:border-border-darkSubtle bg-surface/95 dark:bg-surface-dark/95 backdrop-blur-md overflow-x-auto no-scrollbar text-ink-secondary dark:text-ink-darkSecondary flex-shrink-0 z-30 shadow-lg">
                  <button
                    onClick={() => editorRef.current?.undo?.()}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    title="Undo"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => editorRef.current?.redo?.()}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    title="Redo"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-4 bg-border-subtle dark:border-border-darkSubtle mx-0.5" />

                  <button
                    onClick={() => formatText('# ', '', 'Heading 1')}
                    className="px-2 py-1 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition font-bold text-xs flex items-center gap-0.5"
                    title="H1"
                  >
                    <span>H1</span>
                  </button>

                  <button
                    onClick={() => formatText('## ', '', 'Heading 2')}
                    className="px-2 py-1 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-90 transition font-bold text-xs flex items-center gap-0.5"
                    title="H2"
                  >
                    <span>H2</span>
                  </button>

                  <button
                    onClick={() => formatText('**', '**', 'bold text')}
                    className="w-7 h-7 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs active:scale-90 transition"
                    title="Bold"
                  >
                    <span>B</span>
                  </button>

                  <button
                    onClick={() => formatText('*', '*', 'italic text')}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center italic font-semibold text-xs shrink-0 active:scale-90 transition"
                    title="Italic"
                  >
                    <span>I</span>
                  </button>

                  <button
                    onClick={() => formatText('~~', '~~', 'strikethrough')}
                    className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center line-through text-xs shrink-0 active:scale-90 transition"
                    title="Strikethrough"
                  >
                    <span>S</span>
                  </button>

                  <div className="w-[1px] h-4 bg-border-subtle dark:border-border-darkSubtle mx-0.5" />

                  <button
                    onClick={() => formatText('- [ ] ', '', 'Task item')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition text-brand-primary"
                    title="Checklist"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => formatText('- ', '', 'List item')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => formatText('1. ', '', 'Numbered item')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => formatText('> ', '', 'Quote')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    title="Blockquote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => formatText('```ts\n', '\n```', 'console.log("hello");')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    title="Code Block"
                  >
                    <Code className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => formatText('[', '](https://)', 'link title')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    title="Link"
                  >
                    <Link className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() =>
                      formatText(
                        '| Column 1 | Column 2 |\n|---|---|\n| Item 1 | Item 2 |\n'
                      )
                    }
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition"
                    title="Table"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* ─── 3. SPEED DIAL FLOATING ACTION BUTTON (Visible in explorer level) ─── */}
      {currentLevel !== 'editor' && (
        <>
          {/* Speed Dial Menu Popover & Backdrop */}
          {isSpeedDialOpen && (
            <div
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1.5px] z-40 flex flex-col justify-end p-5 pb-20 animate-in fade-in duration-150"
              onClick={() => setIsSpeedDialOpen(false)}
            >
              <div
                className="bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-3xl p-2.5 shadow-2xl space-y-1 mb-3 self-end w-64 animate-in slide-in-from-bottom-4 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                  Quick Capture
                </div>

                {/* Speed Dial 1: New Note */}
                <button
                  onClick={handleCreateNewNote}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-brand-light dark:hover:bg-brand-primary/10 text-ink-primary dark:text-ink-darkPrimary transition text-xs font-bold active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>New Note</div>
                      <span className="text-[10px] text-ink-muted font-normal">Active section</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-muted font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    ⌘N
                  </span>
                </button>

                {/* Speed Dial 2: New Task */}
                <button
                  onClick={() => {
                    setIsSpeedDialOpen(false);
                    setIsQuickTaskOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-ink-primary dark:text-ink-darkPrimary transition text-xs font-bold active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>New Task</div>
                      <span className="text-[10px] text-ink-muted font-normal">Todo list</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-muted font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    ⌘T
                  </span>
                </button>

                {/* Speed Dial 3: Log Habit */}
                <button
                  onClick={() => {
                    setIsSpeedDialOpen(false);
                    setCurrentView('habits');
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-950/30 text-ink-primary dark:text-ink-darkPrimary transition text-xs font-bold active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>Log Habit</div>
                      <span className="text-[10px] text-ink-muted font-normal">Today's streak</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-muted font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    ⌘H
                  </span>
                </button>

                {/* Speed Dial 4: Add Expense */}
                <button
                  onClick={() => {
                    setIsSpeedDialOpen(false);
                    setIsQuickExpenseOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-ink-primary dark:text-ink-darkPrimary transition text-xs font-bold active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div>Add Expense</div>
                      <span className="text-[10px] text-ink-muted font-normal">Track receipts</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-muted font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    ⌘E
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Primary Floating Action Button with Rotate Animation */}
          <button
            onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
            className={`fixed right-4 bottom-20 w-14 h-14 rounded-2xl bg-brand-primary text-white shadow-[0_8px_20px_-2px_rgba(79,70,229,0.45)] flex items-center justify-center transition-all transform active:scale-90 z-50 ${
              isSpeedDialOpen ? 'rotate-45 bg-slate-800' : 'hover:scale-105'
            }`}
            title="Speed Dial Actions"
          >
            <Plus className="w-7 h-7" />
          </button>
        </>
      )}

      {/* ─── 4. NOTEBOOK SELECTION DRAWER / BOTTOM SHEET ─── */}
      {isNotebookDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex flex-col justify-end animate-in fade-in duration-150"
          onClick={() => setIsNotebookDrawerOpen(false)}
        >
          <div
            className="bg-surface dark:bg-surface-dark rounded-t-3xl border-t border-border-subtle dark:border-border-darkSubtle max-h-[80vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border-subtle dark:border-border-darkSubtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Book className="w-5 h-5 text-brand-primary" />
                <h3 className="font-bold text-sm text-ink-primary dark:text-ink-darkPrimary">
                  Switch Notebook
                </h3>
              </div>
              <button
                onClick={async () => {
                  const name = prompt('New notebook name:');
                  if (name && name.trim()) {
                    const nb = await createNotebook(name.trim());
                    setActiveNotebook(nb.id);
                    setIsNotebookDrawerOpen(false);
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-light dark:bg-brand-primary/10 text-brand-primary dark:text-brand-darkPrimary text-xs font-bold active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2">
              {notebooks
                .filter((n) => !n.trashed)
                .map((nb) => {
                  const isCurrent = nb.id === activeNotebook?.id;
                  const secCount = sections.filter((s) => s.notebookId === nb.id && !s.trashed).length;
                  const pageCount = pages.filter((p) => p.notebookId === nb.id && !p.trashed).length;

                  return (
                    <div
                      key={nb.id}
                      onClick={() => handleSelectNotebook(nb.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition cursor-pointer active:scale-98 ${
                        isCurrent
                          ? 'border-brand-primary bg-brand-light/50 dark:bg-brand-primary/15'
                          : 'border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isCurrent
                              ? 'bg-brand-primary text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-700 text-ink-muted'
                          }`}
                        >
                          <Book className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary">
                            {nb.name}
                          </h4>
                          <span className="text-[11px] text-ink-muted">
                            {secCount} sections • {pageCount} notes
                          </span>
                        </div>
                      </div>

                      {isCurrent && <CheckCircle2 className="w-5 h-5 text-brand-primary" />}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. QUICK ADD TASK BOTTOM SHEET ─── */}
      {isQuickTaskOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex flex-col justify-end animate-in fade-in duration-150"
          onClick={() => setIsQuickTaskOpen(false)}
        >
          <form
            onSubmit={handleQuickTaskSubmit}
            className="bg-surface dark:bg-surface-dark rounded-t-3xl border-t border-border-subtle dark:border-border-darkSubtle p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                <span>Quick Add Task</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickTaskOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="What needs to be done?"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm font-medium text-ink-primary dark:text-ink-darkPrimary"
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-border-subtle dark:border-border-darkSubtle">
                <button
                  type="button"
                  onClick={() => setQuickTaskScope('work')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    quickTaskScope === 'work'
                      ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs'
                      : 'text-ink-muted'
                  }`}
                >
                  Work
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTaskScope('personal')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    quickTaskScope === 'personal'
                      ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs'
                      : 'text-ink-muted'
                  }`}
                >
                  Personal
                </button>
              </div>

              <button
                type="submit"
                disabled={!quickTaskTitle.trim()}
                className="px-5 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover transition disabled:opacity-50 shadow-sm active:scale-95"
              >
                Create Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── 6. QUICK ADD EXPENSE BOTTOM SHEET ─── */}
      {isQuickExpenseOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex flex-col justify-end animate-in fade-in duration-150"
          onClick={() => setIsQuickExpenseOpen(false)}
        >
          <form
            onSubmit={handleQuickExpenseSubmit}
            className="bg-surface dark:bg-surface-dark rounded-t-3xl border-t border-border-subtle dark:border-border-darkSubtle p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-500" />
                <span>Quick Log Transaction</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsQuickExpenseOpen(false)}
                className="p-1 rounded-lg text-ink-muted hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                autoFocus
                placeholder="Amount (₹ / $)"
                value={quickExpenseAmount}
                onChange={(e) => setQuickExpenseAmount(e.target.value)}
                className="px-4 py-3 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm font-bold text-ink-primary dark:text-ink-darkPrimary"
              />

              <div className="flex items-center p-0.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border-subtle dark:border-border-darkSubtle">
                <button
                  type="button"
                  onClick={() => setQuickExpenseType('expense')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    quickExpenseType === 'expense'
                      ? 'bg-surface dark:bg-surface-dark text-rose-600 shadow-xs'
                      : 'text-ink-muted'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpenseType('income')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    quickExpenseType === 'income'
                      ? 'bg-surface dark:bg-surface-dark text-emerald-600 shadow-xs'
                      : 'text-ink-muted'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="Description (e.g. Coffee, Domain, Client Invoice)..."
              value={quickExpenseDesc}
              onChange={(e) => setQuickExpenseDesc(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm font-medium text-ink-primary dark:text-ink-darkPrimary"
            />

            <button
              type="submit"
              disabled={!quickExpenseAmount || !quickExpenseDesc.trim()}
              className="w-full py-3 rounded-2xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover transition disabled:opacity-50 shadow-sm active:scale-95"
            >
              Log Transaction
            </button>
          </form>
        </div>
      )}

      {/* ─── 7. QUICK TAG MODAL ─── */}
      {isTagModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsTagModalOpen(false)}
        >
          <div
            className="bg-surface dark:bg-surface-dark rounded-3xl border border-border-subtle dark:border-border-darkSubtle p-5 w-full max-w-xs space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">Add Tag to Note</h4>
              <button onClick={() => setIsTagModalOpen(false)}>
                <X className="w-4 h-4 text-ink-muted" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Tag name (e.g. ideas, work, books)..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
            />

            <button
              onClick={() => {
                if (newTagInput.trim() && activePage) {
                  const tagText = ` #${newTagInput.trim().replace(/^#/, '')}`;
                  updatePageContent(activePage.id, activePage.content + tagText);
                  setNewTagInput('');
                  setIsTagModalOpen(false);
                }
              }}
              disabled={!newTagInput.trim()}
              className="w-full py-2 rounded-xl bg-brand-primary text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition"
            >
              Insert Tag
            </button>
          </div>
        </div>
      )}

      {/* ─── 8. EDITOR ACTIONS DROPDOWN MENU ─── */}
      {isEditorMenuOpen && activePage && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsEditorMenuOpen(false)}
        >
          <div
            className="absolute top-12 right-4 bg-surface dark:bg-surface-dark rounded-2xl border border-border-subtle dark:border-border-darkSubtle p-1.5 shadow-xl w-48 space-y-0.5 z-50 text-xs font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                navigator.clipboard.writeText(activePage.content);
                setIsEditorMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-ink-primary dark:text-ink-darkPrimary text-left"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Copy Note Markdown</span>
            </button>

            <button
              onClick={async () => {
                setIsEditorMenuOpen(false);
                await trashPage(activePage.id);
                setCurrentLevel('pages');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 text-left"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Move to Trash</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 9. DOCKED MOBILE BOTTOM NAVIGATION BAR ─── */}
      {currentLevel !== 'editor' && renderBottomNav()}
    </div>
  );
};
