import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://cmpklimagrwwzfjvqzqe.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcGtsaW1hZ3J3d3pmanZxenFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5Njc0ODIsImV4cCI6MjEwMDU0MzQ4Mn0.rTlNAVwom8DX_uPKEwvt-U0-8SAZR8Lx9FhDkbz20Ac';

export const getSupabaseConfig = () => {
  const url =
    (typeof localStorage !== 'undefined' && localStorage.getItem('kv_supabase_url')) ||
    import.meta.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;

  const anonKey =
    (typeof localStorage !== 'undefined' && localStorage.getItem('kv_supabase_anon_key')) ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY;

  return { url, anonKey };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const { url, anonKey } = getSupabaseConfig();
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
};

export const resetSupabaseConfig = (newUrl?: string, newKey?: string) => {
  if (typeof localStorage !== 'undefined') {
    if (newUrl) localStorage.setItem('kv_supabase_url', newUrl);
    if (newKey) localStorage.setItem('kv_supabase_anon_key', newKey);
  }
  const { url, anonKey } = getSupabaseConfig();
  supabaseInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return supabaseInstance;
};
