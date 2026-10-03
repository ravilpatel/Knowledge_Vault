import MiniSearch from 'minisearch';
import { db } from '../../db/db';
import { PageRecord, SearchResultItem } from '../../types';

export interface IndexedDoc {
  id: string;
  title: string;
  tags: string;
  body: string;
  notebookName: string;
  sectionName: string;
  favorite: boolean;
  notebookId: string;
  sectionId: string;
}

export class SearchEngine {
  private miniSearch: MiniSearch<IndexedDoc>;
  private isIndexed = false;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ['title', 'tags', 'body', 'notebookName', 'sectionName'],
      storeFields: ['title', 'tags', 'body', 'notebookName', 'sectionName', 'favorite', 'notebookId', 'sectionId'],
      searchOptions: {
        boost: { title: 3, tags: 2, body: 1 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }

  /**
   * Directly load documents into search index (in-memory)
   */
  addDocuments(docs: IndexedDoc[]): void {
    this.miniSearch.removeAll();
    this.miniSearch.addAll(docs);
    this.isIndexed = true;
  }

  /**
   * Rebuild or initialize search index from all active pages
   */
  async buildIndex(): Promise<void> {
    const pages = await db.pages.filter((p) => !p.trashed).toArray();
    const notebooks = await db.notebooks.toArray();
    const sections = await db.sections.toArray();

    const nbMap = new Map(notebooks.map((n) => [n.id, n.name]));
    const secMap = new Map(sections.map((s) => [s.id, s.name]));

    this.miniSearch.removeAll();

    const docs: IndexedDoc[] = pages.map((p) => ({
      id: p.id,
      title: p.title,
      tags: p.tags.join(' '),
      body: p.content,
      notebookName: nbMap.get(p.notebookId) || 'General',
      sectionName: secMap.get(p.sectionId) || 'General',
      favorite: p.favorite,
      notebookId: p.notebookId,
      sectionId: p.sectionId,
    }));

    this.miniSearch.addAll(docs);
    this.isIndexed = true;
  }

  /**
   * Index or update a single page incrementally
   */
  async indexPage(page: PageRecord): Promise<void> {
    if (!this.isIndexed) {
      await this.buildIndex();
      return;
    }

    if (this.miniSearch.has(page.id)) {
      this.miniSearch.discard(page.id);
    }

    if (page.trashed) return;

    const nb = await db.notebooks.get(page.notebookId);
    const sec = await db.sections.get(page.sectionId);

    this.miniSearch.add({
      id: page.id,
      title: page.title,
      tags: page.tags.join(' '),
      body: page.content,
      notebookName: nb?.name || 'General',
      sectionName: sec?.name || 'General',
      favorite: page.favorite,
      notebookId: page.notebookId,
      sectionId: page.sectionId,
    });
  }

  /**
   * Parse query with operators: tag:cooking, in:Work, is:favorite
   */
  search(rawQuery: string): SearchResultItem[] {
    if (!rawQuery.trim()) return [];

    let cleanQuery = rawQuery;
    let tagFilter: string | null = null;
    let notebookFilter: string | null = null;
    let isFavoriteFilter = false;

    // tag:cooking
    const tagMatch = cleanQuery.match(/tag:([^\s]+)/i);
    if (tagMatch) {
      tagFilter = tagMatch[1].toLowerCase();
      cleanQuery = cleanQuery.replace(tagMatch[0], '').trim();
    }

    // in:Work
    const inMatch = cleanQuery.match(/in:([^\s]+)/i);
    if (inMatch) {
      notebookFilter = inMatch[1].toLowerCase();
      cleanQuery = cleanQuery.replace(inMatch[0], '').trim();
    }

    // is:favorite
    if (/is:favorite/i.test(cleanQuery)) {
      isFavoriteFilter = true;
      cleanQuery = cleanQuery.replace(/is:favorite/gi, '').trim();
    }

    const searchQuery = cleanQuery.trim() || MiniSearch.wildcard;

    const results = this.miniSearch.search(searchQuery, {
      filter: (result) => {
        if (tagFilter && !result.tags.toLowerCase().includes(tagFilter)) {
          return false;
        }
        if (notebookFilter && !result.notebookName.toLowerCase().includes(notebookFilter)) {
          return false;
        }
        if (isFavoriteFilter && !result.favorite) {
          return false;
        }
        return true;
      },
    });

    return results.slice(0, 50).map((r) => {
      const bodySnippet = generateSnippet(r.body, cleanQuery);
      return {
        id: r.id,
        title: r.title,
        bodySnippet,
        notebookName: r.notebookName,
        sectionName: r.sectionName,
        tags: r.tags ? r.tags.split(' ').filter(Boolean) : [],
        favorite: r.favorite,
        score: r.score,
      };
    });
  }
}

/**
 * Creates highlighted snippet around the matched search terms
 */
function generateSnippet(body: string, query: string, snippetLength = 120): string {
  if (!query || !body) {
    return body.slice(0, snippetLength) + (body.length > snippetLength ? '...' : '');
  }

  const terms = query.split(/\s+/).filter(Boolean);
  const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

  const match = regex.exec(body);
  if (!match) {
    return body.slice(0, snippetLength) + (body.length > snippetLength ? '...' : '');
  }

  const start = Math.max(0, match.index - 40);
  const end = Math.min(body.length, match.index + snippetLength);
  const snippet = (start > 0 ? '...' : '') + body.slice(start, end) + (end < body.length ? '...' : '');

  // Highlight terms
  return snippet.replace(regex, '<mark class="bg-amber-200 dark:bg-amber-700/80 text-amber-900 dark:text-amber-100 font-semibold px-0.5 rounded">$1</mark>');
}

export const searchEngine = new SearchEngine();
