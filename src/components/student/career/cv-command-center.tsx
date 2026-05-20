'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  BadgeCheck,
  Briefcase,
  Download,
  Eye,
  FileUser,
  Globe,
  Loader2,
  Lock,
  MessageSquare,
  Plus,
  Rocket,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CvHub } from '@/lib/student/student-cv-hub';
import type { CvVisibility } from '@/lib/career/cv-intelligence';
import { ProgressRing } from '@/components/student/home/progress-ring';

const VISIBILITY_OPTIONS: { id: CvVisibility; label: string; icon: typeof Lock }[] = [
  { id: 'private', label: 'Private', icon: Lock },
  { id: 'peers', label: 'Selected peers', icon: Users },
  { id: 'public', label: 'Public profile', icon: Globe },
];

const SECTION_LABELS: Record<string, string> = {
  education: 'Education',
  experience: 'Experience',
  project: 'Projects',
  skill: 'Skills',
  achievement: 'Achievements',
  leadership: 'Leadership',
  certification: 'Certifications',
  portfolio: 'Portfolio',
};

function VerificationPill({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full">
        <BadgeCheck className="h-3 w-3" />
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full">
      Pending verification
    </span>
  );
}

export function CvCommandCenter({ initialHub }: { initialHub: CvHub }) {
  const [hub, setHub] = useState(initialHub);
  const [versionId, setVersionId] = useState(initialHub.activeVersion.id);
  const [visibility, setVisibility] = useState<CvVisibility>(initialHub.visibility);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', subtitle: '', body: '', section: 'experience' });

  const fetchHub = useCallback(async () => {
    const params = new URLSearchParams({ version: versionId, visibility });
    const res = await fetch(`/api/student/career/cv?${params}`);
    if (res.ok) setHub(await res.json());
  }, [versionId, visibility]);

  useEffect(() => {
    const t = setTimeout(() => void fetchHub(), 250);
    return () => clearTimeout(t);
  }, [fetchHub]);

  async function saveSettings(nextVis?: CvVisibility, nextVer?: string) {
    setLoading(true);
    const res = await fetch('/api/student/career/cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'settings',
        visibility: nextVis ?? visibility,
        versionId: nextVer ?? versionId,
      }),
    });
    if (res.ok) setHub(await res.json());
    setLoading(false);
  }

  async function addPendingEntry() {
    if (!newEntry.title.trim()) return;
    setLoading(true);
    const res = await fetch('/api/student/career/cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_entry', ...newEntry, versionId }),
    });
    if (res.ok) {
      setHub(await res.json());
      setNewEntry({ title: '', subtitle: '', body: '', section: 'experience' });
      setShowAdd(false);
    }
    setLoading(false);
  }

  async function askAdvisor() {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    const res = await fetch('/api/student/career/cv/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiPrompt, versionId }),
    });
    if (res.ok) {
      const data = await res.json();
      setAiReply(data.reply);
    }
    setLoading(false);
  }

  function exportCv(ats = false) {
    const url = `/api/student/career/cv/export?version=${versionId}${ats ? '&format=html' : ''}`;
    window.open(url, '_blank');
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-emerald-300 font-medium">
              <Shield className="h-4 w-4" />
              Verified professional identity
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              What the ecosystem confirms — not what you claim
            </h2>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              Grades, internships, startups, and projects auto-sync into your CV. Manual entries stay in{' '}
              <strong className="text-white">Pending verification</strong> until confirmed.
            </p>
          </div>
          <div className="flex gap-3">
            <ProgressRing value={hub.analytics.verifiedRatio} label="Verified" size={88} stroke={7} />
            <ProgressRing value={hub.analytics.completeness} label="Complete" size={88} stroke={7} />
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-2">
          {hub.compatibility.ecosystemLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs rounded-full bg-white/10 border border-white/20 px-3 py-1 hover:bg-white/20 transition"
            >
              {link.label}
              {link.score != null ? ` · ${link.score}%` : ''}
            </Link>
          ))}
        </div>
      </section>

      {/* Analytics row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Profile strength</p>
            <p className="text-2xl font-semibold mt-1">{hub.analytics.profileStrength}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Recruiter appeal</p>
            <p className="text-2xl font-semibold text-brand mt-1">{hub.analytics.recruiterAppeal}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Verified items</p>
            <p className="text-2xl font-semibold mt-1">{hub.analytics.verifiedCount}</p>
            <p className="text-[10px] text-muted-foreground">{hub.analytics.pendingCount} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs text-muted-foreground">Strongest for</p>
            <p className="text-sm font-semibold mt-1 line-clamp-2">
              {hub.analytics.topCompatibleRoles[0]?.role ?? 'Set a career path'}
            </p>
            {hub.analytics.topCompatibleRoles[0] && (
              <p className="text-xs text-brand">{hub.analytics.topCompatibleRoles[0].compatibility}% fit</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Versions + visibility + export */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileUser className="h-4 w-4" />
              CV versions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {hub.versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVersionId(v.id);
                  void saveSettings(undefined, v.id);
                }}
                className={cn(
                  'text-left rounded-xl border p-4 transition',
                  versionId === v.id
                    ? 'border-brand bg-brand/5 ring-1 ring-brand/30'
                    : 'border-border hover:border-brand/40'
                )}
              >
                <p className="font-medium text-sm">{v.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setVisibility(opt.id);
                    void saveSettings(opt.id);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                    visibility === opt.id ? 'border-brand bg-brand/5' : 'border-border'
                  )}
                >
                  <opt.icon className="h-4 w-4 text-muted-foreground" />
                  {opt.label}
                </button>
              ))}
              <p className="text-[10px] text-muted-foreground pt-2">
                Universities, companies, and platform owners retain full access per ecosystem policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4 space-y-2">
              <Button className="w-full" variant="default" onClick={() => exportCv()}>
                <Download className="h-4 w-4 mr-2" />
                Export premium PDF
              </Button>
              <Button className="w-full" variant="outline" onClick={() => exportCv(true)}>
                ATS-friendly export
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Live CV preview */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{hub.activeVersion.title} — live preview</h3>
          <Badge variant="secondary">{hub.verifiedEntries.length} verified · dynamic</Badge>
        </div>
        <Card className="border-border/60 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 px-8 py-6 border-b">
            <h4 className="text-xl font-semibold">{hub.user.name}</h4>
            <p className="text-sm text-muted-foreground">
              {hub.program}
              {hub.universityName ? ` · ${hub.universityName}` : ''}
            </p>
            {hub.user.headline && <p className="text-sm mt-2">{hub.user.headline}</p>}
          </div>
          <CardContent className="p-8 space-y-8 max-h-[520px] overflow-y-auto">
            {Object.entries(hub.entriesBySection).map(([section, items]) => (
              <div key={section}>
                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  {SECTION_LABELS[section] ?? section}
                </h5>
                <div className="space-y-4">
                  {items.map((e) => (
                    <div key={e.id} className="border-l-2 border-brand/40 pl-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{e.title}</p>
                        <VerificationPill status={e.verificationStatus} />
                      </div>
                      {e.subtitle && <p className="text-xs text-muted-foreground">{e.subtitle}</p>}
                      <p className="text-sm mt-1 text-foreground/90">{e.aiBody ?? e.body}</p>
                      {e.verifiedBy && (
                        <p className="text-[10px] text-muted-foreground mt-1">Verified by {e.verifiedBy}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Verified vs pending */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <BadgeCheck className="h-4 w-4" />
              Verified ({hub.verifiedEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {hub.verifiedEntries.slice(0, 8).map((e) => (
              <div key={e.id} className="text-sm">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.verifiedBy ?? 'platform'}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base text-amber-700 dark:text-amber-400">Pending verification</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-3 w-3 mr-1" />
              Add external
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showAdd && (
              <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <Input
                  placeholder="Title (e.g. Freelance project)"
                  value={newEntry.title}
                  onChange={(e) => setNewEntry((p) => ({ ...p, title: e.target.value }))}
                />
                <Input
                  placeholder="Organization / context"
                  value={newEntry.subtitle}
                  onChange={(e) => setNewEntry((p) => ({ ...p, subtitle: e.target.value }))}
                />
                <Input
                  placeholder="Description"
                  value={newEntry.body}
                  onChange={(e) => setNewEntry((p) => ({ ...p, body: e.target.value }))}
                />
                <Button size="sm" onClick={() => void addPendingEntry()} disabled={loading}>
                  Submit for verification
                </Button>
              </div>
            )}
            {hub.pendingEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending items — ecosystem data imports automatically.</p>
            ) : (
              hub.pendingEntries.map((e) => (
                <div key={e.id} className="text-sm border-l-2 border-amber-400 pl-3">
                  <p className="font-medium">{e.title}</p>
                  <VerificationPill status="pending" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      {/* Skills + badges */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verified skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hub.skills.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">
                    {s.name}
                    {s.verified && <BadgeCheck className="inline h-3 w-3 ml-1 text-emerald-600" />}
                  </span>
                  <span className="text-muted-foreground">{s.level}%</span>
                </div>
                <Progress value={s.level} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.evidence.join(' · ')}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credibility badges</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {hub.badges.map((b) => (
              <div
                key={b.id}
                className={cn(
                  'rounded-xl border p-3 text-center transition',
                  b.earned ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border opacity-50'
                )}
              >
                <Award className={cn('h-5 w-5 mx-auto', b.earned ? 'text-emerald-600' : 'text-muted-foreground')} />
                <p className="text-xs font-medium mt-2">{b.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Timeline */}
      <section>
        <h3 className="text-lg font-semibold mb-4">Career journey</h3>
        <div className="relative pl-6 border-l border-border space-y-6">
          {hub.timeline.map((ev) => (
            <div key={ev.id} className="relative">
              <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-brand ring-4 ring-background" />
              <p className="text-xs text-muted-foreground">
                {ev.year} · {ev.category}
              </p>
              <p className="font-medium text-sm">{ev.label}</p>
              {ev.href && (
                <Link href={ev.href} className="text-xs text-brand hover:underline">
                  View source
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Recruiter view */}
      <section>
        <Card className="border-violet-500/20 bg-violet-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Recruiter mode preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">{hub.recruiterPreview.compatibilityNote}</p>
            <p className="text-xs text-muted-foreground">
              Verification level: {hub.recruiterPreview.verificationLevel}% · Filter by:{' '}
              {hub.recruiterPreview.filtersAvailable.slice(0, 3).join(', ')}…
            </p>
            <div className="flex flex-wrap gap-2">
              {hub.recruiterPreview.verifiedHighlights.map((h) => (
                <Badge key={h} variant="secondary">
                  {h}
                </Badge>
              ))}
            </div>
            <Link href="/student/career/partnerships">
              <Button variant="outline" size="sm">
                Explore company partnerships
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Compare careers via CV */}
      <section>
        <h3 className="text-lg font-semibold mb-3">CV performance by path</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hub.analytics.topCompatibleRoles.map((r) => (
            <Card key={r.role}>
              <CardContent className="py-4">
                <p className="text-sm font-medium line-clamp-2">{r.role}</p>
                <Progress value={r.compatibility} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{r.compatibility}% compatibility</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* AI advisor + improvements */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI CV optimization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. How should I position my startup for consulting?"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void askAdvisor()}
              />
              <Button onClick={() => void askAdvisor()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
              </Button>
            </div>
            {aiReply && <p className="text-sm rounded-lg bg-muted p-3">{aiReply}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Improvement loop
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hub.improvements.map((imp) => (
              <div key={imp.id} className="text-sm border-l-2 border-brand/30 pl-3">
                <p className="font-medium">{imp.area}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{imp.message}</p>
                {imp.actionHref && (
                  <Link href={imp.actionHref} className="text-xs text-brand mt-1 inline-block hover:underline">
                    Take action →
                  </Link>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Portfolio */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Rocket className="h-4 w-4" />
          Portfolio proof
        </h3>
        <div className="flex flex-wrap gap-2">
          {hub.portfolioLinks.map((p) => (
            <Link key={p.href} href={p.href}>
              <Badge variant={p.verified ? 'default' : 'outline'}>
                {p.label}
                {p.verified && ' ✓'}
              </Badge>
            </Link>
          ))}
          {hub.portfolioLinks.length === 0 && (
            <p className="text-sm text-muted-foreground">Complete assignments or launch a startup to link portfolio proof.</p>
          )}
        </div>
      </section>

      {/* Missing sections */}
      {hub.analytics.missingSections.length > 0 && (
        <Card className="border-amber-500/30">
          <CardContent className="py-4 flex items-center gap-3">
            <Target className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm">
              Missing sections: <strong>{hub.analytics.missingSections.join(', ')}</strong> — add ecosystem activity or
              verified external entries.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
