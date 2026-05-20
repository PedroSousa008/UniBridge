'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  Filter,
  GraduationCap,
  Rocket,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type {
  TalentDegreeOption,
  TalentEcosystemHub,
  TalentStudentCard,
  TalentUniversityOption,
} from '@/lib/company/company-talent-ecosystem-hub';

type Step = 'universities' | 'degrees' | 'ecosystem';

function EngagementBadge({ level }: { level: string }) {
  const colors =
    level === 'strong'
      ? 'bg-emerald-500/15 text-emerald-700'
      : level === 'growing'
        ? 'bg-sky-500/15 text-sky-700'
        : 'bg-muted text-muted-foreground';
  return (
    <Badge variant="outline" className={cn('text-[10px] capitalize', colors)}>
      {level} engagement
    </Badge>
  );
}

function StartupBadge({ level }: { level: string }) {
  return (
    <Badge variant="secondary" className="text-[10px] gap-1">
      <Rocket className="h-3 w-3" />
      Startup {level}
    </Badge>
  );
}

function StudentTalentCard({
  student,
  onSavePipeline,
  saving,
}: {
  student: TalentStudentCard;
  onSavePipeline: (userId: string) => void;
  saving: boolean;
}) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card p-5 transition hover:border-brand/30 hover:shadow-lg">
      <div className="flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-muted to-muted/50 text-lg font-light ring-1 ring-border/60">
          {student.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={student.image} alt="" className="h-full w-full object-cover" />
          ) : (
            student.name.charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold tracking-tight">{student.name}</p>
            <span className="text-sm font-bold text-brand tabular-nums">{student.compatibilityScore}%</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">{student.headline ?? 'Student'}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {student.verifiedBadges.slice(0, 2).map((b) => (
              <Badge key={b} variant="secondary" className="text-[10px]">
                {b}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-muted/40 py-2">
          <p className="font-semibold tabular-nums">{student.employabilityScore}%</p>
          <p className="text-muted-foreground">Employability</p>
        </div>
        <div className="rounded-lg bg-muted/40 py-2">
          <p className="font-semibold tabular-nums">{student.profileStrength}%</p>
          <p className="text-muted-foreground">Profile</p>
        </div>
        <div className="rounded-lg bg-brand/10 py-2">
          <p className="font-semibold tabular-nums text-brand">+{student.growthPercent}%</p>
          <p className="text-muted-foreground">Growth</p>
        </div>
      </div>

      {student.topSkills.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {student.topSkills.map((sk) => (
            <span key={sk} className="rounded-md bg-muted px-2 py-0.5 text-[10px]">
              {sk}
            </span>
          ))}
        </div>
      ) : null}

      {student.startupActivity ? (
        <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
          <Rocket className="h-3 w-3" /> {student.startupActivity}
        </p>
      ) : null}

      <ul className="mt-2 space-y-0.5">
        {student.activitySignals.slice(0, 2).map((sig) => (
          <li key={sig} className="text-[11px] text-muted-foreground">
            · {sig}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="brand"
          className="flex-1"
          disabled={saving}
          onClick={() => onSavePipeline(student.userId)}
        >
          Save to pipeline
        </Button>
      </div>
    </div>
  );
}

export function CompanyTalentCommandCenter() {
  const [step, setStep] = useState<Step>('universities');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPartnerships, setHasPartnerships] = useState(true);

  const [universities, setUniversities] = useState<TalentUniversityOption[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<TalentUniversityOption | null>(null);
  const [degrees, setDegrees] = useState<TalentDegreeOption[]>([]);
  const [selectedDegree, setSelectedDegree] = useState<TalentDegreeOption | null>(null);
  const [ecosystem, setEcosystem] = useState<TalentEcosystemHub | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    graduation: 'all',
    minCompatibility: 0,
    leadership: false,
    startup: false,
    verified: false,
    openOnly: false,
  });

  const fetchUniversities = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/company/talent');
    if (res.ok) {
      const data = await res.json();
      setUniversities(data.universities ?? []);
      setHasPartnerships(data.hasPartnerships ?? false);
    }
    setLoading(false);
  }, []);

  const fetchDegrees = useCallback(async (universityId: string) => {
    setLoading(true);
    const res = await fetch(`/api/company/talent?universityId=${universityId}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedUniversity(data.university);
      setDegrees(data.degrees ?? []);
      setStep('degrees');
    }
    setLoading(false);
  }, []);

  const fetchEcosystem = useCallback(
    async (universityId: string, degreeKey: string, f = filters) => {
      setLoading(true);
      const params = new URLSearchParams({
        universityId,
        degree: degreeKey,
        graduation: f.graduation,
      });
      if (f.minCompatibility > 0) params.set('minCompatibility', String(f.minCompatibility));
      if (f.leadership) params.set('leadership', '1');
      if (f.startup) params.set('startup', '1');
      if (f.verified) params.set('verified', '1');
      if (f.openOnly) params.set('openOnly', '1');

      const res = await fetch(`/api/company/talent?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEcosystem(data.ecosystem);
        setStep('ecosystem');
      }
      setLoading(false);
    },
    [filters]
  );

  useEffect(() => {
    void fetchUniversities();
  }, [fetchUniversities]);

  async function saveToPipeline(userId: string) {
    setSaving(true);
    await fetch('/api/company/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentUserId: userId, stage: 'saved' }),
    });
    setSaving(false);
  }

  if (loading && step === 'universities' && universities.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Loading talent ecosystem…</p>;
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          className={cn('font-medium', step === 'universities' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
          onClick={() => {
            setStep('universities');
            setSelectedUniversity(null);
            setSelectedDegree(null);
            setEcosystem(null);
            void fetchUniversities();
          }}
        >
          Universities
        </button>
        {selectedUniversity ? (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button
              type="button"
              className={cn('font-medium', step === 'degrees' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}
              onClick={() => {
                if (selectedUniversity) void fetchDegrees(selectedUniversity.id);
              }}
            >
              {selectedUniversity.name}
            </button>
          </>
        ) : null}
        {selectedDegree ? (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{selectedDegree.name}</span>
          </>
        ) : null}
      </div>

      {!hasPartnerships && step === 'universities' && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          Activate university partnerships on Home to unlock the talent ecosystem. Only partner universities appear here.
        </p>
      )}

      {/* STEP 1 — Universities */}
      {step === 'universities' && (
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight">Select university</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Discover ambitious talent inside your partner university ecosystems.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {universities.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setSelectedUniversity(u);
                  void fetchDegrees(u.id);
                }}
                className="group text-left rounded-2xl border bg-card p-5 transition hover:border-brand/40 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {u.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold group-hover:text-brand transition-colors">{u.name}</p>
                    {u.location ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{u.location}</p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-brand shrink-0" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/40 px-2 py-2">
                    <p className="font-semibold tabular-nums">{u.totalStudents}</p>
                    <p className="text-muted-foreground">Students</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-2 py-2">
                    <p className="font-semibold tabular-nums">{u.employabilityScore}%</p>
                    <p className="text-muted-foreground">Employability</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <EngagementBadge level={u.engagementLevel} />
                  <StartupBadge level={u.startupActivity} />
                </div>
                {u.strongestSkills.length > 0 ? (
                  <p className="mt-2 text-[10px] text-muted-foreground truncate">
                    Skills: {u.strongestSkills.join(' · ')}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* STEP 2 — Degrees */}
      {step === 'degrees' && selectedUniversity && (
        <section>
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setStep('universities')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Universities
          </Button>
          <div className="mb-6 flex items-center gap-4">
            {selectedUniversity.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedUniversity.logoUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <GraduationCap className="h-6 w-6" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Degree ecosystems</h2>
              <p className="text-sm text-muted-foreground">{selectedUniversity.name}</p>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading degrees…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {degrees.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => {
                    setSelectedDegree(d);
                    void fetchEcosystem(selectedUniversity.id, d.key);
                  }}
                  className="group text-left rounded-2xl border bg-gradient-to-br from-card to-muted/20 p-5 transition hover:border-brand/40 hover:shadow-md"
                >
                  <p className="text-lg font-semibold group-hover:text-brand">{d.name}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border bg-card/80 px-2 py-2">
                      <p className="font-semibold">{d.totalStudents}</p>
                      <p className="text-muted-foreground">Students</p>
                    </div>
                    <div className="rounded-lg border bg-brand/10 px-2 py-2">
                      <p className="font-semibold text-brand">{d.companyCompatibility}%</p>
                      <p className="text-muted-foreground">Your fit</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <EngagementBadge level={d.engagementLevel} />
                    <StartupBadge level={d.startupActivity} />
                  </div>
                  {d.commonSkills.length > 0 && (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Top skills: {d.commonSkills.slice(0, 3).join(', ')}
                    </p>
                  )}
                  <p className="mt-3 text-xs text-brand font-medium flex items-center gap-1">
                    Enter ecosystem <ChevronRight className="h-3 w-3" />
                  </p>
                </button>
              ))}
              {degrees.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  No visible students in this university yet. Students must enable company visibility and open-to-recruiting on their profile.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* STEP 3 — Ecosystem */}
      {step === 'ecosystem' && ecosystem && selectedUniversity && selectedDegree && (
        <section className="space-y-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep('degrees');
              setEcosystem(null);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> {selectedDegree.name}
          </Button>

          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand/25 via-transparent to-transparent" />
            <div className="relative">
              <p className="text-sm text-white/60 uppercase tracking-widest">Talent ecosystem</p>
              <h2 className="text-3xl font-semibold mt-1">
                {ecosystem.degree.name}
                <span className="text-white/50 font-normal"> — {ecosystem.university.name}</span>
              </h2>
              <div className="mt-6 flex flex-wrap gap-6 items-center">
                {ecosystem.university.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ecosystem.university.logoUrl}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover ring-2 ring-white/20"
                  />
                ) : null}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                  {[
                    ['Students', ecosystem.hero.totalStudents],
                    ['Avg compatibility', `${ecosystem.hero.avgCompatibility}%`],
                    ['Employability', `${ecosystem.hero.employabilityScore}%`],
                    ['Startup activity', `${ecosystem.hero.startupActivityPct}%`],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="rounded-xl bg-white/10 px-3 py-2 text-center">
                      <p className="text-lg font-semibold tabular-nums">{val}</p>
                      <p className="text-[10px] text-white/60">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-white/70">
                <span>Leadership {ecosystem.hero.leadershipActivityPct}%</span>
                <span>Internships {ecosystem.hero.internshipActivityPct}%</span>
                <span>Networking {ecosystem.hero.networkingActivityPct}%</span>
                <span>Skills: {ecosystem.hero.commonSkills.slice(0, 3).join(' · ') || '—'}</span>
              </div>
              <div className="mt-4 flex items-end gap-1 h-12">
                {ecosystem.hero.employabilityTrend.map((p) => (
                  <div
                    key={p.label}
                    className="flex-1 rounded-t bg-brand/80"
                    style={{ height: `${Math.max(12, p.value)}%` }}
                    title={`${p.label}: ${p.value}`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-white/50 mt-1">Employability evolution</p>
            </div>
          </div>

          {/* Floating filters */}
          <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shadow-sm bg-card/95 backdrop-blur"
              onClick={() => setShowFilters((v) => !v)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
            {showFilters && (
              <div className="flex flex-wrap gap-2 rounded-2xl border bg-card/95 backdrop-blur p-3 shadow-sm w-full">
                <select
                  className="h-9 rounded-lg border px-2 text-xs"
                  value={filters.graduation}
                  onChange={(e) => setFilters({ ...filters, graduation: e.target.value })}
                >
                  <option value="all">All years</option>
                  <option value="1">1 year left</option>
                  <option value="2">2 years left</option>
                  <option value="3plus">3+ years left</option>
                </select>
                <select
                  className="h-9 rounded-lg border px-2 text-xs"
                  value={filters.minCompatibility}
                  onChange={(e) =>
                    setFilters({ ...filters, minCompatibility: Number(e.target.value) })
                  }
                >
                  <option value={0}>Any compatibility</option>
                  <option value={60}>60%+</option>
                  <option value={70}>70%+</option>
                  <option value={80}>80%+</option>
                </select>
                {[
                  ['leadership', 'Leadership'],
                  ['startup', 'Startup'],
                  ['verified', 'Verified'],
                  ['openOnly', 'Open to roles'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs',
                      filters[key as keyof typeof filters] && 'bg-primary text-primary-foreground'
                    )}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        [key]: !filters[key as keyof typeof filters],
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
                <Button
                  size="sm"
                  variant="brand"
                  onClick={() =>
                    void fetchEcosystem(selectedUniversity.id, selectedDegree.key, filters)
                  }
                >
                  Apply
                </Button>
              </div>
            )}
          </div>

          {/* AI sections */}
          {ecosystem.aiSections.map((section) => (
            <div key={section.id}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand" />
                  {section.title}
                </h3>
                <p className="text-sm text-muted-foreground">{section.subtitle}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {section.students.map((s) => (
                  <StudentTalentCard
                    key={s.userId}
                    student={s}
                    onSavePipeline={saveToPipeline}
                    saving={saving}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Clusters */}
          {ecosystem.clusters.map((cluster) => (
            <div key={cluster.id}>
              <div className="mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {cluster.title}
                </h3>
                <p className="text-sm text-muted-foreground">{cluster.description}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cluster.students.map((s) => (
                  <StudentTalentCard
                    key={s.userId}
                    student={s}
                    onSavePipeline={saveToPipeline}
                    saving={saving}
                  />
                ))}
              </div>
            </div>
          ))}

          {ecosystem.allStudents.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No students match your filters. Try widening compatibility or graduation year.
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
            <Zap className="h-3 w-3" />
            Discovering future talent — not scanning spreadsheets.
          </p>
        </section>
      )}

      {loading && step !== 'universities' && (
        <p className="text-center text-sm text-muted-foreground py-8">Loading…</p>
      )}
    </div>
  );
}
