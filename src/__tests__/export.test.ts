import { describe, it, expect } from 'vitest';
import {
  buildNotebookMarkdown,
  buildPageMarkdown,
  buildNotebookPrintHtml,
  buildPagePrintHtml,
  sanitizeFilename,
} from '../lib/exportUtils';
import { NotebookRecord, SectionRecord, PageRecord } from '../types';

describe('exportUtils', () => {
  const mockNotebook: NotebookRecord = {
    id: 'nb-1',
    name: 'Research Notebook',
    order: 0,
    sectionOrder: ['sec-1', 'sec-2'],
    trashed: false,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
  };

  const mockSections: SectionRecord[] = [
    {
      id: 'sec-1',
      notebookId: 'nb-1',
      name: 'AI Principles',
      color: 'peach',
      order: 0,
      pageOrder: ['p-1'],
      trashed: false,
    },
    {
      id: 'sec-2',
      notebookId: 'nb-1',
      name: 'Recipes',
      color: 'sage',
      order: 1,
      pageOrder: ['p-2'],
      trashed: false,
    },
  ];

  const mockPages: PageRecord[] = [
    {
      id: 'p-1',
      notebookId: 'nb-1',
      sectionId: 'sec-1',
      title: 'Neural Networks 101',
      tags: ['ai', 'deep-learning'],
      favorite: true,
      content: '## Overview\nNeural networks are inspired by biological neurons.\n\n- [x] Input layer\n- [ ] Hidden layer',
      rawMarkdown: '',
      created: '2026-01-01T10:00:00.000Z',
      updated: '2026-01-02T12:00:00.000Z',
      localDirty: false,
      trashed: false,
      order: 0,
    },
    {
      id: 'p-2',
      notebookId: 'nb-1',
      sectionId: 'sec-2',
      title: 'Espresso Guide',
      tags: ['coffee'],
      favorite: false,
      content: '> Brew ratio: 1:2 in 28 seconds.',
      rawMarkdown: '',
      created: '2026-01-03T10:00:00.000Z',
      updated: '2026-01-03T10:00:00.000Z',
      localDirty: false,
      trashed: false,
      order: 0,
    },
  ];

  describe('sanitizeFilename', () => {
    it('cleans invalid characters and attaches extensions', () => {
      expect(sanitizeFilename('My Notebook: Best / Final?', 'md')).toBe('My-Notebook_-Best-_-Final_.md');
      expect(sanitizeFilename('  Simple Name  ', 'pdf')).toBe('Simple-Name.pdf');
      expect(sanitizeFilename('', 'md')).toBe('notebook-export.md');
    });
  });

  describe('buildNotebookMarkdown', () => {
    it('generates a complete Markdown document with TOC and all sections/pages', () => {
      const md = buildNotebookMarkdown(mockNotebook, mockSections, mockPages);

      expect(md).toContain('# Research Notebook');
      expect(md).toContain('## Table of Contents');
      expect(md).toContain('AI Principles');
      expect(md).toContain('Neural Networks 101');
      expect(md).toContain('## Section: AI Principles');
      expect(md).toContain('### Neural Networks 101');
      expect(md).toContain('#ai, #deep-learning');
      expect(md).toContain('Neural networks are inspired by biological neurons.');
      expect(md).toContain('## Section: Recipes');
      expect(md).toContain('### Espresso Guide');
    });

    it('respects includeToc=false option', () => {
      const md = buildNotebookMarkdown(mockNotebook, mockSections, mockPages, {
        includeToc: false,
      });

      expect(md).not.toContain('## Table of Contents');
      expect(md).toContain('# Research Notebook');
      expect(md).toContain('## Section: AI Principles');
    });

    it('filters by sectionIds if specified', () => {
      const md = buildNotebookMarkdown(mockNotebook, mockSections, mockPages, {
        sectionIds: ['sec-1'],
      });

      expect(md).toContain('AI Principles');
      expect(md).toContain('Neural Networks 101');
      expect(md).not.toContain('## Section: Recipes');
      expect(md).not.toContain('Espresso Guide');
    });
  });

  describe('buildPageMarkdown', () => {
    it('generates markdown for a single page with metadata', () => {
      const md = buildPageMarkdown(mockPages[0]);

      expect(md).toContain('# Neural Networks 101');
      expect(md).toContain('**Tags:** #ai, #deep-learning');
      expect(md).toContain('Neural networks are inspired by biological neurons.');
    });
  });

  describe('buildNotebookPrintHtml', () => {
    it('generates a full printable HTML document', () => {
      const html = buildNotebookPrintHtml(mockNotebook, mockSections, mockPages);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Research Notebook - Knowledge Vault Export</title>');
      expect(html).toContain('<style>');
      expect(html).toContain('Research Notebook');
      expect(html).toContain('Table of Contents');
      expect(html).toContain('AI Principles');
      expect(html).toContain('Neural Networks 101');
      expect(html).toContain('Espresso Guide');
    });
  });

  describe('buildPagePrintHtml', () => {
    it('generates printable HTML for a single page', () => {
      const html = buildPagePrintHtml(mockPages[0], 'Research Notebook', 'AI Principles');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Neural Networks 101');
      expect(html).toContain('Research Notebook');
      expect(html).toContain('AI Principles');
    });
  });
});
