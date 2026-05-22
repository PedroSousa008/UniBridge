'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { CompanyProfileEcosystemHub } from '@/lib/company/company-profile-ecosystem-hub';
import type { CompanyPermission } from '@/lib/company/company-permissions';
import { PERMISSION_LABELS } from '@/lib/company/company-permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CompanyTeamMemberAvatar } from '@/components/company/company-team-member-avatar';
import { CompanyProfileHeroBanner } from '@/components/company/company-profile-hero-banner';
import { ProfileSecuritySection } from '@/components/profile/profile-security-section';
import {
  Building2,
  Loader2,
  Network,
  Sparkles,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';

const PERMS: CompanyPermission[] = ['OWNER', 'ADMIN', 'RECRUITER', 'VIEWER'];

export function CompanyProfileEcosystemCommandCenter({
  initialHub,
}: {
  initialHub: CompanyProfileEcosystemHub;
}) {
  const [hub, setHub] = useState(initialHub);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [myForm, setMyForm] = useState({
    fullName: hub.myProfile.fullName ?? '',
    age: hub.myProfile.age?.toString() ?? '',
    roleInCompany: hub.myProfile.roleInCompany ?? '',
    phone: hub.myProfile.phone ?? '',
    bio: hub.myProfile.bio ?? '',
  });


  const [teamDrafts, setTeamDrafts] = useState<
    Record<string, { email: string; password: string; permission: CompanyPermission }>
  >({});

  const refresh = useCallback(async () => {
    const res = await fetch('/api/company/profile/ecosystem');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    const es = new EventSource('/api/partnerships/stream');
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as { type?: string };
        if (
          data.type === 'partnership_active' ||
          data.type === 'mutual_match' ||
          data.type === 'hub_refresh'
        ) {
          void refresh();
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [refresh]);

  async function saveMyProfile() {
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/company/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: myForm.fullName,
        age: myForm.age ? parseInt(myForm.age, 10) : null,
        roleInCompany: myForm.roleInCompany,
        phone: myForm.phone,
        bio: myForm.bio,
      }),
    });
    if (res.ok) {
      setHub(await res.json());
      setMsg('Profile saved.');
    } else setMsg('Could not save profile.');
    setLoading(false);
  }

  async function partnershipAction(
    action: 'accept' | 'reject' | 'cancel' | 'archive',
    universityId: string
  ) {
    setLoading(true);
    const res = await fetch('/api/company/profile/partnerships', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, universityId }),
    });
    if (res.ok) setHub(await res.json());
    setLoading(false);
  }

  async function createTeamAccount(teamMemberId: string) {
    const draft = teamDrafts[teamMemberId];
    if (!draft?.email || !draft.password) {
      setMsg('Email and password required.');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/company/profile/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamMemberId,
        email: draft.email,
        password: draft.password,
        permission: draft.permission,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setHub(data);
      setMsg('Team login created — they can access the full company workspace.');
    } else setMsg(data.error ?? 'Could not create account.');
    setLoading(false);
  }

  async function updateTeamPermission(workspaceMemberId: string, permission: CompanyPermission) {
    setLoading(true);
    const res = await fetch(`/api/company/profile/team/${workspaceMemberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission }),
    });
    if (res.ok) {
      setHub(await res.json());
      setMsg('Permission updated.');
    } else setMsg('Could not update permission.');
    setLoading(false);
  }

  async function saveBanner(url: string) {
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/company/profile/company', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerUrl: url || null }),
    });
    if (res.ok) {
      setHub(await res.json());
      setMsg('Company banner updated.');
    } else {
      const data = await res.json().catch(() => ({}));
      setMsg((data as { error?: string }).error ?? 'Could not update banner.');
    }
    setLoading(false);
  }

  async function deactivateTeamAccess(workspaceMemberId: string) {
    if (!confirm('Deactivate this team login? They will lose access until a new account is created.')) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/company/profile/team/${workspaceMemberId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setHub(await res.json());
      setMsg('Team access deactivated.');
    } else setMsg('Could not deactivate access.');
    setLoading(false);
  }

  return (
    <div className="space-y-10 pb-20">
      <CompanyProfileHeroBanner
        bannerUrl={hub.company.bannerUrl}
        canEditBanner={hub.permissions.canEditBanner}
        companyName={hub.company.companyName ?? hub.workspace.companyName}
        workspaceName={hub.workspace.companyName}
        representativeName={hub.myProfile.fullName}
        permissionLabel={hub.myProfile.permissionLabel}
        onBannerChange={(url) => void saveBanner(url)}
      />

      {msg ? (
        <p className="text-sm rounded-xl border bg-muted/50 px-4 py-2">{msg}</p>
      ) : null}

      {/* My Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My profile
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your personal representative identity — company branding stays shared below.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Full name</label>
            <Input
              value={myForm.fullName}
              onChange={(e) => setMyForm({ ...myForm, fullName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email (login)</label>
            <Input value={hub.myProfile.email} disabled />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Age</label>
            <Input
              type="number"
              value={myForm.age}
              onChange={(e) => setMyForm({ ...myForm, age: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Role in company</label>
            <Input
              value={myForm.roleInCompany}
              onChange={(e) => setMyForm({ ...myForm, roleInCompany: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phone</label>
            <Input
              value={myForm.phone}
              onChange={(e) => setMyForm({ ...myForm, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Account type</label>
            <Input value={hub.myProfile.accountType} disabled />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground">Short bio</label>
            <textarea
              className="w-full min-h-[80px] rounded-lg border px-3 py-2 text-sm"
              value={myForm.bio}
              onChange={(e) => setMyForm({ ...myForm, bio: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button onClick={() => void saveMyProfile()} disabled={loading}>
              Save my profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-violet-500" />
          Company ecosystem stats
        </h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
          {[
            { l: 'Hires', v: hub.stats.hires },
            { l: 'Partnerships', v: hub.stats.activePartnerships },
            { l: 'Events', v: hub.stats.eventsHosted },
            { l: 'Opportunities', v: hub.stats.opportunitiesCreated },
            { l: 'Applications', v: hub.stats.applicationsReceived },
            { l: 'Pipeline', v: hub.stats.pipelineCandidates },
            { l: 'Students reached', v: hub.stats.studentsReached },
            { l: 'Team logins', v: hub.stats.activeTeamMembers },
            { l: 'Startup links', v: hub.stats.startupInvestments },
            { l: 'Saved talent', v: hub.stats.studentsSaved },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border bg-card px-3 py-3 text-center">
              <p className="text-xl font-bold tabular-nums">{s.v}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partnerships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            University partnerships
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Live-synced with Home — accept here and talent, events, and opportunities unlock instantly.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hub.partnershipRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending partnership signals.</p>
          ) : (
            hub.partnershipRequests.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              >
                <div className="flex gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                    {p.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.location ?? 'University'} · {p.direction} ·{' '}
                      {new Date(p.requestedAt).toLocaleDateString()}
                    </p>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.canAccept && hub.permissions.canManagePartnerships ? (
                    <Button
                      size="sm"
                      onClick={() => void partnershipAction('accept', p.universityId)}
                      disabled={loading}
                    >
                      Accept
                    </Button>
                  ) : null}
                  {p.canReject && hub.permissions.canManagePartnerships ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void partnershipAction('reject', p.universityId)}
                      disabled={loading}
                    >
                      Reject
                    </Button>
                  ) : null}
                  {p.canCancel && hub.permissions.canManagePartnerships ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void partnershipAction('cancel', p.universityId)}
                      disabled={loading}
                    >
                      Cancel request
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={p.profileHref}>View university</Link>
                  </Button>
                </div>
              </div>
            ))
          )}
          <p className="text-xs text-muted-foreground">
            {hub.partnerships.active.length} active partnership
            {hub.partnerships.active.length !== 1 ? 's' : ''} in ecosystem.
          </p>
        </CardContent>
      </Card>

      {/* Team */}
      <Card className="border-violet-500/25">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-violet-500" />
            {hub.teamSectionTitle}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            People from Presence become login users here — one company workspace, no duplicate companies.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hub.team.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add people in{' '}
              <Link href="/company/presence" className="text-violet-600 underline">
                Presence
              </Link>{' '}
              first.
            </p>
          ) : (
            hub.team.map((m) => {
              const draft = teamDrafts[m.teamMemberId] ?? {
                email: '',
                password: '',
                permission: 'RECRUITER' as CompanyPermission,
              };
              return (
                <div key={m.teamMemberId} className="rounded-2xl border p-4 space-y-3">
                  <div className="flex gap-3">
                    <CompanyTeamMemberAvatar name={m.name} photoUrl={m.photoUrl} />
                    <div>
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-sm text-muted-foreground">{m.roleTitle ?? 'Team member'}</p>
                      {m.age != null ? (
                        <p className="text-xs text-muted-foreground">Age {m.age}</p>
                      ) : null}
                    </div>
                  </div>
                  {m.hasLogin ? (
                    <div className="space-y-2">
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm">
                        <CheckIcon />
                        Login active · {m.loginEmail} · {m.permissionLabel}
                        {m.status !== 'active' ? ` · ${m.status}` : ''}
                      </div>
                      {hub.permissions.canManagePermissions && m.workspaceMemberId ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            className="rounded-lg border px-3 py-2 text-sm bg-background"
                            value={m.permission}
                            onChange={(e) =>
                              void updateTeamPermission(
                                m.workspaceMemberId!,
                                e.target.value as CompanyPermission
                              )
                            }
                            disabled={loading}
                          >
                            {PERMS.filter((p) => p !== 'OWNER').map((p) => (
                              <option key={p} value={p}>
                                {PERMISSION_LABELS[p]}
                              </option>
                            ))}
                          </select>
                          {hub.permissions.canManageTeam ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void deactivateTeamAccess(m.workspaceMemberId!)}
                              disabled={loading}
                            >
                              Deactivate access
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : hub.permissions.canManageTeam ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Input
                        placeholder="Work email"
                        value={draft.email}
                        onChange={(e) =>
                          setTeamDrafts({
                            ...teamDrafts,
                            [m.teamMemberId]: { ...draft, email: e.target.value },
                          })
                        }
                      />
                      <Input
                        type="password"
                        placeholder="Set password"
                        value={draft.password}
                        onChange={(e) =>
                          setTeamDrafts({
                            ...teamDrafts,
                            [m.teamMemberId]: { ...draft, password: e.target.value },
                          })
                        }
                      />
                      <select
                        className="rounded-lg border px-3 py-2 text-sm bg-background"
                        value={draft.permission}
                        onChange={(e) =>
                          setTeamDrafts({
                            ...teamDrafts,
                            [m.teamMemberId]: {
                              ...draft,
                              permission: e.target.value as CompanyPermission,
                            },
                          })
                        }
                      >
                        {PERMS.map((p) => (
                          <option key={p} value={p}>
                            {PERMISSION_LABELS[p]}
                          </option>
                        ))}
                      </select>
                      <Button
                        className="sm:col-span-3"
                        onClick={() => void createTeamAccount(m.teamMemberId)}
                        disabled={loading}
                      >
                        Create account
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Only owners can create team logins.</p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Network map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Company network map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-[280px] rounded-2xl border bg-gradient-to-br from-slate-50 to-violet-50 dark:from-slate-900 dark:to-violet-950 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {hub.network.edges.map((e, i) => {
                const from = hub.network.nodes.find((n) => n.id === e.from);
                const to = hub.network.nodes.find((n) => n.id === e.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="currentColor"
                    strokeOpacity={0.2}
                    strokeWidth={0.5}
                  />
                );
              })}
            </svg>
            {hub.network.nodes.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[9px] font-medium shadow-sm border whitespace-nowrap max-w-[100px] truncate',
                  n.type === 'company' && 'bg-slate-900 text-white text-[10px] px-3 py-1.5',
                  n.type === 'university' && 'bg-cyan-100 text-cyan-900',
                  n.type === 'startup' && 'bg-violet-100 text-violet-900',
                  n.type === 'event' && 'bg-amber-100 text-amber-900',
                  n.type === 'opportunity' && 'bg-emerald-100 text-emerald-900',
                  n.type === 'talent' && 'bg-rose-100 text-rose-900'
                )}
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                title={n.label}
              >
                {n.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Startup investments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Startup investments & participation
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {hub.startupInvestments.length === 0 ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Follow startups in the{' '}
              <Link href="/company/startups" className="underline">
                Startup Hub
              </Link>{' '}
              to track strategic participation here.
            </p>
          ) : (
            hub.startupInvestments.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                className="rounded-xl border p-4 hover:border-violet-500/40 transition"
              >
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.founders}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {s.investmentType}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {s.stage}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <ProfileSecuritySection
        userEmail={hub.identity.email}
        accessHistory={hub.security.map((a) => ({
          id: a.id,
          action: a.action,
          detail: a.detail,
          actorName: a.actorName,
          createdAt: a.createdAt,
        }))}
      />

      {loading ? (
        <div className="fixed bottom-6 right-6 rounded-full bg-card border p-3 shadow-lg">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="inline-flex items-center gap-1 text-emerald-700">
      ✓ Active login
    </span>
  );
}
