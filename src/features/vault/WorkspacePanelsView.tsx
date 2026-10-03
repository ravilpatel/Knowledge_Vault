import React, { useState } from 'react';
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
  Cloud,
  FileText,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  Edit2,
  X,
} from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FolderKanban,
  BookMarked,
  Users,
  Folder,
  Layers,
  Sparkles,
  FileText,
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
    supabaseSyncStatus,
  } = useVaultStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Panel | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PanelEntry | null>(null);

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

  const activePanel = panels.find((p) => p.id === activePanelId);
  const activeFields = panelFields
    .filter((f) => f.panel_id === activePanelId)
    .sort((a, b) => a.field_order - b.field_order);
  const activeEntries = panelEntries.filter((e) => e.panel_id === activePanelId);

  const filteredEntries = activeEntries.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(entry.data).some((val) =>
      String(val || '').toLowerCase().includes(q)
    );
  });

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
  const openNewEntryModal = () => {
    setEditingEntry(null);
    const initial: Record<string, any> = {};
    activeFields.forEach((f) => {
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

  const openEditEntryModal = (entry: PanelEntry) => {
    setEditingEntry(entry);
    setEntryFormData({ ...entry.data });
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePanelId) return;

    if (editingEntry) {
      await updateEntry(editingEntry.id, entryFormData);
    } else {
      await createEntry(activePanelId, entryFormData);
    }

    setIsEntryModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-light dark:bg-canvas-dark overflow-hidden p-6 space-y-5 select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          {activePanelId && (
            <button
              onClick={() => {
                setActivePanelId(null);
                setSearchQuery('');
              }}
              className="p-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle hover:bg-slate-100 dark:hover:bg-slate-800 text-ink-secondary dark:text-ink-darkSecondary transition"
              title="Back to All Panels"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-ink-primary dark:text-ink-darkPrimary">
                {activePanel ? activePanel.name : 'Workspace Panels'}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize">
                <Cloud className="w-3 h-3" />
                <span>Supabase: {supabaseSyncStatus}</span>
              </span>
            </div>
            <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-0.5">
              {activePanel
                ? `${activeEntries.length} records &bull; ${activeFields.length} custom schema fields`
                : 'Custom user-defined databases and EAV entities with Supabase cloud persistence.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {activePanelId ? (
            <>
              {/* Search in panel */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 w-44 text-ink-primary dark:text-ink-darkPrimary"
                />
              </div>

              {/* Layout toggle */}
              <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle text-xs">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`p-1.5 rounded-md ${
                    layoutMode === 'grid'
                      ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs'
                      : 'text-ink-muted'
                  }`}
                  title="Card Grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setLayoutMode('table')}
                  className={`p-1.5 rounded-md ${
                    layoutMode === 'table'
                      ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs'
                      : 'text-ink-muted'
                  }`}
                  title="Table / List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Panel settings */}
              {activePanel && (
                <button
                  onClick={() => openEditPanelModal(activePanel)}
                  className="p-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle hover:bg-slate-100 dark:hover:bg-slate-800 text-ink-muted hover:text-ink-primary transition"
                  title="Configure Panel & Fields"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              )}

              {/* Add Entry */}
              <button
                onClick={openNewEntryModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Entry</span>
              </button>
            </>
          ) : (
            <button
              onClick={openNewPanelModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Panel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {!activePanelId ? (
          /* Level 1: All Panels Pinned Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {panels.map((panel) => {
              const IconComp = ICON_MAP[panel.icon || 'Folder'] || Folder;
              const count = panelEntries.filter((e) => e.panel_id === panel.id).length;
              const fields = panelFields.filter((f) => f.panel_id === panel.id);

              return (
                <div
                  key={panel.id}
                  onClick={() => setActivePanelId(panel.id)}
                  className="group relative p-5 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark hover:border-brand-primary/40 dark:hover:border-brand-darkPrimary/40 transition-all hover:shadow-md cursor-pointer flex flex-col justify-between h-44"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                        style={{
                          backgroundColor: `${panel.color || '#4F46E5'}20`,
                          color: panel.color || '#4F46E5',
                        }}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPanelModal(panel);
                          }}
                          className="p-1 rounded text-ink-muted hover:text-ink-primary"
                          title="Edit Panel"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete panel "${panel.name}" and all its records?`)) {
                              deletePanel(panel.id);
                            }
                          }}
                          className="p-1 rounded text-ink-muted hover:text-rose-500"
                          title="Delete Panel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary truncate">
                      {panel.name}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {fields.slice(0, 3).map((f) => (
                        <span
                          key={f.id}
                          className="text-[10px] text-ink-muted font-medium bg-surface-subtle dark:bg-surface-subtleDark px-1.5 py-0.5 rounded border border-border-subtle/50"
                        >
                          {f.field_label}
                        </span>
                      ))}
                      {fields.length > 3 && (
                        <span className="text-[10px] text-ink-muted font-medium">
                          +{fields.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 dark:border-border-darkSubtle/60 text-xs">
                    <span className="font-semibold text-brand-primary dark:text-brand-darkPrimary">
                      {count} {count === 1 ? 'record' : 'records'}
                    </span>
                    <span className="text-[11px] text-ink-muted group-hover:text-ink-primary transition">
                      Open Panel &rarr;
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Level 2: Selected Panel Entries View */
          <div className="h-full flex flex-col">
            {filteredEntries.length === 0 ? (
              <div className="p-12 text-center text-xs text-ink-muted border border-dashed border-border-subtle dark:border-border-darkSubtle rounded-2xl bg-surface/50 dark:bg-surface-dark/50">
                <FileText className="w-8 h-8 mx-auto mb-2 text-brand-primary opacity-50" />
                <p className="font-bold text-ink-primary dark:text-ink-darkPrimary text-sm">
                  No records found in {activePanel?.name}
                </p>
                <p className="mt-1">
                  Click "+ New Entry" above to add your first structured entry to this panel.
                </p>
              </div>
            ) : layoutMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredEntries.map((entry) => {
                  const titleField = activeFields[0];
                  const primaryTitle = titleField ? entry.data[titleField.field_key] : 'Entry';

                  return (
                    <div
                      key={entry.id}
                      className="group relative p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-xs hover:border-brand-primary/40 transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary truncate">
                          {primaryTitle || 'Untitled'}
                        </h4>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                          <button
                            onClick={() => openEditEntryModal(entry)}
                            className="p-1 rounded text-ink-muted hover:text-ink-primary"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 rounded text-ink-muted hover:text-rose-500"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-ink-secondary dark:text-ink-darkSecondary">
                        {activeFields.slice(1).map((field) => {
                          const val = entry.data[field.field_key];
                          if (!val) return null;

                          return (
                            <div key={field.id} className="text-[11px] leading-relaxed">
                              <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider block">
                                {field.field_label}
                              </span>

                              {field.field_type === 'url' ? (
                                <a
                                  href={String(val)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-primary hover:underline inline-flex items-center gap-1 break-all"
                                >
                                  <span>{String(val)}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : field.field_type === 'date' ? (
                                <span className="inline-flex items-center gap-1 text-ink-muted">
                                  <Calendar className="w-3 h-3" />
                                  <span>{String(val)}</span>
                                </span>
                              ) : field.field_type === 'textarea' ? (
                                <p className="line-clamp-2 text-ink-muted">{String(val)}</p>
                              ) : field.field_type === 'select' ? (
                                <span className="inline-block px-2 py-0.5 rounded-full bg-brand-light dark:bg-brand-primary/10 text-brand-primary dark:text-brand-darkPrimary text-[10px] font-semibold">
                                  {String(val)}
                                </span>
                              ) : (
                                <span className="text-ink-primary dark:text-ink-darkPrimary">
                                  {String(val)}
                                </span>
                              )}
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
                <table className="w-full text-left text-xs divide-y divide-border-subtle dark:divide-border-darkSubtle">
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
                    {filteredEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition group"
                      >
                        {activeFields.map((f) => {
                          const val = entry.data[f.field_key];
                          return (
                            <td key={f.id} className="p-3 max-w-[200px] truncate text-ink-primary dark:text-ink-darkPrimary">
                              {f.field_type === 'url' && val ? (
                                <a
                                  href={String(val)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-brand-primary hover:underline inline-flex items-center gap-1"
                                >
                                  <span className="truncate">{String(val)}</span>
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                </a>
                              ) : (
                                String(val || '—')
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => openEditEntryModal(entry)}
                              className="p-1 rounded text-ink-muted hover:text-ink-primary"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
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
                {editingPanel ? 'Configure Workspace Panel' : 'Create New Panel'}
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
                  Panel Name
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
                <div className="flex gap-2">
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

              <div className="pt-3 border-t border-border-subtle dark:border-border-darkSubtle flex items-center justify-end gap-2">
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
                  Save Panel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Create / Edit Panel Entry ─── */}
      {isEntryModalOpen && activePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-4">
              <h3 className="text-sm font-bold">
                {editingEntry ? `Edit Record in ${activePanel.name}` : `New Entry in ${activePanel.name}`}
              </h3>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3.5 overflow-y-auto flex-1 pr-1 text-xs">
              {activeFields.map((field) => {
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
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    ) : field.field_type === 'select' && field.options ? (
                      <select
                        value={val}
                        onChange={(e) =>
                          setEntryFormData({ ...entryFormData, [field.field_key]: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                      >
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
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
    </div>
  );
};
