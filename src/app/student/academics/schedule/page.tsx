import { requireSession } from '@/lib/session';
import { loadStudentWeeklySchedule } from '@/lib/student/weekly-schedule';
import { WeeklyScheduleClient } from '@/components/student/schedule/weekly-schedule-client';

export default async function StudentWeeklySchedulePage() {
  const session = await requireSession('STUDENT');
  const { classes, subjects } = await loadStudentWeeklySchedule(session.user.id);

  return <WeeklyScheduleClient initialClasses={classes} subjects={subjects} />;
}
