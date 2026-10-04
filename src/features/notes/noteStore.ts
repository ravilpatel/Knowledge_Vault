import { create } from 'zustand';
import { db } from '../../db/db';
import {
  NotebookRecord,
  SectionRecord,
  PageRecord,
  SectionColor,
  ViewMode,
} from '../../types';
import { generateUUID } from '../../lib/id';
import { parsePageMarkdown, serializePageMarkdown } from '../../lib/frontmatter';
import { syncEngine } from '../sync/syncEngine';
import { searchEngine } from '../search/searchIndex';
import { useAuthStore } from '../auth/authStore';

interface NoteState {
  notebooks: NotebookRecord[];
  sections: SectionRecord[];
  pages: PageRecord[];

  activeNotebookId: string | null;
  activeSectionId: string | null;
  activePageId: string | null;

  viewMode: ViewMode;
  showFavoritesOnly: boolean;
  selectedTag: string | null;
  showTrashView: boolean;
  searchQuery: string;

  isLoading: boolean;

  // Actions
  loadInitialData: () => Promise<void>;
  setActiveNotebook: (id: string | null) => void;
  setActiveSection: (id: string | null) => void;
  setActivePage: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowFavoritesOnly: (show: boolean) => void;
  setSelectedTag: (tag: string | null) => void;
  setShowTrashView: (show: boolean) => void;
  setSearchQuery: (query: string) => void;

  // Notebook mutations
  createNotebook: (name: string, color?: string, icon?: string) => Promise<NotebookRecord>;
  renameNotebook: (id: string, name: string) => Promise<void>;
  trashNotebook: (id: string) => Promise<void>;
  restoreNotebook: (id: string) => Promise<void>;
  deleteNotebookPermanent: (id: string) => Promise<void>;
  reorderNotebooks: (orderedIds: string[]) => Promise<void>;

  // Section mutations
  createSection: (notebookId: string, name: string, color?: SectionColor) => Promise<SectionRecord>;
  renameSection: (id: string, name: string) => Promise<void>;
  changeSectionColor: (id: string, color: SectionColor) => Promise<void>;
  trashSection: (id: string) => Promise<void>;
  restoreSection: (id: string) => Promise<void>;
  deleteSectionPermanent: (id: string) => Promise<void>;
  reorderSections: (orderedIds: string[]) => Promise<void>;

  // Page mutations
  createPage: (notebookId: string, sectionId: string, title?: string, content?: string) => Promise<PageRecord>;
  updatePageContent: (id: string, content: string) => Promise<void>;
  updatePageTitle: (id: string, title: string) => Promise<void>;
  togglePageFavorite: (id: string) => Promise<void>;
  setPageTags: (id: string, tags: string[]) => Promise<void>;
  trashPage: (id: string) => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  deletePagePermanent: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  reorderPages: (orderedIds: string[]) => Promise<void>;
  movePage: (pageId: string, targetSectionId: string, targetNotebookId: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notebooks: [],
  sections: [],
  pages: [],

  activeNotebookId: null,
  activeSectionId: null,
  activePageId: null,

  viewMode: 'split',
  showFavoritesOnly: false,
  selectedTag: null,
  showTrashView: false,
  searchQuery: '',

  isLoading: true,

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      const { supabaseUser, session } = useAuthStore.getState();
      const userId = supabaseUser?.id || session?.user?.id;

      // 1. If user is authenticated with Supabase, sync/migrate notes
      if (userId && navigator.onLine) {
        await syncEngine.migrateLocalNotesToSupabase(userId);
      }

      let notebooks = await db.notebooks.toArray();
      let sections = await db.sections.toArray();
      let pages = await db.pages.toArray();

      if (notebooks.length === 0) {
        // Initialize default starter notebook and section if completely empty
        const defaultNbId = generateUUID();
        const defaultSecId = generateUUID();
        const defaultPageId = generateUUID();
        const now = new Date().toISOString();

        const defaultNb: NotebookRecord = {
          id: defaultNbId,
          user_id: userId,
          name: 'Personal',
          color: '#4F7CAC',
          icon: 'book',
          order: 0,
          sectionOrder: [defaultSecId],
          trashed: false,
          created_at: now,
          updated_at: now,
        };

        const defaultSec: SectionRecord = {
          id: defaultSecId,
          notebookId: defaultNbId,
          user_id: userId,
          name: 'Recipes',
          color: 'peach',
          order: 0,
          pageOrder: [defaultPageId],
          trashed: false,
          created_at: now,
          updated_at: now,
        };

        const initialContent = `# Classic Roman Carbonara 🍝\n\n> "Simplicity is the ultimate sophistication." — Leonardo da Vinci\n\n## Core Ingredients\n- [x] **Guanciale** (200g, cured pork jowl diced into lardons)\n- [x] **Pecorino Romano** (100g, finely microplaned)\n- [x] **Fresh Eggs** (4 large yolks + 1 whole egg)\n- [ ] **Rigatoni or Spaghetti** (400g bronze-die cut)\n- [x] **Tellicherry Black Pepper** (freshly cracked)\n\n## Technique Steps\n1. Render guanciale over medium-low heat until crisp and deep amber.\n2. Whisk egg yolks with pecorino and abundant black pepper into a thick paste.\n3. Cook pasta in salted boiling water until al dente (*riserva l'acqua di cottura*).\n4. Toss pasta with rendered fat, temper with pasta water, fold in egg cream off heat.\n\n> [!NOTE]\n> Authentic Roman carbonara contains no heavy cream. The glossy sauce forms naturally from emulsifying hot starchy cooking water with the rich egg-pecorino paste.\n`;

        const initialFrontMatter = {
          id: defaultPageId,
          title: 'Pasta Notes',
          tags: ['cooking', 'italian', 'dinner'],
          favorite: true,
          created: now,
          updated: now,
        };

        const rawMarkdown = serializePageMarkdown(initialFrontMatter, initialContent);

        const defaultPg: PageRecord = {
          id: defaultPageId,
          notebookId: defaultNbId,
          sectionId: defaultSecId,
          user_id: userId,
          title: 'Pasta Notes',
          tags: ['cooking', 'italian', 'dinner'],
          favorite: true,
          content: initialContent,
          rawMarkdown,
          created: initialFrontMatter.created,
          updated: initialFrontMatter.updated,
          localDirty: true,
          trashed: false,
          order: 0,
          created_at: now,
          updated_at: now,
        };

        await db.notebooks.put(defaultNb);
        await db.sections.put(defaultSec);
        await db.pages.put(defaultPg);

        // Queue outbox items for Supabase sync only if authenticated with Supabase
        if (userId && navigator.onLine) {
          await syncEngine.queueOutbox('create_notebook', defaultNbId, defaultNbId, undefined, { name: defaultNb.name });
          await syncEngine.queueOutbox('create_section', defaultSecId, defaultNbId, defaultSecId, { name: defaultSec.name, color: defaultSec.color });
          await syncEngine.queueOutbox('create_page', defaultPageId, defaultNbId, defaultSecId, {
            title: defaultPg.title,
            rawMarkdown: defaultPg.rawMarkdown,
          });
        }

        await searchEngine.buildIndex();

        set({
          notebooks: [defaultNb],
          sections: [defaultSec],
          pages: [defaultPg],
          activeNotebookId: defaultNbId,
          activeSectionId: defaultSecId,
          activePageId: defaultPageId,
          isLoading: false,
        });
        return;
      }

      // Sort according to order
      notebooks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      pages.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const activeNb = notebooks.find((n) => !n.trashed);
      const activeSec = activeNb ? sections.find((s) => s.notebookId === activeNb.id && !s.trashed) : null;
      const activePg = activeSec ? pages.find((p) => p.sectionId === activeSec.id && !p.trashed) : null;

      await searchEngine.buildIndex();

      set({
        notebooks,
        sections,
        pages,
        activeNotebookId: activeNb ? activeNb.id : null,
        activeSectionId: activeSec ? activeSec.id : null,
        activePageId: activePg ? activePg.id : null,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to load local notes database:', err);
      set({ isLoading: false });
    }
  },

  setActiveNotebook: (id) => {
    const { sections, pages } = get();
    const activeSec = sections.find((s) => s.notebookId === id && !s.trashed);
    const activePg = activeSec ? pages.find((p) => p.sectionId === activeSec.id && !p.trashed) : null;
    set({
      activeNotebookId: id,
      activeSectionId: activeSec ? activeSec.id : null,
      activePageId: activePg ? activePg.id : null,
      showTrashView: false,
    });
  },

  setActiveSection: (id) => {
    const { pages } = get();
    const activePg = pages.find((p) => p.sectionId === id && !p.trashed);
    set({
      activeSectionId: id,
      activePageId: activePg ? activePg.id : null,
      showTrashView: false,
    });
  },

  setActivePage: (id) => set({ activePageId: id, showTrashView: false }),
  setViewMode: (viewMode) => set({ viewMode }),
  setShowFavoritesOnly: (show) => set({ showFavoritesOnly: show, showTrashView: false, selectedTag: null }),
  setSelectedTag: (tag) => set({ selectedTag: tag, showTrashView: false, showFavoritesOnly: false }),
  setShowTrashView: (show) => set({ showTrashView: show }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  // Notebook operations
  createNotebook: async (name, color = '#4F7CAC', icon = 'book') => {
    const { notebooks } = get();
    const userId = useAuthStore.getState().supabaseUser?.id;
    const now = new Date().toISOString();

    const newNotebook: NotebookRecord = {
      id: generateUUID(),
      user_id: userId,
      name: name.trim() || 'New Notebook',
      color,
      icon,
      order: notebooks.length,
      sectionOrder: [],
      trashed: false,
      created_at: now,
      updated_at: now,
    };

    await db.notebooks.put(newNotebook);
    await syncEngine.queueOutbox('create_notebook', newNotebook.id, newNotebook.id, undefined, { name: newNotebook.name });

    set((state) => ({
      notebooks: [...state.notebooks, newNotebook],
      activeNotebookId: newNotebook.id,
      activeSectionId: null,
      activePageId: null,
    }));

    return newNotebook;
  },

  renameNotebook: async (id, name) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const now = new Date().toISOString();

    await db.notebooks.update(id, { name: cleanName, updated_at: now });
    await syncEngine.queueOutbox('rename_notebook', id, id, undefined, { name: cleanName });

    set((state) => ({
      notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, name: cleanName, updated_at: now } : n)),
    }));
  },

  trashNotebook: async (id) => {
    const now = new Date().toISOString();
    await db.notebooks.update(id, { trashed: true, updated_at: now });
    await syncEngine.queueOutbox('trash_notebook', id, id, undefined, { trashed: true });

    // Also mark child sections and pages as trashed in DB
    const { sections, pages } = get();
    const nbSections = sections.filter((s) => s.notebookId === id);
    const nbPages = pages.filter((p) => p.notebookId === id);

    for (const sec of nbSections) {
      await db.sections.update(sec.id, { trashed: true, updated_at: now });
    }
    for (const pg of nbPages) {
      await db.pages.update(pg.id, { trashed: true, updated_at: now });
      await searchEngine.indexPage({ ...pg, trashed: true });
    }

    const remainingNbs = get().notebooks.filter((n) => n.id !== id && !n.trashed);
    const nextNb = remainingNbs[0] || null;
    const nextSec = nextNb ? sections.find((s) => s.notebookId === nextNb.id && !s.trashed && s.notebookId !== id) : null;
    const nextPg = nextSec ? pages.find((p) => p.sectionId === nextSec.id && !p.trashed && p.notebookId !== id) : null;

    set((state) => ({
      notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, trashed: true, updated_at: now } : n)),
      sections: state.sections.map((s) => (s.notebookId === id ? { ...s, trashed: true, updated_at: now } : s)),
      pages: state.pages.map((p) => (p.notebookId === id ? { ...p, trashed: true, updated_at: now } : p)),
      activeNotebookId: nextNb ? nextNb.id : null,
      activeSectionId: nextSec ? nextSec.id : null,
      activePageId: nextPg ? nextPg.id : null,
    }));
  },

  restoreNotebook: async (id) => {
    const now = new Date().toISOString();
    await db.notebooks.update(id, { trashed: false, updated_at: now });
    await syncEngine.queueOutbox('restore_notebook', id, id, undefined, { trashed: false });

    // Also restore its sections and pages
    const { sections, pages } = get();
    const nbSections = sections.filter((s) => s.notebookId === id);
    const nbPages = pages.filter((p) => p.notebookId === id);

    for (const sec of nbSections) {
      await db.sections.update(sec.id, { trashed: false, updated_at: now });
    }
    for (const pg of nbPages) {
      await db.pages.update(pg.id, { trashed: false, updated_at: now });
      await searchEngine.indexPage({ ...pg, trashed: false });
    }

    const firstSec = nbSections[0] || null;
    const firstPg = firstSec ? nbPages.find((p) => p.sectionId === firstSec.id) : null;

    set((state) => ({
      notebooks: state.notebooks.map((n) => (n.id === id ? { ...n, trashed: false, updated_at: now } : n)),
      sections: state.sections.map((s) => (s.notebookId === id ? { ...s, trashed: false, updated_at: now } : s)),
      pages: state.pages.map((p) => (p.notebookId === id ? { ...p, trashed: false, updated_at: now } : p)),
      activeNotebookId: id,
      activeSectionId: firstSec ? firstSec.id : null,
      activePageId: firstPg ? firstPg.id : null,
      showTrashView: false,
    }));
  },

  deleteNotebookPermanent: async (id) => {
    await db.notebooks.delete(id);
    await db.sections.where('notebookId').equals(id).delete();
    await db.pages.where('notebookId').equals(id).delete();
    await syncEngine.queueOutbox('delete_notebook', id, id);

    set((state) => ({
      notebooks: state.notebooks.filter((n) => n.id !== id),
      sections: state.sections.filter((s) => s.notebookId !== id),
      pages: state.pages.filter((p) => p.notebookId !== id),
    }));
  },

  reorderNotebooks: async (orderedIds) => {
    const updated = get().notebooks.map((nb) => {
      const idx = orderedIds.indexOf(nb.id);
      return idx !== -1 ? { ...nb, order: idx } : nb;
    });
    for (const nb of updated) {
      await db.notebooks.update(nb.id, { order: nb.order });
      await syncEngine.queueOutbox('create_notebook', nb.id, nb.id, undefined, { order: nb.order });
    }
    set({ notebooks: updated });
  },

  // Section operations
  createSection: async (notebookId, name, color = 'peach') => {
    const { sections, notebooks } = get();
    const nbSections = sections.filter((s) => s.notebookId === notebookId);
    const userId = useAuthStore.getState().supabaseUser?.id;
    const now = new Date().toISOString();

    const newSection: SectionRecord = {
      id: generateUUID(),
      notebookId,
      user_id: userId,
      name: name.trim() || 'New Section',
      color,
      order: nbSections.length,
      pageOrder: [],
      trashed: false,
      created_at: now,
      updated_at: now,
    };

    await db.sections.put(newSection);

    // Update parent notebook section order
    const parentNb = notebooks.find((n) => n.id === notebookId);
    if (parentNb) {
      const newSecOrder = [...parentNb.sectionOrder, newSection.id];
      await db.notebooks.update(notebookId, { sectionOrder: newSecOrder });
    }

    await syncEngine.queueOutbox('create_section', newSection.id, notebookId, newSection.id, {
      name: newSection.name,
      color: newSection.color,
    });

    set((state) => ({
      sections: [...state.sections, newSection],
      activeSectionId: newSection.id,
      activePageId: null,
    }));

    return newSection;
  },

  renameSection: async (id, name) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const sec = get().sections.find((s) => s.id === id);
    if (!sec) return;
    const now = new Date().toISOString();

    await db.sections.update(id, { name: cleanName, updated_at: now });
    await syncEngine.queueOutbox('rename_section', id, sec.notebookId, id, { name: cleanName });

    set((state) => ({
      sections: state.sections.map((s) => (s.id === id ? { ...s, name: cleanName, updated_at: now } : s)),
    }));
  },

  changeSectionColor: async (id, color) => {
    const sec = get().sections.find((s) => s.id === id);
    if (!sec) return;
    const now = new Date().toISOString();

    await db.sections.update(id, { color, updated_at: now });
    await syncEngine.queueOutbox('update_meta', id, sec.notebookId, id, { color });

    set((state) => ({
      sections: state.sections.map((s) => (s.id === id ? { ...s, color, updated_at: now } : s)),
    }));
  },

  trashSection: async (id) => {
    const sec = get().sections.find((s) => s.id === id);
    if (!sec) return;
    const now = new Date().toISOString();

    await db.sections.update(id, { trashed: true, updated_at: now });
    await syncEngine.queueOutbox('trash_section', id, sec.notebookId, id, { trashed: true });

    // Also mark its pages as trashed
    const secPages = get().pages.filter((p) => p.sectionId === id);
    for (const pg of secPages) {
      await db.pages.update(pg.id, { trashed: true, updated_at: now });
      await searchEngine.indexPage({ ...pg, trashed: true });
    }

    const remainingSecs = get().sections.filter((s) => s.notebookId === sec.notebookId && s.id !== id && !s.trashed);
    const nextSec = remainingSecs[0] || null;
    const nextPg = nextSec ? get().pages.find((p) => p.sectionId === nextSec.id && !p.trashed) : null;

    set((state) => ({
      sections: state.sections.map((s) => (s.id === id ? { ...s, trashed: true, updated_at: now } : s)),
      pages: state.pages.map((p) => (p.sectionId === id ? { ...p, trashed: true, updated_at: now } : p)),
      activeSectionId: nextSec ? nextSec.id : null,
      activePageId: nextPg ? nextPg.id : null,
    }));
  },

  restoreSection: async (id) => {
    const sec = get().sections.find((s) => s.id === id);
    if (!sec) return;
    const now = new Date().toISOString();

    // Ensure parent notebook is also restored if it was trashed
    await db.notebooks.update(sec.notebookId, { trashed: false, updated_at: now });
    await db.sections.update(id, { trashed: false, updated_at: now });
    await syncEngine.queueOutbox('restore_section', id, sec.notebookId, id, { trashed: false });

    // Also restore its pages
    const secPages = get().pages.filter((p) => p.sectionId === id);
    for (const pg of secPages) {
      await db.pages.update(pg.id, { trashed: false, updated_at: now });
      await searchEngine.indexPage({ ...pg, trashed: false });
    }

    const firstPg = secPages[0] || null;

    set((state) => ({
      notebooks: state.notebooks.map((n) => (n.id === sec.notebookId ? { ...n, trashed: false, updated_at: now } : n)),
      sections: state.sections.map((s) => (s.id === id ? { ...s, trashed: false, updated_at: now } : s)),
      pages: state.pages.map((p) => (p.sectionId === id ? { ...p, trashed: false, updated_at: now } : p)),
      activeNotebookId: sec.notebookId,
      activeSectionId: id,
      activePageId: firstPg ? firstPg.id : null,
      showTrashView: false,
    }));
  },

  deleteSectionPermanent: async (id) => {
    const sec = get().sections.find((s) => s.id === id);
    await db.sections.delete(id);
    await db.pages.where('sectionId').equals(id).delete();
    await syncEngine.queueOutbox('delete_section', id, sec?.notebookId, id);

    set((state) => ({
      sections: state.sections.filter((s) => s.id !== id),
      pages: state.pages.filter((p) => p.sectionId !== id),
    }));
  },

  reorderSections: async (orderedIds) => {
    const updated = get().sections.map((s) => {
      const idx = orderedIds.indexOf(s.id);
      return idx !== -1 ? { ...s, order: idx } : s;
    });
    for (const s of updated) {
      await db.sections.update(s.id, { order: s.order });
      await syncEngine.queueOutbox('create_section', s.id, s.notebookId, s.id, { order: s.order });
    }
    set({ sections: updated });
  },

  // Page operations
  createPage: async (notebookId, sectionId, title = 'Untitled Page', content = '') => {
    const { pages, sections } = get();
    const secPages = pages.filter((p) => p.sectionId === sectionId);
    const userId = useAuthStore.getState().supabaseUser?.id;

    const pageId = generateUUID();
    const now = new Date().toISOString();

    const frontMatter = {
      id: pageId,
      title: title.trim(),
      tags: [],
      favorite: false,
      created: now,
      updated: now,
    };

    const rawMarkdown = serializePageMarkdown(frontMatter, content);

    const newPage: PageRecord = {
      id: pageId,
      notebookId,
      sectionId,
      user_id: userId,
      title: frontMatter.title,
      tags: [],
      favorite: false,
      content,
      rawMarkdown,
      created: now,
      updated: now,
      localDirty: true,
      trashed: false,
      order: secPages.length,
      created_at: now,
      updated_at: now,
    };

    await db.pages.put(newPage);

    // Update parent section page order
    const parentSec = sections.find((s) => s.id === sectionId);
    if (parentSec) {
      const newPageOrder = [...parentSec.pageOrder, pageId];
      await db.sections.update(sectionId, { pageOrder: newPageOrder });
    }

    await syncEngine.queueOutbox('create_page', pageId, notebookId, sectionId, {
      title: newPage.title,
      rawMarkdown: newPage.rawMarkdown,
    });

    await searchEngine.indexPage(newPage);

    set((state) => ({
      pages: [...state.pages, newPage],
      activePageId: pageId,
    }));

    return newPage;
  },

  updatePageContent: async (id, content) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page) return;

    const now = new Date().toISOString();
    const parsed = parsePageMarkdown(page.rawMarkdown, page.title);

    const updatedFrontMatter = {
      ...parsed.frontMatter,
      ...(page.customFrontMatter || {}),
      id: page.id,
      title: page.title,
      tags: page.tags,
      favorite: page.favorite,
      updated: now,
    };

    const rawMarkdown = serializePageMarkdown(updatedFrontMatter, content);

    const updatedRecord: PageRecord = {
      ...page,
      content,
      rawMarkdown,
      updated: now,
      updated_at: now,
      localDirty: true,
    };

    await db.pages.update(id, {
      content,
      rawMarkdown,
      updated: now,
      updated_at: now,
      localDirty: true,
    });

    await syncEngine.queueOutbox('update_page', id, page.notebookId, page.sectionId, {
      title: page.title,
      rawMarkdown,
      updated: now,
    });

    await searchEngine.indexPage(updatedRecord);

    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? updatedRecord : p)),
    }));
  },

  updatePageTitle: async (id, title) => {
    const cleanTitle = title.trim() || 'Untitled';
    const page = get().pages.find((p) => p.id === id);
    if (!page || page.title === cleanTitle) return;

    const now = new Date().toISOString();
    const parsed = parsePageMarkdown(page.rawMarkdown, cleanTitle);

    const updatedFrontMatter = {
      ...parsed.frontMatter,
      ...(page.customFrontMatter || {}),
      id: page.id,
      title: cleanTitle,
      tags: page.tags,
      favorite: page.favorite,
      updated: now,
    };

    const rawMarkdown = serializePageMarkdown(updatedFrontMatter, page.content);

    const updatedRecord: PageRecord = {
      ...page,
      title: cleanTitle,
      rawMarkdown,
      updated: now,
      updated_at: now,
      localDirty: true,
    };

    await db.pages.update(id, {
      title: cleanTitle,
      rawMarkdown,
      updated: now,
      updated_at: now,
      localDirty: true,
    });

    await syncEngine.queueOutbox('rename_page', id, page.notebookId, page.sectionId, {
      title: cleanTitle,
      rawMarkdown,
      updated: now,
    });

    await searchEngine.indexPage(updatedRecord);

    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? updatedRecord : p)),
    }));
  },

  togglePageFavorite: async (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page) return;

    const newFavorite = !page.favorite;
    const now = new Date().toISOString();
    const parsed = parsePageMarkdown(page.rawMarkdown, page.title);

    const updatedFrontMatter = {
      ...parsed.frontMatter,
      ...(page.customFrontMatter || {}),
      id: page.id,
      title: page.title,
      tags: page.tags,
      favorite: newFavorite,
      updated: now,
    };

    const rawMarkdown = serializePageMarkdown(updatedFrontMatter, page.content);

    const updatedRecord: PageRecord = {
      ...page,
      favorite: newFavorite,
      rawMarkdown,
      updated: now,
      updated_at: now,
      localDirty: true,
    };

    await db.pages.update(id, {
      favorite: newFavorite,
      rawMarkdown,
      updated: now,
      updated_at: now,
      localDirty: true,
    });

    await syncEngine.queueOutbox('update_page', id, page.notebookId, page.sectionId, {
      title: page.title,
      rawMarkdown,
      updated: now,
    });

    await searchEngine.indexPage(updatedRecord);

    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? updatedRecord : p)),
    }));
  },

  setPageTags: async (id, tags) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page) return;

    const now = new Date().toISOString();
    const parsed = parsePageMarkdown(page.rawMarkdown, page.title);

    const updatedFrontMatter = {
      ...parsed.frontMatter,
      ...(page.customFrontMatter || {}),
      id: page.id,
      title: page.title,
      tags,
      favorite: page.favorite,
      updated: now,
    };

    const rawMarkdown = serializePageMarkdown(updatedFrontMatter, page.content);

    const updatedRecord: PageRecord = {
      ...page,
      tags,
      rawMarkdown,
      updated: now,
      updated_at: now,
      localDirty: true,
    };

    await db.pages.update(id, {
      tags,
      rawMarkdown,
      updated: now,
      updated_at: now,
      localDirty: true,
    });

    await syncEngine.queueOutbox('update_page', id, page.notebookId, page.sectionId, {
      title: page.title,
      rawMarkdown,
      updated: now,
    });

    await searchEngine.indexPage(updatedRecord);

    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? updatedRecord : p)),
    }));
  },

  trashPage: async (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page) return;
    const now = new Date().toISOString();

    await db.pages.update(id, { trashed: true, updated_at: now });
    await syncEngine.queueOutbox('trash_page', id, page.notebookId, page.sectionId, { trashed: true });
    await searchEngine.indexPage({ ...page, trashed: true });

    const secPages = get().pages.filter((p) => p.sectionId === page.sectionId && p.id !== id && !p.trashed);
    const nextPg = secPages[0] || null;

    set((state) => ({
      pages: state.pages.map((p) => (p.id === id ? { ...p, trashed: true, updated_at: now } : p)),
      activePageId: nextPg ? nextPg.id : null,
    }));
  },

  restorePage: async (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page) return;
    const now = new Date().toISOString();

    // Ensure parent notebook and section are un-trashed too
    await db.notebooks.update(page.notebookId, { trashed: false, updated_at: now });
    await db.sections.update(page.sectionId, { trashed: false, updated_at: now });
    await db.pages.update(id, { trashed: false, updated_at: now });
    await syncEngine.queueOutbox('restore_page', id, page.notebookId, page.sectionId, { trashed: false });
    await searchEngine.indexPage({ ...page, trashed: false });

    set((state) => ({
      notebooks: state.notebooks.map((n) => (n.id === page.notebookId ? { ...n, trashed: false, updated_at: now } : n)),
      sections: state.sections.map((s) => (s.id === page.sectionId ? { ...s, trashed: false, updated_at: now } : s)),
      pages: state.pages.map((p) => (p.id === id ? { ...p, trashed: false, updated_at: now } : p)),
      activeNotebookId: page.notebookId,
      activeSectionId: page.sectionId,
      activePageId: id,
      showTrashView: false,
    }));
  },

  deletePagePermanent: async (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (page) {
      await searchEngine.indexPage({ ...page, trashed: true });
    }
    await db.pages.delete(id);
    await syncEngine.queueOutbox('delete_page', id, page?.notebookId, page?.sectionId);

    set((state) => ({
      pages: state.pages.filter((p) => p.id !== id),
    }));
  },

  emptyTrash: async () => {
    const trashedNbs = get().notebooks.filter((n) => n.trashed);
    const trashedSecs = get().sections.filter((s) => s.trashed);
    const trashedPgs = get().pages.filter((p) => p.trashed);

    for (const nb of trashedNbs) {
      await db.notebooks.delete(nb.id);
      await syncEngine.queueOutbox('delete_notebook', nb.id, nb.id);
    }
    for (const sec of trashedSecs) {
      await db.sections.delete(sec.id);
      await syncEngine.queueOutbox('delete_section', sec.id, sec.notebookId, sec.id);
    }
    for (const pg of trashedPgs) {
      await db.pages.delete(pg.id);
      await syncEngine.queueOutbox('delete_page', pg.id, pg.notebookId, pg.sectionId);
    }

    set((state) => ({
      notebooks: state.notebooks.filter((n) => !n.trashed),
      sections: state.sections.filter((s) => !s.trashed),
      pages: state.pages.filter((p) => !p.trashed),
    }));
  },

  reorderPages: async (orderedIds) => {
    const updated = get().pages.map((p) => {
      const idx = orderedIds.indexOf(p.id);
      return idx !== -1 ? { ...p, order: idx } : p;
    });
    for (const p of updated) {
      await db.pages.update(p.id, { order: p.order });
      await syncEngine.queueOutbox('create_page', p.id, p.notebookId, p.sectionId, { order: p.order });
    }
    set({ pages: updated });
  },

  movePage: async (pageId, targetSectionId, targetNotebookId) => {
    const page = get().pages.find((p) => p.id === pageId);
    if (!page) return;
    const now = new Date().toISOString();

    await db.pages.update(pageId, {
      sectionId: targetSectionId,
      notebookId: targetNotebookId,
      updated_at: now,
      localDirty: true,
    });

    await syncEngine.queueOutbox('move_page', pageId, targetNotebookId, targetSectionId, {
      oldSectionId: page.sectionId,
      newSectionId: targetSectionId,
    });

    set((state) => ({
      pages: state.pages.map((p) =>
        p.id === pageId ? { ...p, sectionId: targetSectionId, notebookId: targetNotebookId, updated_at: now, localDirty: true } : p
      ),
    }));
  },
}));
