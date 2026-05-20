import { prisma } from '@/lib/db';
import {
  companyStageFromApplication,
  companyStageLabel,
} from '@/lib/company/company-intelligence';
import type { OpportunityStage } from '@/lib/career/opportunities-intelligence';

export interface CompanyInternshipRow {
  id: string;
  title: string;
  department: string | null;
  status: string;
  applicationsCount: number;
  universityName: string | null;
  href: string;
}

export interface CompanyPipelineRow {
  applicationId: string;
  studentId: string;
  studentName: string;
  studentUserId: string;
  roleTitle: string;
  internshipId: string;
  stage: OpportunityStage;
  stageLabel: string;
  compatibility: number | null;
  profileStrength: number;
  appliedAt: string | null;
  updatedAt: string;
  priority: boolean;
}

export interface CompanyOpportunitiesHub {
  internships: CompanyInternshipRow[];
  pipeline: CompanyPipelineRow[];
  byStage: Record<string, number>;
  serverTime: string;
}

export async function loadCompanyOpportunitiesHub(userId: string): Promise<CompanyOpportunitiesHub> {
  const [internships, applications] = await Promise.all([
    prisma.internship.findMany({
      where: { companyUserId: userId },
      include: {
        university: { select: { name: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.internshipApplication.findMany({
      where: { internship: { companyUserId: userId } },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        internship: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const internshipRows: CompanyInternshipRow[] = internships.map((i) => ({
    id: i.id,
    title: i.title,
    department: i.department,
    status: i.status,
    applicationsCount: i._count.applications,
    universityName: i.university?.name ?? null,
    href: `/company/opportunities?role=${i.id}`,
  }));

  const pipeline: CompanyPipelineRow[] = applications.map((app) => {
    const stage = companyStageFromApplication(app.status);
    return {
      applicationId: app.id,
      studentId: app.studentId,
      studentName: app.student.user.name ?? 'Student',
      studentUserId: app.student.userId,
      roleTitle: app.internship.title,
      internshipId: app.internship.id,
      stage,
      stageLabel: companyStageLabel(stage),
      compatibility: null,
      profileStrength: app.student.profileStrength,
      appliedAt: app.appliedAt?.toISOString() ?? null,
      updatedAt: app.updatedAt.toISOString(),
      priority: app.priority,
    };
  });

  const byStage: Record<string, number> = {};
  for (const p of pipeline) {
    byStage[p.stage] = (byStage[p.stage] ?? 0) + 1;
  }

  return {
    internships: internshipRows,
    pipeline,
    byStage,
    serverTime: new Date().toISOString(),
  };
}

export async function updateCompanyApplication(
  companyUserId: string,
  applicationId: string,
  data: { status?: string; companyResponse?: string; priority?: boolean }
) {
  const app = await prisma.internshipApplication.findFirst({
    where: { id: applicationId, internship: { companyUserId } },
  });
  if (!app) return null;

  return prisma.internshipApplication.update({
    where: { id: applicationId },
    data: {
      ...(data.status ? { status: data.status } : {}),
      ...(data.companyResponse !== undefined ? { companyResponse: data.companyResponse } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
    },
  });
}
