import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getExportHtml, loadStudentCvHub } from '@/lib/student/student-cv-hub';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'html';
  const versionId = searchParams.get('version') ?? undefined;

  const hub = await loadStudentCvHub(session.user.id, { versionId });
  const html = getExportHtml(hub);

  if (format === 'json') {
    return NextResponse.json({ html, hub });
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${hub.user.name.replace(/\s+/g, '-')}-cv.html"`,
    },
  });
}
