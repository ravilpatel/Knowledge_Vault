import React, { useState, useRef, useEffect } from 'react';
import { useNoteStore } from '../features/notes/noteStore';
import { SectionColor } from '../types';
import { Plus, MoreVertical, Edit2, Palette, Trash2, Check } from 'lucide-react';

const COLOR_MAP: Record<
  SectionColor,
  {
    light: string;
    dark: string;
    activeLight: string;
    activeDark: string;
    indicator: string;
  }
> = {
  peach: {
    light: 'bg-[#FFE4D6]/70 text-[#9A3412] hover:bg-[#FFE4D6]',
    dark: 'dark:bg-[#431407]/60 dark:text-[#FB923C] dark:hover:bg-[#431407]',
    activeLight: 'bg-[#FFE4D6] text-[#7C2D12] border-b-2 border-b-[#EA580C]',
    activeDark: 'dark:bg-[#431407] dark:text-[#FDBA74] dark:border-b-2 dark:border-b-[#EA580C]',
    indicator: 'bg-[#EA580C]',
  },
  sage: {
    light: 'bg-[#DCFCE7]/70 text-[#166534] hover:bg-[#DCFCE7]',
    dark: 'dark:bg-[#052E16]/60 dark:text-[#4ADE80] dark:hover:bg-[#052E16]',
    activeLight: 'bg-[#DCFCE7] text-[#14532D] border-b-2 border-b-[#16A34A]',
    activeDark: 'dark:bg-[#052E16] dark:text-[#86EFAC] dark:border-b-2 dark:border-b-[#16A34A]',
    indicator: 'bg-[#16A34A]',
  },
  lavender: {
    light: 'bg-[#EDE9FE]/70 text-[#5B21B6] hover:bg-[#EDE9FE]',
    dark: 'dark:bg-[#2E1065]/60 dark:text-[#A78BFA] dark:hover:bg-[#2E1065]',
    activeLight: 'bg-[#EDE9FE] text-[#4C1D95] border-b-2 border-b-[#7C3AED]',
    activeDark: 'dark:bg-[#2E1065] dark:text-[#C4B5FD] dark:border-b-2 dark:border-b-[#7C3AED]',
    indicator: 'bg-[#7C3AED]',
  },
  sky: {
    light: 'bg-[#E0F2FE]/70 text-[#075985] hover:bg-[#E0F2FE]',
    dark: 'dark:bg-[#082F49]/60 dark:text-[#38BDF8] dark:hover:bg-[#082F49]',
    activeLight: 'bg-[#E0F2FE] text-[#0C4A6E] border-b-2 border-b-[#0284C7]',
    activeDark: 'dark:bg-[#082F49] dark:text-[#7DD3FC] dark:border-b-2 dark:border-b-[#0284C7]',
    indicator: 'bg-[#0284C7]',
  },
  butter: {
    light: 'bg-[#FEF9C3]/70 text-[#854D0E] hover:bg-[#FEF9C3]',
    dark: 'dark:bg-[#422006]/60 dark:text-[#FACC15] dark:hover:bg-[#422006]',
    activeLight: 'bg-[#FEF9C3] text-[#713F12] border-b-2 border-b-[#CA8A04]',
    activeDark: 'dark:bg-[#422006] dark:text-[#FDE047] dark:border-b-2 dark:border-b-[#CA8A04]',
    indicator: 'bg-[#CA8A04]',
  },
  rose: {
    light: 'bg-[#FFE4E6]/70 text-[#9F1239] hover:bg-[#FFE4E6]',
    dark: 'dark:bg-[#4C0519]/60 dark:text-[#FB7185] dark:hover:bg-[#4C0519]',
    activeLight: 'bg-[#FFE4E6] text-[#881337] border-b-2 border-b-[#E11D48]',
    activeDark: 'dark:bg-[#4C0519] dark:text-[#FDA4AF] dark:border-b-2 dark:border-b-[#E11D48]',
    indicator: 'bg-[#E11D48]',
  },
};

const ALL_COLORS: SectionColor[] = ['peach', 'sage', 'lavender', 'sky', 'butter', 'rose'];

export const SectionTabs: React.FC = () => {
  const {
    notebooks,
    sections,
    activeNotebookId,
    activeSectionId,
    setActiveSection,
    createSection,
    renameSection,
    changeSectionColor,
    trashSection,
  } = useNoteStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [menuOpenSectionId, setMenuOpenSectionId] = useState<string | null>(null);
  const [colorPickerSectionId, setColorPickerSectionId] = useState<string | null>(null);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId && !n.trashed);
  const activeSections = sections
    .filter((s) => s.notebookId === activeNotebookId && !s.trashed)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenSectionId(null);
        setColorPickerSectionId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!activeNotebook) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) {
      setIsAdding(false);
      return;
    }
    const color = ALL_COLORS[activeSections.length % ALL_COLORS.length];
    const created = await createSection(activeNotebook.id, newSectionName.trim(), color);
    setActiveSection(created.id);
    setNewSectionName('');
    setIsAdding(false);
  };

  const handleRenameSubmit = async (sectionId: string) => {
    if (renameValue.trim()) {
      await renameSection(sectionId, renameValue.trim());
    }
    setEditingSectionId(null);
    setRenameValue('');
  };

  return (
    <div className="flex items-center w-full bg-surface-subtle dark:bg-surface-subtleDark border-b border-border-subtle dark:border-border-darkSubtle px-2 pt-1.5 select-none overflow-x-auto no-scrollbar">
      <div ref={tabsContainerRef} className="flex items-center gap-1.5 min-w-max">
        {activeSections.map((sec) => {
          const isActive = sec.id === activeSectionId;
          const colorStyles = COLOR_MAP[sec.color] || COLOR_MAP.peach;

          return (
            <div
              key={sec.id}
              className={`group relative flex items-center h-9 px-3.5 rounded-t-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                isActive
                  ? `${colorStyles.activeLight} ${colorStyles.activeDark} shadow-xs font-bold`
                  : `${colorStyles.light} ${colorStyles.dark} opacity-85 hover:opacity-100`
              }`}
              onClick={() => {
                if (editingSectionId !== sec.id) {
                  setActiveSection(sec.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuOpenSectionId(sec.id);
              }}
            >
              {/* Dot indicator */}
              <span
                className={`w-2 h-2 rounded-full mr-2 transition-transform ${colorStyles.indicator} ${
                  isActive ? 'scale-110' : 'opacity-70'
                }`}
              />

              {editingSectionId === sec.id ? (
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(sec.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(sec.id);
                    if (e.key === 'Escape') setEditingSectionId(null);
                  }}
                  className="bg-transparent border-b border-current outline-none text-xs font-semibold w-24 py-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="truncate max-w-[140px]"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingSectionId(sec.id);
                    setRenameValue(sec.name);
                  }}
                >
                  {sec.name}
                </span>
              )}

              {/* Options icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenSectionId(menuOpenSectionId === sec.id ? null : sec.id);
                  setColorPickerSectionId(null);
                }}
                className={`ml-1.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition opacity-0 group-hover:opacity-100 ${
                  menuOpenSectionId === sec.id ? 'opacity-100' : ''
                }`}
                title="Section Options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu */}
              {menuOpenSectionId === sec.id && (
                <div
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-10 left-0 z-50 w-44 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-lg py-1.5 text-xs text-ink-primary dark:text-ink-darkPrimary animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    onClick={() => {
                      setEditingSectionId(sec.id);
                      setRenameValue(sec.name);
                      setMenuOpenSectionId(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-ink-muted" />
                    <span>Rename Section</span>
                  </button>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setColorPickerSectionId(colorPickerSectionId === sec.id ? null : sec.id)
                      }
                      className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
                    >
                      <span className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-ink-muted" />
                        <span>Tab Color</span>
                      </span>
                    </button>

                    {colorPickerSectionId === sec.id && (
                      <div className="px-3 py-2 grid grid-cols-6 gap-1 bg-surface-subtle dark:bg-surface-subtleDark border-y border-border-subtle dark:border-border-darkSubtle">
                        {ALL_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              changeSectionColor(sec.id, c);
                              setColorPickerSectionId(null);
                              setMenuOpenSectionId(null);
                            }}
                            className={`w-5 h-5 rounded-full ${COLOR_MAP[c].indicator} flex items-center justify-center transition hover:scale-110`}
                            title={c}
                          >
                            {sec.color === c && <Check className="w-3 h-3 text-white" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="h-[1px] bg-border-subtle dark:bg-border-darkSubtle my-1" />

                  <button
                    onClick={() => {
                      trashSection(sec.id);
                      setMenuOpenSectionId(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to Trash</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Section inline / button */}
        {isAdding ? (
          <form onSubmit={handleCreateSubmit} className="flex items-center">
            <input
              type="text"
              autoFocus
              placeholder="Section name..."
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onBlur={() => {
                if (!newSectionName.trim()) setIsAdding(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsAdding(false);
              }}
              className="h-8 px-2.5 text-xs rounded-t-lg bg-surface dark:bg-surface-dark border-b-2 border-brand-primary outline-none text-ink-primary dark:text-ink-darkPrimary w-32 font-medium"
            />
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 h-8 px-2.5 rounded-t-lg text-xs font-medium text-ink-muted hover:text-brand-primary dark:text-ink-darkMuted dark:hover:text-brand-darkPrimary hover:bg-surface dark:hover:bg-surface-dark transition"
            title="Add Section"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Section</span>
          </button>
        )}
      </div>
    </div>
  );
};
