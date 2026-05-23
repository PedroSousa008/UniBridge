'use client';

import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { FileUp, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { VERCEL_SERVER_UPLOAD_MAX_BYTES } from '@/lib/uploads/blob-storage';
import {
  guessContentItemType,
  MAX_ACADEMIC_BYTES,
  validateAcademicFile,
} from '@/lib/uploads/validate-academic-file';

interface AcademicFileUploadProps {
  onUploaded: (result: { url: string; fileName: string; contentType: string }) => void;
  folder?: string;
  className?: string;
  disabled?: boolean;
}

function formatMaxSize(): string {
  const gb = MAX_ACADEMIC_BYTES / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb} GB` : `${Math.round(MAX_ACADEMIC_BYTES / (1024 * 1024))} MB`;
}

export function AcademicFileUpload({
  onUploaded,
  folder = 'subject-content',
  className,
  disabled,
}: AcademicFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pickedName, setPickedName] = useState<string | null>(null);

  async function uploadViaBlob(file: File) {
    const blob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/uploads',
      clientPayload: JSON.stringify({ folder }),
      multipart: file.size > 100 * 1024 * 1024,
    });
    return blob.url;
  }

  async function uploadViaForm(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await fetch('/api/uploads', { method: 'POST', body: formData });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url as string;
  }

  async function handleFile(file: File) {
    setUploading(true);
    setError('');
    const err = validateAcademicFile(file, MAX_ACADEMIC_BYTES);
    if (err) {
      setError(err);
      setUploading(false);
      return;
    }

    const preferServer = file.size <= VERCEL_SERVER_UPLOAD_MAX_BYTES;
    const attempts: Array<() => Promise<string>> = preferServer
      ? [() => uploadViaForm(file), () => uploadViaBlob(file)]
      : [() => uploadViaBlob(file), () => uploadViaForm(file)];

    let lastError: Error | null = null;
    for (const attempt of attempts) {
      try {
        const url = await attempt();
        setPickedName(file.name);
        onUploaded({
          url,
          fileName: file.name,
          contentType: guessContentItemType(file),
        });
        setUploading(false);
        return;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error('Upload failed');
      }
    }

    const message = lastError?.message ?? 'Upload failed';
    if (message.includes('client token') || message.includes('Blob')) {
      setError(
        `${message} If this keeps happening, open Vercel → your project → Storage → Create Blob Store, then redeploy.`
      );
    } else {
      setError(message);
    }
    setUploading(false);
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          {uploading ? 'Uploading…' : 'Choose file from device'}
        </Button>
        {pickedName ? (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            {pickedName}
            <button
              type="button"
              className="rounded p-0.5 hover:bg-muted"
              onClick={() => setPickedName(null)}
              aria-label="Clear"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        PDF, slides, Office, video, audio, images, ZIP · up to {formatMaxSize()}
      </p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
