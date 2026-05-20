import { requireSession } from '@/lib/session';
import { loadStudentProfileHub } from '@/lib/student/student-profile-hub';
import { ProfileCommandCenter } from '@/components/student/profile/profile-command-center';
import { PageHeader } from '@/components/layout/page-header';

export default async function StudentProfilePage() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentProfileHub(session.user.id);

  return (
    <div>
      <PageHeader
        title="Professional Identity"
        subtitle="Your dynamic academic, career, and entrepreneurial journey — in one place."
      />
      <ProfileCommandCenter initialHub={JSON.parse(JSON.stringify(hub))} />
    </div>
  );
}
