'use client';

import { useCallback, useState } from 'react';
import {
  Building2,
  ChevronRight,
  MapPin,
  Star,
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

  return (
    <div className="space-y-10 pb-12">
      {/* Company header */}
      <section className="rounded-2xl border border-border/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-start gap-6">
          <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {detail.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={detail.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <Badge variant="secondary" className="mb-2">
              {detail.partnershipTier}
            </Badge>
            <h2 className="text-xl font-semibold">{detail.name}</h2>
            {detail.industry ? <p className="text-sm text-muted-foreground">{detail.industry}</p> : null}
            {detail.headquarters ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {detail.headquarters}
              </p>
            ) : null}
            <p className="text-sm mt-2">{detail.hiringStatus}</p>
          </div>
          <div className="flex gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold">{detail.openPositions}</p>
              <p className="text-xs text-muted-foreground">Open roles</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-brand">{detail.avgCompatibility}%</p>
              <p className="text-xs text-muted-foreground">Your avg match</p>
            </div>
          </div>
          <Button variant="outline" disabled={actionLoading} onClick={() => void toggleBookmark()}>
            <Star className={cn('mr-2 h-4 w-4', detail.isBookmarked && 'fill-amber-400 text-amber-500')} />
            {detail.isBookmarked ? 'Saved' : 'Save company'}
          </Button>
        </div>
      </section>

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
