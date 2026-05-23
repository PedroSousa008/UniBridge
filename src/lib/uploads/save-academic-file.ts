import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { isBlobStorageConfigured } from './blob-storage';
import { MAX_ACADEMIC_BYTES, validateAcademicFile } from './validate-academic-file';

function safeName(original: string) {
  const ext = path.extname(original).toLowerCase() || '.bin';
  const base = randomBytes(12).toString('hex');
  return `${base}${ext}`;
}

async function saveLocal(buffer: Buffer, filename: string) {
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${filename}`;
}

async function saveBlob(buffer: Buffer, filename: string, contentType: string) {
  const { put } = await import('@vercel/blob');
  const blob = await put(`uploads/${filename}`, buffer, {
    access: 'public',
    contentType: contentType || 'application/octet-stream',
  });
  return blob.url;
}

/** Server-side academic upload (multipart form or dev fallback). */
export async function saveUploadedAcademicFile(file: File, folder: string) {
  const err = validateAcademicFile(file, MAX_ACADEMIC_BYTES);
  if (err) throw new Error(err);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${folder}/${safeName(file.name)}`;

  if (isBlobStorageConfigured()) {
    return saveBlob(buffer, filename, file.type);
  }

  if (process.env.VERCEL === '1') {
    throw new Error(
      'File storage is not configured on the server. Connect Vercel Blob in your project Storage settings.'
    );
  }

  return saveLocal(buffer, filename.replace(/\//g, '-'));
}
