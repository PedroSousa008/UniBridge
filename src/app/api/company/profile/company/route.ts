import { NextRequest, NextResponse } from 'next/server';
import {
  loadCompanyProfileEcosystemHub,
  updateCompanySharedBranding,
} from '@/lib/company/company-profile-ecosystem-hub';
import { requireCompanyWorkspace } from '@/lib/session';

export async function PATCH(req: NextRequest) {
  const { session } = await requireCompanyWorkspace();
  const body = (await req.json()) as { bannerUrl?: string | null };

  const hub = await updateCompanySharedBranding(session.user.id, {
    bannerUrl: body.bannerUrl,
  });

  if (!hub) {
    return NextResponse.json({ error: 'Only the main owner can update company branding' }, { status: 403 });
  }

  return NextResponse.json(hub);
}
