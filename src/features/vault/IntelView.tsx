import React, { useState } from 'react';
import { useVaultStore } from './vaultStore';
import {
  Globe,
  ExternalLink,
  Search,
  BookmarkCheck,
  Bookmark,
  Building2,
  Rocket,
  Cpu,
  FileText,
} from 'lucide-react';

export const IntelView: React.FC = () => {
  const { news, toggleNewsRead } = useVaultStore();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNews = news.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSourceIcon = (category: string) => {
    switch (category) {
      case 'policy':
        return <Building2 className="w-3.5 h-3.5 text-blue-500" />;
      case 'startup':
        return <Rocket className="w-3.5 h-3.5 text-amber-500" />;
      case 'tech':
        return <Cpu className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas-light dark:bg-canvas-dark overflow-hidden p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-ink-primary dark:text-ink-darkPrimary flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <span>Intel Gathering &amp; Policy Feeds</span>
          </h2>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted mt-0.5">
            Curated updates from PIB India, Startup India, and Tech policy directives.
          </p>
        </div>

        {/* Search omnibar */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-ink-muted" />
          <input
            type="text"
            placeholder="Search intel &amp; policy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border-subtle dark:border-border-darkSubtle bg-surface-subtle dark:bg-surface-subtleDark text-ink-primary dark:text-ink-darkPrimary outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            activeCategory === 'all'
              ? 'bg-brand-primary text-white shadow-xs'
              : 'bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle text-ink-secondary hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          All Feeds ({news.length})
        </button>
        <button
          onClick={() => setActiveCategory('policy')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            activeCategory === 'policy'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle text-ink-secondary hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          PIB &amp; Policy
        </button>
        <button
          onClick={() => setActiveCategory('startup')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            activeCategory === 'startup'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle text-ink-secondary hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Startup India
        </button>
        <button
          onClick={() => setActiveCategory('tech')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition ${
            activeCategory === 'tech'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle text-ink-secondary hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Tech &amp; AI
        </button>
      </div>

      {/* News Cards Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredNews.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted bg-surface dark:bg-surface-dark border border-border-subtle dark:border-border-darkSubtle rounded-2xl">
            <Globe className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-500" />
            <p className="font-semibold">No intel items match your filter.</p>
            <p className="text-[11px] mt-1">Try another category or clear search terms.</p>
          </div>
        ) : (
          filteredNews.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all ${
                item.isRead
                  ? 'bg-surface/60 dark:bg-surface-dark/60 border-border-subtle/50 dark:border-border-darkSubtle/50 opacity-75'
                  : 'bg-surface dark:bg-surface-dark border-border-subtle dark:border-border-darkSubtle shadow-xs hover:border-brand-primary/40'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800">
                    {getSourceIcon(item.category)}
                  </div>
                  <span className="text-xs font-bold text-ink-primary dark:text-ink-darkPrimary">
                    {item.source}
                  </span>
                  <span className="text-[10px] text-ink-muted">·</span>
                  <span className="text-[10px] text-ink-muted font-medium uppercase tracking-wide">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleNewsRead(item.id)}
                    className={`p-1 rounded-lg text-xs transition ${
                      item.isRead
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-ink-muted hover:text-ink-primary'
                    }`}
                    title={item.isRead ? 'Mark as Unread' : 'Mark as Read'}
                  >
                    {item.isRead ? (
                      <BookmarkCheck className="w-4 h-4 fill-emerald-500/20" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 rounded-lg text-ink-muted hover:text-brand-primary transition"
                    title="Open Source URL"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <h3 className="text-sm font-bold text-ink-primary dark:text-ink-darkPrimary mt-2 leading-snug">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brand-primary transition"
                >
                  {item.title}
                </a>
              </h3>

              <p className="text-xs text-ink-secondary dark:text-ink-darkSecondary mt-1.5 leading-relaxed">
                {item.summary}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
