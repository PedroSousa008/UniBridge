'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import {
  ArrowRight,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Rocket,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { loadLocalScheduleClasses } from '@/lib/student/schedule-local-storage';
import type { HomeNextClass, StudentHomeHub } from '@/lib/student/student-home-hub';
import { findNextUpcomingClass, formatClassCountdown } from '@/lib/student/weekly-schedule';
import { ProgressRing } from './progress-ring';

function toHomeNextClass(
  raw: NonNullable<ReturnType<typeof findNextUpcomingClass>>,
  now = new Date()
): HomeNextClass {
  return {
    subjectName: raw.cls.subjectName,
    subjectId: raw.cls.subjectId,
    professor: raw.cls.professor,
    room: raw.cls.room,
    building: raw.cls.building,
    isOnline: raw.cls.isOnline,
    startTime: raw.cls.startTime,
    endTime: raw.cls.endTime,
    countdown: formatClassCountdown(raw.startsAt, now),
    classType: raw.cls.classType,
  };
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

function SnapshotCard({
  title,
  children,
  href,
  className,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const inner = (
    <Card className={cn('h-full border-border/60 shadow-sm transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

function HomeRightSidebar({
  hub,
  open,
  onToggle,
}: {
  hub: StudentHomeHub;
  open: boolean;
  onToggle: () => void;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="fixed right-0 top-24 z-20 hidden rounded-l-lg border border-r-0 bg-background/95 px-2 py-3 shadow-lg backdrop-blur xl:block"
        aria-label="Open sidebar"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
    );
  }

  return (
    <aside className="hidden w-72 shrink-0 space-y-4 xl:block">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Quick panel</p>
        <button type="button" onClick={onToggle} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" />
            Notifications
            {hub.sidebar.unreadNotifications > 0 && (
              <Badge variant="brand" className="text-[10px]">{hub.sidebar.unreadNotifications}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hub.sidebar.notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground">All caught up.</p>
          ) : (
            hub.sidebar.notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href ?? '#'}
                className="block rounded-lg border border-transparent px-2 py-1.5 hover:border-border hover:bg-muted/40"
              >
                <p className="text-xs font-medium line-clamp-1">{n.title}</p>
                <p className="text-[10px] text-muted-foreground">{n.time}</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            Messages
            {hub.sidebar.unreadMessages > 0 && (
              <Badge variant="brand" className="text-[10px]">{hub.sidebar.unreadMessages}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/student/academics/messages">Open messages</Link>
          </Button>
        </CardContent>
      </Card>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {hub.sidebar.upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pending deadlines.</p>
          ) : (
            hub.sidebar.upcomingDeadlines.map((d) => (
              <Link key={d.id} href={d.href} className="block text-xs">
                <p className="font-medium line-clamp-1">{d.title}</p>
                <p className="text-muted-foreground">{format(parseISO(d.dueDate), 'MMM d')}</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
      <Button variant="outline" size="sm" className="w-full" asChild>
        <Link href="/student/academics/calendar">
          <Calendar className="mr-2 h-4 w-4" />
          Calendar
        </Link>
      </Button>
    </aside>
  );
}

export function StudentCommandCenter({
  initialHub,
  userId,
}: {
  initialHub: StudentHomeHub;
  userId: string;
}) {
  const [hub, setHub] = useState(initialHub);
  const [nextClass, setNextClass] = useState<HomeNextClass | null>(initialHub.nextClass);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      fetch('/api/student/home')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.progression) {
            setHub(data);
            setNextClass(data.nextClass ?? null);
          }
        });
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (hub.nextClass) {
      setNextClass(hub.nextClass);
      return;
    }
    const local = loadLocalScheduleClasses(userId);
    const upcoming = findNextUpcomingClass(local, new Date());
    setNextClass(upcoming ? toHomeNextClass(upcoming) : null);
  }, [hub.nextClass, userId]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const askAi = useCallback(async (prompt: string) => {
    setAiPrompt(prompt);
    setAiLoading(true);
    setAiReply(null);
    const res = await fetch('/api/student/calendar/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (res.ok) {
      const data = await res.json();
      setAiReply(data.reply ?? 'No insight available yet.');
    } else {
      setAiReply('Connect more activity across UniBridge for personalized guidance.');
    }
    setAiLoading(false);
  }, []);

  const aiSuggestions = [
    'What should I prioritize this week?',
    'Summarize my upcoming deadlines.',
    'Am I on track academically?',
  ];

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1 space-y-10 pb-12">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-muted/30 p-8 shadow-sm">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground">{greeting}</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
                  {hub.userName ? hub.userName.split(' ')[0] : 'Student'}
                </h1>
                <p className="mt-2 max-w-xl text-muted-foreground">
                  Your command center — clarity on progression, focus, and what moves your future forward.
                </p>
              </div>
              {hub.insights.length > 0 && (
                <div className="space-y-2">
                  {hub.insights.slice(0, 3).map((ins) => (
                    <Link
                      key={ins.id}
                      href={ins.href}
                      className="flex items-start gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                    >
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>{ins.text}</span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {hub.quickActions.map((a) => (
                  <Button key={a.id} variant="secondary" size="sm" asChild>
                    <Link href={a.href}>{a.label}</Link>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-4">
              <ProgressRing
                value={hub.progression.overall}
                label="Progression"
                sublabel={
                  hub.hasData
                    ? 'Synthesized from academics, career, profile & activity'
                    : 'Complete your profile to unlock insights'
                }
              />
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>Profile {hub.progression.profileStrength}%</span>
                <span>Employability {hub.progression.employabilityScore}%</span>
                {hub.progression.compatibilityAvg != null && (
                  <span>Compatibility {hub.progression.compatibilityAvg}%</span>
                )}
                {hub.progression.gradeAverage != null && (
                  <span>Average {hub.progression.gradeAverage.toFixed(1)}/20</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ACADEMIC SNAPSHOT */}
        <section>
          <SectionTitle action={<Link href="/student/academics" className="text-sm text-brand">Academics</Link>}>
            Academic snapshot
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SnapshotCard
              title="Next class"
              href={
                nextClass?.subjectId
                  ? `/student/academics/subjects/${nextClass.subjectId}`
                  : '/student/academics/schedule'
              }
            >
              {nextClass ? (
                <>
                  <p className="font-medium">{nextClass.subjectName}</p>
                  <p className="text-muted-foreground">{nextClass.countdown}</p>
                  <p className="text-xs mt-1">
                    {nextClass.startTime}–{nextClass.endTime}
                    {nextClass.isOnline ? ' · Online' : ` · ${nextClass.room ?? 'TBA'}`}
                  </p>
                  {nextClass.professor ? (
                    <p className="text-xs text-muted-foreground mt-0.5">{nextClass.professor}</p>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">Add classes on your weekly schedule</p>
              )}
            </SnapshotCard>
            <SnapshotCard title="Deadline" href={hub.upcomingDeadline?.href ?? '/student/academics/assignments'}>
              {hub.upcomingDeadline ? (
                <>
                  <p className="font-medium line-clamp-1">{hub.upcomingDeadline.title}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{hub.upcomingDeadline.urgency}</Badge>
                  <Progress value={hub.upcomingDeadline.progressPercent} className="mt-2 h-1" />
                </>
              ) : (
                <p className="text-muted-foreground">No pending work</p>
              )}
            </SnapshotCard>
            <SnapshotCard title="Recent grade" href={hub.recentGrade?.href ?? '/student/academics/gradebook'}>
              {hub.recentGrade ? (
                <>
                  <p className="text-2xl font-semibold">{hub.recentGrade.gradeOnTwenty}</p>
                  <p className="text-muted-foreground line-clamp-1">{hub.recentGrade.subjectName}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No grades yet</p>
              )}
            </SnapshotCard>
            <SnapshotCard title="Attendance" href={hub.attendance.href}>
              <p className="text-2xl font-semibold">{hub.attendance.percent ?? '—'}{hub.attendance.percent != null ? '%' : ''}</p>
              {hub.attendance.warning && <Badge variant="outline" className="mt-1 text-[10px] text-amber-700">Review</Badge>}
            </SnapshotCard>
            <SnapshotCard title="Pending" href="/student/academics/assignments">
              <p className="text-2xl font-semibold">{hub.pendingAssignments.count}</p>
              <p className="text-muted-foreground">assignments</p>
            </SnapshotCard>
            <SnapshotCard title="Next exam" href={hub.nextExam?.href ?? '/student/academics/exams'}>
              {hub.nextExam ? (
                <>
                  <p className="font-medium line-clamp-1">{hub.nextExam.title}</p>
                  <p className="text-brand">{hub.nextExam.countdown}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No upcoming exams</p>
              )}
            </SnapshotCard>
          </div>
        </section>

        {/* CAREER */}
        <section>
          <SectionTitle action={<Link href="/student/career" className="text-sm text-brand">Career</Link>}>
            Career progression
          </SectionTitle>
          <div className="grid gap-4 lg:grid-cols-3">
            {hub.career.targets.length === 0 ? (
              <Card className="lg:col-span-3 border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Set career targets to unlock compatibility tracking.{' '}
                  <Link href="/student/career/compatibility" className="text-brand underline">Get started</Link>
                </CardContent>
              </Card>
            ) : (
              hub.career.targets.map((t) => (
                <Link key={t.id} href={t.href}>
                  <Card className="h-full border-border/60 hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                      <p className="font-medium">{t.roleTitle}</p>
                      {t.companyName && <p className="text-sm text-muted-foreground">{t.companyName}</p>}
                      <p className="mt-3 text-2xl font-semibold">{t.compatibility}%</p>
                      <Progress value={t.compatibility} className="mt-2 h-1.5" />
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
          {hub.career.recommendedActions.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Recommended actions</p>
              {hub.career.recommendedActions.map((a) => (
                <Link key={a.id} href={a.href} className="flex items-center gap-2 text-sm hover:text-brand">
                  <ArrowRight className="h-3.5 w-3.5" />
                  {a.text}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* STARTUP */}
        <section>
          <SectionTitle action={<Link href="/student/startup" className="text-sm text-brand">Startup Hub</Link>}>
            Startup
          </SectionTitle>
          {!hub.startup.hasStartup ? (
            <Card className="border-border/60 bg-gradient-to-r from-violet-500/5 to-transparent">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-8">
                <div>
                  <p className="text-lg font-semibold">Start building</p>
                  <p className="text-sm text-muted-foreground">Turn ideas into traction with the Startup Hub.</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild><Link href="/student/startup/create">Create Startup</Link></Button>
                  <Button variant="outline" asChild><Link href="/student/startup/discover">Explore Founders</Link></Button>
                </div>
              </CardContent>
            </Card>
          ) : hub.startup.primary ? (
            <Card className="border-border/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-6 py-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-brand" />
                    <p className="font-semibold text-lg">{hub.startup.primary.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Readiness {hub.startup.primary.readiness}% · {hub.startup.primary.milestonesDone}/{hub.startup.primary.milestonesTotal} milestones
                  </p>
                  <Progress value={hub.startup.primary.readiness} className="mt-3 h-2 max-w-xs" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild><Link href={hub.startup.primary.href}>Open Startup</Link></Button>
                  <Button variant="outline" asChild><Link href={hub.startup.primary.href}>Update Progress</Link></Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        {/* OPPORTUNITIES */}
        {hub.opportunities.length > 0 && (
          <section>
            <SectionTitle>Opportunities</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              {hub.opportunities.map((o) => (
                <Link key={o.id} href={o.href}>
                  <Card className="hover:shadow-md transition-shadow border-border/60">
                    <CardContent className="py-4">
                      <div className="flex justify-between gap-2">
                        <div>
                          <Badge variant="secondary" className="text-[10px]">{o.type}</Badge>
                          <p className="mt-2 font-medium">{o.title}</p>
                          <p className="text-sm text-muted-foreground">{o.company}</p>
                        </div>
                        <span className="text-sm font-medium text-brand">{o.relevance}% fit</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* WEEKLY FOCUS */}
        {hub.weeklyFocus.length > 0 && (
          <section>
            <SectionTitle>This week&apos;s focus</SectionTitle>
            <div className="space-y-2">
              {hub.weeklyFocus.map((f) => (
                <Link
                  key={f.id}
                  href={f.href}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40',
                    f.priority === 'high' && 'border-brand/30 bg-brand/5'
                  )}
                >
                  <span className="text-sm font-medium">{f.text}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ANALYTICS */}
        {(hub.analytics.gradeEvolution.length > 0 || hub.analytics.compatibilityTrend.length > 0) && (
          <section>
            <SectionTitle>Progression analytics</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
              {hub.analytics.gradeEvolution.length > 0 && (
                <Card className="border-border/60">
                  <CardHeader><CardTitle className="text-sm">Grade evolution</CardTitle></CardHeader>
                  <CardContent className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hub.analytics.gradeEvolution}>
                        <defs>
                          <linearGradient id="gradeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="hsl(var(--brand))" fill="url(#gradeGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              {hub.analytics.compatibilityTrend.length > 0 && (
                <Card className="border-border/60">
                  <CardHeader><CardTitle className="text-sm">Career compatibility</CardTitle></CardHeader>
                  <CardContent className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hub.analytics.compatibilityTrend}>
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#8b5cf620" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

        {/* ACTIVITY FEED */}
        {hub.activityFeed.length > 0 && (
          <section>
            <SectionTitle>Recent activity</SectionTitle>
            <div className="divide-y rounded-xl border border-border/60 bg-card">
              {hub.activityFeed.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {format(parseISO(item.time), 'MMM d')}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* AI ASSIST */}
        <section>
          <SectionTitle>AI quick assist</SectionTitle>
          <Card className="border-border/60">
            <CardContent className="space-y-4 py-6">
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((s) => (
                  <Button key={s} variant="outline" size="sm" onClick={() => askAi(s)} disabled={aiLoading}>
                    {s}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask your mentor…"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && aiPrompt.trim() && askAi(aiPrompt)}
                />
                <Button onClick={() => aiPrompt.trim() && askAi(aiPrompt)} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
                </Button>
              </div>
              {aiReply && (
                <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm leading-relaxed">{aiReply}</p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* PRESTIGE */}
        {(hub.prestige.activityPercentile != null || hub.prestige.consistencyLabel || hub.prestige.improvementLabel) && (
          <section className="rounded-xl border border-border/40 bg-muted/20 px-6 py-5">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <TrendingUp className="h-5 w-5 text-brand" />
              {hub.prestige.activityPercentile != null && (
                <span>Activity percentile: top {100 - hub.prestige.activityPercentile}%</span>
              )}
              {hub.prestige.consistencyLabel && <span>{hub.prestige.consistencyLabel}</span>}
              {hub.prestige.improvementLabel && <span>{hub.prestige.improvementLabel}</span>}
            </div>
          </section>
        )}
      </div>

      <HomeRightSidebar hub={hub} open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
    </div>
  );
}
