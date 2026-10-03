import { create } from 'zustand';
import { ConflictItem } from '../../types';

interface SyncStoreState {
  status: 'synced' | 'syncing' | 'offline' | 'error';
  pendingCount: number;
  lastSyncTime: number | null;
  errorMessage: string | null;
  activeConflict: ConflictItem | null;
  setStatus: (status: 'synced' | 'syncing' | 'offline' | 'error') => void;
  setPendingCount: (count: number) => void;
  setLastSyncTime: (time: number) => void;
  setErrorMessage: (msg: string | null) => void;
  setActiveConflict: (conflict: ConflictItem | null) => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced',
  pendingCount: 0,
  lastSyncTime: null,
  errorMessage: null,
  activeConflict: null,

  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setActiveConflict: (activeConflict) => set({ activeConflict }),
}));
