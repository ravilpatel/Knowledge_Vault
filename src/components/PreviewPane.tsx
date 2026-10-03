import React, { useEffect, useRef, useState } from 'react';
import { renderMarkdownToHtml, resolveAttachmentUrl } from '../features/markdown/markdownRenderer';
import { useNoteStore } from '../features/notes/noteStore';

interface PreviewPaneProps {
  content: string;
  notebookId: string;
  pageId: string;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  content,
  notebookId,
  pageId,
  onScroll,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { pages, setActivePage, createPage, activeSectionId, updatePageContent } = useNoteStore();
  const [renderedHtml, setRenderedHtml] = useState<string>('');

  // Handle task checkbox toggle in Markdown content
  const handleTaskToggle = (lineIndex: number, newChecked: boolean) => {
    const lines = content.split(/\r?\n/);
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      if (newChecked) {
        lines[lineIndex] = line.replace(/^(\s*[-*+]\s+)\[ \]/, '$1[x]');
      } else {
        lines[lineIndex] = line.replace(/^(\s*[-*+]\s+)\[[xX]\]/, '$1[ ]');
      }
      updatePageContent(pageId, lines.join('\n'));
    }
  };

  // Handle wiki link clicks [[Target Title]]
  const handleWikiLinkClick = async (title: string) => {
    const existing = pages.find(
      (p) => !p.trashed && p.title.trim().toLowerCase() === title.trim().toLowerCase()
    );
    if (existing) {
      setActivePage(existing.id);
    } else {
      if (
        confirm(
          `Page "${title}" does not exist yet. Would you like to create it in the current section?`
        )
      ) {
        const secId = activeSectionId || 'general';
        const newPage = await createPage(
          notebookId,
          secId,
          title,
          `# ${title}\n\nCreated from link.`
        );
        setActivePage(newPage.id);
      }
    }
  };

  // Generate initial HTML
  useEffect(() => {
    let rawHtml = renderMarkdownToHtml(content, {
      notebookId,
      onTaskToggle: handleTaskToggle,
      onWikiLinkClick: handleWikiLinkClick,
    });

    // Replace relative attachment URLs ../_attachments/xyz with cached object URLs if available
    const replaceAsyncUrls = async () => {
      const imgRegex = /src="(\.\.\/_attachments\/[^"]+)"/g;
      const matches = Array.from(rawHtml.matchAll(imgRegex));

      if (matches.length > 0) {
        for (const match of matches) {
          const originalSrc = match[1];
          const resolvedSrc = await resolveAttachmentUrl(notebookId, originalSrc);
          rawHtml = rawHtml.replace(`src="${originalSrc}"`, `src="${resolvedSrc}"`);
        }
      }
      setRenderedHtml(rawHtml);
    };

    replaceAsyncUrls();
  }, [content, notebookId, pageId]);

  // Handle DOM events: task checkboxes, wiki links, and code copy buttons
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Checkbox toggle
    if (target.matches('input[type="checkbox"][data-line-index]')) {
      const checkbox = target as HTMLInputElement;
      const lineIndex = parseInt(checkbox.getAttribute('data-line-index') || '-1', 10);
      if (lineIndex >= 0) {
        handleTaskToggle(lineIndex, checkbox.checked);
      }
      return;
    }

    // Wiki link click
    const wikiLink = target.closest('a[data-wiki-link]');
    if (wikiLink) {
      e.preventDefault();
      const pageTitle = wikiLink.getAttribute('data-wiki-link') || '';
      if (pageTitle) {
        handleWikiLinkClick(pageTitle);
      }
      return;
    }

    // Code copy button click
    const copyBtn = target.closest('button[data-code-copy]');
    if (copyBtn) {
      e.preventDefault();
      const codeId = copyBtn.getAttribute('data-code-copy');
      if (codeId) {
        const preEl = containerRef.current?.querySelector(`pre#${codeId} code`);
        if (preEl) {
          navigator.clipboard.writeText(preEl.textContent || '');
          copyBtn.innerHTML =
            '<svg class="w-3.5 h-3.5 text-emerald-500 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> <span class="text-emerald-500 text-[10px]">Copied</span>';
          setTimeout(() => {
            copyBtn.innerHTML =
              '<svg class="w-3.5 h-3.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> <span class="text-[10px]">Copy</span>';
          }, 2000);
        }
      }
      return;
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={(e) => {
        if (onScroll) {
          const dom = e.currentTarget;
          onScroll(dom.scrollTop, dom.scrollHeight, dom.clientHeight);
        }
      }}
      onClick={handleContainerClick}
      className="h-full w-full overflow-y-auto px-8 py-6 bg-surface dark:bg-surface-dark text-ink-primary dark:text-ink-darkPrimary focus:outline-none selection:bg-brand-primary/20 selection:text-brand-primary"
    >
      <div
        className="max-w-3xl mx-auto space-y-4 markdown-rendered"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
};
