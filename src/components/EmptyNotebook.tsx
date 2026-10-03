import React, { useState } from 'react';
import { FolderPlus, BookOpen } from 'lucide-react';
import { SectionColor } from '../types';

interface EmptyNotebookProps {
  notebookName: string;
  onCreateSection: (name: string, color?: SectionColor) => void;
}

export const EmptyNotebook: React.FC<EmptyNotebookProps> = ({ notebookName, onCreateSection }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedColor, setSelectedColor] = useState<SectionColor>('peach');

  const colorOptions: { name: SectionColor; bg: string }[] = [
    { name: 'peach', bg: 'bg-[#FFE4D6] border-[#FDBA74]' },
    { name: 'sage', bg: 'bg-[#DCFCE7] border-[#86EFAC]' },
    { name: 'lavender', bg: 'bg-[#EDE9FE] border-[#C4B5FD]' },
    { name: 'sky', bg: 'bg-[#E0F2FE] border-[#7DD3FC]' },
    { name: 'butter', bg: 'bg-[#FEF9C3] border-[#FDE047]' },
    { name: 'rose', bg: 'bg-[#FFE4E6] border-[#FDA4AF]' },
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    onCreateSection(newSectionName.trim(), selectedColor);
    setNewSectionName('');
    setIsCreating(false);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-canvas-light dark:bg-canvas-dark">
      <div className="max-w-md w-full p-8 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-sm">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-light dark:bg-brand-primary/15 text-brand-primary dark:text-brand-darkPrimary flex items-center justify-center shadow-inner">
          <BookOpen className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-ink-primary dark:text-ink-darkPrimary mb-1">
          {notebookName} is empty
        </h3>
        <p className="text-sm text-ink-muted dark:text-ink-darkMuted mb-6 leading-relaxed">
          Notebooks organize your work into colored Sections (like OneNote tabs). Create your first section to get started.
        </p>

        {isCreating ? (
          <form onSubmit={handleCreate} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-ink-secondary dark:text-ink-darkSecondary mb-1.5">
                Section Name
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Daily Journal, Recipes, Architecture..."
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-secondary dark:text-ink-darkSecondary mb-1.5">
                Tab Color
              </label>
              <div className="flex gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColor(c.name)}
                    className={`w-7 h-7 rounded-full border-2 transition ${c.bg} ${
                      selectedColor === c.name ? 'ring-2 ring-brand-primary ring-offset-2 scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-ink-secondary dark:text-ink-darkSecondary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newSectionName.trim()}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-brand-primary text-white hover:bg-brand-hover disabled:opacity-50 transition shadow-sm"
              >
                Create Section
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-hover transition shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create First Section</span>
          </button>
        )}
      </div>
    </div>
  );
};
