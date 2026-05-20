'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Brain,
  Briefcase,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
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
import type { SkillsHub } from '@/lib/student/student-skills-hub';
import type { SkillCategory, TrackedSkill } from '@/lib/career/skills-intelligence';
import { ProgressRing } from '@/components/student/home/progress-ring';

const CATEGORY_META: Record<SkillCategory, { label: string; color: string }> = {
  technical: { label: 'Technical Skills', color: 'text-blue-600' },
  soft: { label: 'Soft Skills', color: 'text-violet-600' },
  entrepreneurial: { label: 'Entrepreneurial Skills', color: 'text-amber-600' },
  creative: { label: 'Creative Skills', color: 'text-pink-600' },
};

function LevelBadge({ level, xp }: { level: string; xp: number }) {
  return (
    <span className="text-xs font-medium tabular-nums">
      {xp} XP · <span className="capitalize">{level}</span>
    </span>
  );
}

function SkillCard({ skill }: { skill: TrackedSkill }) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition',
        skill.verification === 'verified'
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-amber-500/30 bg-amber-500/5'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm">{skill.name}</p>
          <LevelBadge level={skill.level} xp={skill.xp} />
        </div>
        {skill.verification === 'verified' ? (
          <Badge variant="secondary" className="text-emerald-700 bg-emerald-100 dark:bg-emerald-950">
            <BadgeCheck className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        ) : (
          <Badge variant="outline" className="text-amber-700">
            Self-reported
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        <span className="font-medium text-foreground/80">Why it increased: </span>
        {skill.whyIncreased}
      </p>
      {skill.trend === 'up' && skill.recentDelta > 0 && (
        <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />+{skill.recentDelta} recent
        </p>
      )}
      {skill.sources.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Verified through</p>
          <ul className="text-xs space-y-1">
            {skill.sources.map((s) => (
              <li key={s.label}>
                {s.href ? (
                  <Link href={s.href} className="text-brand hover:underline">
                    {s.label}
                  </Link>
                ) : (
                  s.label
                )}
                <span className="text-muted-foreground"> · {s.verifiedBy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {skill.usedIn.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Used in real life</p>
          <div className="flex flex-wrap gap-1">
            {skill.usedIn.map((u) => (
              <Badge key={u.label} variant="outline" className="text-[10px]">
                {u.label}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {skill.careers.length > 0 && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Important for: {skill.careers.slice(0, 3).join(' · ')}
        </p>
      )}
    </div>
  );
}

export function SkillsCommandCenter({ initialHub }: { initialHub: SkillsHub }) {
  const [hub, setHub] = useState(initialHub);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<SkillCategory | 'all'>('all');
  const [addSkillId, setAddSkillId] = useState('');
  const [addLevel, setAddLevel] = useState(55);

  const fetchHub = useCallback(async () => {
    const res = await fetch('/api/student/career/skills');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    const t = setInterval(() => void fetchHub(), 60_000);
    return () => clearInterval(t);
  }, [fetchHub]);

  const displaySkills =
    activeCategory === 'all' ? hub.skills : hub.skillsByCategory[activeCategory];

  async function askAdvisor() {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    const res = await fetch('/api/student/career/skills/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: aiPrompt }),
    });
    if (res.ok) setAiReply((await res.json()).reply);
    setLoading(false);
  }

  async function submitSelfReport() {
    if (!addSkillId) return;
    setLoading(true);
    const res = await fetch('/api/student/career/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'self_report', skillId: addSkillId, claimedLevel: addLevel }),
    });
    if (res.ok) setHub(await res.json());
    setAddSkillId('');
    setLoading(false);
  }

  const compareData = hub.industryCompare.map((r) => ({
    name: r.skill.slice(0, 12),
    you: r.you,
    industry: r.industry,
  }));

  return (
    <div className="space-y-10 pb-12">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/40 p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm text-cyan-300 font-medium">
              <Zap className="h-4 w-4" />
              Central growth intelligence
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Your career skill tree — alive & verified</h2>
            <p className="mt-2 text-sm text-slate-300 max-w-xl">
              Skills evolve from grades, projects, internships, and Startup Hub — powering compatibility, CV, mentor,
              and matching across UniBridge.
            </p>
          </div>
          <div className="flex gap-3">
            <ProgressRing value={hub.stats.averageXp} label="Avg XP" size={88} stroke={7} />
            <ProgressRing value={hub.stats.verifiedCount * 8} label="Verified" size={88} stroke={7} />
          </div>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2">
          {hub.compatibility.ecosystemLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs rounded-full bg-white/10 border border-white/20 px-3 py-1 hover:bg-white/20"
            >
              {link.label}
            </Link>
          ))}
        </div>
        {hub.compatibility.primaryRole && (
          <p className="relative mt-4 text-sm text-cyan-200">
            {hub.compatibility.primaryRole}: {hub.compatibility.primaryScore}% compatibility
            {hub.compatibility.withSkillsEstimate != null && (
              <> → up to {hub.compatibility.withSkillsEstimate}% with verified skills (+{hub.stats.compatibilityBoost})</>
            )}
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Verified skills</p>
            <p className="text-2xl font-semibold">{hub.stats.verifiedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Self-reported</p>
            <p className="text-2xl font-semibold">{hub.stats.selfReportedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Expert tier</p>
            <p className="text-2xl font-semibold text-brand">{hub.stats.expertCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Compatibility boost</p>
            <p className="text-2xl font-semibold">+{hub.stats.compatibilityBoost}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Live sync</p>
            <p className="text-sm font-medium mt-1 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Ecosystem active
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill strength radar</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={hub.radar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                <Radar dataKey="value" stroke="hsl(var(--brand))" fill="hsl(var(--brand))" fillOpacity={0.35} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">You vs industry expectations</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareData} layout="vertical" margin={{ left: 8 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="you" name="You" fill="hsl(var(--brand))" radius={2} />
                <Bar dataKey="industry" name="Industry" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveCategory('all')}
          >
            All
          </Button>
          {(Object.keys(CATEGORY_META) as SkillCategory[]).map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? 'default' : 'outline'}
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_META[cat].label}
            </Button>
          ))}
        </div>
        {displaySkills.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Complete coursework, internships, or startup work to unlock skills in this category.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {displaySkills.map((s) => (
              <SkillCard key={s.id} skill={s} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-brand/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              AI skill gap analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hub.compatibility.primaryRole && (
              <p className="text-sm font-medium">
                To become <span className="text-brand">{hub.compatibility.primaryRole}</span> you still need:
              </p>
            )}
            {hub.gaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No major gaps detected — keep building verified depth.</p>
            ) : (
              hub.gaps.map((g) => (
                <div key={g.skill}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{g.skill}</span>
                    <span className="text-muted-foreground">{g.currentXp}/{g.targetXp} XP</span>
                  </div>
                  <Progress value={Math.min(100, (g.currentXp / g.targetXp) * 100)} className="h-2" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Recommended actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {hub.recommendations.map((r) => (
              <div key={r.id} className="text-sm border-l-2 border-brand/40 pl-3">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{r.reason}</p>
                <Link href={r.href} className="text-xs text-brand hover:underline">
                  Start →
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI skills advisor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="What skills do I need for product management?"
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
              <Plus className="h-4 w-4" />
              Self-reported skill
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={addSkillId}
              onChange={(e) => setAddSkillId(e.target.value)}
            >
              <option value="">Select skill…</option>
              {hub.catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={20}
              max={100}
              value={addLevel}
              onChange={(e) => setAddLevel(Number(e.target.value))}
              placeholder="Claimed level (20-100)"
            />
            <Button size="sm" className="w-full" onClick={() => void submitSelfReport()} disabled={loading || !addSkillId}>
              Add (pending verification)
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Self-reported skills display but do not boost compatibility until verified by ecosystem evidence.
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Milestones & achievements</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hub.milestones.map((m) => (
            <div
              key={m.id}
              className={cn(
                'rounded-xl border p-4 text-center',
                m.earned ? 'border-brand/40 bg-brand/5' : 'border-border opacity-50'
              )}
            >
              <BadgeCheck className={cn('h-6 w-6 mx-auto', m.earned ? 'text-brand' : 'text-muted-foreground')} />
              <p className="text-sm font-medium mt-2">{m.title}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{m.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Professor & company validation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Verified sources already include <strong className="text-foreground">teacher</strong> (graded work),{' '}
              <strong className="text-foreground">company</strong> (internships), and{' '}
              <strong className="text-foreground">university</strong> (gradebook & attendance).
            </p>
            <p>
              Formal validation workflows for professors and partners to endorse teamwork, communication, and leadership
              are supported by the verification layer — expand as your institution connects reviewers.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Real-time activity feed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hub.liveActivity.map((a, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {a.label}
              </p>
            ))}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => void fetchHub()}>
              Refresh now
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
