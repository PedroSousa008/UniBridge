import { NextRequest, NextResponse } from 'next/server';
import {
  loadCompanyOpportunitiesEcosystemHub,
  updateCompanyApplication,
} from '@/lib/company/company-opportunities-ecosystem-hub';
import { requireSession } from '@/lib/session';

export async function GET() {
  const session = await requireSession('COMPANY');
  const hub = await loadCompanyOpportunitiesEcosystemHub(session.user.id);
  return NextResponse.json(hub);
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession('COMPANY');
  const body = (await req.json()) as {
    applicationId?: string;
    status?: string;
    companyResponse?: string;
    priority?: boolean;
  };

  if (!body.applicationId) {
    return NextResponse.json({ error: 'applicationId required' }, { status: 400 });
  }

  const updated = await updateCompanyApplication(session.user.id, body.applicationId, {
    status: body.status,
    companyResponse: body.companyResponse,
    priority: body.priority,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  const hub = await loadCompanyOpportunitiesEcosystemHub(session.user.id);
  return NextResponse.json(hub);
}
