import { requireSession } from '@/lib/session';
import { prisma } from '@/lib/db';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function UniversityNotificationsPage() {
  const session = await requireSession('UNIVERSITY');

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Calm, intelligent updates about your ecosystem."
      />
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No notifications yet. Partnership requests, career path approvals, and
              engagement alerts will appear here.
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read ? <Badge variant="brand">New</Badge> : null}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
