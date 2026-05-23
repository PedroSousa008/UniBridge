'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type {
  CompanyOpportunitiesEcosystemHub,
  OpportunityDetail,
  OpportunityEcosystemCard,
  OpportunityLinkedStudent,
} from '@/lib/company/company-opportunities-ecosystem-hub';
import type { OpportunityCategoryId } from '@/lib/company/company-opportunities-intelligence';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Bookmark,
  Calendar,
  ChevronRight,
  GitCompare,
  Globe,
  GraduationCap,
  Loader2,
  MapPin,
  MessageCircle,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  UserPlus,
  X,
  Zap,
} from 'lucide-react';

function CompatRing({ value }: { value: number | null }) {
  const v = value ?? 0;
  const r = 20;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="url(#oppCompat)"
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="oppCompat" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">
        {value != null ? `${value}%` : '—'}
      </span>
    </div>
  );
}

function HeroMetricCard({
  label,
  value,
  hint,
  trend,
  delay,
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: 'up' | 'steady';
  delay: number;
}) {
  return (
    <div
      className="min-w-[140px] shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-white/50">{hint}</p>}
      {trend === 'up' && (
        <span className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-emerald-300">
          <TrendingUp className="h-3 w-3" /> Live
        </span>
      )}
    </div>
  );
}

function OpportunityCard({
  card,
  selected,
  onSelect,
}: {
  card: OpportunityEcosystemCard;
  selected: boolean;
  onSelect: () => void;
}) {
  const statusColor =
    card.status === 'open'
      ? card.currentlyHiring
        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
        : 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
      : card.status === 'future'
        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
        : 'bg-muted text-muted-foreground';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group w-full text-left rounded-2xl border bg-gradient-to-br from-card via-card to-muted/30 p-5 shadow-sm transition-all duration-300',
        'hover:shadow-xl hover:border-brand/40 hover:-translate-y-1',
        selected && 'ring-2 ring-brand shadow-lg'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {card.categoryLabel}
            </Badge>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusColor)}>
              {card.statusLabel}
            </span>
          </div>
          <h3 className="mt-2 font-semibold text-base leading-snug group-hover:text-brand transition-colors">
            {card.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{card.department}</p>
        </div>
        <CompatRing value={card.compatibilityAvg} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
          <MapPin className="h-3 w-3" /> {card.remoteLabel}
        </span>
        {card.duration && (
          <span className="rounded-full bg-muted/60 px-2 py-0.5">{card.duration}</span>
        )}
        {card.salaryLabel && (
          <span className="rounded-full bg-muted/60 px-2 py-0.5">{card.salaryLabel}</span>
        )}
        <span
          className={cn(
            'rounded-full px-2 py-0.5',
            card.currentlyHiring && card.status === 'open'
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
              : card.status === 'open'
                ? 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
                : 'bg-muted/60 text-muted-foreground'
          )}
        >
          {card.hiringUrgency}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {card.requiredSkills.slice(0, 4).map((s) => (
          <span key={s} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px]">
            {s}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-muted/40 px-2 py-1.5">
          <span className="text-muted-foreground">Applications</span>
          <p className="font-semibold tabular-nums">{card.applicationsCount}</p>
        </div>
        <div className="rounded-lg bg-muted/40 px-2 py-1.5">
          <span className="text-muted-foreground">Startup align</span>
          <p className="font-semibold tabular-nums">{card.startupAlignment}%</p>
        </div>
      </div>

      <ul className="mt-3 space-y-1">
        {card.signals.slice(0, 2).map((sig) => (
          <li key={sig} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 shrink-0 text-violet-500" />
            {sig}
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-center gap-1 text-xs font-medium text-brand opacity-0 group-hover:opacity-100 transition-opacity">
        Explore ecosystem <ChevronRight className="h-3 w-3" />
      </p>
    </button>
  );
}

function LinkedStudentRow({
  student,
  onPromote,
  onArchive,
  onPipeline,
  compareSelected,
  onToggleCompare,
}: {
  student: OpportunityLinkedStudent;
  onPromote: () => void;
  onArchive: () => void;
  onPipeline: () => void;
  compareSelected: boolean;
  onToggleCompare: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-3 transition-all',
        compareSelected && 'ring-2 ring-violet-500/50',
        student.linkType === 'official' ? 'border-violet-300/50 bg-violet-500/5' : 'bg-muted/20'
      )}
    >
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
          {student.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-medium text-muted-foreground">{student.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{student.name}</p>
            <CompatRing value={student.compatibility} />
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {student.universityName}
            {student.program ? ` · ${student.program}` : ''}
          </p>
          <Badge
            variant="outline"
            className={cn(
              'mt-1 text-[10px]',
              student.linkType === 'official'
                ? 'border-violet-400 text-violet-700'
                : 'border-slate-300'
            )}
          >
            {student.linkType === 'official' ? 'Official · student notified' : 'Preview · internal only'}
          </Badge>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={onToggleCompare}>
          <GitCompare className="h-3 w-3 mr-1" /> Compare
        </Button>
        {student.linkType === 'preview' && (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={onPromote}>
            Make official
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2" onClick={onPipeline}>
          Pipeline
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2" asChild>
          <Link href={`/company/talent?student=${student.studentUserId}`}>Profile</Link>
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2" asChild>
          <Link href={`/company/pipeline?student=${student.studentUserId}`}>
            <MessageCircle className="h-3 w-3" />
          </Link>
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-muted-foreground" onClick={onArchive}>
          Remove
        </Button>
      </div>
    </div>
  );
}

function ComparePanel({ students }: { students: OpportunityLinkedStudent[] }) {
  if (students.length < 2) return null;
  const metrics = [
    { key: 'compatibility', label: 'Compatibility', fn: (s: OpportunityLinkedStudent) => s.compatibility },
    { key: 'leadership', label: 'Leadership', fn: (s: OpportunityLinkedStudent) => s.leadershipScore },
    { key: 'profile', label: 'Profile strength', fn: (s: OpportunityLinkedStudent) => s.profileStrength },
    { key: 'network', label: 'Networking', fn: (s: OpportunityLinkedStudent) => s.networkingScore },
    { key: 'growth', label: 'Growth', fn: (s: OpportunityLinkedStudent) => s.growthPercent },
  ] as const;

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 animate-in fade-in duration-300">
      <p className="text-sm font-semibold flex items-center gap-2">
        <GitCompare className="h-4 w-4" /> Side-by-side comparison
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1 pr-4 text-muted-foreground font-medium">Metric</th>
              {students.map((s) => (
                <th key={s.linkId} className="text-left py-1 pr-4 font-medium">
                  {s.name.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key} className="border-t border-border/50">
                <td className="py-2 pr-4 text-muted-foreground">{m.label}</td>
                {students.map((s) => (
                  <td key={s.linkId} className="py-2 pr-4 font-semibold tabular-nums">
                    {m.fn(s) ?? '—'}
                    {m.key === 'compatibility' && m.fn(s) != null ? '%' : m.key !== 'growth' ? '' : '%'}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-border/50">
              <td className="py-2 pr-4 text-muted-foreground">Startup</td>
              {students.map((s) => (
                <td key={s.linkId} className="py-2 pr-4">
                  {s.startupInvolvement ?? '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CompanyOpportunitiesCommandCenter({
  initialHub,
}: {
  initialHub: CompanyOpportunitiesEcosystemHub;
}) {
  const [hub, setHub] = useState(initialHub);
  const [activeCategory, setActiveCategory] = useState<OpportunityCategoryId | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OpportunityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { studentUserId: string; name: string; universityName: string; program: string | null }[]
  >([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [linkBusy, setLinkBusy] = useState(false);
  const searchParams = useSearchParams();

  const refreshHub = useCallback(async () => {
    const res = await fetch('/api/company/opportunities');
    if (res.ok) setHub(await res.json());
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/company/opportunities/${id}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }, []);

  useEffect(() => {
    const opp = searchParams.get('opportunity');
    if (opp) {
      setSelectedId(opp);
      void loadDetail(opp);
    }
  }, [searchParams, loadDetail]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (studentQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      const res = await fetch(
        `/api/company/opportunities/search-students?q=${encodeURIComponent(studentQuery)}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results ?? []);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [studentQuery]);

  const filteredCards = useMemo(() => {
    if (activeCategory === 'all') return hub.opportunities;
    return hub.byCategory[activeCategory] ?? [];
  }, [hub, activeCategory]);

  const compareStudents = useMemo(
    () =>
      (detail?.linkedStudents ?? []).filter((s) => compareIds.includes(s.linkId)),
    [detail, compareIds]
  );

  async function linkStudent(studentUserId: string, linkType: 'preview' | 'official') {
    if (!selectedId) return;
    setLinkBusy(true);
    const res = await fetch(`/api/company/opportunities/${selectedId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentUserId, linkType }),
    });
    if (res.ok) {
      setDetail(await res.json());
      void refreshHub();
      setStudentQuery('');
      setSearchResults([]);
    }
    setLinkBusy(false);
  }

  async function patchLink(linkId: string, body: Record<string, unknown>) {
    if (!selectedId) return;
    setLinkBusy(true);
    const res = await fetch(`/api/company/opportunities/${selectedId}/links`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkId, ...body }),
    });
    if (res.ok) {
      setDetail(await res.json());
      void refreshHub();
    }
    setLinkBusy(false);
  }

  return (
    <div className="space-y-10 pb-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-10 text-white shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/50">
            Entry paths · not job posts
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{hub.heroTitle}</h1>
          <p className="mt-2 max-w-xl text-sm text-white/70">
            Explore ways students enter your ecosystem — internships, programs, startup collaborations,
            and future openings connected to Talent, Pipeline, and Events.
          </p>
          <div className="mt-8 flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {hub.heroMetrics.map((m, i) => (
              <HeroMetricCard key={m.id} {...m} delay={i * 60} />
            ))}
          </div>
          {hub.featuredSignals.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {hub.featuredSignals.slice(0, 4).map((sig) => (
                <span
                  key={sig}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/80"
                >
                  <Zap className="h-3 w-3 text-amber-300" />
                  {sig}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category navigation */}
      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Opportunity ecosystems
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition',
              activeCategory === 'all'
                ? 'bg-brand text-brand-foreground shadow-md'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            All paths ({hub.opportunities.length})
          </button>
          {hub.categories.map((cat) => {
            const count = hub.byCategory[cat.id]?.length ?? 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition whitespace-nowrap',
                  activeCategory === cat.id
                    ? 'bg-brand text-brand-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {cat.label}
                {count > 0 && (
                  <span className="ml-1.5 opacity-70 tabular-nums">({count})</span>
                )}
              </button>
            );
          })}
        </div>
        {activeCategory !== 'all' && (
          <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
            {hub.categories.find((c) => c.id === activeCategory)?.description}
          </p>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Cards grid */}
        <div className={cn('space-y-4', selectedId ? 'lg:col-span-2' : 'lg:col-span-5')}>
          {filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <p className="mt-4 font-medium">No opportunities in this ecosystem yet</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
                Roles from Company Presence sync here automatically. Add roles in Presence to populate
                internships, programs, and collaborations.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/company/presence">
                  Open Presence <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                'grid gap-4',
                selectedId ? 'grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'
              )}
            >
              {filteredCards.map((card) => (
                <OpportunityCard
                  key={card.id}
                  card={card}
                  selected={selectedId === card.id}
                  onSelect={() => setSelectedId(card.id === selectedId ? null : card.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedId && (
          <div className="lg:col-span-3 space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Opportunity workspace</h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {detailLoading && !detail ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : detail ? (
              <>
                <div className="rounded-2xl border bg-card p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Badge>{detail.card.categoryLabel}</Badge>
                      <h3 className="mt-2 text-2xl font-bold">{detail.card.title}</h3>
                      <p className="text-muted-foreground">{detail.card.department}</p>
                    </div>
                    <CompatRing value={detail.card.compatibilityAvg} />
                  </div>

                  {/* Why this exists */}
                  <div className="mt-6 rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 p-4 border border-indigo-500/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                      Why this opportunity exists
                    </p>
                    <p className="mt-2 text-sm leading-relaxed">
                      {detail.narrative.whyExists ??
                        detail.description ??
                        'Define your narrative in Presence or edit ecosystem story to attract the right talent.'}
                    </p>
                    {detail.narrative.successProfile && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <strong>Succeeds here:</strong> {detail.narrative.successProfile}
                      </p>
                    )}
                    {detail.narrative.growthPath && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        <strong>Growth path:</strong> {detail.narrative.growthPath}
                      </p>
                    )}
                  </div>

                  {/* Intelligence */}
                  <div className="mt-6">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      Opportunity intelligence
                    </p>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-lg font-bold tabular-nums">
                          {detail.intelligence.applicationQuality || '—'}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">Avg quality</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-lg font-bold tabular-nums">
                          {detail.intelligence.leadershipDensity}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">Leadership density</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-lg font-bold tabular-nums">
                          {detail.intelligence.startupFounderDensity}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">Startup signal</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-lg font-bold tabular-nums">
                          +{detail.intelligence.interestGrowth}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Weekly growth</p>
                      </div>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {detail.interestSignals.map((s) => (
                        <li
                          key={s}
                          className="text-[11px] rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Timeline */}
                  <div className="mt-6">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Active timeline
                    </p>
                    <ul className="mt-2 space-y-2">
                      {detail.timeline.map((t) => (
                        <li key={t.label} className="flex justify-between text-xs border-b border-border/40 pb-2">
                          <span className="text-muted-foreground">{t.label}</span>
                          <span className="font-medium">
                            {t.date ? new Date(t.date).toLocaleDateString() : 'TBD'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Events */}
                  {detail.connectedEvents.length > 0 && (
                    <div className="mt-6">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Connected events
                      </p>
                      <ul className="mt-2 space-y-2">
                        {detail.connectedEvents.map((e) => (
                          <li key={e.id}>
                            <Link
                              href={e.href}
                              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition"
                            >
                              <span>{e.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(e.startsAt).toLocaleDateString()}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Event attendance improves student compatibility and engagement indicators.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/company/presence?role=${detail.card.roleId ?? ''}`}>
                        Edit in Presence
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/company/pipeline">Open Pipeline</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/company/talent">Talent discovery</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/company/events">
                        <Rocket className="h-3 w-3 mr-1" /> Events
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Student linking */}
                <div className="rounded-2xl border p-5">
                  <p className="font-semibold flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Link students to this opportunity
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Preview = internal only. Official = student notified and sees company interest.
                  </p>
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search partner university students…"
                      value={studentQuery}
                      onChange={(e) => setStudentQuery(e.target.value)}
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <ul className="mt-2 rounded-lg border divide-y max-h-40 overflow-y-auto">
                      {searchResults.map((s) => (
                        <li key={s.studentUserId} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {s.universityName}
                              {s.program ? ` · ${s.program}` : ''}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={linkBusy}
                              className="text-[10px] h-7"
                              onClick={() => void linkStudent(s.studentUserId, 'preview')}
                            >
                              Preview
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={linkBusy}
                              className="text-[10px] h-7"
                              onClick={() => void linkStudent(s.studentUserId, 'official')}
                            >
                              Official
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {compareStudents.length >= 2 && <div className="mt-4"><ComparePanel students={compareStudents} /></div>}

                  <div className="mt-4 space-y-2">
                    {detail.linkedStudents.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-xl">
                        No linked students yet — search above to add candidates.
                      </p>
                    ) : (
                      detail.linkedStudents.map((s) => (
                        <LinkedStudentRow
                          key={s.linkId}
                          student={s}
                          compareSelected={compareIds.includes(s.linkId)}
                          onToggleCompare={() =>
                            setCompareIds((ids) =>
                              ids.includes(s.linkId)
                                ? ids.filter((x) => x !== s.linkId)
                                : ids.length < 4
                                  ? [...ids, s.linkId]
                                  : ids
                            )
                          }
                          onPromote={() => void patchLink(s.linkId, { linkType: 'official' })}
                          onArchive={() => void patchLink(s.linkId, { archive: true })}
                          onPipeline={async () => {
                            setLinkBusy(true);
                            await fetch(`/api/company/opportunities/${selectedId}/links`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'pipeline',
                                studentUserId: s.studentUserId,
                              }),
                            });
                            setLinkBusy(false);
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Applications */}
                {detail.applications.length > 0 && (
                  <div className="rounded-2xl border p-5">
                    <p className="font-semibold">Applications via UniBridge profile</p>
                    <ul className="mt-3 space-y-2">
                      {detail.applications.map((a) => (
                        <li
                          key={a.applicationId}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{a.studentName}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">{a.status}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {a.compatibility != null && (
                              <span className="text-xs font-semibold tabular-nums">
                                {a.compatibility}% fit
                              </span>
                            )}
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/company/talent?student=${a.studentUserId}`}>View</Link>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Cross-links footer */}
      <section className="rounded-2xl border bg-muted/30 p-6">
        <p className="text-sm font-semibold">Ecosystem connections</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {[
            { href: '/company/talent', label: 'Talent', icon: Search },
            { href: '/company/pipeline', label: 'Pipeline', icon: Bookmark },
            { href: '/company/presence', label: 'Presence & roles', icon: GraduationCap },
            { href: '/company/events', label: 'Events', icon: Calendar },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm hover:border-brand/40 transition"
            >
              <Icon className="h-4 w-4 text-brand" />
              {label}
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
