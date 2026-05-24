import { sanitizeProfileImageUrl } from '@/lib/auth-image';

/**
 * URLs safe to persist in the database and show to all users.
 * Never store data: URLs — they break auth cookies and disappear on login.
 */
export function sanitizeStoredImageUrl(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return null;
  if (trimmed.startsWith('/uploads/')) return trimmed;
  return sanitizeProfileImageUrl(trimmed);
}

export function isPersistableImageUrl(value: string | null | undefined): boolean {
  return sanitizeStoredImageUrl(value) === (value?.trim() || null);
}
