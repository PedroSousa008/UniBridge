'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  Loader2,
  Plus,
  Rocket,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CULTURE_TAG_OPTIONS, ROLE_TYPE_OPTIONS } from '@/lib/company/company-presence-intelligence';
import type { CompanyPresenceHub } from '@/lib/company/company-presence-hub';

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white/10 px-3 py-2 text-center backdrop-blur-sm">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-white/70">{label}</p>
    </div>
  );
}

function CompatBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function CompanyPresenceCommandCenter({ initialHub }: { initialHub: CompanyPresenceHub }) {
  const [hub, setHub] = useState(initialHub);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    cultureHeadline: initialHub.hero.cultureHeadline ?? '',
    ownerName: initialHub.hero.ownerName ?? '',
    totalEmployees: initialHub.hero.totalEmployees ?? '',
    hiringActivity: 'actively_hiring',
    mission: initialHub.culture.mission ?? '',
    vision: initialHub.culture.vision ?? '',
    workPhilosophy: initialHub.culture.workPhilosophy ?? '',
    whatWeLookFor: initialHub.culture.whatWeLookFor ?? '',
    growthCulture: initialHub.culture.growthCulture ?? '',
    startupCollaboration: initialHub.startupSection.mentorshipOffers ?? '',
    nonNegotiables: initialHub.nonNegotiables.join('\n'),
    preferredQualities: initialHub.preferredQualities.join('\n'),
    values: initialHub.culture.values.join('\n'),
    leadershipStyles: initialHub.culture.leadershipStyles,
  });

  const refresh = useCallback(async () => {
    const res = await fetch('/api/company/presence');
    if (res.ok) setHub(await res.json());
  }, []);

  async function saveProfile() {
    setSaving(true);
    const res = await fetch('/api/company/presence', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cultureHeadline: draft.cultureHeadline,
        ownerName: draft.ownerName,
        totalEmployees: draft.totalEmployees ? Number(draft.totalEmployees) : null,
        hiringActivity: draft.hiringActivity,
        mission: draft.mission,
        vision: draft.vision,
        workPhilosophy: draft.workPhilosophy,
        whatWeLookFor: draft.whatWeLookFor,
        growthCulture: draft.growthCulture,
        startupCollaboration: draft.startupCollaboration,
        values: draft.values.split('\n').map((s) => s.trim()).filter(Boolean),
        leadershipStyles: draft.leadershipStyles,
        nonNegotiables: draft.nonNegotiables.split('\n').map((s) => s.trim()).filter(Boolean),
        preferredQualities: draft.preferredQualities.split('\n').map((s) => s.trim()).filter(Boolean),
        whyJoin: hub.whyJoin,
      }),
    });
    if (res.ok) setHub(await res.json());
    setSaving(false);
    setEditMode(false);
  }

  async function addRole() {
    setSaving(true);
    const res = await fetch('/api/company/presence/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New role',
        roleType: 'internship',
        remoteType: 'hybrid',
        requiredSkills: [],
        preferredSkills: [],
      }),
    });
    if (res.ok) setHub(await res.json());
    setSaving(false);
  }

  async function updateRole(roleId: string, patch: Record<string, unknown>) {
    const role = hub.roles.find((r) => r.id === roleId);
    if (!role) return;
    setSaving(true);
    const res = await fetch('/api/company/presence/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...role, ...patch, id: roleId }),
    });
    if (res.ok) setHub(await res.json());
    setSaving(false);
  }

  async function removeRole(roleId: string) {
    setSaving(true);
    const res = await fetch(`/api/company/presence/roles?id=${roleId}`, { method: 'DELETE' });
    if (res.ok) setHub(await res.json());
    setSaving(false);
  }

  async function addDepartment() {
    const name = window.prompt('Department name');
    if (!name?.trim()) return;
    setSaving(true);
    const res = await fetch('/api/company/presence/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) setHub(await res.json());
    setSaving(false);
  }

  async function addTeamMember() {
    setSaving(true);
    const res = await fetch('/api/company/presence/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New team member', memberType: 'employee' }),
    });
    if (res.ok) setHub(await res.json());
    setSaving(false);
  }

  const c = hub.compatibilityPreview;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Your live company page — students see this through active university partnerships.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={saving}>
            Refresh
          </Button>
          <Button variant={editMode ? 'secondary' : 'brand'} size="sm" onClick={() => setEditMode(!editMode)}>
            {editMode ? 'Preview mode' : 'Edit page'}
          </Button>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/20 via-transparent to-transparent" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-2 ring-white/20">
              {hub.hero.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={hub.hero.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-white/60" />
              )}
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">{hub.hero.companyName}</h2>
              {editMode ? (
                <Input
                  className="mt-2 max-w-md bg-white/10 text-white border-white/20"
                  value={draft.cultureHeadline}
                  onChange={(e) => setDraft({ ...draft, cultureHeadline: e.target.value })}
                  placeholder="Culture headline"
                />
              ) : (
                <p className="mt-2 max-w-lg text-lg text-white/80 italic">
                  &ldquo;{hub.hero.cultureHeadline}&rdquo;
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/70">
                {hub.hero.industry && <span>{hub.hero.industry}</span>}
                {hub.hero.headquarters && <span>· {hub.hero.headquarters}</span>}
                {hub.hero.ownerName && <span>· Owner: {hub.hero.ownerName}</span>}
              </div>
              <Badge className="mt-3 border-white/20 bg-white/10">{hub.hero.hiringActivity}</Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="Partnerships" value={hub.hero.partnerships} />
            <StatPill label="Opportunities" value={hub.hero.activeOpportunities} />
            <StatPill label="Startups" value={hub.hero.startupCollaborations} />
            <StatPill label="Employees" value={hub.hero.totalEmployees ?? '—'} />
          </div>
        </div>
        {editMode ? (
          <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
            <Input
              className="bg-white/10 border-white/20 text-white"
              placeholder="Owner name"
              value={draft.ownerName}
              onChange={(e) => setDraft({ ...draft, ownerName: e.target.value })}
            />
            <Input
              className="bg-white/10 border-white/20 text-white"
              placeholder="Total employees"
              type="number"
              value={draft.totalEmployees}
              onChange={(e) => setDraft({ ...draft, totalEmployees: e.target.value })}
            />
            <select
              className="h-11 rounded-xl border border-white/20 bg-white/10 px-3 text-sm text-white"
              value={draft.hiringActivity}
              onChange={(e) => setDraft({ ...draft, hiringActivity: e.target.value })}
            >
              <option value="actively_hiring">Actively hiring</option>
              <option value="selective">Selective hiring</option>
              <option value="building_pipeline">Building pipeline</option>
              <option value="paused">Hiring paused</option>
            </select>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compatibility preview */}
        <Card className="lg:col-span-1 border-brand/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-brand" />
              Compatibility engine
            </CardTitle>
            <p className="text-xs text-muted-foreground">{hub.previewStudentLabel}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-brand tabular-nums">{c.overall}%</p>
              <p className="text-sm text-muted-foreground">match with {hub.hero.companyName}</p>
            </div>
            <CompatBar label="Skills match" value={c.skillsMatch} />
            <CompatBar label="Leadership" value={c.leadership} />
            <CompatBar label="Communication" value={c.communication} />
            <CompatBar label="Startup activity" value={c.startupActivity} />
            <CompatBar label="Academic alignment" value={c.academicAlignment} />
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-xs font-medium mb-2">To improve compatibility</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {c.recommendations.map((r, i) => (
                  <li key={i}>· {r}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Attractiveness */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Attractiveness score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold tabular-nums mb-4">{hub.attractiveness.score}</p>
            <div className="space-y-2 text-xs">
              {[
                ['Student interest', hub.attractiveness.studentInterest],
                ['Application growth', hub.attractiveness.applicationGrowth],
                ['Event engagement', hub.attractiveness.eventEngagement],
                ['Response speed', hub.attractiveness.responseSpeed],
                ['Hiring satisfaction', hub.attractiveness.hiringSatisfaction],
                ['Mentorship activity', hub.attractiveness.mentorshipActivity],
              ].map(([label, val]) => (
                <CompatBar key={String(label)} label={String(label)} value={Number(val)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Non-negotiables */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Requirements & fit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground mb-2">Non-negotiables</p>
              {editMode ? (
                <textarea
                  className="min-h-[80px] w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.nonNegotiables}
                  onChange={(e) => setDraft({ ...draft, nonNegotiables: e.target.value })}
                  placeholder="One per line"
                />
              ) : (
                <ul className="space-y-1 text-sm">
                  {hub.nonNegotiables.length === 0 ? (
                    <li className="text-muted-foreground">Add absolute requirements students must meet.</li>
                  ) : (
                    hub.nonNegotiables.map((n) => (
                      <li key={n} className="rounded-lg bg-muted/50 px-2 py-1">
                        {n}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground mb-2">Preferred qualities</p>
              {editMode ? (
                <textarea
                  className="min-h-[80px] w-full rounded-xl border px-3 py-2 text-sm"
                  value={draft.preferredQualities}
                  onChange={(e) => setDraft({ ...draft, preferredQualities: e.target.value })}
                />
              ) : (
                <div className="flex flex-wrap gap-1">
                  {hub.preferredQualities.map((q) => (
                    <Badge key={q} variant="secondary" className="text-[10px]">
                      {q}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Culture */}
      <Card>
        <CardHeader>
          <CardTitle>Culture & values</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {editMode ? (
            <>
              <textarea
                className="min-h-[60px] rounded-xl border px-3 py-2 text-sm"
                placeholder="Mission"
                value={draft.mission}
                onChange={(e) => setDraft({ ...draft, mission: e.target.value })}
              />
              <textarea
                className="min-h-[60px] rounded-xl border px-3 py-2 text-sm"
                placeholder="Vision"
                value={draft.vision}
                onChange={(e) => setDraft({ ...draft, vision: e.target.value })}
              />
              <textarea
                className="min-h-[60px] rounded-xl border px-3 py-2 text-sm md:col-span-2"
                placeholder="Values (one per line)"
                value={draft.values}
                onChange={(e) => setDraft({ ...draft, values: e.target.value })}
              />
              <textarea
                className="min-h-[60px] rounded-xl border px-3 py-2 text-sm"
                placeholder="Work philosophy"
                value={draft.workPhilosophy}
                onChange={(e) => setDraft({ ...draft, workPhilosophy: e.target.value })}
              />
              <textarea
                className="min-h-[60px] rounded-xl border px-3 py-2 text-sm"
                placeholder="What we look for"
                value={draft.whatWeLookFor}
                onChange={(e) => setDraft({ ...draft, whatWeLookFor: e.target.value })}
              />
              <div className="md:col-span-2 flex flex-wrap gap-2">
                {CULTURE_TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs',
                      draft.leadershipStyles.includes(tag) && 'bg-brand text-white border-brand'
                    )}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        leadershipStyles: draft.leadershipStyles.includes(tag)
                          ? draft.leadershipStyles.filter((t) => t !== tag)
                          : [...draft.leadershipStyles, tag],
                      })
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {hub.culture.mission && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Mission</p>
                  <p className="text-sm mt-1">{hub.culture.mission}</p>
                </div>
              )}
              {hub.culture.vision && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Vision</p>
                  <p className="text-sm mt-1">{hub.culture.vision}</p>
                </div>
              )}
              <div className="md:col-span-2 flex flex-wrap gap-2">
                {[...hub.culture.values, ...hub.culture.leadershipStyles].map((v) => (
                  <Badge key={v} variant="outline">
                    {v}
                  </Badge>
                ))}
              </div>
              {hub.culture.whatWeLookFor && (
                <p className="text-sm text-muted-foreground md:col-span-2">{hub.culture.whatWeLookFor}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {editMode ? (
        <Button onClick={() => void saveProfile()} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save culture & hero
        </Button>
      ) : null}

      {/* Departments & roles */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Roles & team structure</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void addDepartment()} disabled={saving}>
              <Plus className="h-4 w-4 mr-1" /> Department
            </Button>
            <Button size="sm" variant="brand" onClick={() => void addRole()} disabled={saving}>
              <Plus className="h-4 w-4 mr-1" /> Role
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {hub.departments.map((dept) => (
            <Card key={dept.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{dept.name}</CardTitle>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary">{dept.occupiedCount} occupied</Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-700">{dept.openCount} open</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {dept.roles.map((role) => (
                  <div
                    key={role.id}
                    className={cn(
                      'rounded-xl border p-4 transition',
                      role.isFilled && 'opacity-60 bg-muted/30'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{role.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_TYPE_OPTIONS.find((t) => t.id === role.roleType)?.label ?? role.roleType}
                          {role.location ? ` · ${role.location}` : ''} · {role.remoteType}
                        </p>
                        {role.isFilled ? (
                          <Badge variant="outline" className="mt-1 text-[10px]">
                            Filled — applications still open
                          </Badge>
                        ) : (
                          <Badge className="mt-1 text-[10px] bg-emerald-500/15 text-emerald-700">Open</Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {editMode ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void updateRole(role.id, { isFilled: !role.isFilled })}
                            >
                              {role.isFilled ? 'Mark open' : 'Mark filled'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void removeRole(role.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">{role.applicationCount} applications</span>
                        )}
                      </div>
                    </div>
                    {role.description ? (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{role.description}</p>
                    ) : null}
                    {(role.salaryMin || role.salaryMax) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Salary: {role.salaryMin ?? '—'} – {role.salaryMax ?? '—'}
                      </p>
                    )}
                  </div>
                ))}
                {dept.roles.length === 0 && (
                  <p className="text-sm text-muted-foreground">No roles in this department yet.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Team */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" /> People
          </h3>
          <Button size="sm" variant="outline" onClick={() => void addTeamMember()} disabled={saving}>
            <Plus className="h-4 w-4 mr-1" /> Add person
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hub.team.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex gap-3 pt-5">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Users className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.roleTitle ?? m.memberType}</p>
                  {m.previousUniversity && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {m.previousUniversity}
                      {m.degree ? ` · ${m.degree}` : ''}
                    </p>
                  )}
                  {m.age ? <p className="text-[10px] text-muted-foreground">Age {m.age}</p> : null}
                </div>
              </CardContent>
            </Card>
          ))}
          {hub.team.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">
              Add employees, mentors, and recruiters so students see a human company.
            </p>
          )}
        </div>
      </section>

      {/* Events + startups + why join */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" /> Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {hub.events.map((e) => (
              <div key={e.id} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.startsAt).toLocaleDateString()} · {e.status}
                </p>
              </div>
            ))}
            {hub.events.length === 0 && (
              <p className="text-sm text-muted-foreground">
                <Link href="/company/events" className="text-brand hover:underline">
                  Create events
                </Link>{' '}
                to show workshops, fairs, and networking sessions here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-4 w-4" /> Startup collaboration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {hub.startupSection.collaborations} startup connections · {hub.startupSection.challengeCount}{' '}
              challenges
            </p>
            {editMode ? (
              <textarea
                className="min-h-[80px] w-full rounded-xl border px-3 py-2 text-sm"
                value={draft.startupCollaboration}
                onChange={(e) => setDraft({ ...draft, startupCollaboration: e.target.value })}
                placeholder="Mentorship, investment, innovation programs…"
              />
            ) : (
              <p className="text-sm">{hub.startupSection.mentorshipOffers ?? 'Connect via Startup Hub.'}</p>
            )}
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/company/startups">Open Startup Hub</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-brand/20 bg-gradient-to-br from-card to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-brand" />
            Why students should join
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hub.whyJoin.map((item, i) => (
              <div key={i} className="rounded-2xl border bg-card p-4">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Applications flow to{' '}
        <Link href="/company/pipeline" className="text-brand hover:underline">
          Pipeline
        </Link>{' '}
        and{' '}
        <Link href="/company/opportunities" className="text-brand hover:underline">
          Opportunities
        </Link>{' '}
        automatically when students apply to published roles.
      </p>
    </div>
  );
}
