import React, { useState } from 'react';
import { useVaultStore } from './vaultStore';
import {
  Flame,
  Plus,
  Check,
  Sparkles,
  Trash2,
} from 'lucide-react';

export const HabitsView: React.FC = () => {
  const { habits, addHabit, toggleHabitDate, deleteHabit } = useVaultStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Productivity');
  const [newColor, setNewColor] = useState('#4F46E5');

  // Compute 7 days up to today
  const last7Days: { dateStr: string; label: string; dayName: string; isToday: boolean }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString([], { weekday: 'short' });
    const label = d.getDate().toString();
    last7Days.push({
      dateStr,
      label,
      dayName,
      isToday: i === 0,
    });
  }

  const todayStr = last7Days[6].dateStr;
  const totalHabits = habits.length;
  const completedToday = habits.filter((h) => (h.completedDates || []).includes(todayStr)).length;
  const todayPct = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
  const totalStreaks = habits.reduce((acc, h) => acc + (h.streak || 0), 0);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await addHabit({
      title: newTitle.trim(),
      category: newCategory,
      frequency: 'daily',
      color: newColor,
    });

    setNewTitle('');
    setIsAdding(false);
  };

  const categories = ['Productivity', 'Fitness', 'Health', 'Learning', 'Mindset', 'Finance', 'Personal'];
  const colors = ['#4F46E5', '#10B981', '#F59E0B', '#E11D48', '#0284C7', '#8B5CF6'];

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-light dark:bg-canvas-dark overflow-y-auto md:overflow-hidden p-3.5 md:p-6 space-y-3.5 md:space-y-5 pb-24 md:pb-6 touch-pan-y">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle p-3.5 md:p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base md:text-lg font-bold text-ink-primary dark:text-ink-darkPrimary flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <span>Habit Tracker &amp; Daily Streaks</span>
          </h2>
          <p className="text-[11px] md:text-xs text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Atomic consistency builds compounded results over time.
          </p>
        </div>

        <div className="flex items-center gap-3 md:gap-4 text-xs font-semibold flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-20 md:w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${todayPct}%` }}
              />
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] md:text-xs">
              {completedToday}/{totalHabits} Today ({todayPct}%)
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] md:text-xs">
            <Flame className="w-3.5 h-3.5" />
            <span>{totalStreaks} Active Streak Days</span>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs ml-auto md:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>
      </div>

      {/* Quick Add Modal */}
      {isAdding && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-4 rounded-2xl border border-brand-primary/30 bg-surface dark:bg-surface-dark shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">Create Habit</h4>
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
            placeholder="Habit title (e.g. 30m reading, 10k steps, mediation)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark outline-none focus:ring-2 focus:ring-brand-primary/20 text-ink-primary dark:text-ink-darkPrimary"
          />

          <div className="flex items-center gap-4 flex-wrap text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-ink-muted">Category:</span>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-2 py-1 text-xs rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-ink-muted">Color:</span>
              <div className="flex gap-1.5">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full border transition ${
                      newColor === c ? 'ring-2 ring-brand-primary ring-offset-2 scale-110' : 'opacity-80'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="ml-auto px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition disabled:opacity-50"
            >
              Save Habit
            </button>
          </div>
        </form>
      )}

      {/* Habits Grid with 7-Day Checklist */}
      <div className="flex-1 overflow-x-auto overflow-y-auto touch-pan-x touch-pan-y bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-xs divide-y divide-border-subtle/60 dark:divide-border-darkSubtle/60">
        <div className="min-w-[480px]">
          {/* Table Header: Days of Week */}
          <div className="flex items-center justify-between p-3.5 md:p-4 bg-surface-subtle dark:bg-surface-subtleDark text-xs font-bold text-ink-muted select-none">
            <div className="w-1/3">Habit Name</div>
            <div className="flex items-center justify-end gap-3 flex-1">
              {last7Days.map((day) => (
              <div
                key={day.dateStr}
                className={`w-9 text-center ${
                  day.isToday ? 'text-brand-primary dark:text-brand-darkPrimary font-extrabold' : ''
                }`}
              >
                <div className="text-[10px] uppercase">{day.dayName}</div>
                <div className="text-xs">{day.label}</div>
              </div>
            ))}
            <div className="w-20 text-center pl-2">Streak</div>
            <div className="w-8"></div>
          </div>
        </div>

        {/* Habit Rows */}
        {habits.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-60" />
            <p className="font-semibold">No habits tracked yet.</p>
            <p className="text-[11px] mt-1">Create your first habit to start building streaks.</p>
          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className="group flex items-center justify-between p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition text-xs"
            >
              {/* Left Info */}
              <div className="w-1/3 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />
                  <h4 className="font-semibold text-ink-primary dark:text-ink-darkPrimary truncate">
                    {habit.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-ink-muted font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                    {habit.category}
                  </span>
                  {habit.description && (
                    <span className="text-[10px] text-ink-muted truncate max-w-[150px]">
                      {habit.description}
                    </span>
                  )}
                </div>
              </div>

              {/* 7-Day Checkoff Circles */}
              <div className="flex items-center justify-end gap-3 flex-1">
                {last7Days.map((day) => {
                  const isDone = (habit.completedDates || []).includes(day.dateStr);

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => toggleHabitDate(habit.id, day.dateStr)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                        isDone
                          ? 'text-white shadow-xs font-bold scale-105'
                          : 'border border-border-subtle dark:border-border-darkSubtle hover:border-brand-primary/50 text-transparent'
                      } ${day.isToday && !isDone ? 'ring-2 ring-brand-primary/30' : ''}`}
                      style={{
                        backgroundColor: isDone ? habit.color : 'transparent',
                      }}
                      title={`${day.dateStr}: ${isDone ? 'Completed' : 'Click to complete'}`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>
                  );
                })}

                {/* Streak Badge */}
                <div className="w-20 text-center pl-2">
                  <div className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>{habit.streak}d</span>
                  </div>
                  <div className="text-[10px] text-ink-muted">Best {habit.bestStreak}d</div>
                </div>

                {/* Delete Action */}
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="w-8 p-1.5 rounded text-ink-muted hover:text-rose-500 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition text-center"
                  title="Delete habit"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
        </div>
      </div>
    </div>
  );
};
