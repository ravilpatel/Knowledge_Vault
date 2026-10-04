import React, { useState } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { useNoteStore } from '../features/notes/noteStore';
import { useSyncStore } from '../features/sync/syncStore';
import { useVaultStore } from '../features/vault/vaultStore';
import { syncEngine } from '../features/sync/syncEngine';
import { TrashView } from './TrashView';
import {
  Settings,
  Trash2,
  Cloud,
  RefreshCw,
  LogOut,
  Download,
  Moon,
  Sun,
  ShieldCheck,
  X,
} from 'lucide-react';
import { getSupabaseConfig } from '../lib/supabaseClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
}) => {
  const { user, supabaseUser, isGuest, signOut } = useAuthStore();
  const { notebooks, sections, pages, loadInitialData } = useNoteStore();
  const { todos, habits, expenses, news, panels, panelFields, panelEntries } = useVaultStore();
  const { status, pendingCount, errorMessage } = useSyncStore();

  const [activeTab, setActiveTab] = useState<'settings' | 'trash'>('settings');
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const { url } = getSupabaseConfig();
  let projectHostname = 'supabase.co';
  try {
    projectHostname = new URL(url).hostname;
  } catch {
    projectHostname = 'supabase.co';
  }

  const handleRebuildFromSupabase = async () => {
    if (
      !confirm(
        'Are you sure you want to rebuild local data from Supabase Cloud? Your local Dexie cache will be cleared and repopulated directly from your Supabase database.'
      )
    ) {
      return;
    }

    setIsRebuilding(true);
    setRebuildStatus('Clearing local cache and rebuilding from Supabase...');
    try {
      await syncEngine.rebuildFromSupabase();
      await loadInitialData();
      setRebuildStatus('Recovery complete! All notes and sections restored from Supabase.');
      setTimeout(() => setRebuildStatus(null), 4000);
    } catch (err: any) {
      setRebuildStatus(`Rebuild failed: ${err.message || err}`);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleExportVault = () => {
    const exportData = {
      vaultVersion: 4,
      exportedAt: new Date().toISOString(),
      notebooks: notebooks.filter((n) => !n.trashed),
      sections: sections.filter((s) => !s.trashed),
      pages: pages.filter((p) => !p.trashed),
      panels,
      panelFields,
      panelEntries,
      todos,
      habits,
      expenses,
      news,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KnowledgeVault-Complete-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-light dark:bg-brand-primary/15 text-brand-primary dark:text-brand-darkPrimary flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary">
                NoteVault Settings
              </h3>
              <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted">
                Preferences, Supabase cloud sync status, and trash recovery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-border-subtle dark:border-border-darkSubtle px-6 bg-surface-subtle dark:bg-surface-subtleDark text-xs font-semibold">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'settings'
                ? 'border-brand-primary text-brand-primary dark:text-brand-darkPrimary'
                : 'border-transparent text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary'
            }`}
          >
            Preferences & Cloud
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`py-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'trash'
                ? 'border-brand-primary text-brand-primary dark:text-brand-darkPrimary'
                : 'border-transparent text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash & Recovery</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-ink-primary dark:text-ink-darkPrimary">
          {activeTab === 'trash' ? (
            <TrashView />
          ) : (
            <>
              {/* Account Section */}
              <div className="p-4 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle/50 dark:bg-surface-subtleDark/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold">{user?.name || (isGuest ? 'Local Guest' : 'User Account')}</h4>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${
                          isGuest 
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        }`}>
                          {isGuest ? 'Offline Guest' : 'Supabase Session'}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted">{user?.email || (isGuest ? 'Local storage only' : 'Connected')}</p>
                    </div>
                  </div>

                  {!isGuest && (
                    <button
                      onClick={() => {
                        signOut();
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>

                {/* Supabase Cloud Connection Status */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border-subtle/60 dark:border-border-darkSubtle/60">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-ink-muted">Backend Database: </span>
                    <span className="font-semibold text-ink-primary dark:text-ink-darkPrimary">
                      {projectHostname}
                    </span>
                  </div>

                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    {supabaseUser ? 'Authenticated' : isGuest ? 'Guest Mode' : 'Ready'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle/60 dark:border-border-darkSubtle/60">
                  <span className="text-ink-muted">Supabase Outbox Queue:</span>
                  <span className="font-semibold capitalize text-brand-primary dark:text-brand-darkPrimary">
                    {status} ({pendingCount} pending)
                  </span>
                </div>
              </div>

              {/* Theme Preference */}
              <div className="flex items-center justify-between py-2 border-b border-border-subtle dark:border-border-darkSubtle">
                <div>
                  <h4 className="text-xs font-bold">Theme Appearance</h4>
                  <p className="text-[11px] text-ink-muted">Switch between light and slate obsidian dark mode</p>
                </div>
                <button
                  onClick={onToggleTheme}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                  <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
              </div>

              {/* Recovery & Sync Actions */}
              <div className="space-y-3 py-2 border-b border-border-subtle dark:border-border-darkSubtle">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold">Supabase Cloud Sync & Recovery</h4>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    status === 'synced'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : status === 'syncing'
                      ? 'bg-indigo-500/10 text-indigo-600'
                      : status === 'offline'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {status === 'synced' ? 'Synced with Cloud' : status === 'syncing' ? 'Syncing...' : status === 'offline' ? 'Offline' : 'Sync Error'}
                  </span>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between gap-2">
                    <span className="truncate">{errorMessage}</span>
                    <button
                      onClick={() => syncEngine.clearAndRetry()}
                      className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-semibold shrink-0 hover:bg-rose-600 transition"
                    >
                      Clear & Retry
                    </button>
                  </div>
                )}

                {rebuildStatus && (
                  <div className="p-3 rounded-xl bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 text-xs text-brand-primary flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>{rebuildStatus}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => syncEngine.clearAndRetry()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Now</span>
                  </button>

                  <button
                    onClick={handleRebuildFromSupabase}
                    disabled={isRebuilding || isGuest}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold transition disabled:opacity-50"
                    title="Wipe local Dexie database and rebuild completely from Supabase Cloud"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Rebuild Local DB from Supabase</span>
                  </button>

                  <button
                    onClick={handleExportVault}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle text-ink-primary dark:text-ink-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition ml-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON Backup</span>
                  </button>
                </div>
              </div>

              {/* Local Storage Meter */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold">Local IndexedDB Database Metrics</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
                    <span className="block text-base font-bold text-brand-primary">
                      {notebooks.filter((n) => !n.trashed).length}
                    </span>
                    <span className="text-[10px] text-ink-muted">Notebooks</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
                    <span className="block text-base font-bold text-brand-primary">
                      {sections.filter((s) => !s.trashed).length}
                    </span>
                    <span className="text-[10px] text-ink-muted">Sections</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
                    <span className="block text-base font-bold text-brand-primary">
                      {pages.filter((p) => !p.trashed).length}
                    </span>
                    <span className="text-[10px] text-ink-muted">Pages</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
                    <span className="block text-base font-bold text-brand-primary">{pendingCount}</span>
                    <span className="text-[10px] text-ink-muted">Outbox Queue</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
                    <span className="block text-base font-bold text-indigo-600 dark:text-indigo-400">
                      {panels.length}
                    </span>
                    <span className="text-[10px] text-ink-muted">Workspace Panels</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
                    <span className="block text-base font-bold text-sky-600 dark:text-sky-400">
                      {panelEntries.length}
                    </span>
                    <span className="text-[10px] text-ink-muted">Panel Records</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
                    <span className="block text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {todos.length}
                    </span>
                    <span className="text-[10px] text-ink-muted">Tasks (Matrix)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
                    <span className="block text-base font-bold text-amber-600 dark:text-amber-400">
                      {habits.length}
                    </span>
                    <span className="text-[10px] text-ink-muted">Habits</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
