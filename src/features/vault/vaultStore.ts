import { create } from 'zustand';
import { db } from '../../db/db';
import { getSupabase } from '../../lib/supabaseClient';
import {
  TodoItem,
  HabitItem,
  ExpenseItem,
  NewsItem,
  WorkspaceView,
  Panel,
  PanelField,
  PanelEntry,
} from '../../types';
import { generateUUID } from '../../lib/id';

interface VaultState {
  currentView: WorkspaceView;
  activePanelId: string | null;
  panels: Panel[];
  panelFields: PanelField[];
  panelEntries: PanelEntry[];
  todos: TodoItem[];
  habits: HabitItem[];
  expenses: ExpenseItem[];
  news: NewsItem[];
  isLoading: boolean;
  supabaseSyncStatus: 'synced' | 'syncing' | 'offline' | 'error';

  setCurrentView: (view: WorkspaceView) => void;
  setActivePanelId: (id: string | null) => void;
  loadVaultData: () => Promise<void>;

  // Panel Actions
  createPanel: (
    name: string,
    icon?: string,
    color?: string,
    initialFields?: Omit<PanelField, 'id' | 'panel_id'>[]
  ) => Promise<Panel>;
  updatePanel: (id: string, updates: Partial<Panel>) => Promise<void>;
  deletePanel: (id: string) => Promise<void>;

  // Panel Field Actions
  addField: (panelId: string, field: Omit<PanelField, 'id' | 'panel_id'>) => Promise<PanelField>;
  deleteField: (fieldId: string) => Promise<void>;

  // Panel Entry Actions
  createEntry: (panelId: string, data: Record<string, any>) => Promise<PanelEntry>;
  updateEntry: (entryId: string, data: Record<string, any>) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;

  // Task / Eisenhower Actions
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt'>) => Promise<TodoItem>;
  toggleTodoComplete: (id: string) => Promise<void>;
  updateTodoQuadrant: (id: string, urgent: boolean, important: boolean) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;

  // Habit Actions
  addHabit: (
    habit: Omit<HabitItem, 'id' | 'streak' | 'bestStreak' | 'completedDates' | 'createdAt'>
  ) => Promise<HabitItem>;
  toggleHabitDate: (id: string, dateStr: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  // Expense Actions
  addExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => Promise<ExpenseItem>;
  deleteExpense: (id: string) => Promise<void>;

  // News Actions
  toggleNewsRead: (id: string) => Promise<void>;
}

const safeSupabaseCall = async (queryPromise: PromiseLike<any>) => {
  try {
    await queryPromise;
  } catch (err: any) {
    console.warn('Supabase sync warning:', err);
  }
};

export const useVaultStore = create<VaultState>((set, get) => ({
  currentView: 'notebooks',
  activePanelId: null,
  panels: [],
  panelFields: [],
  panelEntries: [],
  todos: [],
  habits: [],
  expenses: [],
  news: [],
  isLoading: true,
  supabaseSyncStatus: 'synced',

  setCurrentView: (currentView) => set({ currentView }),
  setActivePanelId: (activePanelId) => set({ activePanelId }),

  loadVaultData: async () => {
    set({ isLoading: true });
    try {
      const sb = getSupabase();
      const {
        data: { session },
      } = await sb.auth.getSession();
      const userId = session?.user?.id;

      // 1. Load from local Dexie first for instant display
      let localPanels = await db.panels.toArray();
      let localFields = await db.panel_fields.toArray();
      let localEntries = await db.panel_entries.toArray();
      let localTodos = await db.todos.toArray();
      let localHabits = await db.habits.toArray();
      let localExpenses = await db.expenses.toArray();
      let localNews = await db.news.toArray();

      set({
        panels: localPanels,
        panelFields: localFields,
        panelEntries: localEntries,
        todos: localTodos,
        habits: localHabits,
        expenses: localExpenses,
        news: localNews,
      });

      // 2. If online and authenticated with Supabase, pull remote data
      if (navigator.onLine && userId) {
        set({ supabaseSyncStatus: 'syncing' });
        try {
          const [pRes, fRes, eRes, tRes, hRes, nRes] = await Promise.allSettled([
            sb.from('panels').select('*').order('sort_order', { ascending: true }),
            sb.from('panel_fields').select('*').order('field_order', { ascending: true }),
            sb.from('panel_entries').select('*').order('created_at', { ascending: false }),
            sb.from('todos').select('*'),
            sb.from('habits').select('*'),
            sb.from('news_items').select('*'),
          ]);

          if (pRes.status === 'fulfilled' && pRes.value.data) {
            const remotePanels = pRes.value.data;
            if (remotePanels.length > 0) {
              await db.panels.clear();
              await db.panels.bulkPut(remotePanels);
              set({ panels: remotePanels });
            }
          }

          if (fRes.status === 'fulfilled' && fRes.value.data) {
            const remoteFields = fRes.value.data;
            if (remoteFields.length > 0) {
              await db.panel_fields.clear();
              await db.panel_fields.bulkPut(remoteFields);
              set({ panelFields: remoteFields });
            }
          }

          if (eRes.status === 'fulfilled' && eRes.value.data) {
            const remoteEntries = eRes.value.data;
            if (remoteEntries.length > 0) {
              await db.panel_entries.clear();
              await db.panel_entries.bulkPut(remoteEntries);
              set({ panelEntries: remoteEntries });
            }
          }

          if (tRes.status === 'fulfilled' && tRes.value.data) {
            const remoteTodos = tRes.value.data.map((r: any) => ({
              id: r.id,
              title: r.title,
              description: r.description || '',
              urgent: !!r.urgent,
              important: !!r.important,
              dueDate: r.due_date || undefined,
              completed: !!r.completed,
              completedAt: r.completed_at || undefined,
              category: r.category || 'General',
              priority: r.priority || 'medium',
              createdAt: r.created_at || new Date().toISOString(),
            }));
            if (remoteTodos.length > 0) {
              await db.todos.clear();
              await db.todos.bulkPut(remoteTodos);
              set({ todos: remoteTodos });
            }
          }

          if (hRes.status === 'fulfilled' && hRes.value.data) {
            const remoteHabits = hRes.value.data.map((r: any) => ({
              id: r.id,
              title: r.name || r.title,
              description: r.description || '',
              category: r.category || 'Personal',
              frequency: r.frequency || 'daily',
              color: r.color || '#4F46E5',
              streak: 0,
              bestStreak: 0,
              completedDates: [],
              createdAt: r.created_at || new Date().toISOString(),
            }));
            if (remoteHabits.length > 0) {
              await db.habits.clear();
              await db.habits.bulkPut(remoteHabits);
              set({ habits: remoteHabits });
            }
          }

          if (nRes.status === 'fulfilled' && nRes.value.data) {
            const remoteNews = nRes.value.data.map((r: any) => ({
              id: r.id,
              title: r.title,
              summary: r.summary || '',
              source: r.source || 'Intel',
              url: r.url || '#',
              category: r.category || 'policy',
              publishedAt: r.published_at || new Date().toISOString(),
              isRead: !!r.is_read,
            }));
            if (remoteNews.length > 0) {
              await db.news.clear();
              await db.news.bulkPut(remoteNews);
              set({ news: remoteNews });
            }
          }

          set({ supabaseSyncStatus: 'synced' });
        } catch (syncErr) {
          console.warn('Supabase initial fetch failed, using local cache:', syncErr);
          set({ supabaseSyncStatus: 'offline' });
        }
      }

      // 3. Seed default sample workspace panels if completely empty
      const currentPanels = get().panels;
      if (currentPanels.length === 0) {
        const p1Id = generateUUID();
        const p2Id = generateUUID();
        const p3Id = generateUUID();

        const defaultPanels: Panel[] = [
          {
            id: p1Id,
            name: 'Active Projects',
            icon: 'FolderKanban',
            color: '#4F46E5',
            sort_order: 0,
            created_at: new Date().toISOString(),
          },
          {
            id: p2Id,
            name: 'Research & Reading',
            icon: 'BookMarked',
            color: '#0284C7',
            sort_order: 1,
            created_at: new Date().toISOString(),
          },
          {
            id: p3Id,
            name: 'Key Contacts',
            icon: 'Users',
            color: '#10B981',
            sort_order: 2,
            created_at: new Date().toISOString(),
          },
        ];

        const defaultFields: PanelField[] = [
          // Projects fields
          {
            id: generateUUID(),
            panel_id: p1Id,
            field_key: 'project_name',
            field_label: 'Project Name',
            field_type: 'text',
            field_order: 0,
            is_required: true,
          },
          {
            id: generateUUID(),
            panel_id: p1Id,
            field_key: 'status',
            field_label: 'Status',
            field_type: 'select',
            field_order: 1,
            is_required: true,
            options: ['Planning', 'In Progress', 'In Review', 'Completed'],
          },
          {
            id: generateUUID(),
            panel_id: p1Id,
            field_key: 'target_deadline',
            field_label: 'Target Deadline',
            field_type: 'date',
            field_order: 2,
            is_required: false,
          },
          {
            id: generateUUID(),
            panel_id: p1Id,
            field_key: 'scope_notes',
            field_label: 'Scope & Specifications',
            field_type: 'textarea',
            field_order: 3,
            is_required: false,
          },

          // Research fields
          {
            id: generateUUID(),
            panel_id: p2Id,
            field_key: 'resource_title',
            field_label: 'Article / Paper Title',
            field_type: 'text',
            field_order: 0,
            is_required: true,
          },
          {
            id: generateUUID(),
            panel_id: p2Id,
            field_key: 'url',
            field_label: 'URL Link',
            field_type: 'url',
            field_order: 1,
            is_required: false,
          },
          {
            id: generateUUID(),
            panel_id: p2Id,
            field_key: 'key_takeaways',
            field_label: 'Key Takeaways',
            field_type: 'textarea',
            field_order: 2,
            is_required: false,
          },

          // Contacts fields
          {
            id: generateUUID(),
            panel_id: p3Id,
            field_key: 'contact_name',
            field_label: 'Full Name',
            field_type: 'text',
            field_order: 0,
            is_required: true,
          },
          {
            id: generateUUID(),
            panel_id: p3Id,
            field_key: 'organization',
            field_label: 'Company / Organization',
            field_type: 'text',
            field_order: 1,
            is_required: false,
          },
          {
            id: generateUUID(),
            panel_id: p3Id,
            field_key: 'email',
            field_label: 'Email',
            field_type: 'text',
            field_order: 2,
            is_required: false,
          },
        ];

        const defaultEntries: PanelEntry[] = [
          {
            id: generateUUID(),
            panel_id: p1Id,
            data: {
              project_name: 'NoteVault PWA Migration',
              status: 'In Progress',
              target_deadline: '2026-10-15',
              scope_notes:
                'Integrate OneNote markdown notebook hierarchy with Supabase cloud workspace panel.',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: generateUUID(),
            panel_id: p2Id,
            data: {
              resource_title: 'Building Offline-First Web Applications with Dexie & Service Workers',
              url: 'https://dexie.org/docs/Tutorial/React',
              key_takeaways: 'IndexedDB caching guarantees sub-millisecond local reads and resilience.',
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        await db.panels.bulkPut(defaultPanels);
        await db.panel_fields.bulkPut(defaultFields);
        await db.panel_entries.bulkPut(defaultEntries);

        set({
          panels: defaultPanels,
          panelFields: defaultFields,
          panelEntries: defaultEntries,
        });

        // Push defaults to Supabase if authenticated
        if (userId) {
          try {
            await sb.from('panels').upsert(
              defaultPanels.map((p) => ({
                id: p.id,
                user_id: userId,
                name: p.name,
                icon: p.icon,
                color: p.color,
                sort_order: p.sort_order,
              }))
            );
            await sb.from('panel_fields').upsert(defaultFields);
            await sb.from('panel_entries').upsert(
              defaultEntries.map((e) => ({
                id: e.id,
                panel_id: e.panel_id,
                user_id: userId,
                data: e.data,
              }))
            );
          } catch (e) {
            console.warn('Seeding to Supabase failed:', e);
          }
        }
      }

      // Seed default sample todos/habits/expenses if empty
      if (get().todos.length === 0) {
        const sampleTodos: TodoItem[] = [
          {
            id: generateUUID(),
            title: 'Finalize Q4 Architecture Roadmap',
            description: 'Align distributed consensus protocol and offline sync engine specifications.',
            urgent: true,
            important: true,
            dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            completed: false,
            category: 'Engineering',
            priority: 'high',
            createdAt: new Date().toISOString(),
          },
          {
            id: generateUUID(),
            title: 'Design Habit Heatmap & Streaks Visualization',
            description: 'Implement GitHub-style contribution squares for daily habits.',
            urgent: false,
            important: true,
            dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
            completed: false,
            category: 'Productivity',
            priority: 'medium',
            createdAt: new Date().toISOString(),
          },
        ];
        await db.todos.bulkPut(sampleTodos);
        set({ todos: sampleTodos });
      }

      if (get().habits.length === 0) {
        const sampleHabits: HabitItem[] = [
          {
            id: generateUUID(),
            title: 'Daily Deep Work Block (90m)',
            description: 'Uninterrupted focus with notifications muted.',
            category: 'Productivity',
            frequency: 'daily',
            color: '#4F46E5',
            streak: 5,
            bestStreak: 14,
            completedDates: [
              new Date().toISOString().slice(0, 10),
              new Date(Date.now() - 86400000).toISOString().slice(0, 10),
              new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
            ],
            createdAt: new Date().toISOString(),
          },
        ];
        await db.habits.bulkPut(sampleHabits);
        set({ habits: sampleHabits });
      }

      if (get().expenses.length === 0) {
        const sampleExpenses: ExpenseItem[] = [
          {
            id: generateUUID(),
            amount: 2499,
            description: 'Cloud Infrastructure & Postgres Hosting',
            category: 'Software',
            type: 'expense',
            reimbursable: true,
            date: new Date().toISOString().slice(0, 10),
            createdAt: new Date().toISOString(),
          },
        ];
        await db.expenses.bulkPut(sampleExpenses);
        set({ expenses: sampleExpenses });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  // ─── Custom Panel Mutations ──────────────────────────────

  createPanel: async (name, icon = 'Folder', color = '#4F46E5', initialFields = []) => {
    const sb = getSupabase();
    const {
      data: { session },
    } = await sb.auth.getSession();
    const userId = session?.user?.id;

    const panelId = generateUUID();
    const newPanel: Panel = {
      id: panelId,
      user_id: userId,
      name,
      icon,
      color,
      sort_order: get().panels.length,
      created_at: new Date().toISOString(),
    };

    const newFields: PanelField[] = initialFields.map((f, idx) => ({
      id: generateUUID(),
      panel_id: panelId,
      field_key: f.field_key,
      field_label: f.field_label,
      field_type: f.field_type,
      field_order: idx,
      is_required: f.is_required,
      options: f.options || null,
    }));

    // Update local DB
    await db.panels.put(newPanel);
    if (newFields.length > 0) {
      await db.panel_fields.bulkPut(newFields);
    }

    set((state) => ({
      panels: [...state.panels, newPanel],
      panelFields: [...state.panelFields, ...newFields],
      activePanelId: panelId,
    }));

    // Sync to Supabase
    if (userId) {
      safeSupabaseCall(
        sb.from('panels').insert({
          id: newPanel.id,
          user_id: userId,
          name: newPanel.name,
          icon: newPanel.icon,
          color: newPanel.color,
          sort_order: newPanel.sort_order,
        })
      );
      if (newFields.length > 0) {
        safeSupabaseCall(sb.from('panel_fields').insert(newFields));
      }
    }

    return newPanel;
  },

  updatePanel: async (id, updates) => {
    await db.panels.update(id, updates);
    set((state) => ({
      panels: state.panels.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('panels').update(updates).eq('id', id));
  },

  deletePanel: async (id) => {
    await db.panels.delete(id);
    await db.panel_fields.where('panel_id').equals(id).delete();
    await db.panel_entries.where('panel_id').equals(id).delete();

    set((state) => ({
      panels: state.panels.filter((p) => p.id !== id),
      panelFields: state.panelFields.filter((f) => f.panel_id !== id),
      panelEntries: state.panelEntries.filter((e) => e.panel_id !== id),
      activePanelId: state.activePanelId === id ? null : state.activePanelId,
    }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('panels').delete().eq('id', id));
  },

  addField: async (panelId, field) => {
    const newField: PanelField = {
      id: generateUUID(),
      panel_id: panelId,
      field_key: field.field_key,
      field_label: field.field_label,
      field_type: field.field_type,
      field_order: field.field_order || 0,
      is_required: !!field.is_required,
      options: field.options || null,
    };

    await db.panel_fields.put(newField);
    set((state) => ({
      panelFields: [...state.panelFields, newField],
    }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('panel_fields').insert(newField));

    return newField;
  },

  deleteField: async (fieldId) => {
    await db.panel_fields.delete(fieldId);
    set((state) => ({
      panelFields: state.panelFields.filter((f) => f.id !== fieldId),
    }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('panel_fields').delete().eq('id', fieldId));
  },

  createEntry: async (panelId, data) => {
    const sb = getSupabase();
    const {
      data: { session },
    } = await sb.auth.getSession();
    const userId = session?.user?.id;

    const entryId = generateUUID();
    const newEntry: PanelEntry = {
      id: entryId,
      panel_id: panelId,
      user_id: userId,
      data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.panel_entries.put(newEntry);
    set((state) => ({
      panelEntries: [newEntry, ...state.panelEntries],
    }));

    if (userId) {
      safeSupabaseCall(
        sb.from('panel_entries').insert({
          id: newEntry.id,
          panel_id: newEntry.panel_id,
          user_id: userId,
          data: newEntry.data,
        })
      );
    }

    return newEntry;
  },

  updateEntry: async (entryId, data) => {
    const now = new Date().toISOString();
    await db.panel_entries.update(entryId, { data, updated_at: now });

    set((state) => ({
      panelEntries: state.panelEntries.map((e) =>
        e.id === entryId ? { ...e, data, updated_at: now } : e
      ),
    }));

    const sb = getSupabase();
    safeSupabaseCall(
      sb.from('panel_entries').update({ data, updated_at: now }).eq('id', entryId)
    );
  },

  deleteEntry: async (entryId) => {
    await db.panel_entries.delete(entryId);
    set((state) => ({
      panelEntries: state.panelEntries.filter((e) => e.id !== entryId),
    }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('panel_entries').delete().eq('id', entryId));
  },

  // ─── Todo Actions ────────────────────────────────────────

  addTodo: async (item) => {
    const id = generateUUID();
    const now = new Date().toISOString();
    const newTodo: TodoItem = { ...item, id, createdAt: now };

    await db.todos.put(newTodo);
    set((state) => ({ todos: [newTodo, ...state.todos] }));

    const sb = getSupabase();
    safeSupabaseCall(
      sb.from('todos').insert({
        id: newTodo.id,
        title: newTodo.title,
        description: newTodo.description,
        urgent: newTodo.urgent,
        important: newTodo.important,
        due_date: newTodo.dueDate,
        completed: newTodo.completed,
      })
    );

    return newTodo;
  },

  toggleTodoComplete: async (id) => {
    const target = get().todos.find((t) => t.id === id);
    if (!target) return;
    const completed = !target.completed;
    const completedAt = completed ? new Date().toISOString() : undefined;

    await db.todos.update(id, { completed, completedAt });
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, completed, completedAt } : t)),
    }));

    const sb = getSupabase();
    safeSupabaseCall(
      sb.from('todos').update({ completed, completed_at: completedAt }).eq('id', id)
    );
  },

  updateTodoQuadrant: async (id, urgent, important) => {
    await db.todos.update(id, { urgent, important });
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, urgent, important } : t)),
    }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('todos').update({ urgent, important }).eq('id', id));
  },

  deleteTodo: async (id) => {
    await db.todos.delete(id);
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('todos').delete().eq('id', id));
  },

  // ─── Habit Actions ───────────────────────────────────────

  addHabit: async (item) => {
    const id = generateUUID();
    const now = new Date().toISOString();
    const newHabit: HabitItem = {
      ...item,
      id,
      streak: 0,
      bestStreak: 0,
      completedDates: [],
      createdAt: now,
    };

    await db.habits.put(newHabit);
    set((state) => ({ habits: [...state.habits, newHabit] }));

    const sb = getSupabase();
    safeSupabaseCall(
      sb.from('habits').insert({
        id: newHabit.id,
        name: newHabit.title,
        description: newHabit.description,
        category: newHabit.category,
        color: newHabit.color,
        frequency: newHabit.frequency,
      })
    );

    return newHabit;
  },

  toggleHabitDate: async (id, dateStr) => {
    const target = get().habits.find((h) => h.id === id);
    if (!target) return;

    let updatedDates = [...target.completedDates];
    const isCompleted = updatedDates.includes(dateStr);

    if (isCompleted) {
      updatedDates = updatedDates.filter((d) => d !== dateStr);
    } else {
      updatedDates.push(dateStr);
    }

    // Recalculate streak
    let currentStreak = 0;
    const checkDate = new Date();
    while (true) {
      const dStr = checkDate.toISOString().slice(0, 10);
      if (updatedDates.includes(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const bestStreak = Math.max(target.bestStreak, currentStreak);

    await db.habits.update(id, {
      completedDates: updatedDates,
      streak: currentStreak,
      bestStreak,
    });

    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id
          ? { ...h, completedDates: updatedDates, streak: currentStreak, bestStreak }
          : h
      ),
    }));

    const sb = getSupabase();
    if (!isCompleted) {
      safeSupabaseCall(
        sb.from('habit_logs').upsert({
          habit_id: id,
          date: dateStr,
          completed: true,
        })
      );
    } else {
      safeSupabaseCall(
        sb.from('habit_logs').delete().eq('habit_id', id).eq('date', dateStr)
      );
    }
  },

  deleteHabit: async (id) => {
    await db.habits.delete(id);
    set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('habits').delete().eq('id', id));
  },

  // ─── Expense Actions ─────────────────────────────────────

  addExpense: async (item) => {
    const id = generateUUID();
    const now = new Date().toISOString();
    const newExpense: ExpenseItem = { ...item, id, createdAt: now };

    await db.expenses.put(newExpense);
    set((state) => ({ expenses: [newExpense, ...state.expenses] }));

    const sb = getSupabase();
    safeSupabaseCall(
      sb.from('expenses').insert({
        id: newExpense.id,
        amount: newExpense.amount,
        description: newExpense.description,
        category: newExpense.category,
        reimbursable: newExpense.reimbursable,
        date: newExpense.date,
      })
    );

    return newExpense;
  },

  deleteExpense: async (id) => {
    await db.expenses.delete(id);
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('expenses').delete().eq('id', id));
  },

  // ─── News Actions ────────────────────────────────────────

  toggleNewsRead: async (id) => {
    const target = get().news.find((n) => n.id === id);
    if (!target) return;
    const isRead = !target.isRead;

    await db.news.update(id, { isRead });
    set((state) => ({
      news: state.news.map((n) => (n.id === id ? { ...n, isRead } : n)),
    }));

    const sb = getSupabase();
    safeSupabaseCall(sb.from('news_items').update({ is_read: isRead }).eq('id', id));
  },
}));
