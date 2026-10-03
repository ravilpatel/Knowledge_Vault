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
  panels!: Table<import('../types').Panel, string>;
  panel_fields!: Table<import('../types').PanelField, string>;
  panel_entries!: Table<import('../types').PanelEntry, string>;
  people!: Table<import('../types').PersonEntity, string>;
  companies!: Table<import('../types').CompanyEntity, string>;
  technologies!: Table<import('../types').TechnologyEntity, string>;
  projects!: Table<import('../types').ProjectEntity, string>;
  categories!: Table<import('../types').CategoryItem, string>;
  tags!: Table<import('../types').TagItem, string>;
  habit_logs!: Table<import('../types').HabitLog, string>;
  legacy_notes!: Table<import('../types').LegacyNote, string>;
  user_settings!: Table<import('../types').UserSettings, string>;

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

    this.version(3).stores({
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
      panels: 'id, user_id, name, sort_order, created_at',
      panel_fields: 'id, panel_id, field_key, field_type, field_order',
      panel_entries: 'id, panel_id, user_id, created_at, updated_at',
    });

    this.version(4).stores({
      notebooks: 'id, driveFolderId, name, order, trashed',
      sections: 'id, driveFolderId, notebookId, name, order, trashed',
      pages: 'id, driveFileId, notebookId, sectionId, title, *tags, favorite, updated, localDirty, trashed, order',
      attachments: 'id, notebookId, driveFileId, filename, relativePath',
      outbox: '++id, action, entityId, notebookId, sectionId, createdAt, retryCount',
      syncState: 'id',
      settings: 'key',
      todos: 'id, title, urgent, important, completed, dueDate, category, createdAt',
      habits: 'id, title, category, frequency, streak, bestStreak, createdAt',
      habit_logs: 'id, habit_id, user_id, date, completed',
      expenses: 'id, amount, description, category, type, date, createdAt',
      news: 'id, title, category, source, publishedAt, isRead',
      panels: 'id, user_id, name, sort_order, created_at',
      panel_fields: 'id, panel_id, field_key, field_type, field_order',
      panel_entries: 'id, panel_id, user_id, created_at, updated_at',
      people: 'id, user_id, name, created_at',
      companies: 'id, user_id, name, created_at',
      technologies: 'id, user_id, name, created_at',
      projects: 'id, user_id, name, created_at',
      categories: 'id, user_id, name',
      tags: 'id, user_id, name',
      legacy_notes: 'id, user_id, title, created_at',
      user_settings: 'id, user_id',
    });
  }
}

export const db = new NoteVaultDatabase();
