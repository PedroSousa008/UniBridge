import { requireSession } from '@/lib/session';
import {
  isScheduleDatabaseReady,
  loadStudentWeeklySchedule,
} from '@/lib/student/weekly-schedule';
import { WeeklyScheduleClient } from '@/components/student/schedule/weekly-schedule-client';
import { isPrismaSchemaMismatchError } from '@/lib/prisma-errors';

export default async function StudentWeeklySchedulePage() {
  const session = await requireSession('STUDENT');
  const dbReady = await isScheduleDatabaseReady();

  try {
    const { classes, subjects } = await loadStudentWeeklySchedule(session.user.id);
    return (
      <WeeklyScheduleClient
        userId={session.user.id}
        initialClasses={classes}
        subjects={subjects}
        dbSyncNeeded={!dbReady}
      />
    );
  } catch (error) {
    if (isPrismaSchemaMismatchError(error)) {
      return (
        <WeeklyScheduleClient
          userId={session.user.id}
          initialClasses={[]}
          subjects={[]}
          dbSyncNeeded={!dbReady}
        />
      );
    }
    throw error;
  }
}
