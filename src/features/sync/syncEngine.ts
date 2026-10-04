import { db } from '../../db/db';
import { getSupabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../auth/authStore';
import { useSyncStore } from './syncStore';
import { OutboxActionType, OutboxItem, PageRecord, NotebookRecord, SectionRecord } from '../../types';
import { generateUUID } from '../../lib/id';
import { parsePageMarkdown, serializePageMarkdown } from '../../lib/frontmatter';

class SyncEngine {
  private flushTimer: any = null;
  private isFlushing = false;

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

      // Periodic background check every 60s
      setInterval(() => {
        this.flushOutbox();
      }, 60000);
    }
  }

  /**
   * Queue an operation to the local Dexie outbox
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

    // Debounce flush (1s)
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushOutbox();
    }, 1000);
  }

  async updatePendingCount(): Promise<number> {
    const count = await db.outbox.count();
    useSyncStore.getState().setPendingCount(count);
    return count;
  }

  /**
   * Flushes local outbox operations to Supabase
   */
  async flushOutbox(): Promise<void> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const { session, supabaseUser, isGuest } = useAuthStore.getState();
    const userId = supabaseUser?.id || session?.user?.id;

    const pending = await this.updatePendingCount();

    if (!isOnline) {
      useSyncStore.getState().setStatus('offline');
      return;
    }

    if (isGuest || !userId) {
      // Offline guest mode: data stays local in IndexedDB
      useSyncStore.getState().setStatus(pending > 0 ? 'offline' : 'synced');
      return;
    }

    if (this.isFlushing || pending === 0) return;

    this.isFlushing = true;
    useSyncStore.getState().setStatus('syncing');

    try {
      const sb = getSupabase();
      const items = await db.outbox.orderBy('id').toArray();

      for (const item of items) {
        try {
          await this.processOutboxItem(item, userId, sb);
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
          break; // Stop on error to preserve FIFO ordering
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
      useSyncStore.getState().setErrorMessage(err.message || 'Failed to connect to Supabase Cloud');
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Process individual outbox item against Supabase REST API
   */
  private async processOutboxItem(item: OutboxItem, userId: string, sb: any): Promise<void> {
    switch (item.action) {
      case 'create_notebook':
      case 'rename_notebook':
      case 'trash_notebook':
      case 'restore_notebook': {
        const nb = await db.notebooks.get(item.entityId);
        if (!nb) return;

        const row = {
          id: nb.id,
          user_id: userId,
          name: nb.name,
          color: nb.color || '#4F7CAC',
          icon: nb.icon || 'book',
          sort_order: nb.order ?? 0,
          section_order: nb.sectionOrder || [],
          trashed: Boolean(nb.trashed),
          updated_at: new Date().toISOString(),
        };

        const { error } = await sb.from('notebooks').upsert(row);
        if (error) throw error;
        await db.notebooks.update(nb.id, { user_id: userId, updated_at: row.updated_at });
        break;
      }

      case 'create_section':
      case 'rename_section':
      case 'trash_section':
      case 'restore_section':
      case 'update_meta': {
        const sec = await db.sections.get(item.entityId);
        if (!sec) return;

        const row = {
          id: sec.id,
          notebook_id: sec.notebookId,
          user_id: userId,
          name: sec.name,
          color: sec.color || 'peach',
          icon: sec.icon || null,
          sort_order: sec.order ?? 0,
          page_order: sec.pageOrder || [],
          trashed: Boolean(sec.trashed),
          updated_at: new Date().toISOString(),
        };

        const { error } = await sb.from('sections').upsert(row);
        if (error) throw error;
        await db.sections.update(sec.id, { user_id: userId, updated_at: row.updated_at });
        break;
      }

      case 'create_page':
      case 'update_page':
      case 'rename_page':
      case 'move_page':
      case 'trash_page':
      case 'restore_page': {
        const page = await db.pages.get(item.entityId);
        if (!page) return;

        // Check for remote conflict if updating existing page
        if (item.action === 'update_page' && page.updated_at) {
          const { data: remoteData } = await sb
            .from('pages')
            .select('id, title, content, raw_markdown, updated_at')
            .eq('id', page.id)
            .maybeSingle();

          if (
            remoteData &&
            remoteData.updated_at &&
            page.updated_at &&
            new Date(remoteData.updated_at).getTime() > new Date(page.updated_at).getTime() &&
            page.localDirty &&
            remoteData.content !== page.content
          ) {
            // Keep both: Create conflict copy
            const timestampStr = new Date().toISOString().replace(/:/g, '-').slice(0, 16).replace('T', ' ');
            const conflictTitle = `${page.title} (conflict ${timestampStr})`;
            const conflictPageId = generateUUID();

            const parsedRemote = parsePageMarkdown(remoteData.raw_markdown || remoteData.content, remoteData.title);

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
              user_id: userId,
              title: conflictTitle,
              tags: page.tags || [],
              favorite: false,
              content: page.content,
              rawMarkdown: conflictRaw,
              created: page.created,
              updated: new Date().toISOString(),
              localDirty: true,
              trashed: false,
              order: (page.order || 0) + 1,
            };

            await db.pages.put(conflictRecord);

            // Trigger conflict modal in UI
            useSyncStore.getState().setActiveConflict({
              pageId: page.id,
              title: page.title,
              localContent: page.content,
              remoteContent: remoteData.content,
              localUpdated: page.updated,
              remoteUpdated: remoteData.updated_at,
              localRecord: page,
              remoteRecord: parsedRemote.frontMatter,
            });

            // Queue the conflict page for sync
            await this.queueOutbox('create_page', conflictPageId, page.notebookId, page.sectionId, {
              title: conflictTitle,
              rawMarkdown: conflictRaw,
            });
            return;
          }
        }

        const now = new Date().toISOString();
        const row = {
          id: page.id,
          notebook_id: page.notebookId,
          section_id: page.sectionId,
          user_id: userId,
          title: page.title,
          tags: page.tags || [],
          favorite: Boolean(page.favorite),
          content: page.content || '',
          raw_markdown: page.rawMarkdown || '',
          sort_order: page.order ?? 0,
          trashed: Boolean(page.trashed),
          custom_front_matter: page.customFrontMatter || {},
          updated_at: now,
        };

        const { error } = await sb.from('pages').upsert(row);
        if (error) throw error;

        await db.pages.update(page.id, {
          user_id: userId,
          updated_at: now,
          localDirty: false,
        });
        break;
      }

      case 'upload_attachment': {
        const att = await db.attachments.get(item.entityId);
        if (!att || !att.blob) return;

        const storagePath = `${userId}/${att.filename}`;

        // Attempt Supabase Storage upload
        try {
          const { error: uploadError } = await sb.storage
            .from('notevault-attachments')
            .upload(storagePath, att.blob, {
              upsert: true,
              contentType: att.mimeType,
            });

          if (!uploadError) {
            const { data: pubUrlData } = sb.storage
              .from('notevault-attachments')
              .getPublicUrl(storagePath);

            await db.attachments.update(att.id, {
              storagePath: pubUrlData?.publicUrl || storagePath,
              user_id: userId,
              localDirty: false,
            });

            // Also record in note_attachments metadata table
            await sb.from('note_attachments').upsert({
              id: att.id,
              notebook_id: att.notebookId,
              user_id: userId,
              filename: att.filename,
              relative_path: att.relativePath,
              storage_path: pubUrlData?.publicUrl || storagePath,
              mime_type: att.mimeType,
              size: att.size || 0,
              created_at: att.created || new Date().toISOString(),
            });
          }
        } catch (storageErr) {
          console.warn('Supabase storage upload optional warning:', storageErr);
        }
        break;
      }
    }
  }

  /**
   * Migrates all local Dexie notes to Supabase upon first login
   */
  async migrateLocalNotesToSupabase(userId: string): Promise<void> {
    try {
      const sb = getSupabase();

      // Check if remote already has notebooks for this user
      const { data: remoteNotebooks, error } = await sb
        .from('notebooks')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        console.warn('Could not check remote notebooks:', error.message);
        return;
      }

      const localNotebooks = await db.notebooks.toArray();
      const localSections = await db.sections.toArray();
      const localPages = await db.pages.toArray();

      // If remote is empty and local has notes, upload all local notes
      if ((!remoteNotebooks || remoteNotebooks.length === 0) && localNotebooks.length > 0) {
        console.log('🔄 Migrating local notes to Supabase for user:', userId);

        for (const nb of localNotebooks) {
          await sb.from('notebooks').upsert({
            id: nb.id,
            user_id: userId,
            name: nb.name,
            color: nb.color || '#4F7CAC',
            icon: nb.icon || 'book',
            sort_order: nb.order ?? 0,
            section_order: nb.sectionOrder || [],
            trashed: Boolean(nb.trashed),
            updated_at: nb.updated_at || new Date().toISOString(),
          });
          await db.notebooks.update(nb.id, { user_id: userId });
        }

        for (const sec of localSections) {
          await sb.from('sections').upsert({
            id: sec.id,
            notebook_id: sec.notebookId,
            user_id: userId,
            name: sec.name,
            color: sec.color || 'peach',
            icon: sec.icon || null,
            sort_order: sec.order ?? 0,
            page_order: sec.pageOrder || [],
            trashed: Boolean(sec.trashed),
            updated_at: sec.updated_at || new Date().toISOString(),
          });
          await db.sections.update(sec.id, { user_id: userId });
        }

        for (const pg of localPages) {
          await sb.from('pages').upsert({
            id: pg.id,
            notebook_id: pg.notebookId,
            section_id: pg.sectionId,
            user_id: userId,
            title: pg.title,
            tags: pg.tags || [],
            favorite: Boolean(pg.favorite),
            content: pg.content || '',
            raw_markdown: pg.rawMarkdown || '',
            sort_order: pg.order ?? 0,
            trashed: Boolean(pg.trashed),
            custom_front_matter: pg.customFrontMatter || {},
            updated_at: pg.updated_at || new Date().toISOString(),
          });
          await db.pages.update(pg.id, { user_id: userId, localDirty: false });
        }

        console.log('✅ Local notes successfully migrated to Supabase Cloud!');
      } else if (remoteNotebooks && remoteNotebooks.length > 0) {
        // User already has remote data, pull latest from Supabase
        await this.pullFromSupabase(userId);
      }
    } catch (err) {
      console.warn('Note migration warning:', err);
    }
  }

  /**
   * Pulls all notebooks, sections, and pages from Supabase into local Dexie
   */
  async pullFromSupabase(userId: string): Promise<void> {
    const sb = getSupabase();

    const [nbRes, secRes, pgRes] = await Promise.all([
      sb.from('notebooks').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
      sb.from('sections').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
      sb.from('pages').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
    ]);

    if (nbRes.data && nbRes.data.length > 0) {
      for (const row of nbRes.data) {
        const record: NotebookRecord = {
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          color: row.color,
          icon: row.icon,
          order: row.sort_order ?? 0,
          sectionOrder: Array.isArray(row.section_order) ? row.section_order : [],
          trashed: Boolean(row.trashed),
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
        await db.notebooks.put(record);
      }
    }

    if (secRes.data && secRes.data.length > 0) {
      for (const row of secRes.data) {
        const record: SectionRecord = {
          id: row.id,
          notebookId: row.notebook_id,
          user_id: row.user_id,
          name: row.name,
          color: row.color,
          icon: row.icon,
          order: row.sort_order ?? 0,
          pageOrder: Array.isArray(row.page_order) ? row.page_order : [],
          trashed: Boolean(row.trashed),
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
        await db.sections.put(record);
      }
    }

    if (pgRes.data && pgRes.data.length > 0) {
      for (const row of pgRes.data) {
        const record: PageRecord = {
          id: row.id,
          notebookId: row.notebook_id,
          sectionId: row.section_id,
          user_id: row.user_id,
          title: row.title,
          tags: Array.isArray(row.tags) ? row.tags : [],
          favorite: Boolean(row.favorite),
          content: row.content || '',
          rawMarkdown: row.raw_markdown || row.content || '',
          created: row.created_at || new Date().toISOString(),
          updated: row.updated_at || new Date().toISOString(),
          localDirty: false,
          trashed: Boolean(row.trashed),
          order: row.sort_order ?? 0,
          customFrontMatter: row.custom_front_matter || {},
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
        await db.pages.put(record);
      }
    }
  }

  /**
   * RECOVERY GUARANTEE:
   * Rebuilds all notebooks, sections, and pages cleanly from Supabase Cloud.
   */
  async rebuildFromSupabase(): Promise<void> {
    const { supabaseUser, session, isGuest } = useAuthStore.getState();
    const userId = supabaseUser?.id || session?.user?.id;

    if (isGuest || !userId) {
      throw new Error('Sign in to Supabase to rebuild local data from cloud');
    }

    useSyncStore.getState().setStatus('syncing');

    try {
      // Clear local notebook cache
      await db.pages.clear();
      await db.sections.clear();
      await db.notebooks.clear();
      await db.outbox.clear();

      await this.pullFromSupabase(userId);

      useSyncStore.getState().setStatus('synced');
      useSyncStore.getState().setLastSyncTime(Date.now());
      useSyncStore.getState().setErrorMessage(null);
    } catch (err: any) {
      console.error('Rebuild from Supabase failed:', err);
      useSyncStore.getState().setStatus('error');
      useSyncStore.getState().setErrorMessage(err.message || 'Failed to rebuild local data from Supabase');
      throw err;
    }
  }
}

export const syncEngine = new SyncEngine();
