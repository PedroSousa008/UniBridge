import { requireSession } from '@/lib/session';
import { loadStudentDocumentsHub } from '@/lib/student/student-documents';
import { DocumentsLibraryClient } from '@/components/student/documents/documents-library-client';

export default async function StudentDocumentsPage() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentDocumentsHub(session.user.id);

  return (
    <DocumentsLibraryClient
      initialHub={JSON.parse(JSON.stringify(hub))}
    />
  );
}
