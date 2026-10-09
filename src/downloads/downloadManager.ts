/**
 * Pure download helpers (no native dependencies — unit-tested).
 * Privacy: filenames are derived from the URL path only; query strings,
 * which may contain search terms or tokens, are stripped before use.
 */

export const DOWNLOAD_DIR_NAME = 'orizen-downloads';

const ILLEGAL_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  txt: 'text/plain',
  csv: 'text/csv',
  html: 'text/html',
  json: 'application/json',
  apk: 'application/vnd.android.package-archive',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/zip': 'zip',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'audio/mpeg': 'mp3',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

export function sanitizeFilename(raw: string): string {
  let name = raw;
  try {
    name = decodeURIComponent(name);
  } catch {
    // keep raw when decoding fails
  }
  name = name.replace(ILLEGAL_CHARS, '_').replace(/^[\s.]+|[\s.]+$/g, '');
  if (name.length > 100) {
    const dot = name.lastIndexOf('.');
    const ext = dot > 0 ? name.slice(dot) : '';
    name = `${name.slice(0, 100 - ext.length)}${ext}`;
  }
  return name || 'download';
}

export function filenameFromUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    const segment = parsed.pathname.split('/').filter(Boolean).pop() ?? '';
    if (segment && segment.includes('.')) return sanitizeFilename(segment);
    return sanitizeFilename(`${parsed.hostname.replace(/^www\./, '')}-download`);
  } catch {
    return 'download';
  }
}

export function filenameFromContentDisposition(header: string | null | undefined): string | null {
  if (!header) return null;
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) return sanitizeFilename(star[1]);
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  if (plain?.[1]) return sanitizeFilename(plain[1].trim());
  return null;
}

export function ensureExtension(filename: string, mimeType: string | null): string {
  if (!mimeType) return filename;
  const base = mimeType.split(';')[0]!.trim().toLowerCase();
  if (filename.includes('.')) return filename;
  const ext = EXT_BY_MIME[base];
  return ext ? `${filename}.${ext}` : filename;
}

export function mimeFromFilename(filename: string): string | null {
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return null;
  return MIME_BY_EXT[filename.slice(dot + 1).toLowerCase()] ?? null;
}

export function typeLabel(filename: string, mimeType: string | null): string {
  const mime = (mimeType ?? '').split(';')[0]!.trim().toLowerCase();
  if (mime.startsWith('image/')) return 'Image';
  if (mime.startsWith('video/')) return 'Video';
  if (mime.startsWith('audio/')) return 'Audio';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.includes('zip') || mime.includes('archive')) return 'Archive';
  if (mime.startsWith('text/')) return 'Document';
  const dot = filename.lastIndexOf('.');
  if (dot >= 0) return filename.slice(dot + 1).toUpperCase().slice(0, 8) || 'File';
  return 'File';
}

export function formatBytes(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function isDownloadableUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
