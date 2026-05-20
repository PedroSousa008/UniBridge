/** Profile images must be short HTTPS URLs — never base64 in User.image (breaks JWT cookies). */
const MAX_IMAGE_URL_LENGTH = 2048;

export function sanitizeProfileImageUrl(value: string | null | undefined): string | null {
  if (value == null || value === '') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return null;
  if (trimmed.length > MAX_IMAGE_URL_LENGTH) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
}
