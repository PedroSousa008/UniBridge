import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addJournalEntry, loadStudentInternshipsHub } from '@/lib/student/student-internships-hub';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, content, kind, internshipId } = await request.json();
  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
  }

  try {
    await addJournalEntry(session.user.id, { title, content, kind, internshipId });
    const hub = await loadStudentInternshipsHub(session.user.id);
    return NextResponse.json({ journal: hub.journal });
  } catch {
    return NextResponse.json({ error: 'Could not save entry' }, { status: 400 });
  }
}
