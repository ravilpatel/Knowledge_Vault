import { db } from '../../db/db';
import { DriveClient } from '../drive/driveClient';
import { useAuthStore } from '../auth/authStore';
import { useSyncStore } from './syncStore';
import { OutboxActionType, OutboxItem, PageRecord, NotebookRecord, SectionRecord } from '../../types';
import { sanitizeFilename, generateUUID } from '../../lib/id';
import { parsePageMarkdown, serializePageMarkdown } from '../../lib/frontmatter';

class SyncEngine {
  private flushTimer: any = null;
  private isFlushing = false;
  private rootFolderId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        useSyncStore.getState().setStatus('syncing');
        this.flushOutbox();
      });

      window.addEventListener('offline', () => {
        useSyncStore.getState().setStatus('offline');
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.flushOutbox();
        }
      });

      // Periodic check every 60s
      setInterval(() => {
        this.flushOutbox();
      }, 60000);
    }
  }

  /**
   * Queue an operation to the local outbox
   */
  async queueOutbox(
    action: OutboxActionType,
    entityId: string,
    notebookId?: string,
    sectionId?: string,
    payload: Record<string, any> = {}
  ): Promise<void> {
    const item: OutboxItem = {
      action,
      entityId,
      notebookId,
      sectionId,
      payload,
      createdAt: Date.now(),
      retryCount: 0,
    };

    await db.outbox.add(item);
    await this.updatePendingCount();

    // Debounce flush (1.5s as per spec 6.2)
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushOutbox();
    }, 1500);
  }

  async updatePendingCount(): Promise<number> {
    const count = await db.outbox.count();
    useSyncStore.getState().setPendingCount(count);
    return count;
  }

  /**
   * Resolves or caches the NoteVault root folder in Google Drive
   */
  async ensureRootFolder(): Promise<string> {
    if (this.rootFolderId) return this.rootFolderId;
    const rootId = await DriveClient.getOrCreateRootFolder();
    this.rootFolderId = rootId;
    return rootId;
  }

  /**
   * Flushes outbox operations to Google Drive
   */
  async flushOutbox(): Promise<void> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const { user, isGuest } = useAuthStore.getState();

    const pending = await this.updatePendingCount();

    if (!isOnline) {
      useSyncStore.getState().setStatus('offline');
      return;
    }

    if (isGuest || !user || !user.accessToken) {
      // Offline guest mode: data stays local in IndexedDB
      useSyncStore.getState().setStatus(pending > 0 ? 'offline' : 'synced');
      return;
    }

    if (this.isFlushing || pending === 0) return;

    this.isFlushing = true;
    useSyncStore.getState().setStatus('syncing');

    try {
      const rootFolderId = await this.ensureRootFolder();
      const items = await db.outbox.orderBy('id').toArray();

      for (const item of items) {
        try {
          await this.processOutboxItem(item, rootFolderId);
          if (item.id) {
            await db.outbox.delete(item.id);
          }
        } catch (err: any) {
          console.error(`Error processing outbox item ${item.id}:`, err);
          if (item.id) {
            await db.outbox.update(item.id, {
              retryCount: (item.retryCount || 0) + 1,
              lastError: err.message || String(err),
            });
          }
          useSyncStore.getState().setErrorMessage(err.message || 'Sync error encountered');
          useSyncStore.getState().setStatus('error');
          break; // Stop on error to preserve order
        }
      }

      const remaining = await this.updatePendingCount();
      if (remaining === 0) {
        useSyncStore.getState().setStatus('synced');
        useSyncStore.getState().setLastSyncTime(Date.now());
        useSyncStore.getState().setErrorMessage(null);
      }
    } catch (err: any) {
      console.error('Fatal flushOutbox error:', err);
      useSyncStore.getState().setStatus('error');
      useSyncStore.getState().setErrorMessage(err.message || 'Failed to connect to Google Drive');
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Process individual outbox item
   */
  private async processOutboxItem(item: OutboxItem, rootFolderId: string): Promise<void> {
    switch (item.action) {
      case 'create_notebook': {
        const nb = await db.notebooks.get(item.entityId);
        if (!nb || nb.trashed) return;
        if (!nb.driveFolderId) {
          const folder = await DriveClient.createFolder(nb.name, rootFolderId);
          await db.notebooks.update(nb.id, { driveFolderId: folder.id });

          // Also create _attachments folder inside notebook
          await DriveClient.createFolder('_attachments', folder.id);
        }
        break;
      }

      case 'rename_notebook': {
        const nb = await db.notebooks.get(item.entityId);
        if (nb && nb.driveFolderId) {
          await DriveClient.renameFile(nb.driveFolderId, item.payload.name);
        }
        break;
      }

      case 'trash_notebook': {
        const nb = await db.notebooks.get(item.entityId);
        if (nb && nb.driveFolderId) {
          await DriveClient.trashFile(nb.driveFolderId);
        }
        break;
      }

      case 'restore_notebook': {
        const nb = await db.notebooks.get(item.entityId);
        if (nb && nb.driveFolderId) {
          await DriveClient.restoreFile(nb.driveFolderId);
        }
        break;
      }

      case 'create_section': {
        const sec = await db.sections.get(item.entityId);
        if (!sec || sec.trashed) return;

        const parentNb = await db.notebooks.get(sec.notebookId);
        if (!parentNb || !parentNb.driveFolderId) {
          // Parent notebook folder not yet created
          throw new Error('Parent notebook folder not ready');
        }

        if (!sec.driveFolderId) {
          const folder = await DriveClient.createFolder(sec.name, parentNb.driveFolderId);
          await db.sections.update(sec.id, { driveFolderId: folder.id });
        }
        break;
      }

      case 'rename_section': {
        const sec = await db.sections.get(item.entityId);
        if (sec && sec.driveFolderId) {
          await DriveClient.renameFile(sec.driveFolderId, item.payload.name);
        }
        break;
      }

      case 'trash_section': {
        const sec = await db.sections.get(item.entityId);
        if (sec && sec.driveFolderId) {
          await DriveClient.trashFile(sec.driveFolderId);
        }
        break;
      }

      case 'restore_section': {
        const sec = await db.sections.get(item.entityId);
        if (sec && sec.driveFolderId) {
          await DriveClient.restoreFile(sec.driveFolderId);
        }
        break;
      }

      case 'create_page':
      case 'update_page': {
        const page = await db.pages.get(item.entityId);
        if (!page || page.trashed) return;

        const parentSec = await db.sections.get(page.sectionId);
        const parentFolderId = parentSec?.driveFolderId;
        if (!parentFolderId) {
          throw new Error('Parent section folder not ready in Drive');
        }

        const fileName = `${sanitizeFilename(page.title)}.md`;

        if (page.driveFileId) {
          // SECTION 6.4: CONFLICT HANDLING:
          // Before an update, compare stored remoteVersion with current remote
          const remoteMeta = await DriveClient.getFileMetadata(page.driveFileId);
          const currentRemoteVersion = remoteMeta.headRevisionId || remoteMeta.version || remoteMeta.modifiedTime;

          if (page.remoteVersion && currentRemoteVersion && page.remoteVersion !== currentRemoteVersion && page.localDirty) {
            // Keep both!
            const remoteText = await DriveClient.downloadFileText(page.driveFileId);
            const parsedRemote = parsePageMarkdown(remoteText, page.title);

            // 1. Create conflict copy for local version
            const timestampStr = new Date().toISOString().replace(/:/g, '-').slice(0, 16).replace('T', ' ');
            const conflictTitle = `${page.title} (conflict ${timestampStr})`;
            const conflictPageId = generateUUID();

            const conflictFrontMatter = {
              ...parsedRemote.frontMatter,
              id: conflictPageId,
              title: conflictTitle,
              updated: new Date().toISOString(),
            };
            const conflictRaw = serializePageMarkdown(conflictFrontMatter, page.content);

            const conflictRecord: PageRecord = {
              id: conflictPageId,
              notebookId: page.notebookId,
              sectionId: page.sectionId,
              title: conflictTitle,
              tags: page.tags,
              favorite: false,
              content: page.content,
              rawMarkdown: conflictRaw,
              created: page.created,
              updated: new Date().toISOString(),
              localDirty: true,
              trashed: false,
              order: page.order + 1,
            };

            await db.pages.put(conflictRecord);

            // 2. Overwrite main page record with remote version
            await db.pages.update(page.id, {
              title: parsedRemote.frontMatter.title,
              tags: parsedRemote.frontMatter.tags || [],
              favorite: Boolean(parsedRemote.frontMatter.favorite),
              content: parsedRemote.body,
              rawMarkdown: remoteText,
              updated: parsedRemote.frontMatter.updated || new Date().toISOString(),
              remoteVersion: currentRemoteVersion,
              localDirty: false,
            });

            // 3. Trigger Conflict Modal in UI
            useSyncStore.getState().setActiveConflict({
              pageId: page.id,
              title: page.title,
              localContent: page.content,
              remoteContent: parsedRemote.body,
              localUpdated: page.updated,
              remoteUpdated: parsedRemote.frontMatter.updated || 'Remote',
              localRecord: page,
              remoteRecord: parsedRemote.frontMatter,
            });

            // Queue creation of the conflict file in Drive
            await this.queueOutbox('create_page', conflictPageId, page.notebookId, page.sectionId, {
              title: conflictTitle,
              rawMarkdown: conflictRaw,
            });

            return;
          }

          // Versions match, normal update
          const updatedFile = await DriveClient.uploadTextFile(fileName, page.rawMarkdown, parentFolderId, page.driveFileId);
          await db.pages.update(page.id, {
            remoteVersion: updatedFile.headRevisionId || updatedFile.version || updatedFile.modifiedTime,
            localDirty: false,
          });
        } else {
          // New file upload
          const createdFile = await DriveClient.uploadTextFile(fileName, page.rawMarkdown, parentFolderId);
          await db.pages.update(page.id, {
            driveFileId: createdFile.id,
            remoteVersion: createdFile.headRevisionId || createdFile.version || createdFile.modifiedTime,
            localDirty: false,
          });
        }
        break;
      }

      case 'rename_page': {
        const page = await db.pages.get(item.entityId);
        if (page && page.driveFileId) {
          const newFileName = `${sanitizeFilename(item.payload.title)}.md`;
          await DriveClient.renameFile(page.driveFileId, newFileName);
        }
        break;
      }

      case 'move_page': {
        const page = await db.pages.get(item.entityId);
        if (!page || !page.driveFileId) return;

        const oldSec = await db.sections.get(item.payload.oldSectionId);
        const newSec = await db.sections.get(item.payload.newSectionId);
        if (oldSec?.driveFolderId && newSec?.driveFolderId) {
          await DriveClient.moveFile(page.driveFileId, newSec.driveFolderId, oldSec.driveFolderId);
        }
        break;
      }

      case 'trash_page': {
        const page = await db.pages.get(item.entityId);
        if (page && page.driveFileId) {
          await DriveClient.trashFile(page.driveFileId);
        }
        break;
      }

      case 'restore_page': {
        const page = await db.pages.get(item.entityId);
        if (page && page.driveFileId) {
          await DriveClient.restoreFile(page.driveFileId);
        }
        break;
      }

      case 'upload_attachment': {
        const att = await db.attachments.get(item.entityId);
        if (!att || !att.blob) return;

        const nb = await db.notebooks.get(att.notebookId);
        if (!nb || !nb.driveFolderId) return;

        // Find or create _attachments folder
        const nbChildren = await DriveClient.listChildren(nb.driveFolderId);
        let attachFolder = nbChildren.find((f) => f.name === '_attachments' && f.mimeType === 'application/vnd.google-apps.folder');
        if (!attachFolder) {
          attachFolder = await DriveClient.createFolder('_attachments', nb.driveFolderId);
        }

        const uploaded = await DriveClient.uploadBinaryAttachment(att.filename, att.blob, attachFolder.id);
        await db.attachments.update(att.id, {
          driveFileId: uploaded.id,
          localDirty: false,
        });
        break;
      }
    }
  }

  /**
   * SECTION 4.6: RECOVERY GUARANTEE
   * Rebuilds all notebooks, sections, pages, tags, favorites, and search index purely from Google Drive.
   */
  async rebuildFromDrive(): Promise<void> {
    const { user, isGuest } = useAuthStore.getState();
    if (isGuest || !user || !user.accessToken) {
      throw new Error('Sign in with Google Drive to rebuild local data');
    }

    useSyncStore.getState().setStatus('syncing');

    try {
      const rootFolderId = await this.ensureRootFolder();

      // Clear local database
      await db.pages.clear();
      await db.sections.clear();
      await db.notebooks.clear();
      await db.attachments.clear();
      await db.outbox.clear();

      // 1. List notebooks (folders directly under NoteVault root)
      const rootChildren = await DriveClient.listChildren(rootFolderId, true);
      const notebookFolders = rootChildren.filter(
        (f) => f.mimeType === 'application/vnd.google-apps.folder' && f.name !== '_attachments'
      );

      let nbOrder = 0;
      for (const nbFolder of notebookFolders) {
        const nbRecord: NotebookRecord = {
          id: generateUUID(),
          driveFolderId: nbFolder.id,
          name: nbFolder.name,
          color: '#4F7CAC',
          icon: 'book',
          order: nbOrder++,
          sectionOrder: [],
          trashed: Boolean(nbFolder.trashed),
        };
        await db.notebooks.put(nbRecord);

        // 2. List sections (subfolders under notebook)
        const nbChildren = await DriveClient.listChildren(nbFolder.id, true);
        const sectionFolders = nbChildren.filter(
          (f) => f.mimeType === 'application/vnd.google-apps.folder' && f.name !== '_attachments'
        );

        let secOrder = 0;
        for (const secFolder of sectionFolders) {
          const secRecord: SectionRecord = {
            id: generateUUID(),
            driveFolderId: secFolder.id,
            notebookId: nbRecord.id,
            name: secFolder.name,
            color: 'peach',
            order: secOrder++,
            pageOrder: [],
            trashed: Boolean(secFolder.trashed),
          };
          await db.sections.put(secRecord);

          // 3. List pages (.md files under section)
          const secChildren = await DriveClient.listChildren(secFolder.id, true);
          const pageFiles = secChildren.filter((f) => f.name.endsWith('.md'));

          let pgOrder = 0;
          for (const pageFile of pageFiles) {
            const rawContent = await DriveClient.downloadFileText(pageFile.id);
            const fallbackTitle = pageFile.name.replace(/\.md$/, '');
            const parsed = parsePageMarkdown(rawContent, fallbackTitle);

            const pgRecord: PageRecord = {
              id: parsed.frontMatter.id || generateUUID(),
              driveFileId: pageFile.id,
              notebookId: nbRecord.id,
              sectionId: secRecord.id,
              title: parsed.frontMatter.title || fallbackTitle,
              tags: parsed.frontMatter.tags || [],
              favorite: Boolean(parsed.frontMatter.favorite),
              content: parsed.body,
              rawMarkdown: rawContent,
              created: parsed.frontMatter.created || pageFile.modifiedTime || new Date().toISOString(),
              updated: parsed.frontMatter.updated || pageFile.modifiedTime || new Date().toISOString(),
              remoteVersion: pageFile.headRevisionId || pageFile.version || pageFile.modifiedTime,
              localDirty: false,
              trashed: Boolean(pageFile.trashed),
              order: pgOrder++,
              customFrontMatter: parsed.frontMatter,
            };
            await db.pages.put(pgRecord);
          }
        }
      }

      useSyncStore.getState().setStatus('synced');
      useSyncStore.getState().setLastSyncTime(Date.now());
      useSyncStore.getState().setErrorMessage(null);
    } catch (err: any) {
      console.error('Rebuild from Drive failed:', err);
      useSyncStore.getState().setStatus('error');
      useSyncStore.getState().setErrorMessage(err.message || 'Failed to rebuild local data from Google Drive');
      throw err;
    }
  }
}

export const syncEngine = new SyncEngine();
