import React, { useState } from 'react';
import { useAuthStore } from './authStore';
import { signInWithGoogle, getClientId } from './googleAuth';
import {
  BookOpen,
  Cloud,
  WifiOff,
  FolderSync,
  FileCode2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const SignInModal: React.FC = () => {
  const { setGuest, error, setError } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const clientId = getClientId();

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google Sign-In');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    setGuest(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-lg bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* App Logo & Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/25">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-primary dark:text-ink-darkPrimary">
            NoteVault
          </h1>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted max-w-sm mx-auto leading-relaxed">
            OneNote-style, Markdown-first notebook PWA storing all notes in your own Google Drive.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="space-y-3 mb-8">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle/60 dark:border-border-darkSubtle/60">
            <div className="p-2 rounded-lg bg-brand-light dark:bg-brand-primary/10 text-brand-primary dark:text-brand-darkPrimary flex-shrink-0">
              <FolderSync className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">
                OneNote Hierarchy &amp; Pastel Tabs
              </h4>
              <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed">
                Organize thoughts into Notebooks, colored Section tabs, and Pages.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle/60 dark:border-border-darkSubtle/60">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">
                Full Offline Read &amp; Write
              </h4>
              <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed">
                IndexedDB outbox queues your edits instantly and syncs seamlessly when back online.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle/60 dark:border-border-darkSubtle/60">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <FileCode2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">
                Zero Lock-In Recoverability
              </h4>
              <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted leading-relaxed">
                Plain Markdown (<code className="font-mono text-[10px]">.md</code>) files with YAML front-matter stored in your personal Drive.
              </p>
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover transition shadow-md shadow-brand-primary/20 cursor-pointer disabled:opacity-50"
          >
            <Cloud className="w-4 h-4" />
            <span>{isLoading ? 'Connecting Google Drive...' : 'Connect Google Drive'}</span>
            <ArrowRight className="w-4 h-4 ml-auto" />
          </button>

          <button
            onClick={handleGuest}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border-subtle dark:border-border-darkSubtle text-ink-secondary dark:text-ink-darkSecondary text-xs font-semibold hover:bg-surface-subtle dark:hover:bg-surface-subtleDark transition"
          >
            <span>Continue Offline in Guest Mode</span>
          </button>
        </div>

        {/* Client ID hint */}
        {!clientId && (
          <p className="mt-4 text-[10px] text-center text-ink-muted/80">
            Note: Set <code className="font-mono bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> in <code className="font-mono">.env</code> to enable live Google Drive sync. Guest mode works completely offline with IndexedDB.
          </p>
        )}
      </div>
    </div>
  );
};
