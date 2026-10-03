import React, { useState } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { useNoteStore } from '../features/notes/noteStore';
import { useSyncStore } from '../features/sync/syncStore';
import { useVaultStore } from '../features/vault/vaultStore';
import { syncEngine } from '../features/sync/syncEngine';
import { signInWithGoogle } from '../features/auth/googleAuth';
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
  CheckCircle2,
  X,
} from 'lucide-react';

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
  const { user, googleUser, scopeMode, setScopeMode, signOut } = useAuthStore() as any;
  const { notebooks, sections, pages, loadInitialData } = useNoteStore();
  const { todos, habits, expenses, news, panels, panelFields, panelEntries } = useVaultStore();
  const { status, pendingCount } = useSyncStore();

  const [activeTab, setActiveTab] = useState<'settings' | 'trash'>('settings');
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildStatus, setRebuildStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRebuildFromDrive = async () => {
    if (
      !confirm(
        'Are you sure you want to rebuild local data? This tests Section 4.6 (Recovery Guarantee): your local database will be cleared and completely repopulated directly from your Google Drive NoteVault folder.'
      )
    ) {
      return;
    }

    setIsRebuilding(true);
    setRebuildStatus('Clearing local cache and rebuilding from Drive...');
    try {
      await syncEngine.rebuildFromDrive();
      await loadInitialData();
      setRebuildStatus('Recovery complete! All notes restored from Drive.');
      setTimeout(() => setRebuildStatus(null), 4000);
    } catch (err: any) {
      setRebuildStatus(`Rebuild failed: ${err.message || err}`);
    } finally {
      setIsRebuilding(false);
    }
  };

  const handleExportVault = () => {
    const exportData = {
      vaultVersion: 3,
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
                Preferences, cloud sync status, and trash recovery
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
                        <h4 className="text-xs font-bold">{user?.name || 'Supabase User'}</h4>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                          Supabase Auth
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted">{user?.email || 'Logged in via Supabase'}</p>
                    </div>
                  </div>

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
                </div>

                {/* Google Drive Status for NoteVault Notes */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-border-subtle/60 dark:border-border-darkSubtle/60">
                  <div>
                    <span className="text-ink-muted">Notes Storage: </span>
                    <span className="font-semibold text-ink-primary dark:text-ink-darkPrimary">
                      {googleUser?.accessToken ? 'Google Drive (Connected)' : 'Google Drive (Not Connected)'}
                    </span>
                  </div>

                  {!googleUser?.accessToken && (
                    <button
                      onClick={async () => {
                        try {
                          await signInWithGoogle();
                        } catch (err: any) {
                          alert(`Google Drive sign-in: ${err.message || err}`);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-hover transition shadow-2xs"
                    >
                      Connect Google Drive
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle/60 dark:border-border-darkSubtle/60">
                  <span className="text-ink-muted">Drive Outbox Sync:</span>
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

              {/* Google Drive Scope Setting */}
              <div className="space-y-2 py-2 border-b border-border-subtle dark:border-border-darkSubtle">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold">Google Drive Scope Mode</h4>
                    <p className="text-[11px] text-ink-muted">
                      drive.file accesses only app-created files; drive provides full folder import
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setScopeMode('drive.file')}
                    className={`p-3 rounded-xl border text-left transition ${
                      scopeMode === 'drive.file'
                        ? 'border-brand-primary bg-brand-light/50 dark:bg-brand-primary/10 font-bold'
                        : 'border-border-subtle dark:border-border-darkSubtle hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">drive.file (Recommended)</span>
                      {scopeMode === 'drive.file' && <CheckCircle2 className="w-4 h-4 text-brand-primary" />}
                    </div>
                    <p className="text-[10px] text-ink-muted font-normal">
                      Only accesses files created or opened by NoteVault. Safest privacy level.
                    </p>
                  </button>

                  <button
                    onClick={() => setScopeMode('drive')}
                    className={`p-3 rounded-xl border text-left transition ${
                      scopeMode === 'drive'
                        ? 'border-brand-primary bg-brand-light/50 dark:bg-brand-primary/10 font-bold'
                        : 'border-border-subtle dark:border-border-darkSubtle hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">drive (Full Access)</span>
                      {scopeMode === 'drive' && <CheckCircle2 className="w-4 h-4 text-brand-primary" />}
                    </div>
                    <p className="text-[10px] text-ink-muted font-normal">
                      Can discover notes manually placed in Drive by the web UI or external tools.
                    </p>
                  </button>
                </div>
              </div>

              {/* Recovery & Sync Actions */}
              <div className="space-y-3 py-2 border-b border-border-subtle dark:border-border-darkSubtle">
                <h4 className="text-xs font-bold">Cloud Sync & Recovery</h4>

                {rebuildStatus && (
                  <div className="p-3 rounded-xl bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 text-xs text-brand-primary flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>{rebuildStatus}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => syncEngine.flushOutbox()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync Now</span>
                  </button>

                  <button
                    onClick={handleRebuildFromDrive}
                    disabled={isRebuilding}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-semibold transition"
                    title="Section 4.6 Recovery Test: Wipe local Dexie database and rebuild completely from Drive"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Rebuild Local DB from Drive (Test 4.6)</span>
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
