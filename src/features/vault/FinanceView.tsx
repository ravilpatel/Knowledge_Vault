import React, { useState } from 'react';
import { useVaultStore } from './vaultStore';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Receipt,
} from 'lucide-react';

export const FinanceView: React.FC = () => {
  const { expenses, addExpense, deleteExpense } = useVaultStore();

  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [newAmount, setNewAmount] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');
  const [newCategory, setNewCategory] = useState('Software');
  const [newReimbursable, setNewReimbursable] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const categories = [
    'Software',
    'Food',
    'Housing',
    'Utilities',
    'Learning',
    'Travel',
    'Health',
    'Hardware',
    'Consulting',
    'Salary',
    'Other',
  ];

  const totalIncome = expenses
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpense = expenses
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const netBalance = totalIncome - totalExpense;
  const reimbursableTotal = expenses
    .filter((e) => e.reimbursable && e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const filteredExpenses = expenses.filter((e) => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !newDesc.trim()) return;

    await addExpense({
      amount: parsedAmount,
      description: newDesc.trim(),
      type: newType,
      category: newCategory,
      reimbursable: newType === 'expense' ? newReimbursable : false,
      date: newDate,
    });

    setNewAmount('');
    setNewDesc('');
    setIsAdding(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-light dark:bg-canvas-dark overflow-hidden p-3.5 md:p-6 space-y-3.5 md:space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle p-3.5 md:p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base md:text-lg font-bold text-ink-primary dark:text-ink-darkPrimary flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <span>Finance &amp; Expense Tracker</span>
          </h2>
          <p className="text-[11px] md:text-xs text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Monitor cashflow, business expenses, and reimbursable team claims.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-xs self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Transaction</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        {/* Net Balance */}
        <div className="p-4 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-xs">
          <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">
            Net Cashflow
          </span>
          <div
            className={`text-xl font-extrabold ${
              netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(netBalance)}
          </div>
          <span className="text-[10px] text-ink-muted mt-1 block">Income minus expenses</span>
        </div>

        {/* Total Income */}
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/15 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Total Income
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(totalIncome)}
          </div>
          <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-1 block">
            Retainers &amp; revenues
          </span>
        </div>

        {/* Total Expenses */}
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/15 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
              Total Expenses
            </span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-extrabold text-rose-700 dark:text-rose-300">
            {formatCurrency(totalExpense)}
          </div>
          <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70 mt-1 block">
            Tools, cloud, &amp; operations
          </span>
        </div>

        {/* Reimbursable Claims */}
        <div className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/15 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              Reimbursable
            </span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-300">
            {formatCurrency(reimbursableTotal)}
          </div>
          <span className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70 mt-1 block">
            Pending claim submissions
          </span>
        </div>
      </div>

      {/* Add Transaction Form / Modal */}
      {isAdding && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-4 rounded-2xl border border-brand-primary/30 bg-surface dark:bg-surface-dark shadow-md space-y-3 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">
              Add New Transaction
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-ink-muted hover:text-ink-primary"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as 'expense' | 'income')}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary"
              >
                <option value="expense">Expense (-)</option>
                <option value="income">Income (+)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Amount (₹)</label>
              <input
                type="number"
                step="any"
                required
                placeholder="1500"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-ink-muted mb-1">Date</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1">Description</label>
            <input
              type="text"
              required
              placeholder="What was this for?..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {newType === 'expense' ? (
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={newReimbursable}
                  onChange={(e) => setNewReimbursable(e.target.checked)}
                  className="rounded text-brand-primary"
                />
                <span className="text-ink-secondary dark:text-ink-darkSecondary font-medium">
                  Mark as Reimbursable
                </span>
              </label>
            ) : <div />}

            <button
              type="submit"
              disabled={!newAmount || !newDesc.trim()}
              className="px-4 py-1.5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition disabled:opacity-50"
            >
              Save Transaction
            </button>
          </div>
        </form>
      )}

      {/* Transaction List with Filter Bar */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl shadow-xs">
        {/* Filter Bar */}
        <div className="p-3 border-b border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark flex items-center justify-between text-xs gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[11px] font-medium text-ink-muted">Show:</span>
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-xs ${
                filterType === 'all' ? 'bg-brand-primary text-white' : 'text-ink-secondary hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({expenses.length})
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-xs ${
                filterType === 'income' ? 'bg-emerald-600 text-white' : 'text-ink-secondary hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Income
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-xs ${
                filterType === 'expense' ? 'bg-rose-600 text-white' : 'text-ink-secondary hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Expenses
            </button>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2 py-1 rounded-lg border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark text-ink-primary dark:text-ink-darkPrimary text-[11px] outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-ink-muted flex-shrink-0">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'record' : 'records'}
          </div>
        </div>

        {/* List of Transactions */}
        <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/60 dark:divide-border-darkSubtle/60">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center text-xs text-ink-muted">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="font-semibold">No transactions found.</p>
              <p className="text-[11px] mt-1">Add your income and expense receipts above.</p>
            </div>
          ) : (
            filteredExpenses.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                      item.type === 'income'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {item.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-ink-primary dark:text-ink-darkPrimary">
                      {item.description}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink-muted">
                      <span>{item.date}</span>
                      <span>·</span>
                      <span className="font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-ink-secondary dark:text-ink-darkSecondary">
                        {item.category}
                      </span>
                      {item.reimbursable && (
                        <span className="font-semibold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          Reimbursable
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-bold text-sm ${
                      item.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-ink-primary dark:text-ink-darkPrimary'
                    }`}
                  >
                    {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                  </span>

                  <button
                    onClick={() => deleteExpense(item.id)}
                    className="p-1 rounded text-ink-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                    title="Delete record"
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
