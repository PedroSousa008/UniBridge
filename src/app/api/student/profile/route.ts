import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ensureProfileIdentityTables } from '@/lib/db/ensure-profile-identity-schema';
import {
  isProfileVisibility,
  parseJsonArray,
  serializeVisibilityField,
  type ProfileVisibility,
} from '@/lib/career/profile-intelligence';
import { loadStudentProfileHub } from '@/lib/student/student-profile-hub';
import { requireSession } from '@/lib/session';

async function getOrCreateStudentProfile(userId: string) {
  let row = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!row) {
    row = await prisma.studentProfile.create({ data: { userId } });
  }
  return row;
}

export async function GET() {
  const session = await requireSession('STUDENT');
  const hub = await loadStudentProfileHub(session.user.id);
  return NextResponse.json(hub);
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession('STUDENT');
  const body = (await req.json()) as Record<string, unknown>;
  const dbReady = await ensureProfileIdentityTables();
  const studentRow = await getOrCreateStudentProfile(session.user.id);

  if (body.name != null || body.headline != null || body.bio != null || body.image != null) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(typeof body.name === 'string' ? { name: body.name } : {}),
        ...(typeof body.headline === 'string' ? { headline: body.headline } : {}),
        ...(typeof body.bio === 'string' ? { bio: body.bio } : {}),
        ...(typeof body.image === 'string' ? { image: body.image } : {}),
      },
    });
  }

  function parseVisibilityBody(key: string): string | undefined {
    const val = body[key];
    if (Array.isArray(val)) {
      const arr = val.filter((x): x is ProfileVisibility => typeof x === 'string' && isProfileVisibility(x));
      if (arr.length > 0) return serializeVisibilityField(arr);
    }
    if (typeof val === 'string' && isProfileVisibility(val)) {
      return serializeVisibilityField([val]);
    }
    return undefined;
  }

  if (dbReady) {
    const settingsData = {
      age: typeof body.age === 'number' ? body.age : undefined,
      personalLocation: typeof body.personalLocation === 'string' ? body.personalLocation : undefined,
      linkedIn: typeof body.linkedIn === 'string' ? body.linkedIn : undefined,
      portfolioUrl: typeof body.portfolioUrl === 'string' ? body.portfolioUrl : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      languages: Array.isArray(body.languages) ? body.languages : undefined,
      interests: Array.isArray(body.interests) ? body.interests : undefined,
      careerIndustries: Array.isArray(body.careerIndustries) ? body.careerIndustries : undefined,
      careerRoles: Array.isArray(body.careerRoles) ? body.careerRoles : undefined,
      careerGoals: Array.isArray(body.careerGoals) ? body.careerGoals : undefined,
      dreamCompanies: Array.isArray(body.dreamCompanies) ? body.dreamCompanies : undefined,
      openToInternships: typeof body.openToInternships === 'boolean' ? body.openToInternships : undefined,
      openToNetworking: typeof body.openToNetworking === 'boolean' ? body.openToNetworking : undefined,
      openToStartup: typeof body.openToStartup === 'boolean' ? body.openToStartup : undefined,
      openToFullTime: typeof body.openToFullTime === 'boolean' ? body.openToFullTime : undefined,
      visibilityProfile: parseVisibilityBody('visibilityProfile'),
      visibilityCv: parseVisibilityBody('visibilityCv'),
      visibilityProjects: parseVisibilityBody('visibilityProjects'),
      visibilityNetworking: parseVisibilityBody('visibilityNetworking'),
      visibilityAchievements: parseVisibilityBody('visibilityAchievements'),
      visibilityOpportunities: parseVisibilityBody('visibilityOpportunities'),
    };

    const clean = Object.fromEntries(Object.entries(settingsData).filter(([, v]) => v !== undefined));

    if (Object.keys(clean).length > 0) {
      await prisma.studentIdentitySettings.upsert({
        where: { studentProfileId: studentRow.id },
        create: { studentProfileId: studentRow.id, ...clean },
        update: clean,
      });
    }

    if (body.careerRoles && Array.isArray(body.careerRoles)) {
      const roles = parseJsonArray(body.careerRoles);
      for (const role of roles.slice(0, 5)) {
        const existing = await prisma.careerTarget.findFirst({
          where: { userId: session.user.id, roleTitle: role },
        });
        if (!existing) {
          await prisma.careerTarget.create({
            data: { userId: session.user.id, roleTitle: role, compatibility: 0 },
          });
        }
      }
    }
  }

  const hub = await loadStudentProfileHub(session.user.id);
  return NextResponse.json(hub);
}
