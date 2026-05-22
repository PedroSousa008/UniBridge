'use client';

import { PageHeader } from '@/components/layout/page-header';
import { OwnerPasswordResetPanel } from '@/app/owner/control/owner-password-reset-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function OwnerControlClient({
  ownerSlotTaken,
  userCount,
  owner,
}: {
  ownerSlotTaken: boolean;
  userCount: number;
  owner: { name: string | null; email: string; createdAt: Date | string } | null;
}) {
  return (
    <div>
      <PageHeader
        title="Control Center"
        subtitle="Feature flags, moderation, AI controls, and ecosystem settings."
        badge="Owner OS"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform owner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {owner ? (
              <>
                <p className="font-medium">{owner.name}</p>
                <p className="text-sm text-muted-foreground">{owner.email}</p>
                <p className="text-xs text-muted-foreground">
                  Since {new Date(owner.createdAt).toLocaleDateString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No owner registered.</p>
            )}
            <Badge variant={ownerSlotTaken ? 'default' : 'secondary'}>
              Owner slot {ownerSlotTaken ? 'filled' : 'available'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ecosystem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{userCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">Total registered users</p>
          </CardContent>
        </Card>

        <OwnerPasswordResetPanel />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Coming in next phases</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>Feature flags & experiments</li>
              <li>Global announcements</li>
              <li>AI usage controls</li>
              <li>Content moderation</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
