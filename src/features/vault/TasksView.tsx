import React, { useState } from 'react';
import { useVaultStore } from './vaultStore';
import { TodoItem } from '../../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Trash2,
  LayoutGrid,
  List,
  AlertCircle,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const { todos, addTodo, toggleTodoComplete, updateTodoQuadrant, deleteTodo } = useVaultStore();

  const [mode, setMode] = useState<'matrix' | 'list'>('matrix');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newUrgent, setNewUrgent] = useState(true);
  const [newImportant, setNewImportant] = useState(true);
  const [newCategory, setNewCategory] = useState('Engineering');
  const [newDueDate, setNewDueDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const categories = Array.from(new Set(todos.map((t) => t.category).filter(Boolean))) as string[];

  const filteredTodos = todos.filter((t) => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  });

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCount = todos.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr).length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Quadrants
  const q1 = filteredTodos.filter((t) => t.urgent && t.important); // Do First
  const q2 = filteredTodos.filter((t) => !t.urgent && t.important); // Schedule
  const q3 = filteredTodos.filter((t) => t.urgent && !t.important); // Delegate
  const q4 = filteredTodos.filter((t) => !t.urgent && !t.important); // Eliminate

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await addTodo({
      title: newTitle.trim(),
      urgent: newUrgent,
      important: newImportant,
      category: newCategory,
      dueDate: newDueDate || undefined,
      completed: false,
      priority: newUrgent && newImportant ? 'high' : newImportant ? 'medium' : 'low',
    });

    setNewTitle('');
    setNewDueDate('');
    setIsAdding(false);
  };

  const renderTaskCard = (todo: TodoItem) => {
    const isOverdue = !todo.completed && todo.dueDate && todo.dueDate < todayStr;

    return (
      <div
        key={todo.id}
        className={`group p-3 rounded-xl border transition-all ${
          todo.completed
            ? 'bg-slate-50/60 dark:bg-slate-900/40 border-border-subtle/50 dark:border-border-darkSubtle/50 opacity-70'
            : 'bg-surface dark:bg-surface-dark border-border-subtle dark:border-border-darkSubtle shadow-xs hover:border-brand-primary/40'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <button
            onClick={() => toggleTodoComplete(todo.id)}
            className="mt-0.5 text-ink-muted hover:text-brand-primary dark:hover:text-brand-darkPrimary transition flex-shrink-0"
          >
            {todo.completed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4
              className={`text-xs font-semibold leading-tight ${
                todo.completed
                  ? 'line-through text-ink-muted dark:text-ink-darkMuted'
                  : 'text-ink-primary dark:text-ink-darkPrimary'
              }`}
            >
              {todo.title}
            </h4>

            {todo.description && (
              <p className="text-[11px] text-ink-muted dark:text-ink-darkMuted mt-1 line-clamp-2 leading-relaxed">
                {todo.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-ink-muted dark:text-ink-darkMuted">
              {todo.category && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-ink-secondary dark:text-ink-darkSecondary font-medium">
                  {todo.category}
                </span>
              )}

              {todo.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    isOverdue ? 'text-rose-600 dark:text-rose-400 font-bold' : ''
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{todo.dueDate}</span>
                </span>
              )}

              {todo.priority && (
                <span
                  className={`px-1.5 py-0.2 rounded font-semibold uppercase text-[9px] ${
                    todo.priority === 'high'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : todo.priority === 'medium'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {todo.priority}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
            <select
              value={`${todo.urgent ? 'u' : 'nu'}_${todo.important ? 'i' : 'ni'}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'u_i') updateTodoQuadrant(todo.id, true, true);
                else if (val === 'nu_i') updateTodoQuadrant(todo.id, false, true);
                else if (val === 'u_ni') updateTodoQuadrant(todo.id, true, false);
                else if (val === 'nu_ni') updateTodoQuadrant(todo.id, false, false);
              }}
              className="text-[10px] rounded border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-muted px-1.5 py-0.5 outline-none cursor-pointer"
              title="Move Quadrant"
            >
              <option value="u_i">Q1: Do</option>
              <option value="nu_i">Q2: Schedule</option>
              <option value="u_ni">Q3: Delegate</option>
              <option value="nu_ni">Q4: Eliminate</option>
            </select>

            <button
              onClick={() => deleteTodo(todo.id)}
              className="p-1 rounded text-ink-muted hover:text-rose-500 transition"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-light dark:bg-canvas-dark overflow-hidden p-6 space-y-5">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-ink-primary dark:text-ink-darkPrimary flex items-center gap-2">
            <span>Eisenhower Decision Matrix &amp; Tasks</span>
          </h2>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Prioritize based on urgency &amp; importance to maximize impact.
          </p>
        </div>

        {/* Progress & Stat Badges */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-primary rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-brand-primary font-bold">{completionPct}% Done</span>
          </div>

          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{overdueCount} Overdue</span>
            </span>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle">
            <button
              onClick={() => setMode('matrix')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                mode === 'matrix' ? 'bg-surface dark:bg-surface-dark text-brand-primary font-bold shadow-xs' : 'text-ink-muted'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
            <button
              onClick={() => setMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                mode === 'list' ? 'bg-surface dark:bg-surface-dark text-brand-primary font-bold shadow-xs' : 'text-ink-muted'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-ink-primary dark:text-ink-darkPrimary outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Quick Add Modal / Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-4 rounded-2xl border border-brand-primary/30 bg-surface dark:bg-surface-dark shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">Create Task</h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-ink-muted hover:text-ink-primary"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            autoFocus
            placeholder="What needs to be done?..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
          />

          <div className="flex items-center gap-4 flex-wrap text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newUrgent}
                onChange={(e) => setNewUrgent(e.target.checked)}
                className="rounded text-brand-primary"
              />
              <span className="font-semibold text-rose-600 dark:text-rose-400">Urgent</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={newImportant}
                onChange={(e) => setNewImportant(e.target.checked)}
                className="rounded text-brand-primary"
              />
              <span className="font-semibold text-amber-600 dark:text-amber-400">Important</span>
            </label>

            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary"
            />

            <input
              type="text"
              placeholder="Category (e.g. Work, Admin)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary w-32"
            />

            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="ml-auto px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition disabled:opacity-50"
            >
              Add Task
            </button>
          </div>
        </form>
      )}

      {/* Main Content Area */}
      {mode === 'matrix' ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
          {/* Q1: Do First */}
          <div className="flex flex-col p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/15 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Q1: DO FIRST (Urgent &amp; Important)
                </h3>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                {q1.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {q1.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-muted">No urgent &amp; important tasks.</div>
              ) : (
                q1.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Q2: Schedule / Focus */}
          <div className="flex flex-col p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/15 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  Q2: SCHEDULE &amp; FOCUS (Not Urgent &amp; Important)
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {q2.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {q2.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-muted">No scheduled strategic tasks.</div>
              ) : (
                q2.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Q3: Delegate / Quick */}
          <div className="flex flex-col p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/15 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h3 className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  Q3: DELEGATE (Urgent &amp; Not Important)
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {q3.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {q3.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-muted">No delegated tasks.</div>
              ) : (
                q3.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Q4: Eliminate / Backlog */}
          <div className="flex flex-col p-4 rounded-2xl border border-slate-500/20 bg-slate-500/5 dark:bg-slate-900/15 overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Q4: ELIMINATE / BACKLOG (Not Urgent &amp; Not Important)
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full">
                {q4.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {q4.length === 0 ? (
                <div className="text-center py-8 text-xs text-ink-muted">Backlog is clear.</div>
              ) : (
                q4.map(renderTaskCard)
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle p-4 rounded-2xl">
          {filteredTodos.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-muted">No tasks in this list.</div>
          ) : (
            filteredTodos.map(renderTaskCard)
          )}
        </div>
      )}
    </div>
  );
};
