import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureResourceTables } from '@/lib/db/ensure-resources-schema';
import { requireTeacherSubject } from '@/lib/teacher/subject-auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const { subjectId } = await params;
  const auth = await requireTeacherSubject(subjectId);
  if (auth.error) return auth.error;

  await ensureResourceTables();

  const body = await request.json();
  const title = String(body.title || '').trim();
  const description = String(body.description || body.reason || '').trim();
  if (!title || !description) {
    return NextResponse.json({ error: 'Title and description required' }, { status: 400 });
  }

  const url = body.url ? String(body.url) : null;
  const internalPath = body.internalPath ? String(body.internalPath) : null;
  const scope = internalPath ? 'INTERNAL' : 'EXTERNAL';

  const item = await prisma.resourceCatalogItem.create({
    data: {
      title,
      description,
      category: 'SUBJECT',
      subcategory: body.subcategory ? String(body.subcategory) : 'Professor Pick',
      scope: scope as 'INTERNAL' | 'EXTERNAL',
      url,
      internalPath,
      iconKey: body.iconKey ? String(body.iconKey) : 'book-open',
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      keywords: `${title} ${description}`.slice(0, 500),
      subjectId,
      recommendedById: auth.session.user.id,
      isOfficial: false,
      isTrending: false,
    },
  });

  return NextResponse.json({ resource: item }, { status: 201 });
}
