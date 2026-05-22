export const MAX_ACADEMIC_BYTES = 150 * 1024 * 1024; // 150 MB

const ACADEMIC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp4',
  'application/zip',
  'application/x-zip-compressed',
]);

const ACADEMIC_EXT = /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt|mp4|webm|mov|mp3|zip)$/i;

export function validateAcademicFile(file: File, maxBytes = MAX_ACADEMIC_BYTES): string | null {
  if (file.size > maxBytes) {
    return `File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).`;
  }
  const mimeOk = file.type && (ACADEMIC_MIME.has(file.type) || file.type.startsWith('image/'));
  const extOk = ACADEMIC_EXT.test(file.name);
  if (!mimeOk && !extOk) {
    return 'Unsupported file type. Use PDF, Office documents, video, audio, or ZIP.';
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

export const ACADEMIC_UPLOAD_CONTENT_TYPES = [
  ...ACADEMIC_MIME,
  'image/jpeg',
  'image/png',
  'image/webp',
];
