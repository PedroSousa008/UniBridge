import { NextRequest, NextResponse } from 'next/server';
import { updateMyRepresentativeProfile } from '@/lib/company/company-profile-ecosystem-hub';
import { requireCompanyWorkspace } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  const { session } = await requireCompanyWorkspace();
  const body = (await req.json()) as {
    fullName?: string;
    image?: string | null;
    age?: number | null;
    roleInCompany?: string | null;
    phone?: string | null;
    bio?: string | null;
  };

  const hub = await updateMyRepresentativeProfile(session.user.id, body);
  if (!hub) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(hub);
}
