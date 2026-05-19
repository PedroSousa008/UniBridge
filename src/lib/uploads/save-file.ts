import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

const MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export function validateImageFile(file: File) {
  if (!IMAGE_TYPES.has(file.type)) {
    return 'Please upload a JPEG, PNG, WebP, GIF, or SVG image.';
  }
  if (file.size > MAX_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

function safeName(original: string) {
  const ext = path.extname(original).toLowerCase() || '.jpg';
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
    contentType,
  });
  return blob.url;
}

export async function saveUploadedImage(file: File, folder: string) {
  const err = validateImageFile(file);
  if (err) throw new Error(err);

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = `${folder}/${safeName(file.name)}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return saveBlob(buffer, filename, file.type);
  }

  return saveLocal(buffer, filename.replace(/\//g, '-'));
}
