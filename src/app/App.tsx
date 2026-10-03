import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../features/auth/authStore';
import { useNoteStore } from '../features/notes/noteStore';
import { initGoogleAuth } from '../features/auth/googleAuth';
import { syncEngine } from '../features/sync/syncEngine';
import { SignInModal } from '../features/auth/SignInModal';
import { WorkspaceLayout } from './WorkspaceLayout';

export const App: React.FC = () => {
  const { user, isGuest } = useAuthStore();
  const { loadInitialData } = useNoteStore();

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notevault_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('notevault_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('notevault_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  // Bootstrap data and Google Auth
  useEffect(() => {
    loadInitialData();
    initGoogleAuth();

    if (user && !isGuest && navigator.onLine) {
      syncEngine.flushOutbox();
    }
  }, [user?.accessToken]);

  return (
    <div className="h-full w-full">
      {/* If not authenticated and not in guest mode, display sign-in / onboarding */}
      {!user && !isGuest ? (
        <SignInModal />
      ) : (
        <WorkspaceLayout isDark={isDark} onToggleTheme={toggleTheme} />
      )}
    </div>
  );
};
