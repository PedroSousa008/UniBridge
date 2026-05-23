import { ensureAssignmentTables } from '@/lib/db/ensure-assignment-schema';
import { ensureAttendanceTables } from '@/lib/db/ensure-attendance-schema';
import { ensureSubjectGradingColumns } from '@/lib/db/ensure-subject-grading-schema';
import { ensureSubjectCalendarTables } from '@/lib/db/ensure-subject-calendar-schema';

let teacherAcademicSchemaReady = false;

/** Run before teacher Workspace / Classes / subject ecosystem server loads. */
export async function ensureTeacherAcademicSchema(): Promise<void> {
  if (teacherAcademicSchemaReady) return;
  await Promise.all([
    ensureAttendanceTables(),
    ensureAssignmentTables(),
    ensureSubjectGradingColumns(),
    ensureSubjectCalendarTables(),
  ]);
  teacherAcademicSchemaReady = true;
}
