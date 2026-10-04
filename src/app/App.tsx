import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { useNoteStore } from '../features/notes/noteStore';
import { syncEngine } from '../features/sync/syncEngine';
import { WorkspaceLayout } from './WorkspaceLayout';
import { useVaultStore } from '../features/vault/vaultStore';
import { safeStorage } from '../lib/safeStorage';

export const App: React.FC = () => {
  const { supabaseUser, initSupabaseAuth } = useAuthStore();
  const { loadInitialData } = useNoteStore();
  const { loadVaultData } = useVaultStore();

  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = safeStorage.getItem('notevault_theme');
      if (saved) return saved === 'dark';
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch {
      // Fallback
    }
    return false;
  });

  // Apply dark mode class to html element
  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement?.classList.add('dark');
        safeStorage.setItem('notevault_theme', 'dark');
      } else {
        document.documentElement?.classList.remove('dark');
        safeStorage.setItem('notevault_theme', 'light');
      }
    } catch (e) {
      console.warn('Theme update exception:', e);
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Bootstrap data and Supabase Auth sequentially
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await initSupabaseAuth();
      } catch (err) {
        console.warn('Auth init non-blocking warning:', err);
      }
      if (!mounted) return;

      try {
        await loadInitialData();
      } catch (err) {
        console.warn('Note load initial data warning:', err);
      }

      try {
        await loadVaultData();
      } catch (err) {
        console.warn('Vault load initial data warning:', err);
      }

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncEngine.flushOutbox();
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // When user signs in or changes, refresh data and flush outbox
  useEffect(() => {
    if (supabaseUser?.id) {
      loadInitialData();
      loadVaultData();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        syncEngine.flushOutbox();
      }
    }
  }, [supabaseUser?.id]);

  return (
    <div className="h-full min-h-[100dvh] w-full flex flex-col overflow-hidden bg-canvas-light dark:bg-canvas-dark">
      <WorkspaceLayout isDark={isDark} onToggleTheme={toggleTheme} />
    </div>
  );
};

