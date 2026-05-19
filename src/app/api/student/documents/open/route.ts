import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ensureDocumentTables } from '@/lib/db/ensure-documents-schema';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureDocumentTables();
  const body = await request.json();
  const docId = String(body.documentId || '');
  if (!docId) return NextResponse.json({ error: 'documentId required' }, { status: 400 });

  const existing = await prisma.studentDocumentPreference.findUnique({
    where: { studentId: session.user.id },
  });

  const prev = Array.isArray(existing?.recentOpens)
    ? (existing!.recentOpens as { id: string; at: string }[])
    : [];
  const recentOpens = [{ id: docId, at: new Date().toISOString() }, ...prev.filter((r) => r.id !== docId)].slice(
    0,
    30
  );

  await prisma.studentDocumentPreference.upsert({
    where: { studentId: session.user.id },
    create: { studentId: session.user.id, recentOpens },
    update: { recentOpens },
  });

  return NextResponse.json({ ok: true });
}
