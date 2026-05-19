import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { loadStudentAttendanceHub } from '@/lib/student/student-attendance';
import { AttendanceCommandCenter } from '@/components/student/attendance/attendance-command-center';

async function AttendanceContent() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentAttendanceHub(session.user.id);

  return (
    <AttendanceCommandCenter
      initialHub={JSON.parse(JSON.stringify(hub))}
    />
  );
}

export default function StudentAttendancePage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Loading attendance…</p>}>
      <AttendanceContent />
    </Suspense>
  );
}
