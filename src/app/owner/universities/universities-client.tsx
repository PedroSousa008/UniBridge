'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

interface University {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date | string;
  universityProfile: {
    institution: string | null;
    position: string | null;
  } | null;
}

export function OwnerUniversitiesClient({
  universities,
}: {
  universities: University[];
}) {
  return (
    <div>
      <PageHeader
        title="Universities"
        subtitle="Rankings, engagement, onboarding, and employability metrics."
        badge="Owner OS"
      />

      {universities.length === 0 ? (
        <EmptyState
          iconName="building"
          title="No universities yet"
          description="University accounts will appear here once they register on the platform."
        />
      ) : (
        <div className="grid gap-4">
          {universities.map((uni) => (
            <Card key={uni.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                <div>
                  <p className="font-semibold">{uni.name || 'Unnamed account'}</p>
                  <p className="text-sm text-muted-foreground">{uni.email}</p>
                  {uni.universityProfile?.institution ? (
                    <p className="mt-1 text-sm">
                      {uni.universityProfile.institution}
                      {uni.universityProfile.position
                        ? ` · ${uni.universityProfile.position}`
                        : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">University</Badge>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(uni.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
