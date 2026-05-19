import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function StartupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession('STUDENT');
  const { id } = await params;

  const startup = await prisma.startup.findFirst({
    where: {
      id,
      OR: [
        { founderId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      founder: { select: { name: true } },
      members: { include: { user: { select: { name: true } } } },
    },
  });

  if (!startup) notFound();

  return (
    <div>
      <PageHeader
        title={startup.name}
        subtitle={startup.tagline || 'Your startup profile'}
        badge={startup.stage || undefined}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Industry</p>
              <p className="font-medium">{startup.industry || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm leading-relaxed">
                {startup.description || 'Add vision, roadmap, and milestones as you build.'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-3">Team</p>
            <ul className="space-y-2">
              {startup.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between text-sm">
                  <span>{member.user.name}</span>
                  <Badge variant="secondary">{member.role}</Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
