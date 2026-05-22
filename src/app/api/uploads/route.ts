import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { authOptions } from '@/lib/auth';
import { saveUploadedAcademicFile } from '@/lib/uploads/save-academic-file';
import { saveUploadedImage } from '@/lib/uploads/save-file';
import {
  ACADEMIC_UPLOAD_CONTENT_TYPES,
  MAX_ACADEMIC_BYTES,
} from '@/lib/uploads/validate-academic-file';
import { MAX_IMAGE_BYTES } from '@/lib/uploads/validate-image';

const IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

/** Vercel Blob client upload (browser → Blob directly). */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
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
              folder = String(parsed.folder || 'general').replace(/[^a-z0-9-_]/gi, '');
            } catch {
              /* use default folder */
            }
          }

          const safeName = pathname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const isAcademic =
            folder === 'subject-content' || folder === 'academic' || folder.startsWith('subject');
          return {
            pathname: `uploads/${session.user.id}/${folder}/${safeName}`,
            allowedContentTypes: isAcademic ? ACADEMIC_UPLOAD_CONTENT_TYPES : IMAGE_TYPES,
            maximumSizeInBytes: isAcademic ? MAX_ACADEMIC_BYTES : MAX_IMAGE_BYTES,
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

  if (process.env.VERCEL === '1') {
    return NextResponse.json(
      {
        error:
          'Direct file upload is not available on this server. Use the in-app upload button.',
      },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = String(formData.get('folder') || 'general').replace(/[^a-z0-9-_]/gi, '');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isAcademic =
      folder === 'subject-content' || folder === 'academic' || folder.startsWith('subject');
    const url = isAcademic
      ? await saveUploadedAcademicFile(file, `${session.user.id}/${folder}`)
      : await saveUploadedImage(file, `${session.user.id}/${folder}`);
    return NextResponse.json({ url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
