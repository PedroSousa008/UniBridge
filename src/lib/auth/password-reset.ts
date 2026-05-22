import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ensurePasswordResetTables } from '@/lib/db/ensure-password-reset-schema';
import { setUserPassword } from '@/lib/auth/password';

export type PasswordResetRequestDto = {
  id: string;
  userId: string;
  email: string;
  role: UserRole;
  userName: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
};

async function notifyOwners(title: string, message: string) {
  const owners = await prisma.user.findMany({
    where: { role: 'OWNER' },
    select: { id: true },
  });
  for (const owner of owners) {
    await prisma.notification.create({
      data: {
        userId: owner.id,
        type: 'SYSTEM',
        title,
        message,
        link: '/owner/control',
      },
    });
  }
}

async function notifyUser(userId: string, title: string, message: string, link: string) {
  await prisma.notification.create({
    data: {
      userId,
      type: 'SYSTEM',
      title,
      message,
      link,
    },
  });
}

function profileLinkForRole(role: UserRole): string {
  switch (role) {
    case 'STUDENT':
      return '/student/profile';
    case 'TEACHER':
      return '/teacher/profile';
    case 'UNIVERSITY':
      return '/university/profile';
    case 'COMPANY':
      return '/company/profile';
    case 'OWNER':
      return '/owner/control';
    default:
      return '/login';
  }
}

export async function getPasswordResetStatus(userId: string) {
  await ensurePasswordResetTables();
  try {
    const open = await prisma.passwordResetRequest.findFirst({
      where: {
        userId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!open) return { status: 'none' as const };
    return {
      status: open.status.toLowerCase() as 'pending' | 'approved',
      requestId: open.id,
      email: open.email,
      createdAt: open.createdAt.toISOString(),
    };
  } catch {
    return { status: 'none' as const };
  }
}

export async function createPasswordResetRequest(userId: string) {
  await ensurePasswordResetTables();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) return { ok: false as const, error: 'User not found' };

  if (user.role === 'OWNER') {
    return {
      ok: false as const,
      error: 'Platform owner accounts cannot use this flow. Contact infrastructure support.',
    };
  }

  const existing = await prisma.passwordResetRequest.findFirst({
    where: {
      userId,
      status: { in: ['PENDING', 'APPROVED'] },
    },
  });
  if (existing) {
    if (existing.status === 'APPROVED') {
      return {
        ok: true as const,
        alreadyApproved: true,
        message: 'Your reset is already approved. Set a new password below.',
      };
    }
    return {
      ok: true as const,
      alreadyPending: true,
      message: 'A reset request is already pending owner approval.',
    };
  }

  await prisma.passwordResetRequest.create({
    data: {
      userId: user.id,
      email: user.email,
      role: user.role,
      status: 'PENDING',
    },
  });

  await notifyOwners(
    'Password reset requested',
    `${user.name ?? user.email} (${user.role}) requested a password reset. Review in Control Center.`
  );

  return {
    ok: true as const,
    message: 'Request sent to the platform owner. You will be notified when approved.',
  };
}

export async function listPendingPasswordResets(): Promise<PasswordResetRequestDto[]> {
  await ensurePasswordResetTables();
  try {
    const rows = await prisma.passwordResetRequest.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      email: r.email,
      role: r.role,
      userName: r.user.name,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
    }));
  } catch {
    return [];
  }
}

export async function approvePasswordReset(requestId: string, ownerUserId: string) {
  await ensurePasswordResetTables();

  const req = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { role: true, email: true, name: true } } },
  });
  if (!req || req.status !== 'PENDING') {
    return { ok: false as const, error: 'Request not found or already handled' };
  }

  await prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      reviewedById: ownerUserId,
      reviewedAt: new Date(),
    },
  });

  const link = profileLinkForRole(req.user.role);
  await notifyUser(
    req.userId,
    'Password reset approved',
    'Your password reset was approved. Open your Profile → Security and set a new password.',
    link
  );

  return { ok: true as const };
}

export async function rejectPasswordReset(requestId: string, ownerUserId: string) {
  await ensurePasswordResetTables();

  const req = await prisma.passwordResetRequest.findUnique({ where: { id: requestId } });
  if (!req || req.status !== 'PENDING') {
    return { ok: false as const, error: 'Request not found or already handled' };
  }

  await prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewedById: ownerUserId,
      reviewedAt: new Date(),
    },
  });

  await notifyUser(
    req.userId,
    'Password reset declined',
    'Your password reset request was declined. Contact your administrator if you still need help.',
    profileLinkForRole(req.role)
  );

  return { ok: true as const };
}

export async function completePasswordReset(userId: string, newPassword: string) {
  await ensurePasswordResetTables();

  const approved = await prisma.passwordResetRequest.findFirst({
    where: { userId, status: 'APPROVED' },
    orderBy: { reviewedAt: 'desc' },
  });
  if (!approved) {
    return {
      ok: false as const,
      error: 'No approved reset request. Ask the platform owner to approve your request first.',
    };
  }

  const set = await setUserPassword(userId, newPassword);
  if (!set.ok) return set;

  await prisma.passwordResetRequest.update({
    where: { id: approved.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  return { ok: true as const };
}
