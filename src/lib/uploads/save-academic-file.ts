import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
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

/** Server-side academic upload — local development only. */
export async function saveUploadedAcademicFile(file: File, folder: string) {
  if (process.env.VERCEL === '1') {
    throw new Error(
      'Server file save is disabled on Vercel. Upload using the device picker in the app.'
    );
  }

  const err = validateAcademicFile(file, MAX_ACADEMIC_BYTES);
  if (err) throw new Error(err);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${folder}/${safeName(file.name)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return saveBlob(buffer, filename, file.type);
  }

  return saveLocal(buffer, filename.replace(/\//g, '-'));
}
