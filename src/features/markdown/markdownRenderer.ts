import { sanitizeHtml } from '../../lib/sanitize';
import { db } from '../../db/db';

interface RenderOptions {
  notebookId?: string;
  onTaskToggle?: (lineIndex: number, newChecked: boolean) => void;
  onWikiLinkClick?: (pageTitle: string) => void;
}

/**
 * Resolves relative attachment paths (e.g. ../_attachments/xyz.png) to cached Blob object URLs
 */
const attachmentUrlCache = new Map<string, string>();

export async function resolveAttachmentUrl(notebookId: string, relativePath: string): Promise<string> {
  const cacheKey = `${notebookId}:${relativePath}`;
  if (attachmentUrlCache.has(cacheKey)) {
    return attachmentUrlCache.get(cacheKey)!;
  }

  const filename = relativePath.split('/').pop() || '';
  const att = await db.attachments.where({ notebookId, filename }).first();
  if (att && att.blob) {
    const objUrl = URL.createObjectURL(att.blob);
    attachmentUrlCache.set(cacheKey, objUrl);
    return objUrl;
  }
  return relativePath;
}

/**
 * Comprehensive GitHub-Flavored Markdown to HTML renderer.
 * Supports:
 * - Headings (h1-h6) with clean typography
 * - GitHub style callout alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
 * - Interactive task lists with clickable checkboxes (- [ ] / - [x])
 * - Tables with aligned columns
 * - Syntax styled code blocks with language badge and Copy button
 * - Wiki links [[Page Title]]
 * - Blockquotes
 * - Sanitized against XSS
 */
export function renderMarkdownToHtml(markdown: string, options: RenderOptions = {}): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  let inTable = false;

  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        if (inList) {
          output.push(`</${listType}>`);
          inList = false;
        }
        if (inTable) {
          output.push('</tbody></table></div>');
          inTable = false;
        }
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
        continue;
      } else {
        inCodeBlock = false;
        const codeText = codeBlockLines.join('\n');
        const langBadge = codeBlockLang ? `<span class="px-2 py-0.5 text-xs font-mono font-medium uppercase rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">${escapeHtml(codeBlockLang)}</span>` : '';
        const escapedCode = escapeHtml(codeText);

        output.push(`
          <div class="relative my-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-100 font-mono text-sm group">
            <div class="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700 text-xs text-slate-400">
              ${langBadge}
              <button class="copy-code-btn flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition" data-code="${escapeHtml(codeText)}" title="Copy code">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                <span>Copy</span>
              </button>
            </div>
            <pre class="p-4 overflow-x-auto"><code>${escapedCode}</code></pre>
          </div>
        `);
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Callout Alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
    const calloutMatch = line.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
    if (calloutMatch) {
      if (inList) {
        output.push(`</${listType}>`);
        inList = false;
      }
      const type = calloutMatch[1].toUpperCase();
      let alertClasses = 'border-l-4 p-4 my-4 rounded-r-lg ';
      let icon = '';
      let title = type;

      switch (type) {
        case 'NOTE':
          alertClasses += 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100';
          icon = 'ℹ️';
          break;
        case 'TIP':
          alertClasses += 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100';
          icon = '💡';
          break;
        case 'IMPORTANT':
          alertClasses += 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100';
          icon = '📌';
          break;
        case 'WARNING':
          alertClasses += 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100';
          icon = '⚠️';
          break;
        case 'CAUTION':
          alertClasses += 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100';
          icon = '🛑';
          break;
      }

      // Collect rest of callout block
      const calloutLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('>')) {
        calloutLines.push(lines[j].replace(/^>\s?/, ''));
        j++;
      }
      i = j - 1;

      output.push(`
        <div class="${alertClasses}">
          <div class="flex items-center gap-2 font-semibold text-sm mb-1">
            <span>${icon}</span>
            <span>${title}</span>
          </div>
          <div class="text-sm space-y-1">
            ${calloutLines.map((l) => `<p>${formatInlineSpans(l, options)}</p>`).join('')}
          </div>
        </div>
      `);
      continue;
    }

    // Standard Blockquote (> ...)
    if (line.startsWith('>')) {
      if (inList) {
        output.push(`</${listType}>`);
        inList = false;
      }
      const quoteContent = line.replace(/^>\s?/, '');
      output.push(`
        <blockquote class="border-l-4 border-brand-primary dark:border-brand-darkPrimary bg-slate-50 dark:bg-slate-800/40 pl-4 py-2 my-3 rounded-r italic text-slate-700 dark:text-slate-300">
          ${formatInlineSpans(quoteContent, options)}
        </blockquote>
      `);
      continue;
    }

    // Table Row (| col 1 | col 2 |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (inList) {
        output.push(`</${listType}>`);
        inList = false;
      }

      // Check if it's separator row (|---|---|)
      if (/^\|[\s-:]+\|/.test(line.trim())) {
        continue;
      }

      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      if (!inTable) {
        inTable = true;
        output.push(`
          <div class="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <thead class="bg-slate-100 dark:bg-slate-800/70">
                <tr>
                  ${cells.map((c) => `<th class="px-4 py-2.5 text-left font-semibold text-slate-800 dark:text-slate-200">${formatInlineSpans(c, options)}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
        `);
        continue;
      } else {
        output.push(`
          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
            ${cells.map((c) => `<td class="px-4 py-2 text-slate-700 dark:text-slate-300">${formatInlineSpans(c, options)}</td>`).join('')}
          </tr>
        `);
        continue;
      }
    } else if (inTable) {
      output.push('</tbody></table></div>');
      inTable = false;
    }

    // Headings (#, ##, ###, ####, #####, ######)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      if (inList) {
        output.push(`</${listType}>`);
        inList = false;
      }
      const level = headingMatch[1].length;
      const text = formatInlineSpans(headingMatch[2], options);
      const headingClasses = {
        1: 'text-2xl md:text-3xl font-bold tracking-tight mt-6 mb-3 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2',
        2: 'text-xl md:text-2xl font-semibold tracking-tight mt-5 mb-2 text-slate-900 dark:text-slate-100',
        3: 'text-lg md:text-xl font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-200',
        4: 'text-base font-semibold mt-3 mb-1 text-slate-800 dark:text-slate-200',
        5: 'text-sm font-semibold mt-2 mb-1 text-slate-700 dark:text-slate-300',
        6: 'text-xs font-semibold uppercase tracking-wider mt-2 mb-1 text-slate-500 dark:text-slate-400',
      }[level] || 'text-base font-semibold';

      output.push(`<h${level} class="${headingClasses}">${text}</h${level}>`);
      continue;
    }

    // Task Checklist items (- [ ] or - [x])
    const taskMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      if (inList && listType !== 'ul') {
        output.push(`</${listType}>`);
        inList = false;
      }
      if (!inList) {
        inList = true;
        listType = 'ul';
        output.push('<ul class="my-3 space-y-1.5 list-none pl-0">');
      }

      const checked = taskMatch[2].toLowerCase() === 'x';
      const text = formatInlineSpans(taskMatch[3], options);
      const strikeClass = checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200';

      output.push(`
        <li class="flex items-start gap-2.5 my-1 group">
          <input
            type="checkbox"
            ${checked ? 'checked' : ''}
            data-line="${i}"
            class="task-toggle-checkbox mt-1 h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/20 dark:border-slate-600 dark:bg-slate-800 cursor-pointer transition"
          />
          <span class="flex-1 ${strikeClass}">${text}</span>
        </li>
      `);
      continue;
    }

    // Bullet List (- or *)
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (inList && listType !== 'ul') {
        output.push(`</${listType}>`);
        inList = false;
      }
      if (!inList) {
        inList = true;
        listType = 'ul';
        output.push('<ul class="my-3 space-y-1 list-disc pl-5 text-slate-700 dark:text-slate-300">');
      }
      output.push(`<li>${formatInlineSpans(bulletMatch[2], options)}</li>`);
      continue;
    }

    // Numbered List (1. 2.)
    const numberMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (numberMatch) {
      if (inList && listType !== 'ol') {
        output.push(`</${listType}>`);
        inList = false;
      }
      if (!inList) {
        inList = true;
        listType = 'ol';
        output.push('<ol class="my-3 space-y-1 list-decimal pl-5 text-slate-700 dark:text-slate-300">');
      }
      output.push(`<li>${formatInlineSpans(numberMatch[2], options)}</li>`);
      continue;
    }

    // End list if non-list line
    if (inList) {
      output.push(`</${listType}>`);
      inList = false;
    }

    // Horizontal Rule (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      output.push('<hr class="my-6 border-slate-200 dark:border-slate-800" />');
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      continue;
    }

    // Normal paragraph
    output.push(`<p class="my-2 leading-relaxed text-slate-700 dark:text-slate-300">${formatInlineSpans(line, options)}</p>`);
  }

  // Close lingering tags
  if (inCodeBlock) {
    output.push(`<pre class="p-4 bg-slate-900 text-slate-100 rounded"><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`);
  }
  if (inTable) {
    output.push('</tbody></table></div>');
  }
  if (inList) {
    output.push(`</${listType}>`);
  }

  const rawResult = output.join('\n');
  return sanitizeHtml(rawResult);
}

/**
 * Format inline markdown tokens: bold, italic, strikethrough, inline code, links, images, wiki links
 */
function formatInlineSpans(text: string, _options?: RenderOptions): string {
  let res = escapeHtml(text);

  // Images: ![alt](url)
  res = res.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, url) => {
    return `<img src="${url}" alt="${alt}" class="my-3 rounded-lg max-h-96 w-auto object-contain border border-slate-200 dark:border-slate-700 shadow-sm" loading="lazy" />`;
  });

  // Wiki Links: [[Page Title]]
  res = res.replace(/\[\[(.*?)\]\]/g, (_match, title) => {
    return `<a href="#wiki:${encodeURIComponent(title)}" class="wiki-link inline-flex items-center gap-1 font-medium text-brand-primary dark:text-brand-darkPrimary hover:underline bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded text-xs" data-wiki-title="${title}">
      <svg class="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
      <span>${title}</span>
    </a>`;
  });

  // Links: [text](url)
  res = res.replace(/\[(.*?)\]\((.*?)\)/g, (_match, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-brand-primary dark:text-brand-darkPrimary hover:underline inline-flex items-center gap-0.5">${label}</a>`;
  });

  // Inline Code: `code`
  res = res.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 text-xs font-mono rounded bg-slate-100 dark:bg-slate-800 text-brand-primary dark:text-brand-darkPrimary border border-slate-200 dark:border-slate-700">$1</code>');

  // Bold & Italic: ***text***
  res = res.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold: **text** or __text__
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>');
  res = res.replace(/__(.*?)__/g, '<strong class="font-semibold text-slate-900 dark:text-slate-100">$1</strong>');

  // Italic: *text* or _text_
  res = res.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  res = res.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

  // Strikethrough: ~~text~~
  res = res.replace(/~~(.*?)~~/g, '<del class="line-through text-slate-400 dark:text-slate-500">$1</del>');

  // Highlight mark: ==text==
  res = res.replace(/==(.*?)==/g, '<mark class="bg-amber-200 dark:bg-amber-800/60 dark:text-amber-100 text-amber-900 px-1 rounded">$1</mark>');

  return res;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
