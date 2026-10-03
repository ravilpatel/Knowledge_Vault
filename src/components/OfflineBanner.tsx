import React from 'react';
import { useSyncStore } from '../features/sync/syncStore';
import { WifiOff, X } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { status, pendingCount } = useSyncStore();
  const [dismissed, setDismissed] = React.useState(false);

  if (status !== 'offline' || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 transition">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          <strong>You are currently working offline.</strong> Edits are safely saved locally in IndexedDB
          {pendingCount > 0 ? ` (${pendingCount} change${pendingCount > 1 ? 's' : ''} queued)` : ''} and will sync automatically when reconnected.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 rounded transition text-amber-700 dark:text-amber-300"
        title="Dismiss notice"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
