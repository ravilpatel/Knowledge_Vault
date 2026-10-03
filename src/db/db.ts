import Dexie, { Table } from 'dexie';
import {
  NotebookRecord,
  SectionRecord,
  PageRecord,
  AttachmentRecord,
  OutboxItem,
  SyncStateRecord,
  TodoItem,
  HabitItem,
  ExpenseItem,
  NewsItem,
} from '../types';

export class NoteVaultDatabase extends Dexie {
  notebooks!: Table<NotebookRecord, string>;
  sections!: Table<SectionRecord, string>;
  pages!: Table<PageRecord, string>;
  attachments!: Table<AttachmentRecord, string>;
  outbox!: Table<OutboxItem, number>;
  syncState!: Table<SyncStateRecord, string>;
  settings!: Table<{ key: string; value: any }, string>;

  // Knowledge Vault Feature Tables
  todos!: Table<TodoItem, string>;
  habits!: Table<HabitItem, string>;
  expenses!: Table<ExpenseItem, string>;
  news!: Table<NewsItem, string>;

  constructor() {
    super('NoteVaultDB');

    this.version(1).stores({
      notebooks: 'id, driveFolderId, name, order, trashed',
      sections: 'id, driveFolderId, notebookId, name, order, trashed',
      pages: 'id, driveFileId, notebookId, sectionId, title, *tags, favorite, updated, localDirty, trashed, order',
      attachments: 'id, notebookId, driveFileId, filename, relativePath',
      outbox: '++id, action, entityId, notebookId, sectionId, createdAt, retryCount',
      syncState: 'id',
      settings: 'key',
    });

    this.version(2).stores({
      notebooks: 'id, driveFolderId, name, order, trashed',
      sections: 'id, driveFolderId, notebookId, name, order, trashed',
      pages: 'id, driveFileId, notebookId, sectionId, title, *tags, favorite, updated, localDirty, trashed, order',
      attachments: 'id, notebookId, driveFileId, filename, relativePath',
      outbox: '++id, action, entityId, notebookId, sectionId, createdAt, retryCount',
      syncState: 'id',
      settings: 'key',
      todos: 'id, title, urgent, important, completed, dueDate, category, createdAt',
      habits: 'id, title, category, frequency, streak, bestStreak, createdAt',
      expenses: 'id, amount, description, category, type, date, createdAt',
      news: 'id, title, category, source, publishedAt, isRead',
    });
  }
}

export const db = new NoteVaultDatabase();
