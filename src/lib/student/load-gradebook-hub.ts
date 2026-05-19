import { prisma } from '@/lib/db';
import { ensureGradebookTables } from '@/lib/db/ensure-gradebook-schema';
import {
  buildGradebookDashboard,
  DEFAULT_THRESHOLDS,
  type GradebookDashboard,
} from '@/lib/student/gradebook-engine';
import { loadSubjectWorkspace } from '@/lib/student/subject-context';
import { serializeSubjectWorkspace } from '@/lib/student/serialize-workspace';

export interface GradebookHubPayload {
  dashboard: GradebookDashboard;
  preferences: {
    goodMin: number;
    moderateMin: number;
    passMin: number;
    targetGpa: number | null;
    creditsCompleted: number;
    creditsRequired: number;
    ectsPerSubject: number;
  };
  dbReady: boolean;
}

export async function loadGradebookHub(studentId: string): Promise<GradebookHubPayload> {
  const dbReady = await ensureGradebookTables();

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId },
    include: {
      subject: { select: { id: true, status: true } },
    },
  });

  const active = enrollments.filter((e) => e.subject.status === 'ACTIVE');

  const workspaces = await Promise.all(
    active.map((e) => loadSubjectWorkspace(studentId, e.subject.id))
  );

  let prefs = {
    goodMin: DEFAULT_THRESHOLDS.goodMin,
    moderateMin: DEFAULT_THRESHOLDS.moderateMin,
    passMin: DEFAULT_THRESHOLDS.passMin,
    targetGpa: null as number | null,
    creditsCompleted: active.length * 6,
    creditsRequired: 180,
    ectsPerSubject: 6,
  };

  if (dbReady) {
    const row = await prisma.studentGradebookPreference.findUnique({
      where: { studentId },
    });
    if (row) {
      prefs = {
        goodMin: row.goodMin,
        moderateMin: row.moderateMin,
        passMin: row.passMin,
        targetGpa: row.targetGpa,
        creditsCompleted: row.creditsCompleted,
        creditsRequired: row.creditsRequired,
        ectsPerSubject: row.ectsPerSubject,
      };
    }
  }

  const dashboard = buildGradebookDashboard(workspaces, prefs);

  return {
    dashboard,
    preferences: prefs,
    dbReady,
  };
}

export async function loadGradebookHubSerialized(studentId: string) {
  const hub = await loadGradebookHub(studentId);
  return {
    ...hub,
    dashboard: JSON.parse(JSON.stringify(hub.dashboard)) as GradebookDashboard,
  };
}
