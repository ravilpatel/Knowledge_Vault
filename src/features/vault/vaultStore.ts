import { create } from 'zustand';
import { db } from '../../db/db';
import { TodoItem, HabitItem, ExpenseItem, NewsItem, WorkspaceView } from '../../types';
import { generateUUID } from '../../lib/id';

interface VaultState {
  currentView: WorkspaceView;
  todos: TodoItem[];
  habits: HabitItem[];
  expenses: ExpenseItem[];
  news: NewsItem[];
  isLoading: boolean;

  setCurrentView: (view: WorkspaceView) => void;
  loadVaultData: () => Promise<void>;

  // Task / Eisenhower Actions
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt'>) => Promise<TodoItem>;
  toggleTodoComplete: (id: string) => Promise<void>;
  updateTodoQuadrant: (id: string, urgent: boolean, important: boolean) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;

  // Habit Actions
  addHabit: (habit: Omit<HabitItem, 'id' | 'streak' | 'bestStreak' | 'completedDates' | 'createdAt'>) => Promise<HabitItem>;
  toggleHabitDate: (id: string, dateStr: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;

  // Expense Actions
  addExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => Promise<ExpenseItem>;
  deleteExpense: (id: string) => Promise<void>;

  // News Actions
  toggleNewsRead: (id: string) => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  currentView: 'notebooks',
  todos: [],
  habits: [],
  expenses: [],
  news: [],
  isLoading: true,

  setCurrentView: (currentView) => set({ currentView }),

  loadVaultData: async () => {
    set({ isLoading: true });
    try {
      let todos = await db.todos.toArray();
      let habits = await db.habits.toArray();
      let expenses = await db.expenses.toArray();
      let news = await db.news.toArray();

      // Seed initial sample data if empty
      if (todos.length === 0) {
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
          {
            id: generateUUID(),
            title: 'Reply to Vendor Inquiries & Invoices',
            description: 'Check cloud service subscriptions and renew team licenses.',
            urgent: true,
            important: false,
            dueDate: new Date().toISOString().slice(0, 10),
            completed: false,
            category: 'Admin',
            priority: 'low',
            createdAt: new Date().toISOString(),
          },
          {
            id: generateUUID(),
            title: 'Audit Legacy CSS Framework Overrides',
            description: 'Remove deprecated stylesheet declarations and clean unused assets.',
            urgent: false,
            important: false,
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
            completed: true,
            completedAt: new Date().toISOString(),
            category: 'Refactoring',
            priority: 'low',
            createdAt: new Date().toISOString(),
          },
        ];
        await db.todos.bulkPut(sampleTodos);
        todos = sampleTodos;
      }

      if (habits.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const dayBefore = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10);

        const sampleHabits: HabitItem[] = [
          {
            id: generateUUID(),
            title: 'Deep Work & Code Crafting',
            description: '4 hours of uninterrupted, flow-state programming and writing.',
            category: 'Productivity',
            frequency: 'daily',
            color: '#4F46E5',
            streak: 7,
            bestStreak: 14,
            completedDates: [dayBefore, yesterday, today],
            createdAt: new Date().toISOString(),
          },
          {
            id: generateUUID(),
            title: '30-Min Cardio / Weightlifting',
            description: 'Zone-2 running, cycling or strength session.',
            category: 'Fitness',
            frequency: 'daily',
            color: '#10B981',
            streak: 3,
            bestStreak: 21,
            completedDates: [dayBefore, yesterday],
            createdAt: new Date().toISOString(),
          },
          {
            id: generateUUID(),
            title: 'Read Non-Fiction & Tech Papers',
            description: 'At least 20 pages of architecture, neuroscience, or engineering literature.',
            category: 'Learning',
            frequency: 'daily',
            color: '#F59E0B',
            streak: 12,
            bestStreak: 30,
            completedDates: [dayBefore, yesterday, today],
            createdAt: new Date().toISOString(),
          },
        ];
        await db.habits.bulkPut(sampleHabits);
        habits = sampleHabits;
      }

      if (expenses.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        const sampleExpenses: ExpenseItem[] = [
          {
            id: generateUUID(),
            amount: 45000,
            description: 'Consulting Retainer & Engineering SOW',
            category: 'Income',
            type: 'income',
            date: today,
            createdAt: new Date().toISOString(),
          },
          {
            id: generateUUID(),
            amount: 1499,
            description: 'Google One 2TB Cloud Storage & Drive API Tier',
            category: 'Software',
            type: 'expense',
            reimbursable: true,
            date: today,
            createdAt: new Date().toISOString(),
          },
          {
            id: generateUUID(),
            amount: 2200,
            description: 'Books & Research Publications',
            category: 'Learning',
            type: 'expense',
            date: today,
            createdAt: new Date().toISOString(),
          },
        ];
        await db.expenses.bulkPut(sampleExpenses);
        expenses = sampleExpenses;
      }

      if (news.length === 0) {
        const sampleNews: NewsItem[] = [
          {
            id: generateUUID(),
            title: 'National Semiconductor Mission: Phase II Framework Announced',
            summary: 'Government outlines expanded incentives for fabless semiconductor startups, indigenous chip design, and advanced packaging infrastructure.',
            source: 'PIB India',
            url: 'https://pib.gov.in',
            category: 'policy',
            publishedAt: new Date().toISOString(),
            isRead: false,
          },
          {
            id: generateUUID(),
            title: 'Startup India Seed Fund Scheme Disburses $120M to Deeptech Innovators',
            summary: 'Focus on AI research, climate tech, and quantum computing prototypes across 85 incubation centers nationwide.',
            source: 'Startup India',
            url: 'https://www.startupindia.gov.in',
            category: 'startup',
            publishedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
            isRead: false,
          },
          {
            id: generateUUID(),
            title: 'Decentralized Identity & Local-First Software Architecture Standards',
            summary: 'Open-source working group publishes protocols for client-side encrypted sync and human-readable portable markdown vaults.',
            source: 'Tech Wire',
            url: 'https://news.ycombinator.com',
            category: 'tech',
            publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
            isRead: true,
          },
        ];
        await db.news.bulkPut(sampleNews);
        news = sampleNews;
      }

      set({ todos, habits, expenses, news, isLoading: false });
    } catch (err) {
      console.error('Failed to load Knowledge Vault data:', err);
      set({ isLoading: false });
    }
  },

  addTodo: async (todoData) => {
    const newTodo: TodoItem = {
      ...todoData,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.todos.put(newTodo);
    set((state) => ({ todos: [newTodo, ...state.todos] }));
    return newTodo;
  },

  toggleTodoComplete: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const completed = !todo.completed;
    const completedAt = completed ? new Date().toISOString() : undefined;
    const updated = { ...todo, completed, completedAt };
    await db.todos.put(updated);
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? updated : t)),
    }));
  },

  updateTodoQuadrant: async (id, urgent, important) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    const updated = { ...todo, urgent, important };
    await db.todos.put(updated);
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? updated : t)),
    }));
  },

  deleteTodo: async (id) => {
    await db.todos.delete(id);
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }));
  },

  addHabit: async (habitData) => {
    const newHabit: HabitItem = {
      ...habitData,
      id: generateUUID(),
      streak: 0,
      bestStreak: 0,
      completedDates: [],
      createdAt: new Date().toISOString(),
    };
    await db.habits.put(newHabit);
    set((state) => ({ habits: [...state.habits, newHabit] }));
    return newHabit;
  },

  toggleHabitDate: async (id, dateStr) => {
    const habit = get().habits.find((h) => h.id === id);
    if (!habit) return;

    let completedDates = [...habit.completedDates];
    if (completedDates.includes(dateStr)) {
      completedDates = completedDates.filter((d) => d !== dateStr);
    } else {
      completedDates.push(dateStr);
    }

    // Calculate streak
    completedDates.sort();
    let streak = 0;
    const checkDate = new Date();
    // Allow today or yesterday as current streak head
    const todayStr = checkDate.toISOString().slice(0, 10);
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().slice(0, 10);

    const hasRecent = completedDates.includes(todayStr) || completedDates.includes(yesterdayStr);
    if (hasRecent) {
      streak = 1;
      let curr = completedDates.includes(todayStr) ? new Date() : checkDate;
      while (true) {
        curr.setDate(curr.getDate() - 1);
        const prevStr = curr.toISOString().slice(0, 10);
        if (completedDates.includes(prevStr)) {
          streak++;
        } else {
          break;
        }
      }
    }

    const bestStreak = Math.max(habit.bestStreak, streak);
    const updated = { ...habit, completedDates, streak, bestStreak };
    await db.habits.put(updated);
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? updated : h)),
    }));
  },

  deleteHabit: async (id) => {
    await db.habits.delete(id);
    set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));
  },

  addExpense: async (expenseData) => {
    const newExpense: ExpenseItem = {
      ...expenseData,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
    };
    await db.expenses.put(newExpense);
    set((state) => ({ expenses: [newExpense, ...state.expenses] }));
    return newExpense;
  },

  deleteExpense: async (id) => {
    await db.expenses.delete(id);
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }));
  },

  toggleNewsRead: async (id) => {
    const item = get().news.find((n) => n.id === id);
    if (!item) return;
    const updated = { ...item, isRead: !item.isRead };
    await db.news.put(updated);
    set((state) => ({
      news: state.news.map((n) => (n.id === id ? updated : n)),
    }));
  },
}));
