'use client';

import { useRef, useState } from 'react';
import { upload } from '@vercel/blob/client';
import { FileUp, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  guessContentItemType,
  MAX_ACADEMIC_BYTES,
  validateAcademicFile,
} from '@/lib/uploads/validate-academic-file';
import { isLocalDev } from '@/lib/uploads/validate-image';

interface AcademicFileUploadProps {
  onUploaded: (result: { url: string; fileName: string; contentType: string }) => void;
  folder?: string;
  className?: string;
  disabled?: boolean;
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

  async function handleFile(file: File) {
    setUploading(true);
    setError('');
    const err = validateAcademicFile(file, MAX_ACADEMIC_BYTES);
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
        url = await uploadViaBlob(file);
      }
      setPickedName(file.name);
      onUploaded({
        url,
        fileName: file.name,
        contentType: guessContentItemType(file),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.webm,.mov,.mp3,.zip,image/*"
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
        PDF, slides, Office files, video, audio · up to 150 MB
      </p>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
