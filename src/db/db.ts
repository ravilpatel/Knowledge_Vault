import Dexie, { Table } from 'dexie';
import {
  NotebookRecord,
  SectionRecord,
  PageRecord,
  AttachmentRecord,
  OutboxItem,
  SyncStateRecord,
} from '../types';

export class NoteVaultDatabase extends Dexie {
  notebooks!: Table<NotebookRecord, string>;
  sections!: Table<SectionRecord, string>;
  pages!: Table<PageRecord, string>;
  attachments!: Table<AttachmentRecord, string>;
  outbox!: Table<OutboxItem, number>;
  syncState!: Table<SyncStateRecord, string>;
  settings!: Table<{ key: string; value: any }, string>;

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
  }
}

export const db = new NoteVaultDatabase();
