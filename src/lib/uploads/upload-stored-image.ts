import { upload } from '@vercel/blob/client';
import { VERCEL_SERVER_UPLOAD_MAX_BYTES } from '@/lib/uploads/blob-storage';
import { isLocalDev, validateImageFile, MAX_IMAGE_BYTES } from '@/lib/uploads/validate-image';

/** Upload an image to durable storage. Returns a public HTTPS URL (or local /uploads path in dev). */
export async function uploadStoredImageFile(file: File, folder = 'profile'): Promise<string> {
  const err = validateImageFile(file, MAX_IMAGE_BYTES);
  if (err) throw new Error(err);

  async function viaForm() {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await fetch('/api/uploads', { method: 'POST', body: formData });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
    return data.url;
  }

  async function viaBlob() {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/uploads',
      clientPayload: JSON.stringify({ folder }),
    });
    return blob.url;
  }

  const preferServer = file.size <= VERCEL_SERVER_UPLOAD_MAX_BYTES;
  const attempts = preferServer ? [viaForm, viaBlob] : [viaBlob, viaForm];

  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Upload failed');
    }
  }

  throw lastError ?? new Error('Could not upload image. Connect Vercel Blob or try a smaller file.');
}
