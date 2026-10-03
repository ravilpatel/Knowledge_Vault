import { describe, it, expect } from 'vitest';
import { parsePageMarkdown, serializePageMarkdown } from '../lib/frontmatter';

describe('Front-matter Parser and Serializer', () => {
  it('should parse standard YAML front-matter and content correctly', () => {
    const raw = `---
id: 7f3c2a9e-1d4b-4c6e-9a10-3b5d8e2f1a77
title: Pasta Notes
tags: [cooking, italian]
favorite: true
created: '2026-01-03T10:15:00.000Z'
updated: '2026-01-05T08:02:11.000Z'
---

# Pasta Notes

Body in normal Markdown.`;

    const { frontMatter, content } = parsePageMarkdown(raw, 'Default Title');

    expect(frontMatter.id).toBe('7f3c2a9e-1d4b-4c6e-9a10-3b5d8e2f1a77');
    expect(frontMatter.title).toBe('Pasta Notes');
    expect(frontMatter.tags).toEqual(['cooking', 'italian']);
    expect(frontMatter.favorite).toBe(true);
    expect(content.trim()).toBe('# Pasta Notes\n\nBody in normal Markdown.');
  });

  it('must preserve unknown custom YAML keys on save without data loss (Locked Rule 4.2)', () => {
    const rawWithCustomKeys = `---
id: test-uuid-123
title: Architecture Spec
tags: [engineering]
favorite: false
customRating: 5
author: "DeepMind Engineer"
legacyCategory: "Tech/Notes"
nestedConfig:
  theme: "solarized"
  readOnly: true
---

# Technical Specification Content`;

    const { frontMatter, content } = parsePageMarkdown(rawWithCustomKeys, 'Fallback Title');

    expect(frontMatter.customRating).toBe(5);
    expect(frontMatter.author).toBe('DeepMind Engineer');
    expect(frontMatter.legacyCategory).toBe('Tech/Notes');
    expect(frontMatter.nestedConfig).toEqual({ theme: 'solarized', readOnly: true });

    // Update title and serialize back
    const updatedFrontMatter = {
      ...frontMatter,
      title: 'Architecture Spec v2',
      updated: '2026-10-03T12:00:00.000Z',
    };

    const serialized = serializePageMarkdown(updatedFrontMatter, content);
    const roundTripped = parsePageMarkdown(serialized, 'Fallback');

    expect(roundTripped.frontMatter.title).toBe('Architecture Spec v2');
    expect(roundTripped.frontMatter.customRating).toBe(5);
    expect(roundTripped.frontMatter.author).toBe('DeepMind Engineer');
    expect(roundTripped.frontMatter.legacyCategory).toBe('Tech/Notes');
    expect(roundTripped.frontMatter.nestedConfig).toEqual({ theme: 'solarized', readOnly: true });
    expect(roundTripped.content.trim()).toBe('# Technical Specification Content');
  });

  it('handles markdown files with missing front-matter gracefully', () => {
    const rawNoFrontMatter = `# Note from External Drive

This file was manually copied into NoteVault Drive folder without front-matter.`;

    const { frontMatter, content } = parsePageMarkdown(rawNoFrontMatter, 'My Discovered Note');

    expect(frontMatter.id).toBeDefined();
    expect(frontMatter.title).toBe('My Discovered Note');
    expect(frontMatter.tags).toEqual([]);
    expect(frontMatter.favorite).toBe(false);
    expect(content.trim()).toContain('This file was manually copied');
  });
});
