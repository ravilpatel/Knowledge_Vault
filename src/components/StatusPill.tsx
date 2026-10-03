import React from 'react';
import { useSyncStore } from '../features/sync/syncStore';
import { Check, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';

interface StatusPillProps {
  onClick?: () => void;
}

export const StatusPill: React.FC<StatusPillProps> = ({ onClick }) => {
  const { status, pendingCount, errorMessage } = useSyncStore();

  switch (status) {
    case 'synced':
      return (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
          title="All notes synced to Google Drive"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <Check className="w-3 h-3" />
          <span>Synced</span>
        </button>
      );

    case 'syncing':
      return (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition cursor-pointer"
          title="Syncing changes with Google Drive..."
        >
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Syncing{pendingCount > 0 ? ` (${pendingCount})` : '...'}</span>
        </button>
      );

    case 'offline':
      return (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
          title={pendingCount > 0 ? `${pendingCount} changes saved offline in IndexedDB` : 'Offline - local mode'}
        >
          <WifiOff className="w-3 h-3" />
          <span>Offline{pendingCount > 0 ? ` (${pendingCount} pending)` : ''}</span>
        </button>
      );

    case 'error':
      return (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer"
          title={errorMessage || 'Sync error. Tap for details.'}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Sync Error</span>
        </button>
      );
  }
};
