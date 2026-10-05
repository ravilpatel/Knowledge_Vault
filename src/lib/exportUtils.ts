import { NotebookRecord, SectionRecord, PageRecord } from '../types';
import { renderMarkdownToHtml } from '../features/markdown/markdownRenderer';

export interface NotebookExportOptions {
  includeToc?: boolean;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  sectionIds?: string[];
}

export interface PageExportOptions {
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
}

/**
 * Sanitizes a string for use as a filename
 */
export function sanitizeFilename(name: string, extension: string = ''): string {
  const clean = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const base = clean || 'notebook-export';
  return extension ? `${base}.${extension}` : base;
}

/**
 * Helper to slugify heading titles for Markdown anchor links
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Formats a date string into human-readable format
 */
function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString();
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Builds a structured, complete Markdown string for an entire Notebook
 */
export function buildNotebookMarkdown(
  notebook: NotebookRecord,
  sections: SectionRecord[],
  pages: PageRecord[],
  options: NotebookExportOptions = {}
): string {
  const {
    includeToc = true,
    includeMetadata = true,
    includeTimestamps = true,
    sectionIds,
  } = options;

  const exportDate = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const filteredSections = sections
    .filter((s) => !s.trashed && s.notebookId === notebook.id)
    .filter((s) => !sectionIds || sectionIds.includes(s.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const lines: string[] = [];

  // Notebook Header
  lines.push(`# ${notebook.name}`);
  lines.push(`> *Exported from Knowledge Vault on ${exportDate}*`);
  lines.push('');

  // Table of Contents
  if (includeToc && filteredSections.length > 0) {
    lines.push('---');
    lines.push('## Table of Contents');
    lines.push('');

    let hasAnyPages = false;
    for (const sec of filteredSections) {
      const secPages = pages
        .filter((p) => !p.trashed && p.sectionId === sec.id)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      if (secPages.length > 0) {
        hasAnyPages = true;
        lines.push(`- **[${sec.name}](#section-${slugify(sec.name)})**`);
        for (const p of secPages) {
          lines.push(`  - [${p.title || 'Untitled'}](#note-${slugify(p.title || 'untitled')})`);
        }
      } else {
        lines.push(`- **[${sec.name}](#section-${slugify(sec.name)})** *(Empty)*`);
      }
    }

    if (!hasAnyPages) {
      lines.push('*No pages in this notebook.*');
    }
    lines.push('');
  }

  // Sections and Pages
  for (const sec of filteredSections) {
    const secPages = pages
      .filter((p) => !p.trashed && p.sectionId === sec.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    lines.push('---');
    lines.push('');
    lines.push(`## Section: ${sec.name} {#section-${slugify(sec.name)}}`);
    lines.push('');

    if (secPages.length === 0) {
      lines.push('*This section is empty.*');
      lines.push('');
      continue;
    }

    for (const p of secPages) {
      lines.push(`### ${p.title || 'Untitled'} {#note-${slugify(p.title || 'untitled')}}`);

      // Metadata bar
      const metaParts: string[] = [];
      if (includeMetadata && p.tags && p.tags.length > 0) {
        metaParts.push(`**Tags:** ${p.tags.map((t) => `#${t}`).join(', ')}`);
      }
      if (includeTimestamps && p.created) {
        metaParts.push(`**Created:** ${formatDisplayDate(p.created)}`);
      }
      if (includeTimestamps && p.updated && p.updated !== p.created) {
        metaParts.push(`**Updated:** ${formatDisplayDate(p.updated)}`);
      }

      if (metaParts.length > 0) {
        lines.push(`*${metaParts.join(' | ')}*`);
        lines.push('');
      }

      // Page body
      const contentBody = p.content ? p.content.trim() : '*Empty note*';
      lines.push(contentBody);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Builds a clean Markdown string for a single page
 */
export function buildPageMarkdown(
  page: PageRecord,
  options: PageExportOptions = {}
): string {
  const { includeMetadata = true, includeTimestamps = true } = options;
  const lines: string[] = [];

  lines.push(`# ${page.title || 'Untitled Note'}`);

  const metaParts: string[] = [];
  if (includeMetadata && page.tags && page.tags.length > 0) {
    metaParts.push(`**Tags:** ${page.tags.map((t) => `#${t}`).join(', ')}`);
  }
  if (includeTimestamps && page.created) {
    metaParts.push(`**Created:** ${formatDisplayDate(page.created)}`);
  }
  if (includeTimestamps && page.updated && page.updated !== page.created) {
    metaParts.push(`**Updated:** ${formatDisplayDate(page.updated)}`);
  }

  if (metaParts.length > 0) {
    lines.push(`> *${metaParts.join(' | ')}*`);
    lines.push('');
  }

  lines.push(page.content ? page.content.trim() : '');
  return lines.join('\n');
}

/**
 * Triggers a browser download of a Markdown file
 */
export function downloadMarkdownFile(filename: string, markdownContent: string): void {
  const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(filename, 'md');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates print/PDF CSS stylesheet for high-quality documents
 */
function getPrintCss(): string {
  return `
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 18mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .document-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
    }
    .cover-header {
      padding: 32px 24px;
      margin-bottom: 32px;
      background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
      color: white;
      border-radius: 12px;
      text-align: left;
    }
    .cover-header h1 {
      font-size: 26pt;
      font-weight: 800;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }
    .cover-header .subtitle {
      font-size: 11pt;
      opacity: 0.9;
      margin: 0 0 16px 0;
    }
    .cover-header .badge-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 600;
    }
    .toc-container {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 36px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .toc-title {
      font-size: 13pt;
      font-weight: 700;
      margin: 0 0 12px 0;
      color: #1e293b;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .toc-list {
      list-style-type: none;
      padding-left: 0;
      margin: 0;
    }
    .toc-section-item {
      font-weight: 700;
      margin-top: 10px;
      color: #334155;
    }
    .toc-page-list {
      list-style-type: disc;
      padding-left: 20px;
      margin-top: 4px;
      font-weight: normal;
    }
    .toc-page-item {
      margin: 3px 0;
      color: #475569;
    }
    .toc-page-item a {
      color: #4f46e5;
      text-decoration: none;
    }
    .section-divider {
      margin: 36px 0 20px 0;
      padding: 12px 18px;
      background: #f1f5f9;
      border-left: 6px solid #4f46e5;
      border-radius: 6px;
      page-break-before: always;
      break-before: page;
    }
    .section-divider.first-section {
      page-break-before: auto !important;
      break-before: auto !important;
    }
    .section-divider h2 {
      margin: 0;
      font-size: 16pt;
      font-weight: 700;
      color: #1e293b;
    }
    .note-card {
      margin-bottom: 32px;
      page-break-inside: auto;
    }
    .note-header {
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .note-header h3 {
      font-size: 15pt;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #0f172a;
    }
    .note-meta {
      font-size: 9pt;
      color: #64748b;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .note-meta span {
      display: inline-flex;
      align-items: center;
    }
    .tag-chip {
      background: #eef2ff;
      color: #4338ca;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 8.5pt;
      margin-right: 4px;
    }
    .markdown-content h1 { font-size: 16pt; font-weight: 700; margin: 18px 0 8px 0; color: #0f172a; }
    .markdown-content h2 { font-size: 14pt; font-weight: 600; margin: 16px 0 8px 0; color: #1e293b; }
    .markdown-content h3 { font-size: 12pt; font-weight: 600; margin: 14px 0 6px 0; color: #334155; }
    .markdown-content p { margin: 8px 0; }
    .markdown-content ul, .markdown-content ol { margin: 8px 0; padding-left: 24px; }
    .markdown-content li { margin: 3px 0; }
    .markdown-content blockquote {
      border-left: 4px solid #cbd5e1;
      padding: 6px 14px;
      margin: 12px 0;
      color: #475569;
      background: #f8fafc;
      border-radius: 0 6px 6px 0;
    }
    .markdown-content pre {
      background: #0f172a !important;
      color: #f8fafc !important;
      padding: 12px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 9pt;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 12px 0;
    }
    .markdown-content code {
      background: #f1f5f9;
      color: #4f46e5;
      padding: 2px 4px;
      border-radius: 4px;
      font-size: 9.5pt;
      font-family: monospace;
    }
    .markdown-content pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    .markdown-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 10pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .markdown-content th, .markdown-content td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    .markdown-content th {
      background: #f1f5f9;
      font-weight: 600;
    }
    .markdown-content tr:nth-child(even) td {
      background: #fafafa;
    }
    .markdown-content .task-toggle-checkbox {
      margin-right: 6px;
    }
    .page-footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 8.5pt;
      color: #94a3b8;
    }
    @media screen {
      body {
        background: #e2e8f0;
        padding: 20px;
      }
      .document-container {
        background: white;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        border-radius: 8px;
      }
    }
  `;
}

/**
 * Builds printable HTML document string for a complete Notebook
 */
export function buildNotebookPrintHtml(
  notebook: NotebookRecord,
  sections: SectionRecord[],
  pages: PageRecord[],
  options: NotebookExportOptions = {}
): string {
  const {
    includeToc = true,
    includeMetadata = true,
    includeTimestamps = true,
    sectionIds,
  } = options;

  const exportDate = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const filteredSections = sections
    .filter((s) => !s.trashed && s.notebookId === notebook.id)
    .filter((s) => !sectionIds || sectionIds.includes(s.id))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  let totalPagesCount = 0;
  for (const sec of filteredSections) {
    const secPages = pages.filter((p) => !p.trashed && p.sectionId === sec.id);
    totalPagesCount += secPages.length;
  }

  const tocHtmlParts: string[] = [];
  const contentHtmlParts: string[] = [];

  let sectionIndex = 0;
  for (const sec of filteredSections) {
    const secPages = pages
      .filter((p) => !p.trashed && p.sectionId === sec.id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    // TOC Section
    tocHtmlParts.push(`<li class="toc-section-item">${sec.name}</li>`);
    if (secPages.length > 0) {
      tocHtmlParts.push('<ul class="toc-page-list">');
      for (const p of secPages) {
        tocHtmlParts.push(`<li class="toc-page-item">${p.title || 'Untitled'}</li>`);
      }
      tocHtmlParts.push('</ul>');
    }

    // Body Section
    const isFirst = sectionIndex === 0;
    contentHtmlParts.push(`
      <div class="section-divider ${isFirst ? 'first-section' : ''}">
        <h2>📁 ${sec.name}</h2>
      </div>
    `);

    if (secPages.length === 0) {
      contentHtmlParts.push('<p style="font-style:italic; color:#94a3b8;">This section is empty.</p>');
    } else {
      for (const p of secPages) {
        const renderedHtml = renderMarkdownToHtml(p.content || '');

        let metaHtml = '';
        if (includeMetadata || includeTimestamps) {
          const tagsHtml =
            includeMetadata && p.tags && p.tags.length > 0
              ? p.tags.map((t) => `<span class="tag-chip">#${t}</span>`).join('')
              : '';

          const createdHtml =
            includeTimestamps && p.created
              ? `<span>Created: ${formatDisplayDate(p.created)}</span>`
              : '';

          const updatedHtml =
            includeTimestamps && p.updated && p.updated !== p.created
              ? `<span>Updated: ${formatDisplayDate(p.updated)}</span>`
              : '';

          metaHtml = `
            <div class="note-meta">
              ${tagsHtml ? `<div>${tagsHtml}</div>` : ''}
              ${createdHtml}
              ${updatedHtml}
            </div>
          `;
        }

        contentHtmlParts.push(`
          <article class="note-card">
            <header class="note-header">
              <h3>📄 ${p.title || 'Untitled'}</h3>
              ${metaHtml}
            </header>
            <div class="markdown-content">
              ${renderedHtml}
            </div>
          </article>
        `);
      }
    }

    sectionIndex++;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${notebook.name} - Knowledge Vault Export</title>
  <style>
    ${getPrintCss()}
  </style>
</head>
<body>
  <div class="document-container">
    <header class="cover-header">
      <h1>${notebook.name}</h1>
      <p class="subtitle">Exported from Knowledge Vault on ${exportDate}</p>
      <div class="badge-row">
        <span class="badge">${filteredSections.length} ${filteredSections.length === 1 ? 'Section' : 'Sections'}</span>
        <span class="badge">${totalPagesCount} ${totalPagesCount === 1 ? 'Note' : 'Notes'}</span>
        <span class="badge">Knowledge Vault</span>
      </div>
    </header>

    ${
      includeToc && filteredSections.length > 0
        ? `
    <nav class="toc-container">
      <div class="toc-title">Table of Contents</div>
      <ul class="toc-list">
        ${tocHtmlParts.join('')}
      </ul>
    </nav>
    `
        : ''
    }

    <main>
      ${contentHtmlParts.join('')}
    </main>

    <footer class="page-footer">
      Knowledge Vault &bull; ${notebook.name} &bull; Generated on ${exportDate}
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Builds printable HTML document for a single page
 */
export function buildPagePrintHtml(
  page: PageRecord,
  notebookName?: string,
  sectionName?: string
): string {
  const exportDate = new Date().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const renderedBody = renderMarkdownToHtml(page.content || '');

  const tagsHtml =
    page.tags && page.tags.length > 0
      ? page.tags.map((t) => `<span class="tag-chip">#${t}</span>`).join('')
      : '';

  const createdHtml = page.created ? `<span>Created: ${formatDisplayDate(page.created)}</span>` : '';
  const updatedHtml =
    page.updated && page.updated !== page.created
      ? `<span>Updated: ${formatDisplayDate(page.updated)}</span>`
      : '';

  const locationBreadcrumb =
    notebookName && sectionName
      ? `<span class="badge">${notebookName} &rsaquo; ${sectionName}</span>`
      : notebookName
      ? `<span class="badge">${notebookName}</span>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${page.title || 'Untitled Note'} - Knowledge Vault</title>
  <style>
    ${getPrintCss()}
  </style>
</head>
<body>
  <div class="document-container">
    <header class="cover-header" style="padding: 24px; margin-bottom: 24px;">
      <h1 style="font-size: 20pt;">${page.title || 'Untitled Note'}</h1>
      <p class="subtitle">Knowledge Vault Document &bull; ${exportDate}</p>
      <div class="badge-row">
        ${locationBreadcrumb}
        <span class="badge">${formatDisplayDate(page.updated || page.created)}</span>
      </div>
    </header>

    <div class="note-meta" style="margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
      ${tagsHtml ? `<div>${tagsHtml}</div>` : ''}
      ${createdHtml}
      ${updatedHtml}
    </div>

    <main class="markdown-content">
      ${renderedBody}
    </main>

    <footer class="page-footer">
      Knowledge Vault &bull; ${page.title || 'Note'} &bull; Exported on ${exportDate}
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Triggers a native print/PDF export using an isolated hidden iframe
 */
export function printHtmlDocument(htmlContent: string, documentTitle: string = 'Document'): void {
  // Create an invisible iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    // Fallback if iframe access fails (e.g. strict security)
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Set original title temporarily for print dialog save name
  const originalTitle = document.title;
  document.title = sanitizeFilename(documentTitle);

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
    } finally {
      document.title = originalTitle;
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.onload = () => {
      setTimeout(triggerPrint, 250);
    };
    // Safety timeout in case onload doesn't fire
    setTimeout(triggerPrint, 500);
  } else {
    setTimeout(triggerPrint, 300);
  }
}
