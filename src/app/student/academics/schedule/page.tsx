import { requireSession } from '@/lib/session';
import { loadStudentWeeklySchedule } from '@/lib/student/weekly-schedule';
import { WeeklyScheduleClient } from '@/components/student/schedule/weekly-schedule-client';
import { isPrismaSchemaMismatchError } from '@/lib/prisma-errors';

export default async function StudentWeeklySchedulePage() {
  const session = await requireSession('STUDENT');

  try {
    const { classes, subjects } = await loadStudentWeeklySchedule(session.user.id);
    return (
      <WeeklyScheduleClient
        initialClasses={classes}
        subjects={subjects}
        dbSyncNeeded={false}
      />
    );
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return (
        <WeeklyScheduleClient initialClasses={[]} subjects={[]} dbSyncNeeded={true} />
      );
    }
    throw error;
  }
}
