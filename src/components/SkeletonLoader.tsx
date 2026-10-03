import React from 'react';

export const PageListSkeleton: React.FC = () => {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="p-3.5 rounded-lg border border-border-subtle/60 dark:border-border-darkSubtle/60 bg-surface dark:bg-surface-dark space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-10" />
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
          <div className="flex gap-1.5 pt-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-12" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const EditorSkeleton: React.FC = () => {
  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto w-full animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
      <div className="flex gap-2">
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
        <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
      </div>
      <div className="space-y-3 pt-4">
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-11/12" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded w-full" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
      </div>
    </div>
  );
};
