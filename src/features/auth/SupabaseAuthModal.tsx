import React, { useState } from 'react';
import { useAuthStore } from './authStore';
import { getSupabaseConfig } from '../../lib/supabaseClient';
import {
  Brain,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  WifiOff,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const SupabaseAuthModal: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, resetPassword, setGuest, authError, clearError } =
    useAuthStore() as any;

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { url } = getSupabaseConfig();
  let projectHostname = 'supabase.co';
  try {
    projectHostname = new URL(url).hostname;
  } catch {
    projectHostname = 'supabase.co';
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clearError) clearError();
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const res = await signInWithEmail(email.trim(), password);
        if (res.success) {
          setSuccessMessage('Signed in successfully!');
        }
      } else if (mode === 'signup') {
        const res = await signUpWithEmail(email.trim(), password, displayName.trim());
        if (res.success) {
          setSuccessMessage('Account created! Please check your email if confirmation is required.');
        }
      } else if (mode === 'forgot') {
        const res = await resetPassword(email.trim());
        if (res.success) {
          setSuccessMessage('Password reset email sent! Check your inbox.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = () => {
    setGuest(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in-95 duration-200 text-ink-primary dark:text-ink-darkPrimary">
        {/* App Logo & Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Brain className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Knowledge Vault</h1>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted leading-relaxed">
            Second Brain Workspace &bull; Supabase Cloud &bull; Google Drive Notes
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-surface-subtle dark:bg-surface-subtleDark p-1 mb-5 border border-border-subtle dark:border-border-darkSubtle text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              mode === 'signin'
                ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs'
                : 'text-ink-muted'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setSuccessMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-lg transition ${
              mode === 'signup'
                ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs'
                : 'text-ink-muted'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Messages */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Alex Mercer"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-ink-muted">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setSuccessMessage(null);
                    }}
                    className="text-[10px] text-brand-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-semibold flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : mode === 'signin' ? (
              <>
                <span>Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'signup' ? (
              <>
                <span>Create Account</span>
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              <span>Send Reset Email</span>
            )}
          </button>
        </form>

        {/* Supabase backend status */}
        <div className="mt-4 pt-4 border-t border-border-subtle dark:border-border-darkSubtle flex items-center justify-between text-[11px] text-ink-muted">
          <div className="flex items-center gap-1.5 truncate max-w-[240px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="truncate">Supabase: {projectHostname}</span>
          </div>

          <button
            type="button"
            onClick={handleGuest}
            className="inline-flex items-center gap-1 text-[11px] text-ink-secondary hover:text-brand-primary font-medium transition"
            title="Continue without logging in"
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span>Guest Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
