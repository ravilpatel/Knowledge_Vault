import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabaseClient';
import { UserProfile } from '../../types';

interface SupabaseAuthState {
  supabaseUser: User | null;
  session: Session | null;
  isGuest: boolean;
  isLoading: boolean;
  authError: string | null;
  googleUser: UserProfile | null;
  scopeMode: 'drive.file' | 'drive';

  // Actions
  initAuth: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  setGoogleUser: (user: UserProfile | null) => void;
  setScopeMode: (mode: 'drive.file' | 'drive') => void;
  clearError: () => void;
}

const GOOGLE_SESSION_KEY = 'notevault_google_profile';
const GUEST_KEY = 'notevault_guest_flag';

function loadSavedGoogleUser(): UserProfile | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(GOOGLE_SESSION_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw) as UserProfile;
    if (profile.expiresAt && Date.now() > profile.expiresAt) {
      sessionStorage.removeItem(GOOGLE_SESSION_KEY);
      return null;
    }
    return profile;
  } catch {
    return null;
  }
}

export const useSupabaseAuthStore = create<SupabaseAuthState>((set) => ({
  supabaseUser: null,
  session: null,
  isGuest: typeof localStorage !== 'undefined' ? localStorage.getItem(GUEST_KEY) === 'true' : false,
  isLoading: true,
  authError: null,
  googleUser: loadSavedGoogleUser(),
  scopeMode:
    (typeof localStorage !== 'undefined'
      ? (localStorage.getItem('notevault_scope_mode') as 'drive.file' | 'drive')
      : null) || 'drive.file',

  initAuth: async () => {
    set({ isLoading: true });
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.warn('Supabase getSession warning:', error.message);
      }
      if (data?.session) {
        set({
          session: data.session,
          supabaseUser: data.session.user,
          isGuest: false,
          isLoading: false,
        });
      } else {
        set({ session: null, supabaseUser: null, isLoading: false });
      }

      // Subscribe to changes
      sb.auth.onAuthStateChange((event, session) => {
        if (session) {
          if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_KEY);
          set({
            session,
            supabaseUser: session.user,
            isGuest: false,
            isLoading: false,
            authError: null,
          });
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, supabaseUser: null, isLoading: false });
        }
      });
    } catch (err: any) {
      console.error('Failed to initialize Supabase auth:', err);
      set({ isLoading: false, authError: err?.message || 'Supabase connection failed' });
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true, authError: null });
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        set({ isLoading: false, authError: error.message });
        return { success: false, error: error.message };
      }
      if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_KEY);
      set({
        session: data.session,
        supabaseUser: data.user,
        isGuest: false,
        isLoading: false,
        authError: null,
      });
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      set({ isLoading: false, authError: msg });
      return { success: false, error: msg };
    }
  },

  signUpWithEmail: async (email, password, name) => {
    set({ isLoading: true, authError: null });
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || email.split('@')[0] },
        },
      });
      if (error) {
        set({ isLoading: false, authError: error.message });
        return { success: false, error: error.message };
      }
      if (data.session) {
        set({
          session: data.session,
          supabaseUser: data.user,
          isGuest: false,
          isLoading: false,
          authError: null,
        });
      } else {
        set({ isLoading: false });
      }
      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      set({ isLoading: false, authError: msg });
      return { success: false, error: msg };
    }
  },

  resetPassword: async (email) => {
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send reset email' };
    }
  },

  signOut: async () => {
    try {
      const sb = getSupabase();
      await sb.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_KEY);
    set({ session: null, supabaseUser: null, isGuest: false });
  },

  continueAsGuest: () => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(GUEST_KEY, 'true');
    set({ isGuest: true, authError: null });
  },

  setGoogleUser: (user) => {
    try {
      if (user) {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(GOOGLE_SESSION_KEY, JSON.stringify(user));
        }
      } else {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(GOOGLE_SESSION_KEY);
        }
      }
    } catch {}
    set({ googleUser: user });
  },

  setScopeMode: (scopeMode) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('notevault_scope_mode', scopeMode);
    }
    set({ scopeMode });
  },

  clearError: () => set({ authError: null }),
}));

// Compatibility proxy bridge so legacy note stores and googleAuth hooks continue working effortlessly
export const useAuthStore = useSupabaseAuthStore;
