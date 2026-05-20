import { NextRequest, NextResponse } from 'next/server';
import { getProfileExportHtml, loadStudentProfileHub } from '@/lib/student/student-profile-hub';
import { requireSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await requireSession('STUDENT');
  const format = request.nextUrl.searchParams.get('format') ?? 'profile';
  const hub = await loadStudentProfileHub(session.user.id);

  if (format === 'cv') {
    const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    return NextResponse.redirect(`${base}/api/student/career/cv/export?format=html`);
  }

  const html = getProfileExportHtml(hub);
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${hub.hero.name.replace(/\s+/g, '-')}-profile.html"`,
    },
  });
}
