import React from 'react';
import { FilePlus, Edit3 } from 'lucide-react';

interface EmptySectionProps {
  sectionName: string;
  onCreatePage: () => void;
}

export const EmptySection: React.FC<EmptySectionProps> = ({ sectionName, onCreatePage }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-canvas-light dark:bg-canvas-dark">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-sm">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-light dark:bg-brand-primary/15 text-brand-primary dark:text-brand-darkPrimary flex items-center justify-center shadow-inner">
          <Edit3 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-ink-primary dark:text-ink-darkPrimary mb-1">
          {sectionName} has no pages
        </h3>
        <p className="text-sm text-ink-muted dark:text-ink-darkMuted mb-6 leading-relaxed">
          Start writing your thoughts, documentation, notes, or checklists in clean Markdown with live preview.
        </p>

        <button
          onClick={onCreatePage}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-hover transition shadow-sm"
        >
          <FilePlus className="w-4 h-4" />
          <span>New Page</span>
        </button>
      </div>
    </div>
  );
};
