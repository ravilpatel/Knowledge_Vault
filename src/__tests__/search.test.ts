import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine, IndexedDoc } from '../features/search/searchIndex';

describe('Search Engine & Operators', () => {
  let searchEngine: SearchEngine;

  beforeEach(() => {
    searchEngine = new SearchEngine();
  });

  it('correctly executes full-text search and ranks relevance', () => {
    const docs: IndexedDoc[] = [
      {
        id: 'p1',
        title: 'Authentic Pasta Carbonara',
        tags: 'cooking italian dinner',
        body: 'Traditional Italian recipe with guanciale, pecorino romano, fresh eggs, and black pepper.',
        notebookName: 'Personal',
        sectionName: 'Recipes',
        favorite: true,
        notebookId: 'nb1',
        sectionId: 'sec1',
      },
      {
        id: 'p2',
        title: 'Dosa Batter Fermentation',
        tags: 'cooking indian breakfast',
        body: 'South Indian crepe batter prepared with parboiled rice and urad dal, fermented for 12 hours.',
        notebookName: 'Personal',
        sectionName: 'Recipes',
        favorite: false,
        notebookId: 'nb1',
        sectionId: 'sec1',
      },
    ];

    searchEngine.addDocuments(docs);

    // Query 1: keyword
    const hits = searchEngine.search('guanciale');
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('p1');
    expect(hits[0].title).toBe('Authentic Pasta Carbonara');
    expect(hits[0].bodySnippet).toContain('guanciale');

    // Query 2: tag operator
    const indianHits = searchEngine.search('tag:indian');
    expect(indianHits.length).toBe(1);
    expect(indianHits[0].id).toBe('p2');

    // Query 3: favorite operator
    const favHits = searchEngine.search('is:favorite');
    expect(favHits.length).toBe(1);
    expect(favHits[0].id).toBe('p1');

    // Query 4: notebook filter operator
    const nbHits = searchEngine.search('in:Personal');
    expect(nbHits.length).toBe(2);
  });
});
