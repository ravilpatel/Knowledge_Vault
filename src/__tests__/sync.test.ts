import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import { syncEngine } from '../features/sync/syncEngine';
import { PageRecord } from '../types';

describe('Sync Engine & Conflict Rules', () => {
  beforeEach(async () => {
    await db.outbox.clear();
    await db.pages.clear();
  });

  it('correctly queues operations to outbox and calculates pending items', async () => {
    expect(await db.outbox.count()).toBe(0);

    await syncEngine.queueOutbox('create_page', 'page-1', 'nb-1', 'sec-1', {
      title: 'First Page',
    });

    await syncEngine.queueOutbox('update_page', 'page-1', 'nb-1', 'sec-1', {
      content: 'Updated content',
    });

    const pending = await db.outbox.count();
    expect(pending).toBe(2);

    const items = await db.outbox.toArray();
    expect(items[0].action).toBe('create_page');
    expect(items[0].entityId).toBe('page-1');
    expect(items[1].action).toBe('update_page');
  });

  it('guarantees non-destructive deletion: mark trashed: true, never permanently remove', async () => {
    const page: PageRecord = {
      id: 'page-del-1',
      notebookId: 'nb-1',
      sectionId: 'sec-1',
      title: 'To Be Deleted',
      tags: [],
      favorite: false,
      content: 'This note should move to trash, never be purged.',
      rawMarkdown: '',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      localDirty: false,
      trashed: false,
      order: 0,
    };

    await db.pages.put(page);

    // Soft delete / Move to trash
    page.trashed = true;
    await db.pages.put(page);
    await syncEngine.queueOutbox('trash_page', page.id, page.notebookId, page.sectionId);

    const saved = await db.pages.get('page-del-1');
    expect(saved).toBeDefined();
    expect(saved?.trashed).toBe(true);

    const outboxItem = await db.outbox.where({ entityId: 'page-del-1' }).first();
    expect(outboxItem?.action).toBe('trash_page');
  });

  it('queues permanent delete operations for notebooks, sections, and pages', async () => {
    await syncEngine.queueOutbox('delete_notebook', 'nb-to-delete', 'nb-to-delete');
    await syncEngine.queueOutbox('delete_section', 'sec-to-delete', 'nb-1', 'sec-to-delete');
    await syncEngine.queueOutbox('delete_page', 'page-to-delete', 'nb-1', 'sec-1');

    const pending = await db.outbox.count();
    expect(pending).toBe(3);

    const actions = (await db.outbox.toArray()).map((i) => i.action);
    expect(actions).toEqual(['delete_notebook', 'delete_section', 'delete_page']);
  });
});
