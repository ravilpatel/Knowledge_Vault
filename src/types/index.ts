export type ViewMode = 'edit' | 'split' | 'preview';

export type WorkspaceView = 'notebooks' | 'workspace' | 'tasks' | 'habits' | 'finance' | 'intel';

export type FieldType = 'text' | 'textarea' | 'tags' | 'people_link' | 'url' | 'date' | 'select';

export interface PanelField {
  id: string;
  panel_id: string;
  field_key: string;
  field_label: string;
  field_type: FieldType;
  field_order: number;
  is_required: boolean;
  options?: string[] | null;
}

export interface Panel {
  id: string;
  user_id?: string;
  name: string;
  icon?: string;
  color?: string;
  sort_order: number;
  created_at?: string;
}

export interface PanelEntry {
  id: string;
  panel_id: string;
  user_id?: string;
  data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export type SectionColor = 'peach' | 'sage' | 'lavender' | 'sky' | 'butter' | 'rose';

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  urgent: boolean;
  important: boolean;
  dueDate?: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
}

export interface HabitItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  frequency: 'daily' | 'weekly';
  color: string;
  streak: number;
  bestStreak: number;
  completedDates: string[]; // YYYY-MM-DD
  archived?: boolean;
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'expense' | 'income';
  reimbursable?: boolean;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  category: string;
  publishedAt: string;
  isRead: boolean;
}

export interface PageFrontMatter {
  id: string;
  title: string;
  tags?: string[];
  favorite?: boolean;
  created?: string;
  updated?: string;
  [key: string]: unknown; // Preserve unknown keys
}

export interface PageRecord {
  id: string; // UUID (front-matter id)
  driveFileId?: string; // Google Drive file ID (runtime primary key)
  notebookId: string; // Parent Notebook ID
  sectionId: string; // Parent Section ID (or 'general' if root notebook page)
  title: string;
  tags: string[];
  favorite: boolean;
  content: string; // Markdown body without front matter
  rawMarkdown: string; // Full markdown content including front matter
  created: string; // ISO date
  updated: string; // ISO date
  remoteVersion?: string; // Drive headRevisionId / modifiedTime
  localDirty: boolean; // True if locally edited and pending sync
  trashed: boolean;
  order: number;
  customFrontMatter?: Record<string, unknown>; // Preserved unknown YAML keys
}

export interface SectionRecord {
  id: string; // Section UUID or Drive folder ID
  driveFolderId?: string;
  notebookId: string;
  name: string;
  color: SectionColor;
  icon?: string;
  order: number;
  pageOrder: string[];
  trashed: boolean;
}

export interface NotebookRecord {
  id: string; // Notebook UUID or Drive folder ID
  driveFolderId?: string;
  name: string;
  color?: string;
  icon?: string;
  order: number;
  sectionOrder: string[];
  trashed: boolean;
}

export interface AttachmentRecord {
  id: string;
  notebookId: string;
  driveFileId?: string;
  filename: string;
  relativePath: string; // e.g. ../_attachments/20260103-a1b2c3-diagram.png
  mimeType: string;
  blob?: Blob;
  size: number;
  created: string;
  localDirty?: boolean;
}

export type OutboxActionType =
  | 'create_notebook'
  | 'rename_notebook'
  | 'trash_notebook'
  | 'create_section'
  | 'rename_section'
  | 'trash_section'
  | 'create_page'
  | 'update_page'
  | 'rename_page'
  | 'move_page'
  | 'trash_page'
  | 'upload_attachment'
  | 'update_meta';

export interface OutboxItem {
  id?: number; // Auto-increment ID in Dexie
  action: OutboxActionType;
  entityId: string;
  notebookId?: string;
  sectionId?: string;
  payload: Record<string, any>;
  createdAt: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncStateRecord {
  id: string; // 'singleton'
  startPageToken?: string;
  lastSyncTime?: number;
  status: 'synced' | 'syncing' | 'offline' | 'error';
  pendingCount: number;
  errorMessage?: string;
}

export interface RootManifest {
  version: number;
  notebookOrder: string[];
}

export interface NotebookManifest {
  version: number;
  color?: string;
  icon?: string;
  order: string[]; // section names
}

export interface SectionManifest {
  version: number;
  color?: string;
  order: string[]; // page titles or IDs
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  accessToken: string;
  expiresAt: number;
  scope: string;
}

export interface ConflictItem {
  pageId: string;
  title: string;
  localContent: string;
  remoteContent: string;
  localUpdated: string;
  remoteUpdated: string;
  localRecord: PageRecord;
  remoteRecord: Partial<PageRecord>;
}

export interface SearchResultItem {
  id: string;
  title: string;
  bodySnippet: string;
  notebookName: string;
  sectionName: string;
  tags: string[];
  favorite: boolean;
  score: number;
}
