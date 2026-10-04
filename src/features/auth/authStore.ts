import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabaseClient';
import { UserProfile } from '../../types';

interface AuthState {
  supabaseUser: User | null;
  session: Session | null;
  user: UserProfile | null;
  isGuest: boolean;
  isLoading: boolean;
  authError: string | null;

  // Actions
  initSupabaseAuth: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  setGuest: (isGuest: boolean) => void;
  setUser: (user: UserProfile | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const GUEST_STORAGE_KEY = 'notevault_guest_mode';

function loadStoredGuest(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(GUEST_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  supabaseUser: null,
  session: null,
  user: null,
  isGuest: loadStoredGuest(),
  isLoading: true,
  authError: null,

  initSupabaseAuth: async () => {
    set({ isLoading: true });
    try {
      const sb = getSupabase();
      const { data, error } = await sb.auth.getSession();
      if (error) {
        console.warn('Supabase getSession warning:', error.message);
      }
      if (data?.session) {
        const u = data.session.user;
        const profile: UserProfile = {
          id: u.id,
          email: u.email || 'user@supabase.io',
          name: u.user_metadata?.name || u.email?.split('@')[0] || 'User',
        };
        set({
          session: data.session,
          supabaseUser: u,
          user: profile,
          isGuest: false,
          isLoading: false,
          authError: null,
        });
      } else {
        set({ session: null, supabaseUser: null, isLoading: false });
      }

      sb.auth.onAuthStateChange((event, session) => {
        if (session) {
          const u = session.user;
          if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_STORAGE_KEY);
          const profile: UserProfile = {
            id: u.id,
            email: u.email || 'user@supabase.io',
            name: u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          };
          set({
            session,
            supabaseUser: u,
            user: profile,
            isGuest: false,
            isLoading: false,
            authError: null,
          });
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, supabaseUser: null, user: null, isLoading: false });
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
      if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_STORAGE_KEY);
      const u = data.user;
      const profile: UserProfile = {
        id: u.id,
        email: u.email || email,
        name: u.user_metadata?.name || email.split('@')[0],
      };
      set({
        session: data.session,
        supabaseUser: u,
        user: profile,
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
      if (data.session && data.user) {
        const u = data.user;
        const profile: UserProfile = {
          id: u.id,
          email: u.email || email,
          name: name || email.split('@')[0],
        };
        set({
          session: data.session,
          supabaseUser: u,
          user: profile,
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
      console.warn('Supabase sign out:', err);
    }
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch {}
    set({ session: null, supabaseUser: null, user: null, isGuest: false, authError: null });
  },

  setUser: (user) => {
    set({ user, isGuest: false, authError: null });
  },

  setGuest: (isGuest) => {
    try {
      if (isGuest) {
        if (typeof localStorage !== 'undefined') localStorage.setItem(GUEST_STORAGE_KEY, 'true');
        set({
          isGuest: true,
          user: {
            id: 'guest_local_user',
            email: 'offline.user@local.vault',
            name: 'Local Guest',
          },
          authError: null,
        });
      } else {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(GUEST_STORAGE_KEY);
        set({ isGuest: false, user: null });
      }
    } catch {
      set({ isGuest });
    }
  },

  setError: (authError) => set({ authError }),
  clearError: () => set({ authError: null }),
}));

// Compatibility export
export const useSupabaseAuthStore = useAuthStore;
