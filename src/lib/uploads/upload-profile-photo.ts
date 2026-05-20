import { upload } from '@vercel/blob/client';
import { isLocalDev, validateImageFile, MAX_IMAGE_BYTES } from '@/lib/uploads/validate-image';

/** Upload a profile photo file while authenticated. Returns public URL or null. */
export async function uploadProfilePhotoFile(file: File): Promise<string | null> {
  const err = validateImageFile(file, MAX_IMAGE_BYTES);
  if (err) throw new Error(err);

  if (isLocalDev()) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'profile');
      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.url) return data.url as string;
    } catch {
      /* try blob */
    }
  }

  try {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/uploads',
      clientPayload: JSON.stringify({ folder: 'profile' }),
    });
    return blob.url;
  } catch {
    /* Never persist base64 data URLs on User.image — they break auth JWT cookies on login */
    throw new Error('Could not upload photo. Try again or use a smaller image.');
  }
}

export async function saveUserProfileImage(imageUrl: string | null): Promise<void> {
  const res = await fetch('/api/user/image', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageUrl }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data.error as string) ?? 'Could not save profile photo');
  }
}
