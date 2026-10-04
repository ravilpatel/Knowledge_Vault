import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://cmpklimagrwwzfjvqzqe.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtcGtsaW1hZ3J3d3pmanZxenFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5Njc0ODIsImV4cCI6MjEwMDU0MzQ4Mn0.rTlNAVwom8DX_uPKEwvt-U0-8SAZR8Lx9FhDkbz20Ac';

export const getSupabaseConfig = () => {
  let url =
    (typeof localStorage !== 'undefined' && localStorage.getItem('kv_supabase_url')) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL;

  let anonKey =
    (typeof localStorage !== 'undefined' && localStorage.getItem('kv_supabase_anon_key')) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY;

  if (typeof url === 'string') {
    url = url.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    url = DEFAULT_SUPABASE_URL;
  }

  if (!anonKey || typeof anonKey !== 'string' || !anonKey.trim()) {
    anonKey = DEFAULT_SUPABASE_ANON_KEY;
  }

  return { url, anonKey };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const { url, anonKey } = getSupabaseConfig();
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Failed to create Supabase client with custom config, using default:', err);
      supabaseInstance = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
  }
  return supabaseInstance;
};

export const resetSupabaseConfig = (newUrl?: string, newKey?: string) => {
  if (typeof localStorage !== 'undefined') {
    if (newUrl) localStorage.setItem('kv_supabase_url', newUrl);
    if (newKey) localStorage.setItem('kv_supabase_anon_key', newKey);
  }
  const { url, anonKey } = getSupabaseConfig();
  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('Failed to reset Supabase client with custom config, falling back to default:', err);
    supabaseInstance = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
};

