'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { upload } from '@vercel/blob/client';
import { Crop, ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImageCropDialog } from '@/components/ui/image-crop-dialog';
import { blobToFile, CROP_ASPECT } from '@/lib/uploads/crop-image';
import {
  isLocalDev,
  isVercelProduction,
  MAX_DATA_URL_BYTES,
  MAX_IMAGE_BYTES,
  readFileAsDataUrl,
  resolveImageSourceForCrop,
  validateImageFile,
} from '@/lib/uploads/validate-image';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
  aspect?: 'square' | 'banner';
  hint?: string;
  enableCrop?: boolean;
  /** Corner control only — for full-bleed hero backgrounds */
  variant?: 'default' | 'overlay';
  overlayClassName?: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  folder = 'startup',
  className,
  aspect = 'square',
  hint = 'JPEG, PNG or WebP · up to 15 MB · crop after upload',
  enableCrop = true,
  variant = 'default',
  overlayClassName,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropPreparing, setCropPreparing] = useState(false);
  const [error, setError] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState('');
  const [pendingName, setPendingName] = useState('image.jpg');

  const cropAspect = CROP_ASPECT[aspect];
  const maxOutputWidth = aspect === 'banner' ? 1920 : 1200;

  async function openCropper(src: string, fileName: string) {
    setCropPreparing(true);
    setError('');
    try {
      const dataUrl = await resolveImageSourceForCrop(src);
      setPendingName(fileName);
      setCropSource(dataUrl);
      setCropOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open image for cropping');
    } finally {
      setCropPreparing(false);
    }
  }

  async function uploadViaBlob(file: File) {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/uploads',
      clientPayload: JSON.stringify({ folder }),
    });
    return blob.url;
  }

  async function uploadViaForm(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await fetch('/api/uploads', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url as string;
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError('');

    const err = validateImageFile(file, MAX_IMAGE_BYTES);
    if (err) {
      setError(err);
      setUploading(false);
      return;
    }

    try {
      let url: string;

      if (isLocalDev()) {
        try {
          url = await uploadViaBlob(file);
        } catch {
          url = await uploadViaForm(file);
        }
      } else {
        try {
          url = await uploadViaBlob(file);
        } catch (blobError) {
          if (file.size <= MAX_DATA_URL_BYTES) {
            url = await readFileAsDataUrl(file);
          } else {
            throw blobError;
          }
        }
      }

      onChange(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      if (isVercelProduction() && !message.includes('Blob')) {
        setError(
          `${message} For large files, add Vercel Blob: Project → Storage → Create Blob Store.`
        );
      } else {
        setError(message);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRawFile(file: File) {
    const err = validateImageFile(file, MAX_IMAGE_BYTES);
    if (err) {
      setError(err);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    const skipCrop = !enableCrop || file.type === 'image/svg+xml';
    if (skipCrop) {
      void uploadFile(file);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingName(file.name);
      setCropSource(dataUrl);
      setCropOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read image');
    }
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleCroppedBlob(blob: Blob) {
    const file = blobToFile(blob, pendingName);
    setCropSource('');
    await uploadFile(file);
  }

  const busy = uploading || cropPreparing || cropOpen;

  if (variant === 'overlay') {
    return (
      <div className={cn('relative', className)}>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleRawFile(file);
          }}
        />
        <div className={cn('flex flex-wrap items-center gap-2', overlayClassName)}>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            className="bg-white/90 text-foreground shadow-md hover:bg-white"
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ImagePlus className="h-4 w-4 mr-2" />
            )}
            {value ? 'Change banner' : 'Add banner'}
          </Button>
          {value ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              className="bg-white/90 text-foreground shadow-md hover:bg-white"
              onClick={() => onChange('')}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
        <ImageCropDialog
          open={cropOpen}
          onOpenChange={(open) => {
            setCropOpen(open);
            if (!open) setCropSource('');
          }}
          imageSrc={cropSource}
          aspect={cropAspect}
          title={aspect === 'banner' ? 'Crop cover image' : 'Crop image'}
          maxOutputWidth={maxOutputWidth}
          onConfirm={handleCroppedBlob}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <span className="text-sm font-medium">{label}</span>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border border-dashed border-border bg-muted/30',
          aspect === 'banner' ? 'h-32' : 'h-36 w-full max-w-[180px]'
        )}
      >
        {value ? (
          <>
            <Image src={value} alt="" fill className="object-cover" unoptimized />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute right-2 top-2 h-8 w-8 p-0"
              onClick={() => onChange('')}
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {uploading || cropPreparing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <ImagePlus className="h-8 w-8" />
            )}
            <span className="text-xs font-medium">
              {uploading ? 'Uploading…' : cropPreparing ? 'Loading…' : 'Upload from device'}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleRawFile(file);
        }}
      />
      {value ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Replace image
          </Button>
          {enableCrop && !value.startsWith('data:image/svg') ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void openCropper(value, 'image.jpg')}
            >
              <Crop className="mr-1.5 h-3.5 w-3.5" />
              Adjust crop
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{hint}</p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <ImageCropDialog
        open={cropOpen}
        onOpenChange={(open) => {
          setCropOpen(open);
          if (!open) setCropSource('');
        }}
        imageSrc={cropSource}
        aspect={cropAspect}
        title={aspect === 'banner' ? 'Crop cover image' : 'Crop image'}
        maxOutputWidth={maxOutputWidth}
        onConfirm={handleCroppedBlob}
      />
    </div>
  );
}
