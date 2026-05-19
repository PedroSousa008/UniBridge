'use client';

import { Plus, Rocket, Search } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';

interface Startup {
  id: string;
  name: string;
  tagline: string | null;
  industry: string | null;
  stage: string | null;
}

export function StudentStartupClient({ startups }: { startups: Startup[] }) {
  const { tr } = useI18n();

  return (
    <div>
      <PageHeader
        title={tr('student.startup.title')}
        subtitle={tr('student.startup.subtitle')}
      />
      <div className="mb-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/student/startup/create">
            <Plus className="h-4 w-4" />
            {tr('student.startup.create')}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/student/startup/discover">
            <Search className="h-4 w-4" />
            {tr('student.startup.discover')}
          </Link>
        </Button>
      </div>

      {startups.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title={tr('common.emptyState')}
          description={tr('common.comingSoon')}
          action={
            <Button asChild>
              <Link href="/student/startup/create">{tr('student.startup.create')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {startups.map((startup) => (
            <Link
              key={startup.id}
              href={`/student/startup/${startup.id}`}
              className="rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-all hover:shadow-elevated"
            >
              <h3 className="text-lg font-semibold">{startup.name}</h3>
              {startup.tagline ? (
                <p className="mt-2 text-sm text-muted-foreground">{startup.tagline}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
