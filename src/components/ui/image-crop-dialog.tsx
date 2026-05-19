'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getCroppedImageBlob } from '@/lib/uploads/crop-image';
import { Loader2 } from 'lucide-react';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspect: number;
  title?: string;
  maxOutputWidth?: number;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  title = 'Adjust image',
  maxOutputWidth = 1600,
  onConfirm,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setError('');
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleApply() {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError('');
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, maxOutputWidth);
      await onConfirm(blob);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not crop image');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl gap-4 p-0 sm:p-0 overflow-hidden">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Drag to reposition. Pinch or use the slider to zoom. The frame shows what will be saved.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="relative h-[min(55vh,360px)] w-full bg-muted">
          {open && imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              objectFit="contain"
            />
          ) : null}
        </div>
        <div className="space-y-4 px-6 pb-6">
          <label className="flex items-center gap-3 text-sm">
            <span className="w-12 shrink-0 text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-primary"
            />
          </label>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <DialogFooter className="sm:justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving || !croppedAreaPixels} onClick={() => void handleApply()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Apply crop'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
