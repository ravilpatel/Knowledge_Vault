/**
 * Safe Storage helper that works across all browser privacy modes, SSR, and restricted environments.
 */

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`safeStorage.getItem error for key [${key}]:`, e);
    }
    return null;
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`safeStorage.setItem error for key [${key}]:`, e);
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`safeStorage.removeItem error for key [${key}]:`, e);
    }
  },

  clear: (): void => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch (e) {
      console.warn('safeStorage.clear error:', e);
    }
  },
};
