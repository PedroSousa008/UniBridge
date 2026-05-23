'use client';

import { GitCompare, Loader2, MapPin, Star, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { APPLICATION_STATUS_LABELS } from '@/lib/career/partnership-intelligence';
import type { InternshipCard } from '@/lib/student/internship-job-builder';

export function PartnershipJobCard({
  job,
  selected,
  compare,
  loading,
  onSelect,
  onToggleBookmark,
  onToggleCompare,
  onBecomeCandidate,
  onApply,
  compact,
}: {
  job: InternshipCard;
  selected?: boolean;
  compare?: boolean;
  loading?: boolean;
  onSelect?: () => void;
  onToggleBookmark: () => void;
  onToggleCompare?: () => void;
  onBecomeCandidate: () => void;
  onApply?: () => void;
  compact?: boolean;
}) {
  const filled = job.availabilityStatus === 'filled';
  const holder = job.positionHolder;
  const statusLabel = job.applicationStatus
    ? APPLICATION_STATUS_LABELS[job.applicationStatus] ?? job.applicationStatus
    : null;

  return (
    <Card
      className={cn(
        'border-border/60 transition-all',
        filled && 'opacity-75 bg-muted/25 border-muted-foreground/20',
        selected && 'ring-2 ring-brand/40 shadow-md',
        compare && 'ring-2 ring-violet-400/50',
        onSelect && 'cursor-pointer hover:shadow-md'
      )}
      onClick={onSelect}
    >
      <CardContent className={cn('py-4', compact && 'py-3')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-[10px]">
                {job.department}
              </Badge>
              {filled ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Filled
                </Badge>
              ) : job.currentlyHiring ? (
                <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-200">
                  Actively hiring
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-amber-800 border-amber-200">
                  Not actively hiring
                </Badge>
              )}
              {statusLabel ? (
                <Badge variant="secondary" className="text-[10px]">
                  {statusLabel}
                </Badge>
              ) : null}
            </div>
            <p className="font-semibold tracking-tight">{job.title}</p>
            {!compact ? <p className="text-xs text-muted-foreground mt-0.5">{job.companyName}</p> : null}
            {filled && job.filledInterestLabel ? (
              <p className="text-xs text-muted-foreground mt-2 rounded-lg bg-muted/50 px-2 py-1.5">
                {job.filledInterestLabel}
              </p>
            ) : null}
            {!filled && job.notActivelyHiringLabel ? (
              <p className="text-xs text-muted-foreground mt-2 rounded-lg bg-amber-500/10 border border-amber-200/60 px-2 py-1.5">
                {job.notActivelyHiringLabel}
              </p>
            ) : null}
            {filled && holder ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border bg-card/80 px-2 py-1.5">
                <div className="h-8 w-8 rounded-md bg-muted overflow-hidden shrink-0">
                  {holder.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={holder.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-medium">{holder.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {holder.previousUniversity ?? '—'}
                    {holder.degree ? ` · ${holder.degree}` : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {holder.mentoringAvailable ? 'Mentoring available' : 'View profile path'}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {job.salaryLabel ? <span>{job.salaryLabel}</span> : null}
              {job.location ? (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
              ) : null}
              <span>{job.remoteLabel}</span>
              <span className="capitalize">{job.employmentType.replace('_', ' ')}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Your match</p>
            <p className={cn('text-2xl font-semibold tabular-nums', job.compatibility >= 75 ? 'text-brand' : '')}>
              {job.compatibility}%
            </p>
          </div>
        </div>

        {!compact ? (
          <>
            <div className="mt-3 flex flex-wrap gap-1">
              {job.requiredSkills.slice(0, 4).map((s) => (
                <Badge key={s} variant="outline" className="text-[10px] font-normal">
                  {s}
                </Badge>
              ))}
            </div>
            {job.deadline ? (
              <p className="text-[11px] text-muted-foreground mt-2">
                Deadline: {new Date(job.deadline).toLocaleDateString()}
              </p>
            ) : null}
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {job.candidateCount} candidate{job.candidateCount !== 1 ? 's' : ''}
            </div>
          </>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant={job.isBookmarked ? 'secondary' : 'outline'}
            disabled={loading}
            onClick={onToggleBookmark}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Star className={cn('h-3.5 w-3.5', job.isBookmarked && 'fill-amber-400 text-amber-500')} />
            )}
          </Button>
          {onToggleCompare ? (
            <Button size="sm" variant={compare ? 'default' : 'outline'} onClick={onToggleCompare}>
              <GitCompare className="mr-1 h-3.5 w-3.5" />
              {compare ? 'Compare' : 'Compare'}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" disabled={loading} onClick={onBecomeCandidate}>
            {job.isCandidate ? 'Candidate' : 'Become candidate'}
          </Button>
          {onApply ? (
            <Button size="sm" disabled={loading || job.applicationStatus === 'applied'} onClick={onApply}>
              {job.applicationStatus === 'applied'
                ? 'Interest registered'
                : filled
                  ? 'Express interest'
                  : 'Apply'}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function JobDetailPanel({ job }: { job: InternshipCard }) {
  const filled = job.availabilityStatus === 'filled';
  const holder = job.positionHolder;
  return (
    <div className="space-y-6">
      {filled && job.filledInterestLabel ? (
        <p className="rounded-xl border border-muted-foreground/20 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {job.filledInterestLabel}
        </p>
      ) : null}
      {filled && holder ? (
        <div className="rounded-xl border p-4 space-y-2">
          <p className="text-sm font-medium">Current role holder</p>
          <p className="font-semibold">{holder.name}</p>
          <p className="text-xs text-muted-foreground">
            {holder.previousUniversity ?? 'University not listed'}
            {holder.degree ? ` · ${holder.degree}` : ''}
            {holder.graduationYear ? ` · Class of ${holder.graduationYear}` : ''}
          </p>
          {holder.bio ? <p className="text-sm text-muted-foreground">{holder.bio}</p> : null}
          <div className="flex flex-wrap gap-2 text-xs">
            {holder.mentoringAvailable ? (
              <Badge variant="secondary">Available for mentoring</Badge>
            ) : null}
            {holder.messagesAvailable ? (
              <Badge variant="outline">Open to student messages</Badge>
            ) : null}
          </div>
        </div>
      ) : null}
      <div>
        <p className="text-sm font-medium mb-2">AI insight</p>
        <p className="rounded-lg bg-brand/5 border border-brand/15 px-4 py-3 text-sm">{job.aiInsight}</p>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Why this score?</p>
        <ul className="space-y-2">
          {job.whyMatches.map((w) => (
            <li key={w} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              {w}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium mb-3">Compatibility breakdown</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {job.breakdown.map((b) => (
            <div key={b.id}>
              <div className="flex justify-between text-xs mb-1">
                <span>{b.label}</span>
                <span>{b.score}%</span>
              </div>
              <Progress value={b.score} className="h-1.5" />
            </div>
          ))}
        </div>
      </div>

      {job.improveTips.length > 0 ? (
        <div>
          <p className="text-sm font-medium mb-2">How to improve compatibility</p>
          <ul className="space-y-2">
            {job.improveTips.map((tip) => (
              <li key={tip} className="flex items-center gap-2 text-sm rounded-lg border border-border/60 px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-xl border border-border/60 p-4 space-y-3">
        <p className="text-sm font-medium">Candidate progress</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Compatibility</p>
            <p className="text-lg font-semibold text-brand">{job.compatibility}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Profile completion</p>
            <p className="text-lg font-semibold">{job.profileCompletion}%</p>
            <Progress value={job.profileCompletion} className="h-1.5 mt-1" />
          </div>
        </div>
        {job.missingSkills.length > 0 ? (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Missing</p>
            <div className="flex flex-wrap gap-1">
              {job.missingSkills.slice(0, 4).map((m) => (
                <Badge key={m.name} variant="outline" className="text-[10px]">
                  {m.name}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function JobComparisonTable({ jobs }: { jobs: InternshipCard[] }) {
  if (jobs.length < 2) return null;
  const rows = [
    { label: 'Compatibility', get: (j: InternshipCard) => `${j.compatibility}%` },
    { label: 'Salary', get: (j: InternshipCard) => j.salaryLabel ?? '—' },
    { label: 'Location', get: (j: InternshipCard) => j.location ?? '—' },
    { label: 'Work mode', get: (j: InternshipCard) => j.remoteLabel },
    { label: 'Type', get: (j: InternshipCard) => j.employmentType },
    { label: 'Profile completion', get: (j: InternshipCard) => `${j.profileCompletion}%` },
    {
      label: 'Top missing skill',
      get: (j: InternshipCard) => j.missingSkills[0]?.name ?? 'None',
    },
    { label: 'Candidates', get: (j: InternshipCard) => String(j.candidateCount) },
    { label: 'Status', get: (j: InternshipCard) => (j.availabilityStatus === 'filled' ? 'Filled' : 'Open') },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="text-left p-3 font-medium text-muted-foreground">Metric</th>
            {jobs.map((j) => (
              <th key={j.id} className="text-left p-3 font-medium min-w-[140px]">
                {j.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/40 last:border-0">
              <td className="p-3 text-muted-foreground">{row.label}</td>
              {jobs.map((j) => (
                <td key={j.id} className="p-3">
                  {row.get(j)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
