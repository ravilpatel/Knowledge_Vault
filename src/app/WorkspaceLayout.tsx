import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { NotebookRail } from '../components/NotebookRail';
import { SectionTabs } from '../components/SectionTabs';
import { PageList } from '../components/PageList';
import { EditorPane } from '../components/EditorPane';
import { StatusPill } from '../components/StatusPill';
import { OfflineBanner } from '../components/OfflineBanner';
import { CommandPalette } from '../components/CommandPalette';
import { ConflictModal } from '../components/ConflictModal';
import { SettingsModal } from '../components/SettingsModal';
import { MobileView } from '../components/mobile/MobileView';
import {
  BookOpen,
  Search,
  Settings,
  Moon,
  Sun,
  User,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';

interface WorkspaceLayoutProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ isDark, onToggleTheme }) => {
  const { user, isGuest } = useAuthStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRailCollapsed, setIsRailCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Responsive resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isMobile) {
    return (
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <OfflineBanner />
        <MobileView
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isDark={isDark}
        />
        <CommandPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
        />
        <ConflictModal />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-canvas-light dark:bg-canvas-dark text-ink-primary dark:text-ink-darkPrimary overflow-hidden font-sans">
      {/* Offline Alert Banner */}
      <OfflineBanner />

      {/* Top Workspace Header */}
      <header className="h-12 border-b border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark px-4 flex items-center justify-between flex-shrink-0 select-none z-10">
        {/* Brand & Left Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRailCollapsed(!isRailCollapsed)}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isRailCollapsed ? 'Expand Notebook Rail' : 'Collapse Notebook Rail'}
          >
            {isRailCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-primary text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-ink-primary dark:text-ink-darkPrimary">
              NoteVault
            </span>
          </div>
        </div>

        {/* Global Search Omnibar Trigger */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark hover:border-brand-primary/40 dark:hover:border-brand-darkPrimary/40 transition w-80 text-xs text-ink-muted dark:text-ink-darkMuted cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-brand-primary dark:text-brand-darkPrimary" />
          <span className="flex-1 text-left truncate">Search notes, tags (#), operators...</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle text-ink-muted shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Right Action Icons: Sync Pill, Theme, Settings, Profile */}
        <div className="flex items-center gap-2.5">
          <StatusPill onClick={() => setIsSettingsOpen(true)} />

          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Settings & Trash"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Avatar */}
          <div
            onClick={() => setIsSettingsOpen(true)}
            className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs cursor-pointer border border-brand-primary/20 hover:scale-105 transition"
            title={user?.name || (isGuest ? 'Guest (Offline)' : 'User')}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
          </div>
        </div>
      </header>

      {/* Pastel Section Tabs bar */}
      <SectionTabs />

      {/* 3-Pane Body: Notebook Rail | Page List | Editor Pane */}
      <div className="flex-1 flex overflow-hidden">
        {!isRailCollapsed && (
          <NotebookRail
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}
        <PageList />
        <EditorPane isDark={isDark} />
      </div>

      {/* Modals & Dialogs */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
      />

      {/* Conflict Resolution Dialog (triggered automatically when conflict is active) */}
      <ConflictModal />
    </div>
  );
};
