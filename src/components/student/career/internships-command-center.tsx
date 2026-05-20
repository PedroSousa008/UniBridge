'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  GitCompare,
  Loader2,
  Radio,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { InternshipsHub } from '@/lib/student/student-internships-hub';
import type { InternshipCard, InternshipLifecycleStage } from '@/lib/student/internship-job-builder';
import {
  JobDetailPanel,
  PartnershipJobCard,
} from '@/components/student/career/partnership-job-card';

const LIFECYCLE_STAGES: { id: InternshipLifecycleStage; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'applied', label: 'Applied' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer_received', label: 'Offer' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'completed', label: 'Completed' },
];

type FeedTab = 'for_you' | 'recommended' | 'trending' | 'goals' | 'all';

function InternshipComparisonExtended({ jobs }: { jobs: InternshipCard[] }) {
  if (jobs.length < 2) return null;
  const rows = [
    { label: 'Compatibility', get: (j: InternshipCard) => `${j.compatibility}%` },
    { label: 'Salary', get: (j: InternshipCard) => j.salaryLabel ?? '—' },
    { label: 'Culture fit', get: (j: InternshipCard) => j.companyInsights.culture.slice(0, 40) + '…' },
    { label: 'Work style', get: (j: InternshipCard) => j.companyInsights.workStyle },
    { label: 'Growth', get: (j: InternshipCard) => j.companyInsights.growth.slice(0, 36) + '…' },
    { label: 'Remote', get: (j: InternshipCard) => j.remoteLabel },
    { label: 'CV readiness', get: (j: InternshipCard) => `${j.cvReadiness}%` },
    { label: 'Prestige signal', get: (j: InternshipCard) => (j.compatibility >= 80 ? 'High' : j.compatibility >= 65 ? 'Medium' : 'Building') },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left p-3 text-muted-foreground font-medium">Criteria</th>
            {jobs.map((j) => (
              <th key={j.id} className="text-left p-3 font-medium min-w-[130px]">
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

export function InternshipsCommandCenter({ initialHub }: { initialHub: InternshipsHub }) {
  const [hub, setHub] = useState(initialHub);
  const [tab, setTab] = useState<FeedTab>('for_you');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialHub.forYou[0]?.id ?? initialHub.recommended[0]?.id ?? null
  );
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');

  const fetchHub = useCallback(async () => {
    const res = await fetch('/api/student/career/internships');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => void fetchHub(), 55_000);
    return () => clearInterval(t);
  }, [live, fetchHub]);

  const feed = useMemo(() => {
    switch (tab) {
      case 'recommended':
        return hub.recommended;
      case 'trending':
        return hub.trending;
      case 'goals':
        return hub.goalMatched;
      case 'all':
        return hub.allInternships;
      default:
        return hub.forYou;
    }
  }, [tab, hub]);

  const selected = useMemo(
    () => hub.allInternships.find((j) => j.id === selectedId) ?? feed[0] ?? null,
    [hub.allInternships, selectedId, feed]
  );

  const compareJobs = compareIds
    .map((id) => hub.allInternships.find((j) => j.id === id))
    .filter(Boolean) as InternshipCard[];

  async function toggleBookmark(jobId: string) {
    setLoading(true);
    await fetch(`/api/student/career/jobs/${jobId}/bookmark`, { method: 'POST' });
    await fetchHub();
    setLoading(false);
  }

  async function startPreparing(jobId: string) {
    setLoading(true);
    await fetch('/api/student/career/internships/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internshipId: jobId, status: 'preparing' }),
    });
    await fetchHub();
    setLoading(false);
  }

  async function apply(jobId: string) {
    setLoading(true);
    const res = await fetch(`/api/student/career/jobs/${jobId}/apply`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.opportunitiesHref) {
        window.location.href = data.opportunitiesHref;
        return;
      }
    }
    await fetchHub();
    setLoading(false);
  }

  async function setLifecycle(jobId: string, status: InternshipLifecycleStage) {
    setLoading(true);
    await fetch('/api/student/career/internships/lifecycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internshipId: jobId, status }),
    });
    await fetchHub();
    setLoading(false);
  }

  async function saveJournal() {
    if (!journalTitle.trim() || !journalContent.trim()) return;
    setLoading(true);
    await fetch('/api/student/career/internships/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: journalTitle,
        content: journalContent,
        kind: 'reflection',
        internshipId: hub.dashboard.currentInternship?.id,
      }),
    });
    setJournalTitle('');
    setJournalContent('');
    await fetchHub();
    setLoading(false);
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  }

  const d = hub.dashboard;

  return (
    <div className="space-y-10 pb-12">
      {/* Hero + Dashboard */}
      <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-blue-500/5 p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-brand font-medium">
              <Radio className={cn('h-4 w-4', live && 'animate-pulse')} />
              Internship launchpad
              <button type="button" className="text-xs text-muted-foreground underline ml-2" onClick={() => setLive((v) => !v)}>
                {live ? 'Pause' : 'Resume'}
              </button>
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your internship journey at a glance</h2>
            {hub.primaryGoal ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Optimized for: <span className="font-medium text-foreground">{hub.primaryGoal.roleTitle}</span>
                {hub.primaryGoal.companyName ? ` · ${hub.primaryGoal.companyName}` : ''}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                <Link href="/student/career/paths" className="text-brand underline">
                  Set a career goal
                </Link>{' '}
                to personalize matching.
              </p>
            )}
          </div>
          <div className="text-center rounded-xl border border-brand/20 bg-brand/5 px-6 py-4">
            <p className="text-3xl font-semibold text-brand">{d.compatibilityAverage}%</p>
            <p className="text-xs text-muted-foreground">Compatibility average</p>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Applications sent', value: d.applicationsSent, icon: Briefcase },
            { label: 'Interviews', value: d.interviews, icon: Calendar },
            { label: 'Offers received', value: d.offersReceived, icon: Award },
            { label: 'Saved', value: d.savedCount, icon: Sparkles },
            {
              label: 'Current internship',
              value: d.currentInternship?.title ?? '—',
              icon: CheckCircle2,
              small: true,
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/60 bg-card/80 p-4">
              <stat.icon className="h-4 w-4 text-muted-foreground mb-2" />
              <p className={cn('font-semibold tabular-nums', stat.small ? 'text-sm line-clamp-2' : 'text-2xl')}>
                {stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lifecycle pipeline */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Internship lifecycle</h3>
        <div className="flex flex-wrap gap-2">
          {LIFECYCLE_STAGES.map((stage, i) => {
            const count = hub.lifecycleCounts[stage.id] ?? 0;
            const active = count > 0;
            return (
              <div key={stage.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    'rounded-full px-4 py-2 text-xs font-medium border transition-colors',
                    active ? 'bg-brand/10 border-brand/30 text-brand' : 'bg-muted/30 border-border/60 text-muted-foreground'
                  )}
                >
                  {stage.label}
                  {count > 0 ? <span className="ml-1.5 font-semibold">{count}</span> : null}
                </div>
                {i < LIFECYCLE_STAGES.length - 1 ? (
                  <div className="hidden sm:block w-4 h-px bg-border" />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Notifications */}
      {hub.notifications.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Smart notifications
          </h3>
          <div className="space-y-2">
            {hub.notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'rounded-lg border px-4 py-3 text-sm flex items-center justify-between',
                  n.urgency === 'high' && 'border-amber-200 bg-amber-50/50',
                  n.urgency === 'medium' && 'border-border/60',
                  n.urgency === 'low' && 'border-border/40 bg-muted/20'
                )}
              >
                <span>{n.text}</span>
                <Badge variant="outline" className="text-[10px] shrink-0 ml-2">
                  {n.type}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!hub.hasCompanyData ? (
        <div className="rounded-xl border border-dashed px-5 py-6 text-sm text-muted-foreground">
          Internships appear when partner companies publish roles through your university. Matching uses the same
          engine as{' '}
          <Link href="/student/career/compatibility" className="text-brand underline">
            Compatibility
          </Link>{' '}
          and{' '}
          <Link href="/student/career/mentor" className="text-brand underline">
            AI Mentor
          </Link>
          .
        </div>
      ) : null}

      {/* Discovery feed */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Internships most compatible with YOU
          </h3>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['for_you', 'For you'],
                ['recommended', 'Recommended'],
                ['trending', 'Trending'],
                ['goals', 'Goal match'],
                ['all', 'All'],
              ] as [FeedTab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-medium',
                  tab === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {feed.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No internships in this feed yet.
                </CardContent>
              </Card>
            ) : (
              feed.map((job) => (
                <PartnershipJobCard
                  key={job.id}
                  job={job}
                  selected={selected?.id === job.id}
                  compare={compareIds.includes(job.id)}
                  loading={loading}
                  onSelect={() => setSelectedId(job.id)}
                  onToggleBookmark={() => void toggleBookmark(job.id)}
                  onToggleCompare={() => toggleCompare(job.id)}
                  onBecomeCandidate={() => void startPreparing(job.id)}
                  onApply={() => void apply(job.id)}
                />
              ))
            )}
          </div>

          {selected ? (
            <div className="space-y-4 lg:sticky lg:top-4 h-fit">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selected.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selected.companyName}</p>
                  {selected.lifecycleStage ? (
                    <Badge variant="secondary" className="w-fit capitalize">
                      {selected.lifecycleStage.replace('_', ' ')}
                    </Badge>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm rounded-lg bg-muted/40 px-3 py-2">{selected.competitiveMessage}</p>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Preparation</p>
                    <div className="space-y-2">
                      {[
                        { label: 'CV readiness', value: selected.cvReadiness },
                        { label: 'Interview prep', value: selected.interviewPrepScore },
                        { label: 'Portfolio', value: selected.portfolioReadiness },
                      ].map((p) => (
                        <div key={p.label}>
                          <div className="flex justify-between text-xs mb-0.5">
                            <span>{p.label}</span>
                            <span>{p.value}%</span>
                          </div>
                          <Progress value={p.value} className="h-1" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <JobDetailPanel job={selected} />

                  <div>
                    <p className="text-sm font-medium mb-2">Company insights</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>
                        <strong>Culture:</strong> {selected.companyInsights.culture}
                      </li>
                      <li>
                        <strong>Work style:</strong> {selected.companyInsights.workStyle}
                      </li>
                      <li>
                        <strong>Growth:</strong> {selected.companyInsights.growth}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Skill requirements</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.requiredSkills.map((s) => (
                        <Badge key={s} variant="default" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                      {selected.preferredSkills.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">AI interview preparation</p>
                    <p className="text-xs text-muted-foreground mb-2">Structured for future AI coaching</p>
                    <ul className="text-xs space-y-1 list-disc pl-4">
                      {selected.interviewPrep.likelyQuestions.slice(0, 3).map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['preparing', 'applied', 'interviewing', 'offer_received', 'accepted'] as const).map(
                      (st) => (
                        <Button
                          key={st}
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => void setLifecycle(selected.id, st)}
                        >
                          {st.replace('_', ' ')}
                        </Button>
                      )
                    )}
                  </div>
                  {selected.partnershipHref ? (
                    <Button variant="ghost" className="px-0" asChild>
                      <Link href={selected.partnershipHref}>View company on Partnerships</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </section>

      {/* Application tracker */}
      {hub.trackers.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4">Application tracker</h3>
          <div className="space-y-3">
            {hub.trackers.map((tr) => (
              <Card key={tr.applicationId} className="border-border/60">
                <CardContent className="py-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium">{tr.title}</p>
                      <p className="text-sm text-muted-foreground">{tr.companyName}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize h-fit">
                      {tr.lifecycleStage.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                    <span>Applied: {tr.appliedAt ? new Date(tr.appliedAt).toLocaleDateString() : '—'}</span>
                    <span>Deadline: {tr.deadline ? new Date(tr.deadline).toLocaleDateString() : '—'}</span>
                    <span>Match: {tr.compatibility}%</span>
                  </div>
                  {tr.documents.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tr.documents.map((doc) => (
                        <Badge key={doc.name} variant={doc.submitted ? 'default' : 'outline'} className="text-[10px]">
                          {doc.name} {doc.submitted ? '✓' : ''}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Timeline */}
      {hub.timeline.length > 0 ? (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Internship timeline
          </h3>
          <div className="relative border-l border-border/60 ml-3 space-y-4 pl-6">
            {hub.timeline.map((ev) => (
              <div key={ev.id} className="relative">
                <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                <p className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString()}</p>
                <p className="text-sm font-medium">{ev.label}</p>
                <p className="text-xs text-muted-foreground">
                  {ev.internshipTitle} · {ev.companyName}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Analytics */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Internship analytics</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60">
            <CardContent className="py-4">
              <p className="text-2xl font-semibold">{hub.analytics.applicationSuccessRate ?? '—'}%</p>
              <p className="text-xs text-muted-foreground">Application success rate</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="py-4">
              <p className="text-2xl font-semibold">{hub.analytics.interviewConversion ?? '—'}%</p>
              <p className="text-xs text-muted-foreground">Interview conversion</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="py-4">
              <p className="text-sm font-medium">{hub.analytics.strongestIndustry ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Strongest industry exposure</p>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="py-4">
              <p className="text-sm font-medium">{hub.analytics.topCompatibleSector ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Top compatible sector</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Compare */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare internships
          </h3>
          {compareIds.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setCompareIds([])}>
              Clear
            </Button>
          ) : null}
        </div>
        {compareJobs.length >= 2 ? (
          <InternshipComparisonExtended jobs={compareJobs} />
        ) : (
          <p className="text-sm text-muted-foreground border border-dashed rounded-xl px-4 py-6 text-center">
            Select Compare on roles to evaluate salary, culture, growth, and compatibility.
          </p>
        )}
      </section>

      {/* Journal */}
      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Internship journal
        </h3>
        <Card className="border-border/60">
          <CardContent className="space-y-4 py-6">
            <p className="text-xs text-muted-foreground">
              Track learning, projects, and reflections — connects to CV & AI Mentor over time.
            </p>
            <Input placeholder="Entry title" value={journalTitle} onChange={(e) => setJournalTitle(e.target.value)} />
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="What did you learn or achieve?"
              value={journalContent}
              onChange={(e) => setJournalContent(e.target.value)}
            />
            <Button size="sm" disabled={loading} onClick={() => void saveJournal()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save reflection'}
            </Button>
            {hub.journal.length > 0 ? (
              <div className="space-y-2 pt-4 border-t">
                {hub.journal.map((j) => (
                  <div key={j.id} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <p className="font-medium">{j.title}</p>
                    <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{j.content}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href="/student/career/partnerships">Company Partnerships</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/student/career/mentor">
            <Target className="mr-2 h-4 w-4" />
            AI Mentor
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/student/career/compatibility">Compatibility Engine</Link>
        </Button>
      </section>
    </div>
  );
}
