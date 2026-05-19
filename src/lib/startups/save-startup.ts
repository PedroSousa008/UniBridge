import { prisma } from '@/lib/db';
import { MILESTONE_TEMPLATES } from './constants';
import { computeStartupReadiness, type StartupPayload } from './readiness';

export async function saveStartupFull(
  startupId: string,
  founderId: string,
  payload: StartupPayload
) {
  const startup = await prisma.startup.findFirst({
    where: { id: startupId, founderId },
  });
  if (!startup) return null;

  const identity = payload.identity ?? {};
  const pitch = payload.pitch ?? {};
  const business = payload.business ?? {};
  const market = payload.market ?? {};

  const profile = await prisma.studentProfile.findUnique({
    where: { userId: founderId },
    select: { universityId: true },
  });

  await prisma.startup.update({
    where: { id: startupId },
    data: {
      universityId: profile?.universityId ?? startup.universityId,
      name: identity.name != null ? String(identity.name) : undefined,
      tagline: identity.tagline != null ? String(identity.tagline) || null : undefined,
      logoUrl: identity.logoUrl != null ? String(identity.logoUrl) || null : undefined,
      coverUrl: identity.coverUrl != null ? String(identity.coverUrl) || null : undefined,
      website: identity.website != null ? String(identity.website) || null : undefined,
      linkedIn: identity.linkedIn != null ? String(identity.linkedIn) || null : undefined,
      instagram: identity.instagram != null ? String(identity.instagram) || null : undefined,
      twitter: identity.twitter != null ? String(identity.twitter) || null : undefined,
      contactEmail: identity.contactEmail != null ? String(identity.contactEmail) || null : undefined,
      industry: identity.industry != null ? String(identity.industry) || null : undefined,
      stage: identity.stage != null ? String(identity.stage) || null : undefined,
      foundedAt: identity.foundedAt
        ? new Date(String(identity.foundedAt))
        : identity.foundedAt === ''
          ? null
          : undefined,
      problem: pitch.problem != null ? String(pitch.problem) || null : undefined,
      targetCustomer: pitch.targetCustomer != null ? String(pitch.targetCustomer) || null : undefined,
      solution: pitch.solution != null ? String(pitch.solution) || null : undefined,
      whyNow: pitch.whyNow != null ? String(pitch.whyNow) || null : undefined,
      differentiator: pitch.differentiator != null ? String(pitch.differentiator) || null : undefined,
      businessModelText: pitch.businessModel != null ? String(pitch.businessModel) || null : undefined,
      visionOneLiner: pitch.vision != null ? String(pitch.vision) || null : undefined,
      revenueModels: business.revenueModels as string[] | undefined,
      expectedPricing: business.expectedPricing != null ? String(business.expectedPricing) || null : undefined,
      targetCustomersBm: business.targetCustomers != null ? String(business.targetCustomers) || null : undefined,
      revenueGoal: business.revenueGoal != null ? String(business.revenueGoal) || null : undefined,
      monetizationStage: business.monetizationStage != null ? String(business.monetizationStage) || null : undefined,
      targetMarket: market.targetMarket != null ? String(market.targetMarket) || null : undefined,
      marketSizeEstimate: market.marketSize != null ? String(market.marketSize) || null : undefined,
      competitors: market.competitors != null ? String(market.competitors) || null : undefined,
      currentAlternatives: market.alternatives != null ? String(market.alternatives) || null : undefined,
      sectionVisibility: payload.visibility ?? undefined,
      defaultVisibility: payload.visibility?.default ?? undefined,
      lookingFor: payload.openings?.map((o) => o.role) ?? undefined,
    },
  });

  if (payload.media) {
    await prisma.startupMedia.deleteMany({ where: { startupId } });
    if (payload.media.length > 0) {
      await prisma.startupMedia.createMany({
        data: payload.media.map((m, i) => ({
          startupId,
          type: m.type,
          title: m.title ?? null,
          url: m.url,
          sortOrder: i,
        })),
      });
    }
  }

  if (payload.milestones) {
    for (const m of payload.milestones) {
      await prisma.startupMilestone.upsert({
        where: { startupId_key: { startupId, key: m.key } },
        create: {
          startupId,
          key: m.key,
          label: m.label,
          status: m.status,
          date: m.date ? new Date(m.date) : null,
          proofUrl: m.proofUrl ?? null,
          notes: m.notes ?? null,
        },
        update: {
          status: m.status,
          date: m.date ? new Date(m.date) : null,
          proofUrl: m.proofUrl ?? null,
          notes: m.notes ?? null,
        },
      });
    }
  } else {
    for (const t of MILESTONE_TEMPLATES) {
      await prisma.startupMilestone.upsert({
        where: { startupId_key: { startupId, key: t.key } },
        create: { startupId, key: t.key, label: t.label, status: 'pending' },
        update: {},
      });
    }
  }

  if (payload.traction) {
    for (const t of payload.traction) {
      await prisma.startupTractionMetric.upsert({
        where: { startupId_metricKey: { startupId, metricKey: t.metricKey } },
        create: {
          startupId,
          metricKey: t.metricKey,
          label: t.label,
          value: t.value ?? null,
          isPrivate: !!t.isPrivate,
        },
        update: {
          value: t.value ?? null,
          isPrivate: !!t.isPrivate,
        },
      });
    }
  }

  if (payload.openings) {
    await prisma.startupOpening.deleteMany({ where: { startupId } });
    if (payload.openings.length > 0) {
      await prisma.startupOpening.createMany({
        data: payload.openings.map((o) => ({
          startupId,
          role: o.role,
          description: o.description ?? null,
          skillsRequired: o.skillsRequired ?? [],
          timeCommitment: o.timeCommitment ?? null,
          compensation: o.compensation ?? null,
        })),
      });
    }
  }

  if (payload.members) {
    for (const m of payload.members) {
      if (m.userId) {
        await prisma.startupMember.upsert({
          where: { startupId_userId: { startupId, userId: m.userId } },
          create: {
            startupId,
            userId: m.userId,
            role: m.role,
            photoUrl: m.photoUrl ?? null,
            course: m.course ?? null,
            yearOfStudy: m.yearOfStudy ?? null,
            linkedIn: m.linkedIn ?? null,
            bio: m.bio ?? null,
            ownershipPercent: m.ownershipPercent ?? null,
            ownershipPrivate: m.ownershipPrivate ?? true,
            isMainFounder: !!m.isMainFounder,
          },
          update: {
            role: m.role,
            photoUrl: m.photoUrl ?? null,
            course: m.course ?? null,
            yearOfStudy: m.yearOfStudy ?? null,
            linkedIn: m.linkedIn ?? null,
            bio: m.bio ?? null,
            ownershipPercent: m.ownershipPercent ?? null,
            ownershipPrivate: m.ownershipPrivate ?? true,
            isMainFounder: !!m.isMainFounder,
          },
        });
      } else if (m.email) {
        const user = await prisma.user.findUnique({
          where: { email: String(m.email).toLowerCase() },
        });
        if (user) {
          await prisma.startupMember.upsert({
            where: { startupId_userId: { startupId, userId: user.id } },
            create: {
              startupId,
              userId: user.id,
              role: m.role,
              isMainFounder: !!m.isMainFounder,
            },
            update: { role: m.role, isMainFounder: !!m.isMainFounder },
          });
        }
      }
    }
  }

  const full = await prisma.startup.findUnique({
    where: { id: startupId },
    include: {
      members: true,
      media: true,
      milestones: true,
      tractionMetrics: true,
      openings: true,
    },
  });

  if (full) {
    const { readinessScore, progressPercent } = computeStartupReadiness(full);
    await prisma.startup.update({
      where: { id: startupId },
      data: { readinessScore, progressPercent },
    });
  }

  return prisma.startup.findUnique({
    where: { id: startupId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      media: { orderBy: { sortOrder: 'asc' } },
      milestones: { orderBy: { sortOrder: 'asc' } },
      tractionMetrics: true,
      openings: true,
      founder: { select: { id: true, name: true, email: true, image: true } },
    },
  });
}
