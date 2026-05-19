import { Suspense } from 'react';
import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import { prisma } from '@/lib/db';
import { UniversityCareerClient } from './career-client';

export default async function UniversityCareerPage() {
  const session = await requireSession('UNIVERSITY');
  const ctx = await getUniversityContext(session.user.id);
  const universityId = ctx?.university.id;

  if (!universityId) {
    return (
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/40" />}>
        <UniversityCareerClient
          partnerships={[]}
          careerPaths={[]}
          compatibility={[]}
          internships={[]}
          challenges={[]}
          analytics={{
            publishedPaths: 0,
            pendingPaths: 0,
            avgCompatibility: 0,
            activePartnerships: 0,
          }}
        />
      </Suspense>
    );
  }

  const [
    partnerships,
    careerPaths,
    students,
    publishedPaths,
    internships,
    challenges,
  ] = await Promise.all([
    prisma.companyPartnership.findMany({
      where: { universityId },
      include: {
        companyUser: { include: { companyProfile: true } },
        _count: { select: { careerPaths: true } },
      },
    }),
    prisma.careerPath.findMany({
      where: { universityId },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.studentProfile.findMany({
      where: { universityId },
      include: {
        user: {
          select: {
            name: true,
            careerTargets: {
              include: {
                careerPath: {
                  select: { roleTitle: true, status: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.careerPath.count({
      where: { universityId, status: 'PUBLISHED' },
    }),
    prisma.internship.findMany({
      where: { universityId },
      include: {
        companyUser: { include: { companyProfile: true } },
      },
    }),
    prisma.companyChallenge.findMany({
      where: { universityId },
      include: {
        companyUser: { include: { companyProfile: true } },
      },
    }),
  ]);

  const pendingPaths = careerPaths.filter(
    (p) => p.status === 'PENDING_APPROVAL' || p.status === 'APPROVED'
  ).length;

  const compatibilityRows = students.flatMap((s) =>
    s.user.careerTargets.map((t) => ({
      id: `${s.id}-${t.id}`,
      studentName: s.user.name || 'Student',
      targetRole: t.roleTitle,
      companyName: t.companyName,
      compatibility: t.compatibility,
      pathTitle:
        t.careerPath?.status === 'PUBLISHED' ? t.careerPath.roleTitle : null,
    }))
  );

  const avgCompatibility =
    compatibilityRows.length > 0
      ? Math.round(
          compatibilityRows.reduce((sum, r) => sum + r.compatibility, 0) /
            compatibilityRows.length
        )
      : 0;

  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted/40" />}>
    <UniversityCareerClient
      partnerships={partnerships.map((p) => ({
        id: p.id,
        companyName:
          p.companyUser.companyProfile?.companyName || p.contactName || 'Company',
        status: p.status,
        partnershipType: p.partnershipType,
        careerPathCount: p._count.careerPaths,
        contactEmail: p.contactEmail,
      }))}
      careerPaths={careerPaths.map((p) => ({
        id: p.id,
        roleTitle: p.roleTitle,
        companyName: p.companyName,
        industry: p.industry,
        status: p.status,
        publishedAt: p.publishedAt?.toISOString() ?? null,
      }))}
      compatibility={compatibilityRows}
      internships={internships.map((i) => ({
        id: i.id,
        title: i.title,
        companyName:
          i.companyUser.companyProfile?.companyName || 'Company',
        location: i.location,
        status: i.status,
      }))}
      challenges={challenges.map((c) => ({
        id: c.id,
        title: c.title,
        companyName:
          c.companyUser.companyProfile?.companyName || 'Company',
        deadline: c.deadline?.toISOString() ?? null,
        status: c.status,
      }))}
      analytics={{
        publishedPaths,
        pendingPaths,
        avgCompatibility,
        activePartnerships: partnerships.filter((p) => p.status === 'ACTIVE').length,
      }}
    />
    </Suspense>
  );
}
