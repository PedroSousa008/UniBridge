'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Calculator,
  GraduationCap,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GradebookHubPayload } from '@/lib/student/load-gradebook-hub';
import {
  requiredGradeForTarget,
  simulateWhatIf,
  statusBadgeClass,
  statusColor,
  type GradebookDashboard,
  type SubjectGradebookSnapshot,
} from '@/lib/student/gradebook-engine';
import { saveLocalGradebookPrefs } from '@/lib/student/gradebook-local-storage';

type TabId = 'overview' | 'subjects' | 'simulator' | 'insights';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'insights', label: 'Insights' },
];

interface GradebookCommandCenterProps {
  initialHub: GradebookHubPayload;
}

export function GradebookCommandCenter({ initialHub }: GradebookCommandCenterProps) {
  const router = useRouter();
  const [hub, setHub] = useState(initialHub);
  const [tab, setTab] = useState<TabId>('overview');
  const [selected, setSelected] = useState<SubjectGradebookSnapshot | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefs, setPrefs] = useState(hub.preferences);

  const dashboard = hub.dashboard;

  const savePrefs = async () => {
    saveLocalGradebookPrefs(prefs);
    const res = await fetch('/api/student/gradebook/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
    if (res.ok) {
      router.refresh();
    }
    setSettingsOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gradebook"
        subtitle="Data-driven academic control — projections, targets, risks, and strategy."
        action={
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Thresholds
          </Button>
        }
      />

      {!hub.dbReady && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Gradebook preferences save locally until database schema is synced.
        </p>
      )}

      <StatsRow dashboard={dashboard} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? 'default' : 'outline'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          dashboard={dashboard}
          onSelectSubject={setSelected}
        />
      )}
      {tab === 'subjects' && (
        <SubjectsTab dashboard={dashboard} onSelect={setSelected} />
      )}
      {tab === 'simulator' && (
        <SimulatorTab dashboard={dashboard} prefs={prefs} />
      )}
      {tab === 'insights' && <InsightsTab dashboard={dashboard} />}

      <SubjectDetailDialog subject={selected} onClose={() => setSelected(null)} />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade thresholds & credits</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Good (green) from
              <Input
                type="number"
                className="mt-1"
                value={prefs.goodMin}
                onChange={(e) => setPrefs((p) => ({ ...p, goodMin: +e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Moderate (yellow) from
              <Input
                type="number"
                className="mt-1"
                value={prefs.moderateMin}
                onChange={(e) => setPrefs((p) => ({ ...p, moderateMin: +e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Pass minimum
              <Input
                type="number"
                className="mt-1"
                value={prefs.passMin}
                onChange={(e) => setPrefs((p) => ({ ...p, passMin: +e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Target GPA
              <Input
                type="number"
                className="mt-1"
                value={prefs.targetGpa ?? ''}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    targetGpa: e.target.value ? +e.target.value : null,
                  }))
                }
              />
            </label>
            <label className="text-sm">
              Credits completed
              <Input
                type="number"
                className="mt-1"
                value={prefs.creditsCompleted}
                onChange={(e) => setPrefs((p) => ({ ...p, creditsCompleted: +e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Credits required
              <Input
                type="number"
                className="mt-1"
                value={prefs.creditsRequired}
                onChange={(e) => setPrefs((p) => ({ ...p, creditsRequired: +e.target.value }))}
              />
            </label>
          </div>
          <Button className="w-full mt-2" onClick={savePrefs}>
            Save preferences
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsRow({ dashboard }: { dashboard: GradebookDashboard }) {
  const items = [
    { label: 'Overall average', value: dashboard.overallGpa?.toFixed(1) ?? '—', sub: '/ 20' },
    { label: 'Semester average', value: dashboard.semesterAverage?.toFixed(1) ?? '—', sub: '/ 20' },
    {
      label: 'Best subject',
      value: dashboard.bestSubject?.name ?? '—',
      sub: dashboard.bestSubject ? `${dashboard.bestSubject.grade}` : '',
    },
    {
      label: 'Worst subject',
      value: dashboard.worstSubject?.name ?? '—',
      sub: dashboard.worstSubject ? `${dashboard.worstSubject.grade}` : '',
    },
    { label: 'Credits completed', value: String(dashboard.creditsCompleted), sub: 'ECTS' },
    { label: 'Credits remaining', value: String(dashboard.creditsRemaining), sub: 'ECTS' },
    {
      label: 'Attendance avg.',
      value: dashboard.attendanceAverage != null ? `${dashboard.attendanceAverage}%` : '—',
      sub: '',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-semibold truncate">{item.value}</p>
            {item.sub ? <p className="text-xs text-muted-foreground">{item.sub}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OverviewTab({
  dashboard,
  onSelectSubject,
}: {
  dashboard: GradebookDashboard;
  onSelectSubject: (s: SubjectGradebookSnapshot) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Risk detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dashboard.risks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active risks detected.</p>
          ) : (
            dashboard.risks.map((r) => (
              <div
                key={r.id}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm',
                  r.severity === 'high' ? 'border-red-300 bg-red-50 dark:bg-red-950/30' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30'
                )}
              >
                <p className="font-medium">{r.subjectName}</p>
                <p className="text-muted-foreground">{r.message}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Smart notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {dashboard.notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grade-related updates yet.</p>
          ) : (
            dashboard.notifications.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                className="block rounded-lg border p-2 text-sm hover:bg-muted/50"
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.subjectName}</p>
                <p className="text-xs mt-1 line-clamp-2">{n.message}</p>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Subject snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dashboard.subjects.map((s) => (
            <button
              key={s.subjectId}
              type="button"
              onClick={() => onSelectSubject(s)}
              className={cn('rounded-xl border p-4 text-left transition-shadow hover:shadow-md', statusColor(s.status))}
            >
              <div className="flex justify-between gap-2">
                <p className="font-medium">{s.subjectName}</p>
                <Badge className={statusBadgeClass(s.status)}>
                  {s.currentGrade?.toFixed(1) ?? '—'}
                </Badge>
              </div>
              <Progress value={s.progressPercent} className="mt-2 h-1.5" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SubjectsTab({
  dashboard,
  onSelect,
}: {
  dashboard: GradebookDashboard;
  onSelect: (s: SubjectGradebookSnapshot) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {dashboard.subjects.map((s) => (
        <Card
          key={s.subjectId}
          className={cn('cursor-pointer hover:shadow-md transition-shadow', statusColor(s.status))}
          onClick={() => onSelect(s)}
        >
          <CardContent className="py-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{s.subjectName}</p>
                {s.subjectCode ? (
                  <p className="text-xs text-muted-foreground">{s.subjectCode}</p>
                ) : null}
                {s.professor ? (
                  <p className="text-xs text-muted-foreground mt-1">{s.professor}</p>
                ) : null}
              </div>
              <Badge className={statusBadgeClass(s.status)}>
                {s.currentGrade?.toFixed(1) ?? '—'}/20
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{s.evaluationMethod}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span>{s.credits} ECTS</span>
              <span>{s.remainingEvaluations} eval. left</span>
              <span>{s.progressPercent}% progress</span>
              <span>
                {s.attendancePercent != null ? `${s.attendancePercent}% attendance` : '—'}
              </span>
            </div>
            <Progress value={(s.currentGrade ?? 0) * 5} className="h-2" />
            <div className="flex gap-2 text-xs">
              <span className="text-emerald-600">↑ {s.projectedBest?.toFixed(1) ?? '—'}</span>
              <span className="text-muted-foreground">~ {s.projectedRealistic?.toFixed(1) ?? '—'}</span>
              <span className="text-red-600">↓ {s.projectedWorst?.toFixed(1) ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SimulatorTab({
  dashboard,
  prefs,
}: {
  dashboard: GradebookDashboard;
  prefs: GradebookHubPayload['preferences'];
}) {
  const [subjectId, setSubjectId] = useState(dashboard.subjects[0]?.subjectId ?? '');
  const subject = dashboard.subjects.find((s) => s.subjectId === subjectId);
  const pending = subject?.rows.filter((r) => r.score == null) ?? [];
  const [targetFinal, setTargetFinal] = useState(String(prefs.targetGpa ?? 16));
  const [targetItem, setTargetItem] = useState(pending[0]?.id ?? '');
  const [whatIfScores, setWhatIfScores] = useState<Record<string, string>>({});

  const categories =
    subject?.categories.map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight,
      rulesJson: c.rules,
      minGrade: c.minGrade,
    })) ?? [];

  const targetResult =
    subject && targetItem
      ? requiredGradeForTarget(
          subject.rows,
          categories,
          targetItem,
          parseFloat(targetFinal) || 16
        )
      : null;

  const whatIfProjected =
    subject && Object.keys(whatIfScores).length > 0
      ? simulateWhatIf(
          subject.rows,
          categories,
          Object.entries(whatIfScores).map(([assignmentId, val]) => {
            const row = subject.rows.find((r) => r.id === assignmentId)!;
            const onTwenty = parseFloat(val) || 0;
            const score = (onTwenty / 20) * row.maxScore;
            return { assignmentId, score, maxScore: row.maxScore };
          })
        )
      : subject?.currentGrade ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Target grade simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <select
            className="w-full h-10 rounded-md border px-3 text-sm"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              const s = dashboard.subjects.find((x) => x.subjectId === e.target.value);
              const p = s?.rows.filter((r) => r.score == null) ?? [];
              setTargetItem(p[0]?.id ?? '');
            }}
          >
            {dashboard.subjects.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {s.subjectName}
              </option>
            ))}
          </select>
          <Input
            type="number"
            placeholder="Desired final /20"
            value={targetFinal}
            onChange={(e) => setTargetFinal(e.target.value)}
          />
          <select
            className="w-full h-10 rounded-md border px-3 text-sm"
            value={targetItem}
            onChange={(e) => setTargetItem(e.target.value)}
          >
            {pending.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          {targetResult ? (
            <p
              className={cn(
                'text-sm rounded-lg border p-3',
                targetResult.achievable
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-amber-300 bg-amber-50'
              )}
            >
              {targetResult.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            What-if simulator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {!subject ? (
            <p className="text-sm text-muted-foreground">Select a subject with evaluations.</p>
          ) : (
            <>
              {subject.rows.map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{r.title}</span>
                  <Input
                    className="w-20"
                    type="number"
                    placeholder={r.score != null ? String(r.score) : '0-20'}
                    value={whatIfScores[r.id] ?? ''}
                    onChange={(e) =>
                      setWhatIfScores((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <p className="text-sm font-medium pt-2">
                Projected final: <strong>{whatIfProjected?.toFixed(1) ?? '—'}</strong> / 20
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Best / realistic / worst case</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {dashboard.subjects.map((s) => (
            <div key={s.subjectId} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{s.subjectName}</p>
              <p className="text-emerald-600 flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" /> Best: {s.projectedBest?.toFixed(1) ?? '—'}
              </p>
              <p className="text-muted-foreground">Realistic: {s.projectedRealistic?.toFixed(1) ?? '—'}</p>
              <p className="text-red-600 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Worst: {s.projectedWorst?.toFixed(1) ?? '—'}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsTab({ dashboard }: { dashboard: GradebookDashboard }) {
  const evolutionData = dashboard.subjects.flatMap((s) =>
    s.evolution.map((e) => ({
      date: format(parseISO(e.date), 'MMM d'),
      grade: e.grade,
      subject: s.subjectName.slice(0, 10),
    }))
  );

  const compareData = dashboard.subjects.map((s) => ({
    name: (s.subjectCode ?? s.subjectName).slice(0, 8),
    grade: s.currentGrade ?? 0,
    attendance: s.attendancePercent ?? 0,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Grade evolution
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {evolutionData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add graded evaluations to see progression.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="grade" stroke="hsl(var(--brand))" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subject comparison</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 20]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="grade" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Attendance vs grade</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" domain={[0, 20]} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
              <Tooltip />
              <Bar yAxisId="left" dataKey="grade" fill="hsl(var(--brand))" name="Grade /20" />
              <Bar yAxisId="right" dataKey="attendance" fill="#94a3b8" name="Attendance %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function SubjectDetailDialog({
  subject,
  onClose,
}: {
  subject: SubjectGradebookSnapshot | null;
  onClose: () => void;
}) {
  if (!subject) return null;

  return (
    <Dialog open={!!subject} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{subject.subjectName}</DialogTitle>
          <p className="text-sm text-muted-foreground">{subject.evaluationMethod}</p>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Badge className={statusBadgeClass(subject.status)}>
            {subject.currentGrade?.toFixed(1) ?? '—'} / 20
          </Badge>
          <Badge variant="outline">{subject.credits} ECTS</Badge>
        </div>

        <section>
          <h3 className="text-sm font-medium mb-2">Evaluation timeline</h3>
          <div className="space-y-2">
            {subject.timeline.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 text-sm border-l-2 pl-3 py-1"
                style={{
                  borderColor:
                    t.status === 'completed'
                      ? '#10b981'
                      : t.status === 'missing'
                        ? '#ef4444'
                        : '#94a3b8',
                }}
              >
                <span className="flex-1">{t.title}</span>
                <span className="text-xs text-muted-foreground capitalize">{t.status.replace('_', ' ')}</span>
                <span className="font-medium">
                  {t.gradeOnTwenty != null ? t.gradeOnTwenty.toFixed(1) : '—'}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium mb-2">Weighted categories</h3>
          {subject.categories.map((c) => (
            <div key={c.id} className="mb-2">
              <div className="flex justify-between text-xs">
                <span>{c.name}</span>
                <span>
                  {c.average?.toFixed(1) ?? '—'} · {c.weight}%
                </span>
              </div>
              <Progress value={c.weight} className="h-1" />
            </div>
          ))}
        </section>

        <Button asChild variant="outline" size="sm">
          <Link href={`/student/academics/subjects/${subject.subjectId}/gradebook`}>
            <GraduationCap className="mr-1 h-3.5 w-3.5" />
            Full subject gradebook
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
