import React, { useRef, useState, useEffect } from 'react';
import { useNoteStore } from '../features/notes/noteStore';
import { MarkdownEditor, MarkdownEditorRef } from '../features/editor/MarkdownEditor';
import { PreviewPane } from './PreviewPane';
import { FormattingToolbar } from './FormattingToolbar';
import { calculateReadTime } from '../lib/date';
import {
  Star,
  Columns,
  Edit3,
  Eye,
  Tag as TagIcon,
  X,
  Plus,
  Clock,
  CheckCircle2,
  CloudUpload,
} from 'lucide-react';

interface EditorPaneProps {
  isDark?: boolean;
}

export const EditorPane: React.FC<EditorPaneProps> = ({ isDark = false }) => {
  const {
    pages,
    activePageId,
    viewMode,
    setViewMode,
    updatePageTitle,
    updatePageContent,
    togglePageFavorite,
    setPageTags,
    createPage,
    activeNotebookId,
    activeSectionId,
  } = useNoteStore();

  const activePage = pages.find((p) => p.id === activePageId && !p.trashed);

  const editorRef = useRef<MarkdownEditorRef>(null);
  const [localTitle, setLocalTitle] = useState(activePage?.title || '');
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    uploading: boolean;
    filename?: string;
    progress?: number;
  }>({ uploading: false });

  // Keep local title in sync when active page switches
  useEffect(() => {
    if (activePage) {
      setLocalTitle(activePage.title);
    }
  }, [activePage?.id]);

  if (!activePage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-canvas-light dark:bg-canvas-dark text-ink-muted dark:text-ink-darkMuted">
        <div className="max-w-md w-full p-8 rounded-2xl border border-border-subtle dark:border-border-darkSubtle bg-surface dark:bg-surface-dark shadow-sm">
          <Edit3 className="w-12 h-12 mx-auto mb-3 text-ink-muted/40" />
          <h3 className="text-base font-bold text-ink-primary dark:text-ink-darkPrimary mb-1">
            No Note Selected
          </h3>
          <p className="text-xs text-ink-muted dark:text-ink-darkMuted mb-6 leading-relaxed">
            Select a note from the list on the left, or create a brand new one to start writing.
          </p>
          {activeNotebookId && (
            <button
              onClick={async () => {
                const secId = activeSectionId || 'general';
                const created = await createPage(activeNotebookId, secId, 'Untitled Note', '');
                useNoteStore.getState().setActivePage(created.id);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Page</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { words, minutes } = calculateReadTime(activePage.content);

  const handleTitleBlur = () => {
    const trimmed = localTitle.trim() || 'Untitled Note';
    if (trimmed !== activePage.title) {
      updatePageTitle(activePage.id, trimmed);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = activePage.tags.filter((t) => t !== tagToRemove);
    setPageTags(activePage.id, updated);
  };

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagInput.trim().replace(/^#/, '').toLowerCase();
    if (cleanTag && !activePage.tags.includes(cleanTag)) {
      setPageTags(activePage.id, [...activePage.tags, cleanTag]);
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleInsertFormatting = (prefix: string, suffix?: string, defaultText?: string) => {
    editorRef.current?.insertText(prefix, suffix, defaultText);
  };

  const handleTriggerUpload = () => {
    editorRef.current?.openFilePicker();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface dark:bg-surface-dark overflow-hidden">
      {/* Header Bar */}
      <div className="px-6 py-3.5 border-b border-border-subtle dark:border-border-darkSubtle space-y-3 bg-surface dark:bg-surface-dark flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Note Title & Star */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={() => togglePageFavorite(activePage.id)}
              className={`p-1 rounded-lg transition ${
                activePage.favorite
                  ? 'text-amber-500 hover:text-amber-600'
                  : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
              }`}
              title={activePage.favorite ? 'Favorited' : 'Add to favorites'}
            >
              <Star className={`w-5 h-5 ${activePage.favorite ? 'fill-amber-500' : ''}`} />
            </button>

            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled Note"
              className="text-xl font-bold tracking-tight text-ink-primary dark:text-ink-darkPrimary bg-transparent border-none outline-none w-full placeholder-ink-muted/50"
            />
          </div>

          {/* Right Controls: View Mode & Stats */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Word & Read Time Stats */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-ink-muted dark:text-ink-darkMuted font-medium pr-2 border-r border-border-subtle dark:border-border-darkSubtle">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {words} {words === 1 ? 'word' : 'words'} · {minutes} min read
              </span>
            </div>

            {/* View Mode Segmented Switcher */}
            <div className="flex items-center p-0.5 rounded-lg bg-surface-subtle dark:bg-surface-subtleDark border border-border-subtle dark:border-border-darkSubtle text-xs font-semibold">
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'edit'
                    ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary'
                }`}
                title="Source Markdown Editor"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>

              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'split'
                    ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary'
                }`}
                title="Split Editor & Live Preview"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>

              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition ${
                  viewMode === 'preview'
                    ? 'bg-surface dark:bg-surface-dark text-brand-primary dark:text-brand-darkPrimary shadow-xs font-bold'
                    : 'text-ink-muted hover:text-ink-primary dark:text-ink-darkMuted dark:hover:text-ink-darkPrimary'
                }`}
                title="Full Preview"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tags Bar */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <TagIcon className="w-3.5 h-3.5 text-ink-muted dark:text-ink-darkMuted mr-1" />

          {activePage.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-light dark:bg-brand-primary/15 text-brand-primary dark:text-brand-darkPrimary font-medium text-[11px]"
            >
              #{tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-rose-500 rounded p-0.5 transition"
                title="Remove tag"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {isAddingTag ? (
            <form onSubmit={handleAddTagSubmit} className="inline-flex items-center">
              <input
                type="text"
                autoFocus
                placeholder="tag name..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onBlur={() => {
                  if (!newTagInput.trim()) setIsAddingTag(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsAddingTag(false);
                }}
                className="h-6 px-2 text-[11px] rounded border border-brand-primary outline-none bg-surface dark:bg-surface-dark text-ink-primary dark:text-ink-darkPrimary w-24"
              />
            </form>
          ) : (
            <button
              onClick={() => setIsAddingTag(true)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] text-ink-muted hover:text-brand-primary dark:text-ink-darkMuted dark:hover:text-brand-darkPrimary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Add Tag"
            >
              <Plus className="w-3 h-3" />
              <span>Add tag</span>
            </button>
          )}

          {/* Sync indicator */}
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-muted dark:text-ink-darkMuted">
            {activePage.localDirty ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <CloudUpload className="w-3 h-3 animate-pulse" />
                <span>Pending sync</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>Saved</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Formatting Toolbar (Visible in edit or split mode) */}
      {viewMode !== 'preview' && (
        <FormattingToolbar
          onInsertMarkdown={handleInsertFormatting}
          onUploadClick={handleTriggerUpload}
        />
      )}

      {/* Upload Progress Bar */}
      {uploadProgress.uploading && (
        <div className="bg-brand-light dark:bg-brand-primary/10 border-b border-brand-primary/20 px-4 py-1.5 text-xs text-brand-primary dark:text-brand-darkPrimary flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-3.5 h-3.5 animate-spin" />
            <span>Uploading {uploadProgress.filename}...</span>
          </div>
          <span className="font-semibold">{uploadProgress.progress}%</span>
        </div>
      )}

      {/* Editor & Preview Panes */}
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'edit' && (
          <div className="flex-1 h-full overflow-hidden">
            <MarkdownEditor
              ref={editorRef}
              value={activePage.content}
              onChange={(newContent) => updatePageContent(activePage.id, newContent)}
              notebookId={activePage.notebookId}
              isDark={isDark}
              onUploadProgress={setUploadProgress}
            />
          </div>
        )}

        {viewMode === 'split' && (
          <>
            <div className="flex-1 h-full overflow-hidden border-r border-border-subtle dark:border-border-darkSubtle">
              <MarkdownEditor
                ref={editorRef}
                value={activePage.content}
                onChange={(newContent) => updatePageContent(activePage.id, newContent)}
                notebookId={activePage.notebookId}
                isDark={isDark}
                onUploadProgress={setUploadProgress}
              />
            </div>
            <div className="flex-1 h-full overflow-hidden bg-surface dark:bg-surface-dark">
              <PreviewPane
                content={activePage.content}
                notebookId={activePage.notebookId}
                pageId={activePage.id}
              />
            </div>
          </>
        )}

        {viewMode === 'preview' && (
          <div className="flex-1 h-full overflow-hidden">
            <PreviewPane
              content={activePage.content}
              notebookId={activePage.notebookId}
              pageId={activePage.id}
            />
          </div>
        )}
      </div>
    </div>
  );
};
