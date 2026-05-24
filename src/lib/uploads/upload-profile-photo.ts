import { uploadStoredImageFile } from '@/lib/uploads/upload-stored-image';
import { validateImageFile, MAX_IMAGE_BYTES } from '@/lib/uploads/validate-image';

/** Upload a profile photo file while authenticated. Returns durable public URL. */
export async function uploadProfilePhotoFile(file: File): Promise<string | null> {
  const err = validateImageFile(file, MAX_IMAGE_BYTES);
  if (err) throw new Error(err);

  try {
    return await uploadStoredImageFile(file, 'profile');
  } catch {
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
