import React, { useState, useMemo } from 'react';
import { useVaultStore } from './vaultStore';
import { TodoItem, TaskScope, TaskStatus, TaskPriority, TaskSubtask } from '../../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  Calendar,
  Trash2,
  List,
  AlertCircle,
  Briefcase,
  User,
  Columns3,
  Flame,
  Edit2,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  ArrowRight,
  PlayCircle,
  PauseCircle,
  Copy,
  CheckSquare,
} from 'lucide-react';

const KANBAN_COLUMNS: {
  id: TaskStatus;
  title: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bgLight: string;
}[] = [
  {
    id: 'todo',
    title: 'To Do',
    icon: Circle,
    color: '#64748B', // Slate
    bgLight: 'rgba(100, 116, 139, 0.08)',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: PlayCircle,
    color: '#F59E0B', // Amber
    bgLight: 'rgba(245, 158, 11, 0.08)',
  },
  {
    id: 'blocked',
    title: 'In Review / Waiting',
    icon: PauseCircle,
    color: '#3B82F6', // Blue
    bgLight: 'rgba(59, 130, 246, 0.08)',
  },
  {
    id: 'done',
    title: 'Done',
    icon: CheckCircle2,
    color: '#10B981', // Emerald
    bgLight: 'rgba(16, 185, 129, 0.08)',
  },
];

export const TasksView: React.FC = () => {
  const {
    todos,
    projects,
    addTodo,
    updateTodo,
    updateTodoStatus,
    toggleTodoComplete,
    deleteTodo,
  } = useVaultStore();

  // Primary Scope Toggle: 'all' | 'work' | 'personal'
  const [activeScope, setActiveScope] = useState<'all' | 'work' | 'personal'>('work');

  // View Mode: 'board' (Kanban) | 'list' | 'matrix' (Eisenhower)
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'matrix'>('board');

  // Filter & Search states
  const [filterPreset, setFilterPreset] = useState<'all' | 'today' | 'upcoming' | 'priority' | 'overdue' | 'completed'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick-Add bar state
  const [quickTitle, setQuickTitle] = useState('');
  const [quickScope, setQuickScope] = useState<TaskScope>('work');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('p3');
  const [quickDueDate, setQuickDueDate] = useState<string>('');
  const [quickProjectId, setQuickProjectId] = useState<string>('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

  // Modal form states
  const [modalTitle, setModalTitle] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [modalScope, setModalScope] = useState<TaskScope>('work');
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo');
  const [modalPriority, setModalPriority] = useState<TaskPriority>('p3');
  const [modalDueDate, setModalDueDate] = useState('');
  const [modalDueTime, setModalDueTime] = useState('');
  const [modalProjectId, setModalProjectId] = useState('');
  const [modalTags, setModalTags] = useState('');
  const [modalUrgent, setModalUrgent] = useState(false);
  const [modalImportant, setModalImportant] = useState(false);
  const [modalSubtasks, setModalSubtasks] = useState<TaskSubtask[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Expanded subtasks inline state: set of todo IDs
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Filter tasks based on Scope, Preset, Project, and Search
  const filteredTodos = useMemo(() => {
    return todos.filter((t) => {
      // 1. Scope filter (Work vs Personal)
      if (activeScope !== 'all') {
        const taskScope = t.scope || 'work';
        if (taskScope !== activeScope) return false;
      }

      // 2. Project filter
      if (projectFilter !== 'all') {
        if (projectFilter === 'none') {
          if (t.projectId) return false;
        } else if (t.projectId !== projectFilter) {
          return false;
        }
      }

      // 3. Preset filter
      const isDone = t.completed || t.status === 'done';
      if (filterPreset === 'today') {
        if (t.dueDate !== todayStr || isDone) return false;
      } else if (filterPreset === 'upcoming') {
        if (!t.dueDate || t.dueDate <= todayStr || isDone) return false;
      } else if (filterPreset === 'priority') {
        if (t.priority !== 'p1' && t.priority !== 'high' && !t.urgent) return false;
      } else if (filterPreset === 'overdue') {
        if (!t.dueDate || t.dueDate >= todayStr || isDone) return false;
      } else if (filterPreset === 'completed') {
        if (!isDone) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const projName = t.projectId ? projects.find((p) => p.id === t.projectId)?.name || '' : '';
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = (t.description || '').toLowerCase().includes(q);
        const inTags = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        const inProj = projName.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inTags && !inProj) return false;
      }

      return true;
    });
  }, [todos, activeScope, projectFilter, filterPreset, searchQuery, todayStr, projects]);

  // Metric counts
  const totalCount = todos.length;
  const workCount = todos.filter((t) => (t.scope || 'work') === 'work').length;
  const personalCount = todos.filter((t) => t.scope === 'personal').length;
  const completedCount = todos.filter((t) => t.completed || t.status === 'done').length;
  const inProgressCount = todos.filter((t) => t.status === 'in_progress').length;
  const overdueCount = todos.filter(
    (t) => !t.completed && t.status !== 'done' && t.dueDate && t.dueDate < todayStr
  ).length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Modal Open Handlers
  const openCreateModal = (defaultStatus: TaskStatus = 'todo') => {
    setEditingTodo(null);
    setModalTitle('');
    setModalDescription('');
    setModalScope(activeScope === 'personal' ? 'personal' : 'work');
    setModalStatus(defaultStatus);
    setModalPriority('p3');
    setModalDueDate('');
    setModalDueTime('');
    setModalProjectId(projectFilter !== 'all' && projectFilter !== 'none' ? projectFilter : '');
    setModalTags('');
    setModalUrgent(defaultStatus === 'in_progress');
    setModalImportant(true);
    setModalSubtasks([]);
    setNewSubtaskInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (todo: TodoItem) => {
    setEditingTodo(todo);
    setModalTitle(todo.title);
    setModalDescription(todo.description || '');
    setModalScope(todo.scope || 'work');
    setModalStatus(todo.status || (todo.completed ? 'done' : 'todo'));
    setModalPriority(todo.priority || 'p3');
    setModalDueDate(todo.dueDate || '');
    setModalDueTime(todo.dueTime || '');
    setModalProjectId(todo.projectId || '');
    setModalTags((todo.tags || []).join(', '));
    setModalUrgent(!!todo.urgent);
    setModalImportant(!!todo.important);
    setModalSubtasks(todo.subtasks || []);
    setNewSubtaskInput('');
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    const tagsArr = modalTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingTodo) {
      await updateTodo(editingTodo.id, {
        title: modalTitle.trim(),
        description: modalDescription.trim(),
        scope: modalScope,
        status: modalStatus,
        priority: modalPriority,
        dueDate: modalDueDate || undefined,
        dueTime: modalDueTime || undefined,
        projectId: modalProjectId || undefined,
        tags: tagsArr,
        urgent: modalUrgent,
        important: modalImportant,
        subtasks: modalSubtasks,
        completed: modalStatus === 'done',
        completedAt: modalStatus === 'done' ? new Date().toISOString() : undefined,
      });
    } else {
      await addTodo({
        title: modalTitle.trim(),
        description: modalDescription.trim(),
        scope: modalScope,
        status: modalStatus,
        priority: modalPriority,
        dueDate: modalDueDate || undefined,
        dueTime: modalDueTime || undefined,
        projectId: modalProjectId || undefined,
        tags: tagsArr,
        urgent: modalUrgent,
        important: modalImportant,
        subtasks: modalSubtasks,
        completed: modalStatus === 'done',
      });
    }

    setIsModalOpen(false);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    let dueStr = quickDueDate;
    if (quickDueDate === 'today') dueStr = todayStr;
    else if (quickDueDate === 'tomorrow') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      dueStr = d.toISOString().slice(0, 10);
    } else if (quickDueDate === 'next_week') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      dueStr = d.toISOString().slice(0, 10);
    }

    await addTodo({
      title: quickTitle.trim(),
      scope: quickScope,
      status: 'todo',
      priority: quickPriority,
      dueDate: dueStr || undefined,
      projectId: quickProjectId || undefined,
      urgent: quickPriority === 'p1',
      important: quickPriority === 'p1' || quickPriority === 'p2',
      completed: false,
    });

    setQuickTitle('');
  };

  const handleDuplicate = async (todo: TodoItem) => {
    await addTodo({
      title: `${todo.title} (Copy)`,
      description: todo.description,
      scope: todo.scope || 'work',
      status: 'todo',
      priority: todo.priority || 'p3',
      dueDate: todo.dueDate,
      dueTime: todo.dueTime,
      projectId: todo.projectId,
      tags: todo.tags ? [...todo.tags] : [],
      subtasks: todo.subtasks ? JSON.parse(JSON.stringify(todo.subtasks)) : [],
      urgent: todo.urgent,
      important: todo.important,
      completed: false,
    });
  };

  const toggleSubtaskInline = async (todoId: string, subtaskId: string) => {
    const target = todos.find((t) => t.id === todoId);
    if (!target || !target.subtasks) return;

    const updatedSubtasks = target.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    await updateTodo(todoId, { subtasks: updatedSubtasks });
  };

  const addSubtaskInline = async (todoId: string, text: string) => {
    if (!text.trim()) return;
    const target = todos.find((t) => t.id === todoId);
    if (!target) return;

    const newSubtask: TaskSubtask = {
      id: `st-${Date.now()}`,
      text: text.trim(),
      completed: false,
    };

    const updated = [...(target.subtasks || []), newSubtask];
    await updateTodo(todoId, { subtasks: updated });
  };

  const toggleSubtasksExpanded = (todoId: string) => {
    setExpandedSubtasks((prev) => {
      const next = new Set(prev);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  };

  const getPriorityBadge = (priority?: TaskPriority) => {
    switch (priority) {
      case 'p1':
      case 'high':
        return {
          label: 'P1 Urgent',
          className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        };
      case 'p2':
      case 'medium':
        return {
          label: 'P2 High',
          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        };
      case 'p3':
      case 'low':
        return {
          label: 'P3 Normal',
          className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        };
      case 'p4':
        return {
          label: 'P4 Low',
          className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        };
      default:
        return {
          label: 'Normal',
          className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
        };
    }
  };

  // ─── Render Task Card Component ───
  const renderTaskCard = (todo: TodoItem) => {
    const isDone = todo.completed || todo.status === 'done';
    const isOverdue = !isDone && todo.dueDate && todo.dueDate < todayStr;
    const isToday = !isDone && todo.dueDate && todo.dueDate === todayStr;
    const project = todo.projectId ? projects.find((p) => p.id === todo.projectId) : null;
    const priorityInfo = getPriorityBadge(todo.priority);
    const subtasks = todo.subtasks || [];
    const stDone = subtasks.filter((s) => s.completed).length;
    const stTotal = subtasks.length;
    const isExpanded = expandedSubtasks.has(todo.id);

    return (
      <div
        key={todo.id}
        onClick={() => openEditModal(todo)}
        className={`group/card relative p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer space-y-2.5 shadow-xs hover:shadow-sm ${
          isDone
            ? 'bg-surface-subtle/40 dark:bg-surface-subtleDark/40 border-border-subtle/60 dark:border-border-darkSubtle/60 opacity-75'
            : 'bg-surface dark:bg-surface-dark border-border-subtle dark:border-border-darkSubtle hover:border-brand-primary/50 dark:hover:border-brand-darkPrimary/50'
        }`}
        style={{
          borderLeft: `4px solid ${
            todo.status === 'done'
              ? '#10B981'
              : todo.status === 'in_progress'
              ? '#F59E0B'
              : todo.status === 'blocked'
              ? '#3B82F6'
              : '#94A3B8'
          }`,
        }}
      >
        {/* Top Line: Checkbox + Title + Actions */}
        <div className="flex items-start gap-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleTodoComplete(todo.id);
            }}
            className="mt-0.5 text-ink-muted hover:text-brand-primary dark:hover:text-brand-darkPrimary transition flex-shrink-0"
            title={isDone ? 'Mark Incomplete' : 'Mark Complete'}
          >
            {isDone ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
            ) : (
              <Circle className="w-4 h-4 hover:scale-110 transition" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h4
              className={`text-xs font-bold leading-snug break-words ${
                isDone
                  ? 'line-through text-ink-muted dark:text-ink-darkMuted'
                  : 'text-ink-primary dark:text-ink-darkPrimary'
              }`}
            >
              {todo.title}
            </h4>
          </div>

          {/* Quick Hover Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicate(todo);
              }}
              className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-subtle"
              title="Duplicate Task"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(todo);
              }}
              className="p-1 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-surface-subtle"
              title="Edit Task"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this task?')) deleteTodo(todo.id);
              }}
              className="p-1 rounded-lg text-ink-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Delete Task"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Description */}
        {todo.description && (
          <p className="text-[11px] text-ink-secondary dark:text-ink-darkSecondary line-clamp-2 leading-relaxed pl-6">
            {todo.description}
          </p>
        )}

        {/* Badges row: Scope, Priority, Due Date, Project, Tags */}
        <div className="flex items-center gap-1.5 flex-wrap pl-6 text-[10px]">
          {/* Scope Badge (Work vs Personal) */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold border ${
              todo.scope === 'personal'
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
            }`}
          >
            {todo.scope === 'personal' ? (
              <>
                <User className="w-2.5 h-2.5" />
                <span>Personal</span>
              </>
            ) : (
              <>
                <Briefcase className="w-2.5 h-2.5" />
                <span>Work</span>
              </>
            )}
          </span>

          {/* Priority Pill */}
          <span className={`px-1.5 py-0.5 rounded-md font-semibold border ${priorityInfo.className}`}>
            {priorityInfo.label}
          </span>

          {/* Due Date Badge */}
          {todo.dueDate && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium border ${
                isOverdue
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold'
                  : isToday
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold'
                  : 'bg-surface-subtle dark:bg-surface-subtleDark text-ink-muted border-border-subtle/60'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>
                {isOverdue ? `Overdue (${todo.dueDate})` : isToday ? 'Today' : todo.dueDate}
                {todo.dueTime ? ` ${todo.dueTime}` : ''}
              </span>
            </span>
          )}

          {/* Assigned Project */}
          {project && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              <Briefcase className="w-2.5 h-2.5" />
              <span className="truncate max-w-[120px]">{project.name}</span>
            </span>
          )}

          {/* Tags */}
          {(todo.tags || []).map((tag, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded-md bg-surface-subtle dark:bg-surface-subtleDark text-ink-muted border border-border-subtle/50 text-[9px]"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Subtasks Progress & Expandable Checklist */}
        {stTotal > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="pl-6 pt-1 border-t border-border-subtle/40 dark:border-border-darkSubtle/40"
          >
            <div
              onClick={() => toggleSubtasksExpanded(todo.id)}
              className="flex items-center justify-between text-[10px] text-ink-muted font-semibold cursor-pointer hover:text-ink-primary"
            >
              <span className="inline-flex items-center gap-1">
                <span>
                  Subtasks ({stDone}/{stTotal})
                </span>
                <span className="text-[9px] font-normal opacity-75">
                  &bull; {Math.round((stDone / stTotal) * 100)}%
                </span>
              </span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </div>

            {/* Subtask Progress bar */}
            <div className="w-full h-1 bg-surface-subtle dark:bg-surface-subtleDark rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-brand-primary rounded-full transition-all duration-300"
                style={{ width: `${(stDone / stTotal) * 100}%` }}
              />
            </div>

            {/* Expanded Checklist */}
            {isExpanded && (
              <div className="mt-2 space-y-1.5 bg-surface-subtle/50 dark:bg-surface-subtleDark/50 p-2 rounded-xl border border-border-subtle/50">
                {subtasks.map((st) => (
                  <label
                    key={st.id}
                    className="flex items-center gap-2 text-[11px] cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => toggleSubtaskInline(todo.id, st.id)}
                      className="rounded text-brand-primary focus:ring-0 w-3.5 h-3.5"
                    />
                    <span
                      className={
                        st.completed
                          ? 'line-through text-ink-muted dark:text-ink-darkMuted'
                          : 'text-ink-primary dark:text-ink-darkPrimary'
                      }
                    >
                      {st.text}
                    </span>
                  </label>
                ))}

                {/* Inline Quick Add Subtask */}
                <div className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    placeholder="Add step..."
                    className="flex-1 px-2 py-0.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-[10px] outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          addSubtaskInline(todo.id, val);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                  <span className="text-[9px] text-ink-muted font-medium">↵ Enter</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Card Footer: Quick Column Switcher */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between pt-1 border-t border-border-subtle/40 dark:border-border-darkSubtle/40 text-[10px] text-ink-muted"
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] uppercase font-bold tracking-wider opacity-60">Move:</span>
            <select
              value={todo.status || (todo.completed ? 'done' : 'todo')}
              onChange={(e) => updateTodoStatus(todo.id, e.target.value as TaskStatus)}
              className="bg-transparent border border-border-subtle/60 dark:border-border-darkSubtle/60 rounded px-1.5 py-0.5 text-[10px] text-ink-secondary dark:text-ink-darkSecondary font-medium outline-none cursor-pointer hover:border-brand-primary"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">In Review / Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* One-click Next Phase Button */}
          {todo.status !== 'done' && (
            <button
              onClick={() => {
                if (todo.status === 'todo' || !todo.status) updateTodoStatus(todo.id, 'in_progress');
                else if (todo.status === 'in_progress') updateTodoStatus(todo.id, 'blocked');
                else if (todo.status === 'blocked') updateTodoStatus(todo.id, 'done');
              }}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark hover:bg-brand-primary/10 hover:text-brand-primary border border-border-subtle/50 text-[10px] font-semibold transition"
              title="Move to next stage"
            >
              <span>Next</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-light dark:bg-canvas-dark overflow-hidden p-3.5 md:p-6 space-y-3 md:space-y-4 select-none">
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-3.5 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle p-3.5 md:p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base md:text-lg font-bold text-ink-primary dark:text-ink-darkPrimary tracking-tight flex items-center gap-2">
            <Columns3 className="w-5 h-5 text-brand-primary" />
            <span>Task Board</span>
          </h2>
          <p className="text-[11px] md:text-xs text-ink-muted dark:text-ink-darkMuted mt-0.5">
            {filteredTodos.length} tasks visible &bull; {completedCount} of {totalCount} completed ({completionPct}%)
          </p>
        </div>

        {/* Work vs Personal Scope Switcher (Prominent Toggle) */}
        <div className="flex items-center p-1 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle text-xs font-semibold shadow-inner flex-wrap">
          <button
            onClick={() => setActiveScope('work')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeScope === 'work'
                ? 'bg-surface dark:bg-surface-dark text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span>Work</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {workCount}
            </span>
          </button>

          <button
            onClick={() => setActiveScope('personal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeScope === 'personal'
                ? 'bg-surface dark:bg-surface-dark text-purple-600 dark:text-purple-400 shadow-xs font-bold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <User className="w-3.5 h-3.5 text-purple-500" />
            <span>Personal</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {personalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveScope('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeScope === 'all'
                ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs font-bold'
                : 'text-ink-muted hover:text-ink-primary'
            }`}
          >
            <span>All</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/10 text-ink-muted">
              {totalCount}
            </span>
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => openCreateModal('todo')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* ─── Stats KPI Row ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
        <div
          onClick={() => setFilterPreset('all')}
          className="p-3 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark flex items-center justify-between cursor-pointer hover:border-brand-primary/40 transition shadow-xs"
        >
          <div>
            <div className="text-lg font-bold text-ink-primary dark:text-ink-darkPrimary">
              {totalCount}
            </div>
            <div className="text-[11px] text-ink-muted">Total Tasks</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
            <CheckSquare className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => {
            setFilterPreset('all');
            setViewMode('board');
          }}
          className="p-3 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition shadow-xs"
        >
          <div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {inProgressCount}
            </div>
            <div className="text-[11px] text-ink-muted">In Progress</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <PlayCircle className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => setFilterPreset('overdue')}
          className="p-3 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark flex items-center justify-between cursor-pointer hover:border-rose-500/40 transition shadow-xs"
        >
          <div>
            <div
              className={`text-lg font-bold ${
                overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-ink-primary dark:text-ink-darkPrimary'
              }`}
            >
              {overdueCount}
            </div>
            <div className="text-[11px] text-ink-muted">Overdue</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div
          onClick={() => setFilterPreset('completed')}
          className="p-3 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition shadow-xs"
        >
          <div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {completedCount}{' '}
              <span className="text-xs font-normal text-ink-muted">({completionPct}%)</span>
            </div>
            <div className="text-[11px] text-ink-muted">Completed</div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ─── Quick Add Omnibar ─── */}
      <form
        onSubmit={handleQuickAdd}
        className="flex items-center gap-2 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle p-2.5 rounded-2xl shadow-xs flex-wrap"
      >
        <span className="text-amber-500 font-bold pl-1 text-sm">⚡</span>
        <input
          type="text"
          placeholder={`Quick add ${activeScope === 'personal' ? 'personal' : 'work'} task... (Press Enter)`}
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          className="flex-1 min-w-[200px] px-2 py-1 rounded-xl text-xs bg-transparent outline-none text-ink-primary dark:text-ink-darkPrimary placeholder:text-ink-muted"
        />

        {/* Scope selector */}
        <select
          value={quickScope}
          onChange={(e) => setQuickScope(e.target.value as TaskScope)}
          className="px-2 py-1 rounded-lg text-xs bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle text-ink-secondary outline-none font-medium"
        >
          <option value="work">💼 Work</option>
          <option value="personal">👤 Personal</option>
        </select>

        {/* Priority selector */}
        <select
          value={quickPriority}
          onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
          className="px-2 py-1 rounded-lg text-xs bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle text-ink-secondary outline-none font-medium"
        >
          <option value="p1">🔴 P1 Urgent</option>
          <option value="p2">🟠 P2 High</option>
          <option value="p3">🔵 P3 Normal</option>
          <option value="p4">⚪ P4 Low</option>
        </select>

        {/* Due Date Shortcut */}
        <select
          value={quickDueDate}
          onChange={(e) => setQuickDueDate(e.target.value)}
          className="px-2 py-1 rounded-lg text-xs bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle text-ink-secondary outline-none font-medium"
        >
          <option value="">📅 No Date</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="next_week">Next Week</option>
        </select>

        {/* Project Selector */}
        <select
          value={quickProjectId}
          onChange={(e) => setQuickProjectId(e.target.value)}
          className="px-2 py-1 rounded-lg text-xs bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle text-ink-secondary outline-none font-medium max-w-[140px] truncate"
        >
          <option value="">📁 No Project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="px-3 py-1 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition disabled:opacity-50"
        >
          + Add
        </button>
      </form>

      {/* ─── Controls & Filter Toolbar ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        {/* View Mode Switcher + Smart Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode */}
          <div className="flex items-center p-0.5 rounded-xl bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle font-semibold">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'board'
                  ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                viewMode === 'matrix'
                  ? 'bg-surface dark:bg-surface-dark text-brand-primary shadow-xs font-bold'
                  : 'text-ink-muted hover:text-ink-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
          </div>

          {/* Smart Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterPreset('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterPreset === 'all'
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'bg-surface dark:bg-surface-dark border border-border-subtle text-ink-muted hover:text-ink-primary'
              }`}
            >
              All ({filteredTodos.length})
            </button>
            <button
              onClick={() => setFilterPreset('today')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterPreset === 'today'
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'bg-surface dark:bg-surface-dark border border-border-subtle text-ink-muted hover:text-ink-primary'
              }`}
            >
              ⚡ Today
            </button>
            <button
              onClick={() => setFilterPreset('upcoming')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterPreset === 'upcoming'
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'bg-surface dark:bg-surface-dark border border-border-subtle text-ink-muted hover:text-ink-primary'
              }`}
            >
              📅 Upcoming
            </button>
            <button
              onClick={() => setFilterPreset('priority')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterPreset === 'priority'
                  ? 'bg-brand-primary text-white font-semibold'
                  : 'bg-surface dark:bg-surface-dark border border-border-subtle text-ink-muted hover:text-ink-primary'
              }`}
            >
              🔴 High Priority
            </button>
            <button
              onClick={() => setFilterPreset('overdue')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterPreset === 'overdue'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'bg-surface dark:bg-surface-dark border border-border-subtle text-ink-muted hover:text-rose-500'
              }`}
            >
              ⚠️ Overdue ({overdueCount})
            </button>
            <button
              onClick={() => setFilterPreset('completed')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filterPreset === 'completed'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-surface dark:bg-surface-dark border border-border-subtle text-ink-muted hover:text-emerald-500'
              }`}
            >
              ✅ Completed
            </button>
          </div>
        </div>

        {/* Project Filter & Search omnibar */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-ink-secondary dark:text-ink-darkSecondary text-xs outline-none"
          >
            <option value="all">📁 All Projects</option>
            <option value="none">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-ink-muted" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-6 py-1.5 rounded-xl text-xs border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 w-36 md:w-48 text-ink-primary dark:text-ink-darkPrimary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-ink-muted hover:text-ink-primary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Main Content Display: Kanban Board vs List vs Matrix ─── */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {viewMode === 'board' ? (
          /* ══════════════════════════════════════════════════════════════════
             KANBAN BOARD VIEW (4 COLUMNS: To Do, In Progress, Review, Done)
             ══════════════════════════════════════════════════════════════════ */
          <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pb-3 pt-1 px-1 items-start">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTodos.filter((t) => {
                if (col.id === 'done') return t.completed || t.status === 'done';
                if (col.id === 'todo') return !t.completed && (!t.status || t.status === 'todo');
                return !t.completed && t.status === col.id;
              });

              // Sort tasks in column: P1 -> P4, then due date, then created date
              colTasks.sort((a, b) => {
                const pMap: Record<string, number> = { p1: 1, high: 1, p2: 2, medium: 2, p3: 3, low: 3, p4: 4 };
                const pA = pMap[a.priority || 'p3'] || 3;
                const pB = pMap[b.priority || 'p3'] || 3;
                if (pA !== pB) return pA - pB;
                if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });

              const Icon = col.icon;

              return (
                <div
                  key={col.id}
                  className="w-80 min-w-[300px] max-w-[340px] flex-shrink-0 flex flex-col h-[calc(100vh-250px)] max-h-[calc(100vh-250px)] bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-xs overflow-hidden transition-all"
                  style={{ borderTop: `4px solid ${col.color}` }}
                >
                  {/* Column Header */}
                  <div className="p-3 border-b border-border-subtle dark:border-border-darkSubtle bg-surface-subtle/50 dark:bg-surface-subtleDark/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${col.color}20`, color: col.color }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">
                        {col.title}
                      </h3>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-surface dark:bg-surface-dark border border-border-subtle/50 text-ink-muted">
                        {colTasks.length}
                      </span>
                    </div>

                    <button
                      onClick={() => openCreateModal(col.id)}
                      className="p-1 rounded-lg text-ink-muted hover:text-brand-primary hover:bg-surface dark:hover:bg-surface-dark transition"
                      title={`Add task to ${col.title}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Scrollable Column Body */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0 bg-canvas-subtle/10 dark:bg-canvas-darkSubtle/10">
                    {colTasks.length === 0 ? (
                      <div className="text-center py-12 px-3 text-ink-muted text-xs">
                        <Circle className="w-6 h-6 mx-auto mb-2 opacity-20 text-ink-muted" />
                        <p className="font-semibold text-ink-primary dark:text-ink-darkPrimary">
                          No tasks in {col.title}
                        </p>
                        <button
                          onClick={() => openCreateModal(col.id)}
                          className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-brand-primary/10 text-brand-primary text-[11px] font-semibold hover:bg-brand-primary/20 transition"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Task</span>
                        </button>
                      </div>
                    ) : (
                      colTasks.map((todo) => renderTaskCard(todo))
                    )}
                  </div>

                  {/* Quick Add footer button */}
                  <div className="p-2 border-t border-border-subtle dark:border-border-darkSubtle bg-surface-subtle/30">
                    <button
                      onClick={() => openCreateModal(col.id)}
                      className="w-full py-1.5 px-2 rounded-xl text-xs font-semibold text-ink-secondary dark:text-ink-darkSecondary hover:text-brand-primary hover:bg-surface dark:hover:bg-surface-dark transition flex items-center justify-center gap-1.5 border border-dashed border-border-subtle hover:border-brand-primary/40"
                    >
                      <Plus className="w-3.5 h-3.5 text-brand-primary" />
                      <span>Add Task</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'list' ? (
          /* ══════════════════════════════════════════════════════════════════
             LIST VIEW
             ══════════════════════════════════════════════════════════════════ */
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredTodos.length === 0 ? (
              <div className="p-12 text-center text-xs text-ink-muted border border-dashed border-border-subtle rounded-2xl bg-surface/50">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 text-brand-primary opacity-40" />
                <p className="font-bold text-ink-primary text-sm">No tasks matching current filters</p>
              </div>
            ) : (
              filteredTodos.map((todo) => renderTaskCard(todo))
            )}
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════════════
             EISENHOWER MATRIX VIEW (2x2 GRID)
             ══════════════════════════════════════════════════════════════════ */
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Q1: Do First (Urgent & Important) */}
            <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex flex-col h-80">
              <div className="flex items-center justify-between pb-2 border-b border-rose-500/20 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <Flame className="w-4 h-4" />
                  <span>DO FIRST (Urgent &amp; Important)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600">
                  {filteredTodos.filter((t) => t.urgent && t.important && !t.completed).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredTodos
                  .filter((t) => t.urgent && t.important)
                  .map((todo) => renderTaskCard(todo))}
              </div>
            </div>

            {/* Q2: Schedule (Not Urgent & Important) */}
            <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 flex flex-col h-80">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-500/20 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-4 h-4" />
                  <span>SCHEDULE (Not Urgent, Important)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600">
                  {filteredTodos.filter((t) => !t.urgent && t.important && !t.completed).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredTodos
                  .filter((t) => !t.urgent && t.important)
                  .map((todo) => renderTaskCard(todo))}
              </div>
            </div>

            {/* Q3: Delegate (Urgent, Not Important) */}
            <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col h-80">
              <div className="flex items-center justify-between pb-2 border-b border-amber-500/20 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <User className="w-4 h-4" />
                  <span>DELEGATE (Urgent, Not Important)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                  {filteredTodos.filter((t) => t.urgent && !t.important && !t.completed).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredTodos
                  .filter((t) => t.urgent && !t.important)
                  .map((todo) => renderTaskCard(todo))}
              </div>
            </div>

            {/* Q4: Eliminate (Not Urgent & Not Important) */}
            <div className="p-4 rounded-2xl border border-slate-500/30 bg-slate-500/5 flex flex-col h-80">
              <div className="flex items-center justify-between pb-2 border-b border-slate-500/20 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <Trash2 className="w-4 h-4" />
                  <span>ELIMINATE (Not Urgent, Not Important)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600">
                  {filteredTodos.filter((t) => !t.urgent && !t.important && !t.completed).length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredTodos
                  .filter((t) => !t.urgent && !t.important)
                  .map((todo) => renderTaskCard(todo))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Task Create / Edit Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] text-ink-primary dark:text-ink-darkPrimary animate-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle dark:border-border-darkSubtle mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-brand-primary" />
                <span>{editingTodo ? 'Edit Task' : 'Create New Task'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-ink-muted hover:text-ink-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveModal} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
              {/* Scope Switcher (Work vs Personal) */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Scope (Work vs Personal)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalScope('work')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl font-bold border transition ${
                      modalScope === 'work'
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/40 shadow-xs'
                        : 'bg-surface-subtle dark:bg-surface-subtleDark border-border-subtle text-ink-muted'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>💼 Work</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalScope('personal')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl font-bold border transition ${
                      modalScope === 'personal'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/40 shadow-xs'
                        : 'bg-surface-subtle dark:bg-surface-subtleDark border-border-subtle text-ink-muted'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>👤 Personal</span>
                  </button>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prepare architectural diagram for Q4..."
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-xs font-semibold"
                />
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Kanban Status
                  </label>
                  <select
                    value={modalStatus}
                    onChange={(e) => setModalStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="blocked">In Review / Blocked</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Priority
                  </label>
                  <select
                    value={modalPriority}
                    onChange={(e) => setModalPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                  >
                    <option value="p1">🔴 P1 - Urgent &amp; Critical</option>
                    <option value="p2">🟠 P2 - High Priority</option>
                    <option value="p3">🔵 P3 - Normal / Medium</option>
                    <option value="p4">⚪ P4 - Low / Backlog</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Project */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={modalDueDate}
                    onChange={(e) => setModalDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                    Assign Project
                  </label>
                  <select
                    value={modalProjectId}
                    onChange={(e) => setModalProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                  >
                    <option value="">-- No Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Description &amp; Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Add details, criteria, or context..."
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 leading-relaxed"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Engineering, Architecture, Client"
                  value={modalTags}
                  onChange={(e) => setModalTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none"
                />
              </div>

              {/* Subtasks Builder */}
              <div className="pt-2 border-t border-border-subtle/60">
                <label className="block text-[11px] font-bold text-ink-primary dark:text-ink-darkPrimary mb-1.5">
                  Subtasks &amp; Action Checklist ({modalSubtasks.length})
                </label>

                <div className="space-y-1.5 mb-2 max-h-32 overflow-y-auto">
                  {modalSubtasks.map((st, i) => (
                    <div
                      key={st.id || i}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle/50 text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() =>
                            setModalSubtasks((prev) =>
                              prev.map((s, idx) =>
                                idx === i ? { ...s, completed: !s.completed } : s
                              )
                            )
                          }
                          className="rounded text-brand-primary"
                        />
                        <span className={st.completed ? 'line-through text-ink-muted' : ''}>
                          {st.text}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setModalSubtasks((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="text-ink-muted hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New checklist step..."
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newSubtaskInput.trim()) {
                          setModalSubtasks((prev) => [
                            ...prev,
                            {
                              id: `st-${Date.now()}`,
                              text: newSubtaskInput.trim(),
                              completed: false,
                            },
                          ]);
                          setNewSubtaskInput('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSubtaskInput.trim()) {
                        setModalSubtasks((prev) => [
                          ...prev,
                          {
                            id: `st-${Date.now()}`,
                            text: newSubtaskInput.trim(),
                            completed: false,
                          },
                        ]);
                        setNewSubtaskInput('');
                      }
                    }}
                    disabled={!newSubtaskInput.trim()}
                    className="px-3 py-1.5 rounded-lg bg-surface dark:bg-surface-dark border border-border-subtle font-semibold hover:border-brand-primary disabled:opacity-50 text-xs"
                  >
                    + Add Step
                  </button>
                </div>
              </div>

              {/* Eisenhower Matrix Toggles */}
              <div className="flex items-center gap-6 pt-2 border-t border-border-subtle/60 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={modalUrgent}
                    onChange={(e) => setModalUrgent(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-0"
                  />
                  <span>Urgent (Needs immediate action)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={modalImportant}
                    onChange={(e) => setModalImportant(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Important (High strategic value)</span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-border-subtle dark:border-border-darkSubtle flex items-center justify-between gap-2">
                {editingTodo ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this task permanently?')) {
                        deleteTodo(editingTodo.id);
                        setIsModalOpen(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition"
                  >
                    Delete Task
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl border border-border-subtle text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!modalTitle.trim()}
                    className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs disabled:opacity-50"
                  >
                    {editingTodo ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
