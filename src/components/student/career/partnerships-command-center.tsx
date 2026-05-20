'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  GitCompare,
  MapPin,
  Radio,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PartnershipsHub, PartnershipJob } from '@/lib/student/student-partnerships-hub';
import {
  JobComparisonTable,
  JobDetailPanel,
  PartnershipJobCard,
} from '@/components/student/career/partnership-job-card';

type JobFilter =
  | 'all'
  | 'available'
  | 'internships'
  | 'remote'
  | 'high_match'
  | 'saved'
  | 'newest';

const FILTERS: { id: JobFilter; label: string }[] = [
  { id: 'all', label: 'All roles' },
  { id: 'available', label: 'Only available' },
  { id: 'internships', label: 'Internships' },
  { id: 'remote', label: 'Remote' },
  { id: 'high_match', label: 'High compatibility' },
  { id: 'saved', label: 'Saved' },
  { id: 'newest', label: 'Newest' },
];

function CompanyCard({
  company,
  onBookmark,
  loading,
}: {
  company: PartnershipsHub['companies'][0];
  onBookmark: () => void;
  loading: boolean;
}) {
  return (
    <Card className="border-border/60 hover:shadow-md transition-shadow h-full">
      <CardContent className="py-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {company.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Badge variant="secondary" className="text-[10px] mb-2">
              {company.partnershipTier}
            </Badge>
            <Link href={company.href} className="font-semibold tracking-tight hover:text-brand block truncate">
              {company.name}
            </Link>
            {company.industry ? (
              <p className="text-xs text-muted-foreground mt-0.5">{company.industry}</p>
            ) : null}
            {company.headquarters ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {company.headquarters}
              </p>
            ) : null}
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              onBookmark();
            }}
          >
            <Star className={cn('h-4 w-4', company.isBookmarked && 'fill-amber-400 text-amber-500')} />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/40 py-2">
            <p className="text-lg font-semibold tabular-nums">{company.openPositions}</p>
            <p className="text-[10px] text-muted-foreground">Open roles</p>
          </div>
          <div className="rounded-lg bg-muted/40 py-2">
            <p className="text-lg font-semibold tabular-nums text-brand">{company.avgCompatibility}%</p>
            <p className="text-[10px] text-muted-foreground">Avg match</p>
          </div>
          <div className="rounded-lg bg-muted/40 py-2">
            <p className="text-xs font-medium leading-tight pt-1">{company.hiringStatus}</p>
            <p className="text-[10px] text-muted-foreground">Status</p>
          </div>
        </div>

        <Button variant="outline" className="w-full mt-4" asChild>
          <Link href={company.href}>View company</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function PartnershipsCommandCenter({ initialHub }: { initialHub: PartnershipsHub }) {
  const [hub, setHub] = useState(initialHub);
  const [filter, setFilter] = useState<JobFilter>('all');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialHub.jobs[0]?.id ?? null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [live, setLive] = useState(true);

  const fetchHub = useCallback(async () => {
    const res = await fetch('/api/student/career/partnerships');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => void fetchHub(), 60_000);
    return () => clearInterval(t);
  }, [live, fetchHub]);

  const filteredJobs = useMemo(() => {
    let list = [...hub.jobs];
    switch (filter) {
      case 'available':
        list = list.filter((j) => j.availabilityStatus === 'available');
        break;
      case 'internships':
        list = list.filter((j) => j.employmentType === 'internship');
        break;
      case 'remote':
        list = list.filter((j) => j.remoteType === 'remote' || j.remoteType === 'hybrid');
        break;
      case 'high_match':
        list = list.filter((j) => j.compatibility >= 75);
        break;
      case 'saved':
        list = list.filter((j) => j.isBookmarked);
        break;
      case 'newest':
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      default:
        break;
    }
    if (filter !== 'newest') {
      list.sort((a, b) => b.compatibility - a.compatibility);
    }
    return list;
  }, [hub.jobs, filter]);

  const selectedJob = useMemo(
    () => hub.jobs.find((j) => j.id === selectedJobId) ?? filteredJobs[0] ?? null,
    [hub.jobs, selectedJobId, filteredJobs]
  );

  const compareJobs = useMemo(
    () => compareIds.map((id) => hub.jobs.find((j) => j.id === id)).filter(Boolean) as PartnershipJob[],
    [compareIds, hub.jobs]
  );

  async function toggleCompanyBookmark(partnershipId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/student/career/partnerships/${partnershipId}/bookmark`, { method: 'POST' });
    if (res.ok) await fetchHub();
    setActionLoading(false);
  }

  async function toggleJobBookmark(jobId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/student/career/jobs/${jobId}/bookmark`, { method: 'POST' });
    if (res.ok) await fetchHub();
    setActionLoading(false);
  }

  async function becomeCandidate(jobId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/student/career/jobs/${jobId}/candidate`, { method: 'POST' });
    if (res.ok) await fetchHub();
    setActionLoading(false);
  }

  async function applyToJob(jobId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/student/career/jobs/${jobId}/apply`, { method: 'POST' });
    if (res.ok) await fetchHub();
    setActionLoading(false);
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  return (
    <div className="space-y-10 pb-12">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-emerald-500/5 p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-brand font-medium">
              <Radio className={cn('h-4 w-4', live && 'animate-pulse')} />
              University-connected marketplace
              <button
                type="button"
                className="text-xs text-muted-foreground underline ml-2"
                onClick={() => setLive((v) => !v)}
              >
                {live ? 'Pause' : 'Resume'}
              </button>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Curated opportunities from verified partners
            </h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              Every role is published and maintained by company accounts — real availability, real requirements,
              intelligent compatibility matching.
            </p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold">{hub.companies.length}</p>
              <p className="text-xs text-muted-foreground">Partners</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-brand">{hub.jobs.length}</p>
              <p className="text-xs text-muted-foreground">Live roles</p>
            </div>
          </div>
        </div>
      </section>

      {!hub.hasCompanyData ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-5 py-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Partnerships activate when companies join your university</p>
          <p>
            Your university links verified company accounts. Once partners publish roles, they appear here with
            real-time compatibility scores — never generic listings.
          </p>
        </div>
      ) : null}

      {/* Company cards */}
      {hub.companies.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Partner companies
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hub.companies.map((c) => (
              <CompanyCard
                key={c.id}
                company={c}
                loading={actionLoading}
                onBookmark={() => void toggleCompanyBookmark(c.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* Jobs marketplace */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Intelligent role matching
          </h3>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <Card className="border-dashed border-border/80">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No roles match this filter. Partners publish opportunities directly — check back as companies activate
              hiring.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {filteredJobs.map((job) => (
                <PartnershipJobCard
                  key={job.id}
                  job={job}
                  selected={selectedJob?.id === job.id}
                  compare={compareIds.includes(job.id)}
                  loading={actionLoading}
                  onSelect={() => setSelectedJobId(job.id)}
                  onToggleBookmark={() => void toggleJobBookmark(job.id)}
                  onToggleCompare={() => toggleCompare(job.id)}
                  onBecomeCandidate={() => void becomeCandidate(job.id)}
                  onApply={() => void applyToJob(job.id)}
                />
              ))}
            </div>

            {selectedJob ? (
              <Card className="border-border/60 lg:sticky lg:top-4 h-fit">
                <CardHeader>
                  <CardTitle className="text-base">{selectedJob.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedJob.companyName}</p>
                </CardHeader>
                <CardContent>
                  <JobDetailPanel job={selectedJob} />
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </section>

      {/* Compare */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare roles
          </h3>
          {compareIds.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setCompareIds([])}>
              Clear
            </Button>
          ) : null}
        </div>
        {compareIds.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {compareJobs.map((j) => (
              <Badge key={j.id} variant="secondary">
                {j.title} · {j.compatibility}%
              </Badge>
            ))}
          </div>
        ) : null}
        {compareJobs.length >= 2 ? (
          <JobComparisonTable jobs={compareJobs} />
        ) : (
          <p className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            Select Compare on up to 3 role cards to evaluate salary, compatibility, skills, and progression side by
            side.
          </p>
        )}
      </section>
    </div>
  );
}
