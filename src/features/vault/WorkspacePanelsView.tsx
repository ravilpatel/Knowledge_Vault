import React, { useState, useMemo } from 'react';
import { useVaultStore } from './vaultStore';
import { Panel, PanelField, PanelEntry, FieldType } from '../../types';
import {
  FolderKanban,
  BookMarked,
  Users,
  Folder,
  Plus,
  ArrowLeft,
  Settings2,
  Trash2,
  ExternalLink,
  Calendar,
  Search,
  FileText,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  Edit2,
  X,
  Building2,
  Briefcase,
  Cpu,
  Star,
  User,
  Columns3,
  Eye,
  Maximize2,
  Clock,
  ChevronDown,
} from 'lucide-react';
import {
  PeopleView,
  CompaniesView,
  ProjectsView,
  TechnologiesView,
} from './DirectoryViews';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FolderKanban,
  BookMarked,
  Users,
  Folder,
  Layers,
  Sparkles,
  FileText,
  Briefcase,
  Building2,
  Cpu,
};

const COLOR_PRESETS = [
  '#4F46E5', // Indigo
  '#0284C7', // Sky
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#E11D48', // Rose
  '#8B5CF6', // Purple
  '#0D9488', // Teal
  '#64748B', // Slate
];

export const WorkspacePanelsView: React.FC = () => {
  const {
    panels,
    panelFields,
    panelEntries,
    people,
    companies,
    technologies,
    projects,
    activePanelId,
    setActivePanelId,
    createPanel,
    updatePanel,
    deletePanel,
    addField,
    deleteField,
    createEntry,
    updateEntry,
    deleteEntry,
  } = useVaultStore();

  const [subTab, setSubTab] = useState<'panels' | 'people' | 'companies' | 'projects' | 'technologies'>('panels');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');

  // Column visibility filter state
  const [hiddenColumnIds, setHiddenColumnIds] = useState<string[]>([]);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  // Modals state
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PanelEntry | null>(null);
  const [targetPanelId, setTargetPanelId] = useState<string | null>(null);

  // Detail Modal state
  const [detailEntry, setDetailEntry] = useState<{ entry: PanelEntry; panel: Panel } | null>(null);

  // Panel modal form state
  const [panelName, setPanelName] = useState('');
  const [panelColor, setPanelColor] = useState(COLOR_PRESETS[0]);
  const [panelIcon, setPanelIcon] = useState('FolderKanban');
  const [draftFields, setDraftFields] = useState<Omit<PanelField, 'id' | 'panel_id'>[]>([]);

  // New field sub-form in panel modal
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Entry modal form state (key-value dictionary)
  const [entryFormData, setEntryFormData] = useState<Record<string, any>>({});

  // Active panel data when zoomed into single panel
  const activePanel = useMemo(() => panels.find((p) => p.id === activePanelId), [panels, activePanelId]);
  const activeFields = useMemo(
    () =>
      panelFields
        .filter((f) => f.panel_id === activePanelId)
        .sort((a, b) => a.field_order - b.field_order),
    [panelFields, activePanelId]
  );
  const activeEntries = useMemo(
    () => panelEntries.filter((e) => e.panel_id === activePanelId),
    [panelEntries, activePanelId]
  );

  const filteredActiveEntries = useMemo(() => {
    if (!searchQuery.trim()) return activeEntries;
    const q = searchQuery.toLowerCase();
    return activeEntries.filter((entry) =>
      Object.values(entry.data || {}).some((val) =>
        String(val || '').toLowerCase().includes(q)
      )
    );
  }, [activeEntries, searchQuery]);

  // Panels filtered by visibility
  const visiblePanels = useMemo(() => {
    return panels.filter((p) => !hiddenColumnIds.includes(p.id) && !p.dashboard_hidden);
  }, [panels, hiddenColumnIds]);

  // Handlers for Panel Modal
  const openNewPanelModal = () => {
    setEditingPanel(null);
    setPanelName('');
    setPanelColor(COLOR_PRESETS[0]);
    setPanelIcon('FolderKanban');
    setDraftFields([
      {
        field_key: 'title',
        field_label: 'Title',
        field_type: 'text',
        field_order: 0,
        is_required: true,
      },
      {
        field_key: 'description',
        field_label: 'Description',
        field_type: 'textarea',
        field_order: 1,
        is_required: false,
      },
    ]);
    setIsPanelModalOpen(true);
  };

  const openEditPanelModal = (panel: Panel) => {
    setEditingPanel(panel);
    setPanelName(panel.name);
    setPanelColor(panel.color || COLOR_PRESETS[0]);
    setPanelIcon(panel.icon || 'Folder');
    const existing = panelFields
      .filter((f) => f.panel_id === panel.id)
      .map((f) => ({
        field_key: f.field_key,
        field_label: f.field_label,
        field_type: f.field_type,
        field_order: f.field_order,
        is_required: f.is_required,
        options: f.options,
      }));
    setDraftFields(existing);
    setIsPanelModalOpen(true);
  };

  const handleAddDraftField = () => {
    if (!newFieldLabel.trim()) return;
    const key = newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const opts =
      newFieldType === 'select' && newFieldOptions.trim()
        ? newFieldOptions.split(',').map((s) => s.trim()).filter(Boolean)
        : null;

    setDraftFields((prev) => [
      ...prev,
      {
        field_key: key,
        field_label: newFieldLabel.trim(),
        field_type: newFieldType,
        field_order: prev.length,
        is_required: newFieldRequired,
        options: opts,
      },
    ]);

    setNewFieldLabel('');
    setNewFieldOptions('');
    setNewFieldRequired(false);
  };

  const handleRemoveDraftField = (idx: number) => {
    setDraftFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSavePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!panelName.trim()) return;

    if (editingPanel) {
      await updatePanel(editingPanel.id, {
        name: panelName.trim(),
        color: panelColor,
        icon: panelIcon,
      });

      // Synchronize fields
      const existing = panelFields.filter((f) => f.panel_id === editingPanel.id);
      for (const f of existing) {
        if (!draftFields.some((df) => df.field_key === f.field_key)) {
          await deleteField(f.id);
        }
      }
      for (const df of draftFields) {
        if (!existing.some((f) => f.field_key === df.field_key)) {
          await addField(editingPanel.id, df);
        }
      }
    } else {
      await createPanel(panelName.trim(), panelIcon, panelColor, draftFields);
    }

    setIsPanelModalOpen(false);
  };

  // Handlers for Entry Modal
  const openNewEntryModal = (panelId?: string) => {
    const pId = panelId || activePanelId || (panels[0]?.id ?? null);
    if (!pId) return;

    setTargetPanelId(pId);
    setEditingEntry(null);

    const fields = panelFields.filter((f) => f.panel_id === pId);
    const initial: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.field_type === 'select' && f.options && f.options.length > 0) {
        initial[f.field_key] = f.options[0];
      } else if (f.field_type === 'date') {
        initial[f.field_key] = new Date().toISOString().slice(0, 10);
      } else {
        initial[f.field_key] = '';
      }
    });

    setEntryFormData(initial);
    setIsEntryModalOpen(true);
  };

  const openEditEntryModal = (entry: PanelEntry, panelId?: string) => {
    const pId = panelId || entry.panel_id || activePanelId;
    setTargetPanelId(pId);
    setEditingEntry(entry);
    setEntryFormData({ ...(entry.data || {}) });
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const pId = targetPanelId || editingEntry?.panel_id || activePanelId;
    if (!pId) return;

    if (editingEntry) {
      await updateEntry(editingEntry.id, entryFormData);
    } else {
      await createEntry(pId, entryFormData);
    }

    setIsEntryModalOpen(false);
    if (detailEntry && editingEntry && detailEntry.entry.id === editingEntry.id) {
      setDetailEntry({
        ...detailEntry,
        entry: {
          ...detailEntry.entry,
          data: entryFormData,
          updated_at: new Date().toISOString(),
        },
      });
    }
  };

  const toggleColumnVisibility = (panelId: string) => {
    setHiddenColumnIds((prev) =>
      prev.includes(panelId) ? prev.filter((id) => id !== panelId) : [...prev, panelId]
    );
  };

  // Helper to resolve entity labels
  const resolveEntityName = (type: 'people' | 'projects' | 'companies' | 'technologies', idOrName: string) => {
    if (!idOrName) return '';
    if (type === 'people') {
      const p = people.find((item) => item.id === idOrName || item.name === idOrName);
      return p ? p.name : idOrName;
    }
    if (type === 'projects') {
      const pr = projects.find((item) => item.id === idOrName || item.name === idOrName);
      return pr ? pr.name : idOrName;
    }
    if (type === 'companies') {
      const c = companies.find((item) => item.id === idOrName || item.name === idOrName);
      return c ? c.name : idOrName;
    }
    if (type === 'technologies') {
      const t = technologies.find((item) => item.id === idOrName || item.name === idOrName);
      return t ? t.name : idOrName;
    }
    return idOrName;
  };

  // Render a field value cleanly
  const renderFieldValue = (field: PanelField, val: any) => {
    if (val === undefined || val === null || val === '') return null;

    switch (field.field_type) {
      case 'url':
        return (
          <a
            href={String(val).startsWith('http') ? String(val) : `https://${val}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-brand-primary dark:text-brand-darkPrimary hover:underline inline-flex items-center gap-1 break-all font-medium text-[11px]"
          >
            <span className="truncate max-w-[200px]">{String(val)}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
        );

      case 'date':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted dark:text-ink-darkMuted font-medium">
            <Calendar className="w-3 h-3 text-brand-primary" />
            <span>{String(val)}</span>
          </span>
        );

      case 'textarea':
        return (
          <p className="text-[11px] text-ink-secondary dark:text-ink-darkSecondary line-clamp-3 leading-relaxed bg-surface-subtle/50 dark:bg-surface-subtleDark/50 p-2 rounded-lg border border-border-subtle/40 dark:border-border-darkSubtle/40 whitespace-pre-line">
            {String(val)}
          </p>
        );

      case 'select':
        return (
          <span className="inline-block px-2 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-brand-darkPrimary text-[10px] font-semibold border border-brand-primary/20">
            {String(val)}
          </span>
        );

      case 'tags':
        const tagsArr = Array.isArray(val)
          ? val
          : String(val)
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean);
        return (
          <div className="flex flex-wrap gap-1">
            {tagsArr.map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded-md bg-surface-subtle dark:bg-surface-subtleDark text-[10px] font-medium text-ink-secondary dark:text-ink-darkSecondary border border-border-subtle/60 dark:border-border-darkSubtle/60"
              >
                #{tag}
              </span>
            ))}
          </div>
        );

      case 'rating':
        const ratingNum = Number(val) || 0;
        return (
          <div className="flex items-center gap-0.5 text-amber-500">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= ratingNum ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
        );

      case 'people_link':
        const personName = resolveEntityName('people', String(val));
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-brand-primary dark:text-brand-darkPrimary font-semibold bg-brand-primary/10 px-2 py-0.5 rounded-md border border-brand-primary/20">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{personName}</span>
          </span>
        );

      case 'projects_link':
        const projectName = resolveEntityName('projects', String(val));
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <Briefcase className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{projectName}</span>
          </span>
        );

      case 'technology_link':
        const techName = resolveEntityName('technologies', String(val));
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
            <Cpu className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{techName}</span>
          </span>
        );

      case 'company_link':
        const compName = resolveEntityName('companies', String(val));
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
            <Building2 className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{compName}</span>
          </span>
        );

      default:
        return (
          <span className="text-[11px] text-ink-primary dark:text-ink-darkPrimary font-medium">
            {String(val)}
          </span>
        );
    }
  };

  const targetPanelForModal = panels.find((p) => p.id === (targetPanelId || activePanelId));
  const targetFieldsForModal = targetPanelForModal
    ? panelFields
        .filter((f) => f.panel_id === targetPanelForModal.id)
        .sort((a, b) => a.field_order - b.field_order)
    : [];

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-light dark:bg-canvas-dark overflow-hidden p-3 md:p-4 space-y-2.5 select-none">
      {/* ─── Top Header & Controls (Minimal Height) ─── */}
      <div className="flex items-center justify-between gap-3 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle px-3.5 py-1.5 md:py-2 rounded-xl shadow-xs flex-wrap sm:flex-nowrap flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {activePanelId && (
            <button
              onClick={() => {
                setActivePanelId(null);
                setSearchQuery('');
              }}
              className="p-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle hover:bg-surface-subtle dark:hover:bg-surface-subtleDark text-ink-secondary dark:text-ink-darkSecondary transition shadow-xs flex-shrink-0"
              title="Back to All Columns"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h2 className="text-sm md:text-base font-bold text-ink-primary dark:text-ink-darkPrimary tracking-tight truncate">
              {activePanel ? activePanel.name : 'Workspace Columns'}
            </h2>
            <span className="text-[11px] text-ink-muted dark:text-ink-darkMuted bg-surface-subtle dark:bg-surface-subtleDark px-2 py-0.5 rounded-md border border-border-subtle/50 dark:border-border-darkSubtle/50 font-normal whitespace-nowrap">
              {activePanel
                ? `${activeEntries.length} entries • ${activeFields.length} fields`
                : `${panels.length} boards • ${panelEntries.length} total entries`}
            </span>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder={activePanelId ? "Search in panel..." : "Search across columns..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1 rounded-lg text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-1 focus:ring-brand-primary/40 w-36 sm:w-48 md:w-56 text-ink-primary dark:text-ink-darkPrimary transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {!activePanelId && (
            /* Visible Columns Popover Toggle */
            <div className="relative">
              <button
                onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition shadow-xs ${
                  isColumnPickerOpen
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-surface dark:bg-surface-dark border-border-subtle dark:border-border-darkSubtle text-ink-secondary dark:text-ink-darkSecondary hover:bg-surface-subtle dark:hover:bg-surface-subtleDark'
                }`}
                title="Toggle visible columns"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Columns</span>
                <span className="px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-[10px]">
                  {visiblePanels.length}/{panels.length}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {isColumnPickerOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 p-2 rounded-xl bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle shadow-xl z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border-subtle/60 px-2 text-[11px] font-bold text-ink-primary dark:text-ink-darkPrimary">
                    <span>Visible Columns</span>
                    <button
                      onClick={() => setHiddenColumnIds([])}
                      className="text-[10px] text-brand-primary font-normal hover:underline"
                    >
                      Show All
                    </button>
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {panels.map((p) => {
                      const isVisible = !hiddenColumnIds.includes(p.id) && !p.dashboard_hidden;
                      return (
                        <label
                          key={p.id}
                          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-surface-subtle dark:hover:bg-surface-subtleDark cursor-pointer text-xs transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: p.color || '#4F46E5' }}
                            />
                            <span className="truncate text-ink-primary dark:text-ink-darkPrimary font-medium text-xs">
                              {p.name}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={() => toggleColumnVisibility(p.id)}
                            className="rounded text-brand-primary focus:ring-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activePanelId && (
            /* Layout Mode Toggle (when zoomed into single panel) */
            <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle text-xs">
              <button
                onClick={() => setLayoutMode('grid')}
                className={`p-1 rounded-md transition ${
                  layoutMode === 'grid'
                    ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs font-semibold'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="Card Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setLayoutMode('table')}
                className={`p-1 rounded-md transition ${
                  layoutMode === 'table'
                    ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs font-semibold'
                    : 'text-ink-muted hover:text-ink-primary'
                }`}
                title="Table List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* New Panel Action */}
          {!activePanelId && (
            <button
              onClick={openNewPanelModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
              title="Create New Board Column"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Board</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Navigation Subtabs ─── */}
      {!activePanelId && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border-subtle dark:border-border-darkSubtle text-xs flex-shrink-0">
          <button
            onClick={() => setSubTab('panels')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
              subTab === 'panels'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-ink-muted hover:text-ink-primary hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Custom Boards ({panels.length})</span>
          </button>

          <button
            onClick={() => setSubTab('people')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
              subTab === 'people'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-ink-muted hover:text-ink-primary hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>People & Contacts ({people.length})</span>
          </button>

          <button
            onClick={() => setSubTab('companies')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
              subTab === 'companies'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-ink-muted hover:text-ink-primary hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Companies ({companies.length})</span>
          </button>

          <button
            onClick={() => setSubTab('projects')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
              subTab === 'projects'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-ink-muted hover:text-ink-primary hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Projects ({projects.length})</span>
          </button>

          <button
            onClick={() => setSubTab('technologies')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition ${
              subTab === 'technologies'
                ? 'bg-brand-primary text-white shadow-xs'
                : 'text-ink-muted hover:text-ink-primary hover:bg-surface dark:hover:bg-surface-dark'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Technologies ({technologies.length})</span>
          </button>
        </div>
      )}

      {/* ─── Main Content Display ─── */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {!activePanelId ? (
          subTab === 'people' ? (
            <div className="flex-1 overflow-y-auto">
              <PeopleView />
            </div>
          ) : subTab === 'companies' ? (
            <div className="flex-1 overflow-y-auto">
              <CompaniesView />
            </div>
          ) : subTab === 'projects' ? (
            <div className="flex-1 overflow-y-auto">
              <ProjectsView />
            </div>
          ) : subTab === 'technologies' ? (
            <div className="flex-1 overflow-y-auto">
              <TechnologiesView />
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════════
               COLUMN SCROLLABLE WORKSPACE PANELS FORMAT (LEGACY KNOWLEDGE VAULT)
               ══════════════════════════════════════════════════════════════════ */
            <div className="flex-1 min-h-0 flex gap-3.5 overflow-x-auto pb-2 pt-0.5 px-0.5 items-stretch h-full">
              {visiblePanels.length === 0 ? (
                <div className="w-full p-12 text-center text-xs text-ink-muted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface/50 dark:bg-surface-dark/50">
                  <FolderKanban className="w-10 h-10 mx-auto mb-3 text-brand-primary opacity-40" />
                  <p className="font-bold text-ink-primary dark:text-ink-darkPrimary text-sm">
                    No Visible Workspace Columns
                  </p>
                  <p className="mt-1 max-w-sm mx-auto">
                    {panels.length > 0
                      ? 'All columns are currently hidden. Use the "Columns" dropdown above to show them.'
                      : 'Create your first custom board using the "+ New Board" button.'}
                  </p>
                  {panels.length > 0 ? (
                    <button
                      onClick={() => setHiddenColumnIds([])}
                      className="mt-4 px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-xs"
                    >
                      Show All Columns
                    </button>
                  ) : (
                    <button
                      onClick={openNewPanelModal}
                      className="mt-4 px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-xs"
                    >
                      + Create Board
                    </button>
                  )}
                </div>
              ) : (
                visiblePanels.map((panel) => {
                  const IconComp = ICON_MAP[panel.icon || 'Folder'] || Folder;
                  const fields = panelFields
                    .filter((f) => f.panel_id === panel.id)
                    .sort((a, b) => a.field_order - b.field_order);
                  const allEntries = panelEntries.filter((e) => e.panel_id === panel.id);

                  // Filter entries inside column based on search
                  const entries = allEntries.filter((entry) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return Object.values(entry.data || {}).some((val) =>
                      String(val || '').toLowerCase().includes(q)
                    );
                  });

                  return (
                    <div
                      key={panel.id}
                      className="w-80 min-w-[320px] max-w-[340px] flex-shrink-0 flex flex-col h-full bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-xs overflow-hidden transition-all duration-150 group/column"
                      style={{ borderTop: `4px solid ${panel.color || '#4F46E5'}` }}
                    >
                      {/* Column Header */}
                      <div className="p-3.5 border-b border-border-subtle dark:border-border-darkSubtle bg-surface-subtle/50 dark:bg-surface-subtleDark/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: `${panel.color || '#4F46E5'}20`,
                              color: panel.color || '#4F46E5',
                            }}
                          >
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h3
                              className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary truncate cursor-pointer hover:underline"
                              onClick={() => setActivePanelId(panel.id)}
                              title={`${panel.name} (Click to zoom)`}
                            >
                              {panel.name}
                            </h3>
                            <div className="flex items-center gap-1 text-[10px] text-ink-muted">
                              <span>
                                {entries.length} {entries.length === 1 ? 'record' : 'records'}
                              </span>
                              {searchQuery && allEntries.length !== entries.length && (
                                <span>(of {allEntries.length})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Column Header Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openNewEntryModal(panel.id)}
                            className="p-1 rounded-lg text-ink-muted hover:text-brand-primary hover:bg-surface dark:hover:bg-surface-dark transition"
                            title={`Add new entry to ${panel.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setActivePanelId(panel.id)}
                            className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface dark:hover:bg-surface-dark transition"
                            title="Focus single panel"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditPanelModal(panel)}
                            className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface dark:hover:bg-surface-dark transition"
                            title="Configure Panel & Schema Fields"
                          >
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Column Content: Vertically Scrollable List of Entries */}
                      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 bg-canvas-subtle/20 dark:bg-canvas-darkSubtle/20">
                        {fields.length === 0 ? (
                          <div className="text-center py-10 px-4 text-ink-muted text-xs">
                            <FileText className="w-6 h-6 mx-auto mb-2 opacity-30 text-ink-muted" />
                            <p className="font-semibold text-ink-primary dark:text-ink-darkPrimary">
                              No fields configured
                            </p>
                            <p className="text-[11px] mt-1 text-ink-muted">
                              Define fields to structure records in this board.
                            </p>
                            <button
                              onClick={() => openEditPanelModal(panel)}
                              className="mt-3 px-3 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-border-subtle text-[11px] font-semibold text-brand-primary shadow-xs hover:bg-surface-subtle"
                            >
                              Configure Fields
                            </button>
                          </div>
                        ) : entries.length === 0 ? (
                          <div className="text-center py-10 px-4 text-ink-muted text-xs">
                            <FolderKanban className="w-6 h-6 mx-auto mb-2 opacity-30 text-ink-muted" />
                            <p className="font-semibold text-ink-primary dark:text-ink-darkPrimary">
                              {searchQuery ? 'No matching entries' : 'No records yet'}
                            </p>
                            <p className="text-[11px] mt-1 text-ink-muted">
                              {searchQuery
                                ? 'Try a different search keyword.'
                                : `Add the first record to ${panel.name}.`}
                            </p>
                            <button
                              onClick={() => openNewEntryModal(panel.id)}
                              className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[11px] font-semibold shadow-xs hover:bg-brand-primary/20"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Record</span>
                            </button>
                          </div>
                        ) : (
                          entries.map((entry) => {
                            const primaryField = fields[0];
                            const primaryTitle = primaryField
                              ? entry.data?.[primaryField.field_key] || entry.data?.title || 'Untitled'
                              : entry.data?.title || 'Untitled';

                            return (
                              <div
                                key={entry.id}
                                onClick={() => setDetailEntry({ entry, panel })}
                                className="group/card relative p-3 rounded-xl bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle hover:border-brand-primary/50 dark:hover:border-brand-darkPrimary/50 shadow-xs hover:shadow-sm transition-all cursor-pointer space-y-2 select-text"
                                style={{
                                  borderLeft: `3.5px solid ${panel.color || '#4F46E5'}`,
                                }}
                              >
                                {/* Card Title & Quick Actions */}
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary leading-snug line-clamp-2">
                                    {String(primaryTitle)}
                                  </h4>
                                  <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition flex-shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditEntryModal(entry, panel.id);
                                      }}
                                      className="p-1 rounded hover:bg-surface-subtle text-ink-muted hover:text-ink-primary"
                                      title="Edit Record"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this record permanently?')) {
                                          deleteEntry(entry.id);
                                        }
                                      }}
                                      className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-ink-muted hover:text-rose-500"
                                      title="Delete Record"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                {/* All Custom Content Fields */}
                                <div className="space-y-1.5 pt-0.5">
                                  {fields.slice(1).map((field) => {
                                    const val = entry.data?.[field.field_key];
                                    if (val === undefined || val === null || val === '') return null;

                                    return (
                                      <div key={field.id} className="space-y-0.5">
                                        {field.field_type !== 'textarea' && (
                                          <div className="text-[9px] font-bold text-ink-muted dark:text-ink-darkMuted uppercase tracking-wider">
                                            {field.field_label}
                                          </div>
                                        )}
                                        <div>{renderFieldValue(field, val)}</div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Card Footer: Timestamp */}
                                <div className="flex items-center justify-between pt-1.5 border-t border-border-subtle/40 dark:border-border-darkSubtle/40 text-[9px] text-ink-muted">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span>
                                      {new Date(entry.updated_at || entry.created_at || '').toLocaleDateString(
                                        undefined,
                                        { month: 'short', day: 'numeric' }
                                      )}
                                    </span>
                                  </span>
                                  <span className="opacity-0 group-hover/card:opacity-100 transition text-brand-primary text-[10px] font-semibold">
                                    View →
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Column Footer: Quick Add bar */}
                      <div className="p-2 border-t border-border-subtle dark:border-border-darkSubtle bg-surface-subtle/30 dark:bg-surface-subtleDark/30">
                        <button
                          onClick={() => openNewEntryModal(panel.id)}
                          className="w-full py-1.5 px-2 rounded-xl text-xs font-semibold text-ink-secondary dark:text-ink-darkSecondary hover:text-brand-primary hover:bg-surface dark:hover:bg-surface-dark transition flex items-center justify-center gap-1.5 border border-dashed border-border-subtle hover:border-brand-primary/40"
                        >
                          <Plus className="w-3.5 h-3.5 text-brand-primary" />
                          <span>Add Record</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* End Card: Create New Board */}
              <div
                onClick={openNewPanelModal}
                className="w-72 min-w-[280px] flex-shrink-0 h-40 border-2 border-dashed border-border-subtle dark:border-border-darkSubtle hover:border-brand-primary/50 dark:hover:border-brand-darkPrimary/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition bg-surface/30 dark:bg-surface-dark/30 hover:bg-surface-subtle/50 dark:hover:bg-surface-subtleDark/50 group"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-2 group-hover:scale-110 transition">
                  <Plus className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">
                  Add New Board
                </h4>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Create a custom schema column
                </p>
              </div>
            </div>
          )
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             LEVEL 2: ZOOMED SINGLE PANEL FULL VIEW (GRID OR TABLE)
             ══════════════════════════════════════════════════════════════════ */
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {filteredActiveEntries.length === 0 ? (
              <div className="p-12 text-center text-xs text-ink-muted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface/50 dark:bg-surface-dark/50">
                <FileText className="w-8 h-8 mx-auto mb-2 text-brand-primary opacity-50" />
                <p className="font-bold text-ink-primary dark:text-ink-darkPrimary text-sm">
                  No records found in {activePanel?.name}
                </p>
                <p className="mt-1">
                  Add your first structured entry to this panel.
                </p>
                {activePanel && (
                  <button
                    onClick={() => openNewEntryModal(activePanel.id)}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold shadow-xs hover:bg-brand-hover transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Record</span>
                  </button>
                )}
              </div>
            ) : layoutMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredActiveEntries.map((entry) => {
                  const titleField = activeFields[0];
                  const primaryTitle = titleField ? entry.data?.[titleField.field_key] : 'Entry';

                  return (
                    <div
                      key={entry.id}
                      onClick={() => activePanel && setDetailEntry({ entry, panel: activePanel })}
                      className="group relative p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-xs hover:border-brand-primary/40 transition space-y-2.5 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary truncate">
                          {primaryTitle || 'Untitled'}
                        </h4>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditEntryModal(entry);
                            }}
                            className="p-1 rounded text-ink-muted hover:text-ink-primary"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Delete this record permanently?')) {
                                deleteEntry(entry.id);
                              }
                            }}
                            className="p-1 rounded text-ink-muted hover:text-rose-500"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-ink-secondary dark:text-ink-darkSecondary">
                        {activeFields.slice(1).map((field) => {
                          const val = entry.data?.[field.field_key];
                          if (val === undefined || val === null || val === '') return null;

                          return (
                            <div key={field.id} className="text-[11px] leading-relaxed">
                              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
                                {field.field_label}
                              </span>
                              <div>{renderFieldValue(field, val)}</div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-border-subtle/50 text-[10px] text-ink-muted">
                        Updated {new Date(entry.updated_at || entry.created_at || '').toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              <div className="overflow-x-auto border border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface dark:bg-surface-dark shadow-xs">
                <table className="w-full text-left text-xs divide-y border-border-subtle dark:divide-border-darkSubtle">
                  <thead className="bg-surface-subtle dark:bg-surface-subtleDark font-bold text-ink-muted">
                    <tr>
                      {activeFields.map((f) => (
                        <th key={f.id} className="p-3">
                          {f.field_label}
                        </th>
                      ))}
                      <th className="p-3 w-16 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60 dark:divide-border-darkSubtle/60">
                    {filteredActiveEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        onClick={() => activePanel && setDetailEntry({ entry, panel: activePanel })}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition group cursor-pointer"
                      >
                        {activeFields.map((f) => {
                          const val = entry.data?.[f.field_key];
                          if (val === undefined || val === null || val === '') {
                            return (
                              <td key={f.id} className="p-3 text-ink-muted">
                                —
                              </td>
                            );
                          }
                          return (
                            <td
                              key={f.id}
                              className="p-3 max-w-[200px] truncate text-ink-primary dark:text-ink-darkPrimary"
                            >
                              {renderFieldValue(f, val)}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditEntryModal(entry);
                              }}
                              className="p-1 rounded text-ink-muted hover:text-ink-primary"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this record?')) {
                                  deleteEntry(entry.id);
                                }
                              }}
                              className="p-1 rounded text-ink-muted hover:text-rose-500"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Modal 1: Create / Edit Panel ─── */}
      {isPanelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-4">
              <h3 className="text-sm font-bold">
                {editingPanel ? 'Configure Workspace Board' : 'Create New Board'}
              </h3>
              <button
                onClick={() => setIsPanelModalOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePanel} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Board / Panel Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clients, Research Papers, Snippets"
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">Theme Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPanelColor(c)}
                      className={`w-6 h-6 rounded-full border transition ${
                        panelColor === c ? 'ring-2 ring-brand-primary ring-offset-2 scale-110' : 'opacity-70'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Schema Fields Builder */}
              <div className="pt-2 border-t border-border-subtle dark:border-border-darkSubtle">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-ink-primary dark:text-ink-darkPrimary">
                    Custom Fields ({draftFields.length})
                  </label>
                </div>

                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {draftFields.map((f, i) => (
                    <div
                      key={f.field_key + i}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{f.field_label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-ink-muted">
                          {f.field_type}
                        </span>
                        {f.is_required && (
                          <span className="text-[9px] text-amber-600 font-semibold">Required</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftField(i)}
                        className="text-ink-muted hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Sub-form to add field */}
                <div className="p-3 rounded-xl border border-dashed border-border-subtle dark:border-border-darkSubtle space-y-2 bg-surface-subtle/50">
                  <span className="text-[10px] font-bold text-ink-muted uppercase">Add Field</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Field Label (e.g. Budget)"
                      value={newFieldLabel}
                      onChange={(e) => setNewFieldLabel(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-xs outline-none"
                    />

                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as FieldType)}
                      className="px-2.5 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-xs"
                    >
                      <option value="text">Text (Single Line)</option>
                      <option value="textarea">Textarea (Multi Line)</option>
                      <option value="date">Date</option>
                      <option value="url">URL Link</option>
                      <option value="select">Dropdown Select</option>
                      <option value="tags">Tags</option>
                      <option value="people_link">Person Link</option>
                      <option value="projects_link">Project Link</option>
                      <option value="technology_link">Technology Link</option>
                      <option value="company_link">Company Link</option>
                      <option value="rating">Rating (1-5 Stars)</option>
                    </select>
                  </div>

                  {newFieldType === 'select' && (
                    <input
                      type="text"
                      placeholder="Options comma-separated: Option 1, Option 2, Option 3"
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-xs"
                    />
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-ink-muted">
                      <input
                        type="checkbox"
                        checked={newFieldRequired}
                        onChange={(e) => setNewFieldRequired(e.target.checked)}
                        className="rounded text-brand-primary"
                      />
                      <span>Required</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAddDraftField}
                      disabled={!newFieldLabel.trim()}
                      className="px-3 py-1 rounded-lg bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle font-semibold hover:border-brand-primary transition disabled:opacity-50 text-[11px]"
                    >
                      + Add Field
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border-subtle dark:border-border-darkSubtle flex items-center justify-between gap-2">
                {editingPanel ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete board "${editingPanel.name}" and all its records?`)) {
                        deletePanel(editingPanel.id);
                        setIsPanelModalOpen(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition"
                  >
                    Delete Board
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPanelModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-border-subtle text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!panelName.trim() || draftFields.length === 0}
                    className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition disabled:opacity-50"
                  >
                    Save Board
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Create / Edit Panel Entry ─── */}
      {isEntryModalOpen && targetPanelForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-4">
              <div>
                <h3 className="text-sm font-bold">
                  {editingEntry ? `Edit Record in ${targetPanelForModal.name}` : `New Entry in ${targetPanelForModal.name}`}
                </h3>
                <p className="text-[11px] text-ink-muted">Fill in the structured fields below.</p>
              </div>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs">
              {targetFieldsForModal.map((field) => {
                const val = entryFormData[field.field_key] || '';

                return (
                  <div key={field.id}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-ink-muted">
                        {field.field_label}
                        {field.is_required && <span className="text-rose-500 ml-0.5">*</span>}
                      </label>
                      <span className="text-[9px] text-ink-muted uppercase">{field.field_type}</span>
                    </div>

                    {field.field_type === 'textarea' ? (
                      <textarea
                        required={field.is_required}
                        rows={3}
                        value={val}
                        placeholder={`Enter ${field.field_label.toLowerCase()}...`}
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    ) : field.field_type === 'select' && field.options ? (
                      <select
                        value={val}
                        required={field.is_required}
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                      >
                        <option value="">Select option...</option>
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : field.field_type === 'people_link' ? (
                      <select
                        value={val}
                        required={field.is_required}
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                      >
                        <option value="">-- Select Person --</option>
                        {people.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} {p.designation ? `(${p.designation})` : p.organisation ? `(${p.organisation})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : field.field_type === 'projects_link' ? (
                      <select
                        value={val}
                        required={field.is_required}
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                      >
                        <option value="">-- Select Project --</option>
                        {projects.map((pr) => (
                          <option key={pr.id} value={pr.name}>
                            {pr.name} ({pr.status})
                          </option>
                        ))}
                      </select>
                    ) : field.field_type === 'technology_link' ? (
                      <select
                        value={val}
                        required={field.is_required}
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                      >
                        <option value="">-- Select Technology --</option>
                        {technologies.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} {t.category ? `(${t.category})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : field.field_type === 'company_link' ? (
                      <select
                        value={val}
                        required={field.is_required}
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                      >
                        <option value="">-- Select Company --</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.industry ? `(${c.industry})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : field.field_type === 'rating' ? (
                      <div className="flex items-center gap-1 py-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() =>
                              setEntryFormData({ ...entryFormData, [field.field_key]: star })
                            }
                            className="p-1 rounded-lg hover:bg-surface-subtle transition"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= Number(val || 0)
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-ink-muted/30 hover:text-amber-400'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs text-ink-muted ml-2 font-medium">
                          {val ? `${val} / 5` : 'Unrated'}
                        </span>
                      </div>
                    ) : field.field_type === 'tags' ? (
                      <input
                        type="text"
                        required={field.is_required}
                        value={val}
                        placeholder="Tags comma-separated: tech, design, priority"
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    ) : (
                      <input
                        type={
                          field.field_type === 'date'
                            ? 'date'
                            : field.field_type === 'url'
                            ? 'url'
                            : 'text'
                        }
                        required={field.is_required}
                        value={val}
                        placeholder={`Enter ${field.field_label.toLowerCase()}...`}
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    )}
                  </div>
                );
              })}

              <div className="pt-3 border-t border-border-subtle dark:border-border-darkSubtle flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEntryModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-border-subtle text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 3: View Full Entry Details ─── */}
      {detailEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: `${detailEntry.panel.color || '#4F46E5'}20`,
                    color: detailEntry.panel.color || '#4F46E5',
                  }}
                >
                  {React.createElement(ICON_MAP[detailEntry.panel.icon || 'Folder'] || Folder, {
                    className: 'w-4 h-4',
                  })}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary">
                    {detailEntry.entry.data?.title || 'Record Details'}
                  </h3>
                  <p className="text-[10px] text-ink-muted">
                    Board: <span className="font-semibold">{detailEntry.panel.name}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDetailEntry(null)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs">
              {panelFields
                .filter((f) => f.panel_id === detailEntry.panel.id)
                .sort((a, b) => a.field_order - b.field_order)
                .map((field) => {
                  const val = detailEntry.entry.data?.[field.field_key];
                  if (val === undefined || val === null || val === '') return null;

                  return (
                    <div
                      key={field.id}
                      className="p-3 rounded-xl bg-surface-subtle/60 dark:bg-surface-subtleDark/60 border border-border-subtle/50 space-y-1"
                    >
                      <div className="text-[10px] font-bold text-ink-muted uppercase tracking-wider">
                        {field.field_label}
                      </div>
                      <div className="text-xs">{renderFieldValue(field, val)}</div>
                    </div>
                  );
                })}

              <div className="pt-2 text-[10px] text-ink-muted flex items-center justify-between border-t border-border-subtle/50">
                <span>
                  Created: {new Date(detailEntry.entry.created_at || '').toLocaleString()}
                </span>
                {detailEntry.entry.updated_at && (
                  <span>
                    Updated: {new Date(detailEntry.entry.updated_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border-subtle dark:border-border-darkSubtle flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (confirm('Delete this record permanently?')) {
                    deleteEntry(detailEntry.entry.id);
                    setDetailEntry(null);
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition"
              >
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailEntry(null)}
                  className="px-3 py-1.5 rounded-xl border border-border-subtle text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openEditEntryModal(detailEntry.entry, detailEntry.panel.id);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
                >
                  Edit Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
