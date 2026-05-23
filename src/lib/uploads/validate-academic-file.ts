import { MAX_ACADEMIC_BYTES } from './blob-storage';

export { MAX_ACADEMIC_BYTES };

const ACADEMIC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]);

const ACADEMIC_EXT =
  /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|csv|mp4|webm|mov|mp3|wav|zip|rar|7z|png|jpe?g|gif|webp)$/i;

export function validateAcademicFile(file: File, maxBytes = MAX_ACADEMIC_BYTES): string | null {
  if (file.size > maxBytes) {
    const gb = maxBytes / (1024 * 1024 * 1024);
    const label = gb >= 1 ? `${gb} GB` : `${Math.round(maxBytes / (1024 * 1024))} MB`;
    return `File is too large (max ${label}).`;
  }
  if (file.size === 0) return 'File is empty.';
  const mimeOk =
    !file.type ||
    ACADEMIC_MIME.has(file.type) ||
    file.type.startsWith('image/') ||
    file.type.startsWith('video/') ||
    file.type.startsWith('audio/');
  const extOk = ACADEMIC_EXT.test(file.name);
  if (!mimeOk && !extOk) {
    return 'Unsupported file type. Use PDF, Office documents, video, audio, images, or ZIP.';
  }
  return null;
}

export function guessContentItemType(file: File): string {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf')) return 'PDF';
  if (/\.(ppt|pptx)$/.test(n)) return 'SLIDES';
  if (/\.(mp4|webm|mov)$/.test(n)) return 'VIDEO';
  if (/\.(doc|docx|txt)$/.test(n)) return 'OTHER';
  if (/\.(xls|xlsx)$/.test(n)) return 'OTHER';
  return 'OTHER';
}

/** Used only for image uploads via the shared /api/uploads token route. */
export const ACADEMIC_UPLOAD_CONTENT_TYPES = [
  ...ACADEMIC_MIME,
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
