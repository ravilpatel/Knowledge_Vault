import { useAuthStore } from '../auth/authStore';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  modifiedTime?: string;
  version?: string;
  headRevisionId?: string;
  trashed?: boolean;
}

export class DriveClient {
  private static async getAuthHeader(): Promise<HeadersInit> {
    const user = useAuthStore.getState().user;
    if (!user || !user.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }
    return {
      Authorization: `Bearer ${user.accessToken}`,
    };
  }

  /**
   * Helper with retry and exponential backoff for quota / rate limits
   */
  private static async requestWithRetry(
    url: string,
    options: RequestInit,
    retries = 3,
    backoffMs = 800
  ): Promise<Response> {
    const isGuest = useAuthStore.getState().isGuest;
    if (isGuest) {
      throw new Error('Offline guest mode active. Cannot perform remote Drive API calls.');
    }

    try {
      const authHeaders = await this.getAuthHeader();
      const res = await fetch(url, {
        ...options,
        headers: {
          ...authHeaders,
          ...options.headers,
        },
      });

      if ((res.status === 403 || res.status === 429 || res.status >= 500) && retries > 0) {
        await new Promise((r) => setTimeout(r, backoffMs));
        return this.requestWithRetry(url, options, retries - 1, backoffMs * 2);
      }

      if (res.status === 401) {
        // Token expired
        useAuthStore.getState().setError('Google Drive session expired. Please sign in again.');
        throw new Error('Token expired');
      }

      return res;
    } catch (err) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, backoffMs));
        return this.requestWithRetry(url, options, retries - 1, backoffMs * 2);
      }
      throw err;
    }
  }

  /**
   * Find or create the root NoteVault folder in 'My Drive'
   */
  static async getOrCreateRootFolder(): Promise<string> {
    const query = "name = 'NoteVault' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents";
    const res = await this.requestWithRetry(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      { method: 'GET' }
    );
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create root folder
    const createRes = await this.requestWithRetry(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'NoteVault',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['root'],
      }),
    });
    const folder = await createRes.json();
    return folder.id;
  }

  /**
   * List files in a parent folder
   */
  static async listChildren(parentId: string, includeTrashed = false): Promise<DriveFile[]> {
    const trashedClause = includeTrashed ? '' : 'and trashed = false';
    const query = `'${parentId}' in parents ${trashedClause}`;
    const fields = 'nextPageToken, files(id, name, mimeType, modifiedTime, version, headRevisionId, parents, trashed)';

    let allFiles: DriveFile[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''
      }`;
      const res = await this.requestWithRetry(url, { method: 'GET' });
      const data = await res.json();
      if (data.files) {
        allFiles = allFiles.concat(data.files);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  /**
   * Create a folder inside a parent
   */
  static async createFolder(name: string, parentId: string): Promise<DriveFile> {
    const res = await this.requestWithRetry(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    });
    return res.json();
  }

  /**
   * Create or update a plain text / markdown file
   */
  static async uploadTextFile(
    name: string,
    content: string,
    parentId: string,
    existingFileId?: string
  ): Promise<DriveFile> {
    const metadata = {
      name,
      mimeType: 'text/markdown',
      ...(existingFileId ? {} : { parents: [parentId] }),
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/markdown; charset=UTF-8\r\n\r\n' +
      content +
      closeDelimiter;

    const url = existingFileId
      ? `${DRIVE_UPLOAD_BASE}/files/${existingFileId}?uploadType=multipart&fields=id,name,mimeType,modifiedTime,version,headRevisionId,trashed`
      : `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,version,headRevisionId,trashed`;

    const method = existingFileId ? 'PATCH' : 'POST';

    const res = await this.requestWithRetry(url, {
      method,
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    return res.json();
  }

  /**
   * Upload binary attachment (image or file)
   */
  static async uploadBinaryAttachment(
    name: string,
    blob: Blob,
    parentId: string,
    onProgress?: (pct: number) => void
  ): Promise<DriveFile> {
    const metadata = {
      name,
      mimeType: blob.type || 'application/octet-stream',
      parents: [parentId],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = new Blob([
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${blob.type || 'application/octet-stream'}\r\n\r\n`
    ]);
    const closePart = new Blob([closeDelimiter]);

    const multipartBody = new Blob([metadataPart, blob, closePart]);

    const url = `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,version,headRevisionId,trashed`;
    if (onProgress) onProgress(30);

    const res = await this.requestWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (onProgress) onProgress(100);
    return res.json();
  }

  /**
   * Download text content of a file
   */
  static async downloadFileText(fileId: string): Promise<string> {
    const res = await this.requestWithRetry(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      method: 'GET',
    });
    return res.text();
  }

  /**
   * Download binary content of a file as Blob
   */
  static async downloadFileBlob(fileId: string): Promise<Blob> {
    const res = await this.requestWithRetry(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
      method: 'GET',
    });
    return res.blob();
  }

  /**
   * Get file metadata (version, headRevisionId, modifiedTime)
   */
  static async getFileMetadata(fileId: string): Promise<DriveFile> {
    const res = await this.requestWithRetry(
      `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,modifiedTime,version,headRevisionId,trashed,parents`,
      { method: 'GET' }
    );
    return res.json();
  }

  /**
   * Rename a file or folder
   */
  static async renameFile(fileId: string, newName: string): Promise<DriveFile> {
    const res = await this.requestWithRetry(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    return res.json();
  }

  /**
   * Move file between folders
   */
  static async moveFile(fileId: string, newParentId: string, oldParentId: string): Promise<DriveFile> {
    const res = await this.requestWithRetry(
      `${DRIVE_API_BASE}/files/${fileId}?addParents=${newParentId}&removeParents=${oldParentId}`,
      { method: 'PATCH' }
    );
    return res.json();
  }

  /**
   * Move item to Trash (never files.delete!)
   */
  static async trashFile(fileId: string): Promise<DriveFile> {
    const res = await this.requestWithRetry(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });
    return res.json();
  }

  /**
   * Restore item from Trash
   */
  static async restoreFile(fileId: string): Promise<DriveFile> {
    const res = await this.requestWithRetry(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: false }),
    });
    return res.json();
  }

  /**
   * Changes API start token
   */
  static async getStartPageToken(): Promise<string> {
    const res = await this.requestWithRetry(`${DRIVE_API_BASE}/changes/startPageToken`, {
      method: 'GET',
    });
    const data = await res.json();
    return data.startPageToken;
  }

  /**
   * List incremental changes since startPageToken
   */
  static async listChanges(pageToken: string): Promise<{ changes: any[]; newStartPageToken?: string; nextPageToken?: string }> {
    const res = await this.requestWithRetry(
      `${DRIVE_API_BASE}/changes?pageToken=${encodeURIComponent(pageToken)}&fields=nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,modifiedTime,version,headRevisionId,parents,trashed))`,
      { method: 'GET' }
    );
    return res.json();
  }
}
