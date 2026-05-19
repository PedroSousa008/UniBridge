'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  className?: string;
  aspect?: 'square' | 'banner';
  hint?: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  folder = 'startup',
  className,
  aspect = 'square',
  hint = 'JPEG, PNG or WebP · max 5 MB',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
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
            <Image
              src={value}
              alt=""
              fill
              className="object-cover"
              unoptimized
            />
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
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <ImagePlus className="h-8 w-8" />
            )}
            <span className="text-xs font-medium">
              {uploading ? 'Uploading…' : 'Upload from device'}
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
          if (file) void handleFile(file);
        }}
      />
      {value ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          Replace image
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">{hint}</p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
