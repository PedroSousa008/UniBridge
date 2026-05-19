export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_DATA_URL_BYTES = 3 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export function validateImageFile(file: File, maxBytes = MAX_IMAGE_BYTES) {
  if (!IMAGE_TYPES.has(file.type)) {
    return 'Please upload a JPEG, PNG, WebP, GIF, or SVG image.';
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return `Image must be ${mb} MB or smaller.`;
  }
  return null;
}

export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the image from your device.'));
    reader.readAsDataURL(file);
  });
}

/** Load any image URL into a data URL so the cropper can display it reliably. */
export async function resolveImageSourceForCrop(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;

  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) throw new Error('fetch failed');
    return readFileAsDataUrl(await res.blob());
  } catch {
    return rasterizeImageUrl(src);
  }
}

function rasterizeImageUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (src.startsWith('http')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not prepare image for cropping.'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () =>
      reject(new Error('Could not load the image. Try uploading the file again.'));
    img.src = src;
  });
}

export function isVercelProduction() {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname.includes('unibridge')
  );
}

export function isLocalDev() {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}
