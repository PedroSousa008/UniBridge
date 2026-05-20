'use client';

import { useCallback, useState } from 'react';
import {
  Building2,
  ChevronRight,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { PartnershipCompanyDetail } from '@/lib/student/student-partnerships-hub';
import {
  JobDetailPanel,
  PartnershipJobCard,
} from '@/components/student/career/partnership-job-card';

export function PartnershipCompanyView({
  initialDetail,
}: {
  initialDetail: PartnershipCompanyDetail;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    initialDetail.allJobs[0]?.id ?? null
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const fetchDetail = useCallback(async () => {
    const res = await fetch(`/api/student/career/partnerships/${detail.id}`);
    if (res.ok) setDetail(await res.json());
  }, [detail.id]);

  const selectedJob = detail.allJobs.find((j) => j.id === selectedJobId) ?? detail.allJobs[0] ?? null;

  async function toggleBookmark() {
    setActionLoading(true);
    const res = await fetch(`/api/student/career/partnerships/${detail.id}/bookmark`, { method: 'POST' });
    if (res.ok) await fetchDetail();
    setActionLoading(false);
  }

  async function toggleJobBookmark(jobId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/student/career/jobs/${jobId}/bookmark`, { method: 'POST' });
    if (res.ok) await fetchDetail();
    setActionLoading(false);
  }

  async function becomeCandidate(jobId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/student/career/jobs/${jobId}/candidate`, { method: 'POST' });
    if (res.ok) await fetchDetail();
    setActionLoading(false);
  }

  async function applyToJob(jobId: string) {
    setActionLoading(true);
    const res = await fetch(`/api/student/career/jobs/${jobId}/apply`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.opportunitiesHref) {
        window.location.href = data.opportunitiesHref;
        return;
      }
      await fetchDetail();
    }
    setActionLoading(false);
  }

  const departments = onlyAvailable
    ? detail.departments
        .map((d) => ({
          ...d,
          jobs: d.jobs.filter((j) => j.availabilityStatus === 'available'),
        }))
        .filter((d) => d.jobs.length > 0)
    : detail.departments;

  const p = detail.presence;
  const compat = p?.compatibility;

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white">
        <div className="flex flex-wrap items-start gap-6">
          <div className="h-16 w-16 rounded-xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white/20">
            {detail.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-white/60" />
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <Badge className="mb-2 border-white/20 bg-white/10">{detail.partnershipTier}</Badge>
            <h2 className="text-2xl font-semibold">{detail.name}</h2>
            {p?.cultureHeadline ? (
              <p className="mt-2 text-white/80 italic">&ldquo;{p.cultureHeadline}&rdquo;</p>
            ) : null}
            {detail.industry ? <p className="text-sm text-white/70 mt-1">{detail.industry}</p> : null}
            {detail.headquarters ? (
              <p className="text-sm text-white/70 flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {detail.headquarters}
              </p>
            ) : null}
            <p className="text-sm mt-2 text-white/80">{detail.hiringStatus}</p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold">{detail.openPositions}</p>
              <p className="text-xs text-white/60">Open roles</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-brand-foreground">
                {compat?.overall ?? detail.avgCompatibility}%
              </p>
              <p className="text-xs text-white/60">Your compatibility</p>
            </div>
            {p ? (
              <div>
                <p className="text-2xl font-semibold">{p.attractivenessScore}</p>
                <p className="text-xs text-white/60">Attractiveness</p>
              </div>
            ) : null}
          </div>
          <Button
            variant="secondary"
            className="bg-white/10 text-white hover:bg-white/20"
            disabled={actionLoading}
            onClick={() => void toggleBookmark()}
          >
            <Star className={cn('mr-2 h-4 w-4', detail.isBookmarked && 'fill-amber-400 text-amber-500')} />
            {detail.isBookmarked ? 'Saved' : 'Save company'}
          </Button>
        </div>
      </section>

      {compat ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="border-brand/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" />
                Your compatibility with {detail.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Skills match', compat.skillsMatch],
                ['Leadership', compat.leadership],
                ['Communication', compat.communication],
                ['Startup activity', compat.startupActivity],
                ['Academic alignment', compat.academicAlignment],
              ].map(([label, val]) => (
                <div key={String(label)}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{label}</span>
                    <span className="font-medium">{val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
              <ul className="text-xs text-muted-foreground pt-2 space-y-1">
                {compat.recommendations.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          {p && (p.nonNegotiables.length > 0 || p.preferredQualities.length > 0) ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fit requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.nonNegotiables.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Non-negotiables</p>
                    <ul className="text-sm space-y-1">
                      {p.nonNegotiables.map((n) => (
                        <li key={n} className="rounded-lg bg-muted/50 px-2 py-1">
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-1">
                  {p.preferredQualities.map((q) => (
                    <Badge key={q} variant="secondary" className="text-[10px]">
                      {q}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}

      {p?.departmentTeams && p.departmentTeams.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-3">Active teams</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.departmentTeams.map((d) => (
              <Card key={d.name}>
                <CardContent className="py-4">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {d.occupiedCount} occupied · {d.openCount} open positions
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {p?.whyJoin && p.whyJoin.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand" />
            Why join {detail.name}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.whyJoin.map((item, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {p?.team && p.team.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-3">People at {detail.name}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {p.team.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex gap-3 py-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.roleTitle ?? m.memberType}</p>
                    {m.previousUniversity ? (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {m.previousUniversity}
                        {m.degree ? ` · ${m.degree}` : ''}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Career ladder */}
      {detail.careerLadder.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">Company career path</h3>
          <div className="flex flex-wrap items-center gap-2">
            {detail.careerLadder.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-2">
                <div className="rounded-xl border border-border/60 bg-card px-4 py-3 min-w-[120px]">
                  <p className="text-sm font-medium">{stage.roleTitle}</p>
                  {stage.description ? (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{stage.description}</p>
                  ) : null}
                </div>
                {i < detail.careerLadder.length - 1 ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Departments */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold">Departments & roles</h3>
          <button
            type="button"
            onClick={() => setOnlyAvailable((v) => !v)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              onlyAvailable ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}
          >
            Only available jobs
          </button>
        </div>

        {departments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No published roles yet. This company will add department listings when hiring opens.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {departments.map((dept) => (
              <div key={dept.name}>
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {dept.name}
                </h4>
                <div className="grid gap-3 lg:grid-cols-2">
                  {dept.jobs.map((job) => (
                    <PartnershipJobCard
                      key={job.id}
                      job={job}
                      selected={selectedJob?.id === job.id}
                      loading={actionLoading}
                      compact
                      onSelect={() => setSelectedJobId(job.id)}
                      onToggleBookmark={() => void toggleJobBookmark(job.id)}
                      onBecomeCandidate={() => void becomeCandidate(job.id)}
                      onApply={() => void applyToJob(job.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Selected job detail */}
      {selectedJob ? (
        <section>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>{selectedJob.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{selectedJob.department}</p>
            </CardHeader>
            <CardContent>
              <JobDetailPanel job={selectedJob} />
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* Alumni */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Students hired here
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {detail.alumni.map((a) => (
            <Card key={a.roleTitle} className="border-border/60">
              <CardContent className="py-4">
                <p className="font-medium">{a.roleTitle}</p>
                <p className="text-sm text-muted-foreground mt-1">{a.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
