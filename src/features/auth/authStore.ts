import { create } from 'zustand';
import { UserProfile } from '../../types';

interface AuthState {
  user: UserProfile | null;
  isGuest: boolean;
  isInitializing: boolean;
  error: string | null;
  scopeMode: 'drive.file' | 'drive';
  setUser: (user: UserProfile | null) => void;
  setGuest: (isGuest: boolean) => void;
  setError: (error: string | null) => void;
  setScopeMode: (mode: 'drive.file' | 'drive') => void;
  signOut: () => void;
}

const SESSION_STORAGE_KEY = 'notevault_auth_profile';
const GUEST_STORAGE_KEY = 'notevault_guest_mode';

function loadStoredUser(): UserProfile | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as UserProfile;
    // Check token expiry
    if (profile.expiresAt && Date.now() > profile.expiresAt) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

function loadStoredGuest(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadStoredUser(),
  isGuest: loadStoredGuest(),
  isInitializing: false,
  error: null,
  scopeMode:
    (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('notevault_scope_mode') as 'drive.file' | 'drive')
      : null) || 'drive.file',

  setUser: (user) => {
    try {
      if (user) {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
        if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_STORAGE_KEY);
        set({ user, isGuest: false, error: null });
      } else {
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_KEY);
        set({ user: null });
      }
    } catch {
      set({ user });
    }
  },

  setGuest: (isGuest) => {
    try {
      if (isGuest) {
        if (typeof localStorage !== 'undefined') localStorage.setItem(GUEST_STORAGE_KEY, 'true');
        if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_KEY);
        set({
          isGuest: true,
          user: {
            email: 'offline.user@local.vault',
            name: 'Local User (Offline)',
            accessToken: 'offline_token',
            expiresAt: Date.now() + 86400000 * 365,
            scope: 'local',
          },
          error: null,
        });
      } else {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_STORAGE_KEY);
        set({ isGuest: false, user: null });
      }
    } catch {
      set({ isGuest });
    }
  },

  setError: (error) => set({ error }),

  setScopeMode: (scopeMode) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('notevault_scope_mode', scopeMode);
    } catch {}
    set({ scopeMode });
  },

  signOut: () => {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_KEY);
      if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {}
    set({ user: null, isGuest: false, error: null });
  },
}));
