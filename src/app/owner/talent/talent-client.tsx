'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

interface Student {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date | string;
  studentProfile: { program: string | null; universityName: string | null } | null;
}

interface Startup {
  id: string;
  name: string;
  tagline: string | null;
  stage: string | null;
  industry: string | null;
  createdAt: Date | string;
  founder: { name: string | null };
}

export function OwnerTalentClient({
  students,
  startups,
}: {
  students: Student[];
  startups: Startup[];
}) {
  return (
    <div>
      <PageHeader
        title="Talent & Startups"
        subtitle="Emerging talent, founder discovery, and innovation analytics."
        badge="Owner OS"
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Students</h2>
          {students.length === 0 ? (
            <EmptyState
              iconName="trending-up"
              title="No students yet"
              description="Student accounts will appear here as they join the ecosystem."
              className="py-10"
            />
          ) : (
            <div className="space-y-3">
              {students.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <p className="font-medium">{s.name || 'Unnamed'}</p>
                    <p className="text-sm text-muted-foreground">{s.email}</p>
                    {s.studentProfile?.program || s.studentProfile?.universityName ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[s.studentProfile.program, s.studentProfile.universityName]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Startups</h2>
          {startups.length === 0 ? (
            <EmptyState
              iconName="rocket"
              title="No startups yet"
              description="Student-founded ventures will appear here once created."
              className="py-10"
            />
          ) : (
            <div className="space-y-3">
              {startups.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{s.name}</p>
                        {s.tagline ? (
                          <p className="text-sm text-muted-foreground">{s.tagline}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Founder: {s.founder.name || 'Unknown'}
                        </p>
                      </div>
                      {s.stage ? <Badge variant="secondary">{s.stage}</Badge> : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
