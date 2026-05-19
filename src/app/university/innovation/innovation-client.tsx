'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Rocket, Star, Eye } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { SectionTabs } from '@/components/university/section-tabs';
import { DataTable, type Column } from '@/components/university/data-table';
import { KpiCard } from '@/components/university/kpi-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'startups', label: 'Startups' },
  { id: 'founders', label: 'Founders' },
  { id: 'rankings', label: 'Rankings' },
  { id: 'talent', label: 'Talent' },
  { id: 'incubator', label: 'Incubator' },
];

export interface InnovationStartup {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
  founderName: string;
  featured: boolean;
  memberCount: number;
  readinessScore: number;
  progressPercent: number;
  lookingFor: string[];
}

export interface InnovationFounder {
  id: string;
  name: string;
  email: string;
  startupCount: number;
  topStartup: string | null;
}

export interface InnovationRanking {
  id: string;
  name: string;
  score: number;
  category: string;
}

export interface InnovationTalent {
  id: string;
  name: string;
  skills: string;
  startupName: string | null;
}

export interface IncubatorProgram {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  location: string | null;
}

export interface UniversityInnovationClientProps {
  kpis: {
    totalStartups: number;
    featuredStartups: number;
    activePrograms: number;
    founderCount: number;
  };
  startups: InnovationStartup[];
  founders: InnovationFounder[];
  rankings: InnovationRanking[];
  talent: InnovationTalent[];
  programs: IncubatorProgram[];
}

export function UniversityInnovationClient({
  kpis,
  startups,
  founders,
  rankings,
  talent,
  programs,
}: UniversityInnovationClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview');
  const [programOpen, setProgramOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t) setTab(t);
    if (searchParams.get('action') === 'add' && t === 'incubator') {
      setProgramOpen(true);
    }
  }, [searchParams]);

  async function patchStartup(id: string, action: 'feature' | 'unfeature' | 'view') {
    setActionId(id);
    try {
      const res = await fetch(`/api/university/startups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionId(null);
    }
  }

  const startupColumns: Column<InnovationStartup>[] = [
    { key: 'name', header: 'Startup', cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'founder', header: 'Founder', cell: (r) => r.founderName },
    { key: 'industry', header: 'Industry', cell: (r) => r.industry ?? '—' },
    { key: 'stage', header: 'Stage', cell: (r) => r.stage ?? '—' },
    {
      key: 'readiness',
      header: 'Readiness',
      cell: (r) => `${Math.round(r.readinessScore)}%`,
    },
    {
      key: 'featured',
      header: 'Featured',
      cell: (r) => (r.featured ? <Badge variant="brand">Featured</Badge> : '—'),
    },
    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={actionId === r.id}
            onClick={() => patchStartup(r.id, 'view')}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={actionId === r.id}
            onClick={() => patchStartup(r.id, r.featured ? 'unfeature' : 'feature')}
          >
            <Star className="h-3.5 w-3.5" />
            {r.featured ? 'Unfeature' : 'Feature'}
          </Button>
        </div>
      ),
    },
  ];

  const founderColumns: Column<InnovationFounder>[] = [
    { key: 'name', header: 'Founder', cell: (r) => r.name },
    { key: 'email', header: 'Email', cell: (r) => r.email },
    { key: 'startups', header: 'Startups', cell: (r) => r.startupCount },
    { key: 'top', header: 'Top startup', cell: (r) => r.topStartup ?? '—' },
  ];

  const rankingColumns: Column<InnovationRanking>[] = [
    { key: 'name', header: 'Startup', cell: (r) => r.name },
    { key: 'category', header: 'Category', cell: (r) => r.category },
    { key: 'score', header: 'Score', cell: (r) => r.score },
  ];

  const talentColumns: Column<InnovationTalent>[] = [
    { key: 'name', header: 'Student', cell: (r) => r.name },
    { key: 'skills', header: 'Skills / focus', cell: (r) => r.skills },
    { key: 'startup', header: 'Startup', cell: (r) => r.startupName ?? '—' },
  ];

  const programColumns: Column<IncubatorProgram>[] = [
    { key: 'title', header: 'Program', cell: (r) => r.title },
    { key: 'status', header: 'Status', cell: (r) => r.status },
    {
      key: 'deadline',
      header: 'Deadline',
      cell: (r) => (r.deadline ? new Date(r.deadline).toLocaleDateString() : '—'),
    },
    { key: 'location', header: 'Location', cell: (r) => r.location ?? '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Innovation & startups"
        subtitle="Startup ecosystem, founders, rankings, talent, and incubator programs."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total startups" value={kpis.totalStartups} icon={Rocket} />
        <KpiCard label="Featured" value={kpis.featuredStartups} icon={Star} />
        <KpiCard label="Incubator programs" value={kpis.activePrograms} href="/university/innovation?tab=incubator" />
        <KpiCard label="Founders" value={kpis.founderCount} href="/university/innovation?tab=founders" />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionTabs tabs={TABS} active={tab} onChange={setTab} className="flex-1 border-0 pb-0" />
        {tab === 'incubator' ? (
          <Button size="sm" onClick={() => setProgramOpen(true)}>
            <Plus className="h-4 w-4" />
            Create program
          </Button>
        ) : null}
      </div>

      {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}

      {tab === 'overview' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Ecosystem snapshot</p>
              <p className="mt-2 text-2xl font-semibold">{kpis.totalStartups} startups</p>
              <p className="mt-1 text-sm">
                {kpis.featuredStartups} featured · {kpis.activePrograms} active programs
              </p>
            </CardContent>
          </Card>
          <DataTable
            columns={startupColumns.slice(0, 4)}
            data={startups.slice(0, 5)}
            emptyMessage="No startups yet."
          />
        </div>
      ) : null}

      {tab === 'startups' ? (
        <DataTable columns={startupColumns} data={startups} emptyMessage="No startups yet." />
      ) : null}
      {tab === 'founders' ? (
        <DataTable columns={founderColumns} data={founders} emptyMessage="No founders yet." />
      ) : null}
      {tab === 'rankings' ? (
        <DataTable columns={rankingColumns} data={rankings} emptyMessage="No rankings data." />
      ) : null}
      {tab === 'talent' ? (
        <DataTable columns={talentColumns} data={talent} emptyMessage="No talent profiles yet." />
      ) : null}
      {tab === 'incubator' ? (
        <DataTable columns={programColumns} data={programs} emptyMessage="No incubator programs." />
      ) : null}

      <Dialog open={programOpen} onOpenChange={setProgramOpen}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              const fd = new FormData(e.currentTarget);
              try {
                const res = await fetch('/api/university/incubator-programs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: fd.get('title'),
                    description: fd.get('description'),
                    location: fd.get('location'),
                    eligibility: fd.get('eligibility'),
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed');
                setProgramOpen(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Create incubator program</DialogTitle>
              <DialogDescription>Launch a new program for student founders.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input name="title" placeholder="Program title" required />
              <Input name="location" placeholder="Location" />
              <Input name="eligibility" placeholder="Eligibility" />
              <textarea
                name="description"
                placeholder="Description"
                className="min-h-[80px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create program'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
