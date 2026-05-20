'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateImageFile, MAX_IMAGE_BYTES } from '@/lib/uploads/validate-image';

export function RegisterProfilePhoto({
  file,
  onFileChange,
  previewUrl,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  previewUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(f: File) {
    const err = validateImageFile(f, MAX_IMAGE_BYTES);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    onFileChange(f);
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">Profile photo (optional)</span>
      <p className="text-xs text-muted-foreground">
        Add a photo now — it will appear on your profile and anywhere companies view you after you sign in.
      </p>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-dashed bg-muted/40',
            previewUrl && 'border-solid'
          )}
        >
          {previewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow"
                onClick={() => {
                  onFileChange(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
                aria-label="Remove photo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-[10px] font-medium">Add photo</span>
            </button>
          )}
        </div>
        {previewUrl ? (
          <button
            type="button"
            className="text-sm text-brand hover:underline"
            onClick={() => inputRef.current?.click()}
          >
            Change photo
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
