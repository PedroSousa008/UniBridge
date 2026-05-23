import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { authOptions } from '@/lib/auth';
import {
  blobSetupHint,
  isAcademicUploadFolder,
  isBlobStorageConfigured,
  MAX_ACADEMIC_BYTES,
  VERCEL_SERVER_UPLOAD_MAX_BYTES,
} from '@/lib/uploads/blob-storage';
import { saveUploadedAcademicFile } from '@/lib/uploads/save-academic-file';
import { saveUploadedImage } from '@/lib/uploads/save-file';
import { MAX_IMAGE_BYTES } from '@/lib/uploads/validate-image';

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export const runtime = 'nodejs';

/** Vercel Blob client token (browser → Blob) or server multipart upload. */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    if (!isBlobStorageConfigured()) {
      return NextResponse.json(
        {
          error: `Blob storage is not configured. ${blobSetupHint()}`,
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as HandleUploadBody;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          let folder = 'general';
          if (clientPayload) {
            try {
              const parsed = JSON.parse(clientPayload as string) as { folder?: string };
              folder = String(parsed.folder || 'general').replace(/[^a-z0-9-_/]/gi, '');
            } catch {
              /* default folder */
            }
          }

          const safeName = pathname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const isAcademic = isAcademicUploadFolder(folder);

          if (isAcademic) {
            return {
              pathname: `uploads/${session.user.id}/${folder}/${safeName}`,
              maximumSizeInBytes: MAX_ACADEMIC_BYTES,
              addRandomSuffix: true,
            };
          }

          return {
            pathname: `uploads/${session.user.id}/${folder}/${safeName}`,
            allowedContentTypes: IMAGE_TYPES,
            maximumSizeInBytes: MAX_IMAGE_BYTES,
            addRandomSuffix: true,
          };
        },
        onUploadCompleted: async () => {
          /* optional hook */
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Upload failed';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = String(formData.get('folder') || 'general').replace(/[^a-z0-9-_/]/gi, '');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isAcademic = isAcademicUploadFolder(folder);

    if (
      process.env.VERCEL === '1' &&
      file.size > VERCEL_SERVER_UPLOAD_MAX_BYTES &&
      isAcademic
    ) {
      return NextResponse.json(
        {
          error:
            'This file is too large for a server upload. Use the device upload button (direct to cloud storage).',
        },
        { status: 413 }
      );
    }

    if (!isBlobStorageConfigured() && process.env.VERCEL === '1') {
      return NextResponse.json(
        { error: `File storage is not configured. ${blobSetupHint()}` },
        { status: 503 }
      );
    }

    const url = isAcademic
      ? await saveUploadedAcademicFile(file, `${session.user.id}/${folder}`)
      : await saveUploadedImage(file, `${session.user.id}/${folder}`);
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
