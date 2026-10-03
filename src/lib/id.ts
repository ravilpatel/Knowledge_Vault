export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sanitizeFilename(title: string): string {
  // Remove characters forbidden in filenames on Windows / Mac / Linux
  const cleaned = title.replace(/[\\/:*?"<>|]/g, '').trim();
  return cleaned || 'Untitled';
}

export function generateAttachmentFilename(originalName: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randChars = Math.random().toString(36).substring(2, 8);
  const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${dateStr}-${randChars}-${cleanName}`;
}
