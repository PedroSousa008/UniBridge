import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sanitizeProfileImageUrl } from '@/lib/auth-image';
import type { UserRole, Locale } from '@prisma/client';

const VALID_ROLES: UserRole[] = [
  'STUDENT',
  'TEACHER',
  'UNIVERSITY',
  'COMPANY',
  'OWNER',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').toLowerCase().trim();
    const password = String(body.password || '');
    const name = String(body.name || '').trim();
    const role = body.role as UserRole;
    const locale = (body.locale === 'PT' ? 'PT' : 'EN') as Locale;

    if (!email || !password || !name || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    if (role === 'OWNER') {
      const ownerExists = await prisma.user.count({ where: { role: 'OWNER' } });
      const config = await prisma.platformConfig.findUnique({
        where: { id: 'platform' },
      });
      if (ownerExists > 0 || config?.ownerSlotTaken) {
        return NextResponse.json(
          { error: 'Owner role is no longer available' },
          { status: 403 }
        );
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const imageUrl =
      typeof body.image === 'string' ? sanitizeProfileImageUrl(body.image) : null;

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          role,
          locale,
          ...(imageUrl ? { image: imageUrl } : {}),
        },
      });

      if (role === 'STUDENT') {
        await tx.studentProfile.create({ data: { userId: created.id } });
      } else if (role === 'TEACHER') {
        await tx.teacherProfile.create({ data: { userId: created.id } });
      } else if (role === 'UNIVERSITY') {
        const institution = String(body.institution || name).trim() || 'University';
        const slug =
          institution
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) + `-${Date.now().toString(36)}`;
        const uni = await tx.university.create({
          data: {
            name: institution,
            slug,
            contactEmail: email,
            departments: [],
          },
        });
        await tx.universityProfile.create({
          data: {
            userId: created.id,
            institution,
            universityId: uni.id,
            position: body.position || null,
          },
        });
      } else if (role === 'COMPANY') {
        await tx.companyProfile.create({ data: { userId: created.id } });
      } else if (role === 'OWNER') {
        await tx.platformConfig.upsert({
          where: { id: 'platform' },
          update: { ownerSlotTaken: true },
          create: { id: 'platform', ownerSlotTaken: true },
        });
      }

      return created;
    });

    return NextResponse.json({ id: user.id, role: user.role }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
