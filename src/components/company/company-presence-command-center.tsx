'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Loader2,
  Plus,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { CompanyDepartmentView as CompanyDepartmentScreen } from '@/components/company/company-department-view';
import { CompanyRoleFitIntelligenceView } from '@/components/company/company-role-fit-intelligence-view';
import { CompanyRoleIntelligenceScreen } from '@/components/company/company-role-intelligence-view';
import { CompanyRoleRequirementsHub } from '@/components/company/company-role-requirements-hub';
import { CompanyRolePanel } from '@/components/company/company-role-panel';
import { CompanyTeamMemberAvatar } from '@/components/company/company-team-member-avatar';
import { CompanyTeamMemberProfileScreen } from '@/components/company/company-team-member-profile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CULTURE_TAG_OPTIONS } from '@/lib/company/company-presence-intelligence';
import {
  buildDepartmentSnapshot,
  buildRoleIntelligenceSnapshot,
  type CompanyDepartmentView,
  type CompanyRoleIntelligenceView,
} from '@/lib/company/company-department-hub';
import { buildRoleFitSnapshot, type RoleFitIntelligenceView } from '@/lib/company/company-role-requirements';
import {
  buildTeamMemberProfileSnapshot,
  type CompanyTeamMemberProfile,
} from '@/lib/company/company-presence-people';
import type { CompanyPresenceHub } from '@/lib/company/company-presence-hub';
import { ImageUpload } from '@/components/ui/image-upload';
import { SlidePanel } from '@/components/ui/slide-panel';

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

type PresenceScreen =
  | { type: 'overview' }
  | { type: 'requirements_hub' }
  | { type: 'role_fit'; roleId: string; initial?: RoleFitIntelligenceView }
  | { type: 'department'; id: string; initial?: CompanyDepartmentView }
  | { type: 'role'; id: string; departmentId: string; initial?: CompanyRoleIntelligenceView }
  | { type: 'person'; memberId: string; initial?: CompanyTeamMemberProfile };

export function CompanyPresenceCommandCenter({ initialHub }: { initialHub: CompanyPresenceHub }) {
  const [hub, setHub] = useState(initialHub);
  const [screen, setScreen] = useState<PresenceScreen>({ type: 'overview' });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createRoleDeptId, setCreateRoleDeptId] = useState<string | null>(null);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [newPersonDraft, setNewPersonDraft] = useState({
    name: '',
    roleTitle: '',
    memberType: 'employee',
    photoUrl: '',
    previousUniversity: '',
    degree: '',
  });
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

  async function saveNewPerson() {
    if (newPersonDraft.name.trim().length < 2) return;
    setSaving(true);
    const res = await fetch('/api/company/presence/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPersonDraft.name.trim(),
        roleTitle: newPersonDraft.roleTitle.trim() || null,
        memberType: newPersonDraft.memberType,
        photoUrl: newPersonDraft.photoUrl || null,
        previousUniversity: newPersonDraft.previousUniversity.trim() || null,
        degree: newPersonDraft.degree.trim() || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const { createdMemberId, createdProfile, ...nextHub } = data;
      setHub(nextHub);
      setAddPersonOpen(false);
      setNewPersonDraft({
        name: '',
        roleTitle: '',
        memberType: 'employee',
        photoUrl: '',
        previousUniversity: '',
        degree: '',
      });
      if (createdMemberId && createdProfile) {
        setScreen({
          type: 'person',
          memberId: createdMemberId,
          initial: createdProfile,
        });
      }
    }
    setSaving(false);
  }

  const c = hub.compatibilityPreview;

  if (screen.type === 'person') {
    return (
      <CompanyTeamMemberProfileScreen
        memberId={screen.memberId}
        initialProfile={screen.initial}
        onBack={() => {
          setScreen({ type: 'overview' });
          void refresh();
        }}
        onDeleted={() => void refresh()}
        onUpdated={() => void refresh()}
      />
    );
  }

  if (screen.type === 'requirements_hub') {
    const firstDept = hub.departments.find((d) => d.id !== '_general');
    return (
      <>
        <CompanyRoleRequirementsHub
          onBack={() => {
            setScreen({ type: 'overview' });
            void refresh();
          }}
          onOpenRole={(roleId) => {
            const role = hub.roles.find((r) => r.id === roleId);
            setScreen({
              type: 'role_fit',
              roleId,
              initial: role
                ? buildRoleFitSnapshot({
                    id: role.id,
                    title: role.title,
                    departmentId: role.departmentId,
                    departmentName: role.departmentName,
                    isFilled: role.isFilled,
                    applicationCount: role.applicationCount,
                    hiringPriority: role.hiringPriority,
                  })
                : undefined,
            });
          }}
          onCreateRole={() => {
            if (firstDept) {
              setCreateRoleDeptId(firstDept.id);
              setCreateRoleOpen(true);
            } else {
              void addDepartment();
            }
          }}
        />
        {createRoleDeptId ? (
          <CompanyRolePanel
            open={createRoleOpen}
            departmentId={createRoleDeptId}
            departmentName={hub.departments.find((d) => d.id === createRoleDeptId)?.name ?? 'Department'}
            onClose={() => setCreateRoleOpen(false)}
            onSaved={() => {
              setCreateRoleOpen(false);
              void refresh();
            }}
          />
        ) : null}
      </>
    );
  }

  if (screen.type === 'role_fit') {
    return (
      <CompanyRoleFitIntelligenceView
        roleId={screen.roleId}
        initialView={screen.initial}
        onBack={() => setScreen({ type: 'requirements_hub' })}
      />
    );
  }

  if (screen.type === 'department') {
    const deptFromHub = hub.departments.find((d) => d.id === screen.id);
    const initial =
      screen.initial ??
      (deptFromHub
        ? buildDepartmentSnapshot(
            deptFromHub,
            hub.hero.companyName,
            hub.departments.map((d) => ({ id: d.id, name: d.name }))
          )
        : undefined);
    return (
      <CompanyDepartmentScreen
        departmentId={screen.id}
        initialView={initial}
        onBack={() => {
          setScreen({ type: 'overview' });
          void refresh();
        }}
        onOpenRole={(roleId) => {
          const role = initial?.roles.find((r) => r.id === roleId);
          setScreen({
            type: 'role',
            id: roleId,
            departmentId: screen.id,
            initial:
              role && initial
                ? buildRoleIntelligenceSnapshot(role, screen.id, initial.name)
                : undefined,
          });
        }}
      />
    );
  }

  if (screen.type === 'role') {
    const deptFromHub = hub.departments.find((d) => d.id === screen.departmentId);
    const deptSnapshot = deptFromHub
      ? buildDepartmentSnapshot(
          deptFromHub,
          hub.hero.companyName,
          hub.departments.map((d) => ({ id: d.id, name: d.name }))
        )
      : null;
    const roleCard = deptSnapshot?.roles.find((r) => r.id === screen.id);
    const roleInitial =
      screen.initial ??
      (roleCard && deptSnapshot
        ? buildRoleIntelligenceSnapshot(roleCard, screen.departmentId, deptSnapshot.name)
        : undefined);
    return (
      <CompanyRoleIntelligenceScreen
        roleId={screen.id}
        initialView={roleInitial}
        onBack={() =>
          setScreen({
            type: 'department',
            id: screen.departmentId,
            initial: deptSnapshot ?? undefined,
          })
        }
        onBackDepartment={() =>
          setScreen({
            type: 'department',
            id: screen.departmentId,
            initial: deptSnapshot ?? undefined,
          })
        }
      />
    );
  }

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

        {/* Requirements & fit — opens Role Requirements Hub */}
        <button
          type="button"
          onClick={() => !editMode && setScreen({ type: 'requirements_hub' })}
          className={cn(
            'lg:col-span-1 text-left rounded-2xl border bg-card transition',
            !editMode && 'hover:border-brand/40 hover:shadow-md cursor-pointer group'
          )}
        >
          <Card className="border-0 shadow-none h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Requirements & fit
                {!editMode && <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand" />}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Live role compatibility intelligence — tap to open hub
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-brand/5 border border-brand/20 p-3">
                <Sparkles className="h-8 w-8 text-brand shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-brand tabular-nums">
                    {hub.departments.reduce((n, d) => n + d.roles.length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Roles with requirements</p>
                </div>
              </div>
              {editMode ? (
                <>
                  <textarea
                    className="min-h-[60px] w-full rounded-xl border px-3 py-2 text-sm"
                    value={draft.nonNegotiables}
                    onChange={(e) => setDraft({ ...draft, nonNegotiables: e.target.value })}
                    placeholder="Company-wide non-negotiables (one per line)"
                  />
                  <textarea
                    className="min-h-[60px] w-full rounded-xl border px-3 py-2 text-sm"
                    value={draft.preferredQualities}
                    onChange={(e) => setDraft({ ...draft, preferredQualities: e.target.value })}
                    placeholder="Company-wide preferred qualities"
                  />
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {hub.nonNegotiables.length} company-wide non-negotiables ·{' '}
                    {hub.preferredQualities.length} preferred qualities
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {[...hub.nonNegotiables.slice(0, 2), ...hub.preferredQualities.slice(0, 2)].map((q) => (
                      <Badge key={q} variant="secondary" className="text-[10px]">
                        {q}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </button>
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

      {/* Departments */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Departments</h3>
          <Button size="sm" variant="outline" onClick={() => void addDepartment()} disabled={saving}>
            <Plus className="h-4 w-4 mr-1" /> New department
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Click a department to manage roles, team culture, and live hiring — each department is a living team.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hub.departments.filter((d) => d.id !== '_general').map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() =>
                setScreen({
                  type: 'department',
                  id: dept.id,
                  initial: buildDepartmentSnapshot(
                    dept,
                    hub.hero.companyName,
                    hub.departments.map((d) => ({ id: d.id, name: d.name }))
                  ),
                })
              }
              className="group text-left rounded-2xl border bg-gradient-to-br from-card to-muted/20 p-5 transition hover:border-brand/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold group-hover:text-brand transition-colors">{dept.name}</p>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-brand" />
              </div>
              <div className="mt-4 flex gap-2 text-xs">
                <Badge variant="secondary">{dept.occupiedCount} occupied</Badge>
                <Badge className="bg-emerald-500/15 text-emerald-700">{dept.openCount} open</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{dept.roles.length} roles in ecosystem</p>
            </button>
          ))}
        </div>
        {hub.departments.filter((d) => d.id !== '_general').length === 0 && (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            Create a department like Finance or Strategy to start building your hiring ecosystem.
          </p>
        )}
      </section>

      {/* Team */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" /> People
          </h3>
          <Button size="sm" variant="outline" onClick={() => setAddPersonOpen(true)} disabled={saving}>
            <Plus className="h-4 w-4 mr-1" /> Add person
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hub.team.map((m) => (
            <Card
              key={m.id}
              className="cursor-pointer transition hover:border-brand/40 hover:shadow-md"
              onClick={() =>
                setScreen({
                  type: 'person',
                  memberId: m.id,
                  initial: buildTeamMemberProfileSnapshot(m),
                })
              }
            >
              <CardContent className="flex gap-3 pt-5">
                <CompanyTeamMemberAvatar name={m.name} photoUrl={m.photoUrl} />
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
              Add real employees, mentors, and recruiters — not job openings. Filled roles can add position holders from the role editor.
            </p>
          )}
        </div>
        <SlidePanel open={addPersonOpen} onClose={() => setAddPersonOpen(false)} title="Add person">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Only add real people who work at your company. Open roles belong under Departments, not here.
            </p>
            <ImageUpload
              label="Photo"
              value={newPersonDraft.photoUrl}
              onChange={(url) => setNewPersonDraft({ ...newPersonDraft, photoUrl: url })}
              folder="company-team"
            />
            <div>
              <label className="text-xs text-muted-foreground">Full name *</label>
              <Input
                value={newPersonDraft.name}
                onChange={(e) => setNewPersonDraft({ ...newPersonDraft, name: e.target.value })}
                placeholder="e.g. Maria Silva"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Role / title</label>
              <Input
                value={newPersonDraft.roleTitle}
                onChange={(e) => setNewPersonDraft({ ...newPersonDraft, roleTitle: e.target.value })}
                placeholder="e.g. Head of Engineering"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={newPersonDraft.memberType}
                onChange={(e) => setNewPersonDraft({ ...newPersonDraft, memberType: e.target.value })}
              >
                <option value="employee">Employee</option>
                <option value="mentor">Mentor</option>
                <option value="recruiter">Recruiter</option>
                <option value="founder">Founder</option>
                <option value="leadership">Leadership</option>
              </select>
            </div>
            <Button
              className="w-full"
              disabled={saving || newPersonDraft.name.trim().length < 2}
              onClick={() => void saveNewPerson()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save person'}
            </Button>
          </div>
        </SlidePanel>
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
