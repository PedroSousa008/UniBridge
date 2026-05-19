import type { Area } from 'react-easy-crop';

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', reject);
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

/** Render cropped region to a JPEG blob (optionally scaled to maxWidth). */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  maxWidth = 1600
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');

  let outW = pixelCrop.width;
  let outH = pixelCrop.height;
  if (outW > maxWidth) {
    const scale = maxWidth / outW;
    outW = maxWidth;
    outH = Math.round(pixelCrop.height * scale);
  }

  canvas.width = outW;
  canvas.height = outH;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not export cropped image'));
      },
      'image/jpeg',
      0.92
    );
  });
}

export function blobToFile(blob: Blob, name: string) {
  return new File([blob], name.replace(/\.\w+$/, '') + '.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

export const CROP_ASPECT = {
  square: 1,
  banner: 16 / 9,
} as const;
