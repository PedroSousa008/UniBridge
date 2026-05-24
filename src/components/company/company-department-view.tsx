'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CompanyDepartmentView } from '@/lib/company/company-department-hub';
import { CompanyRolePanel } from '@/components/company/company-role-panel';

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2.5 text-center backdrop-blur-sm">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-white/60">{label}</p>
    </div>
  );
}

export function CompanyDepartmentView({
  departmentId,
  initialView,
  onBack,
  onOpenRole,
}: {
  departmentId: string;
  initialView?: CompanyDepartmentView;
  onBack: () => void;
  onOpenRole: (roleId: string) => void;
}) {
  const [view, setView] = useState<CompanyDepartmentView | null>(initialView ?? null);
  const [loading, setLoading] = useState(!initialView);
  const [error, setError] = useState<string | null>(null);
  const [editDept, setEditDept] = useState(false);
  const [rolePanel, setRolePanel] = useState<{ open: boolean; roleId?: string }>({ open: false });
  const [menuRoleId, setMenuRoleId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'archive_roles' | 'move' | 'delete_all'>('archive_roles');
  const [moveTarget, setMoveTarget] = useState('');
  const [deptDraft, setDeptDraft] = useState({
    culture: '',
    expectations: '',
    leadershipStyle: '',
    growthPhilosophy: '',
  });

  const refresh = useCallback(async (silent = false) => {
    if (!silent && !view) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/company/presence/departments/${departmentId}`);
      if (res.ok) {
        const data = await res.json();
        setView(data);
        setDeptDraft({
          culture: data.culture ?? '',
          expectations: data.expectations ?? '',
          leadershipStyle: data.leadershipStyle ?? '',
          growthPhilosophy: data.growthPhilosophy ?? '',
        });
      } else {
        const body = await res.json().catch(() => ({}));
        setView(null);
        setError(
          res.status === 404
            ? 'Department not found.'
            : (body.error as string) ?? 'Could not load this department. Please try again.'
        );
      }
    } catch {
      setView(null);
      setError('Network error while loading the department.');
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    void refresh(Boolean(initialView));
  }, [refresh, initialView]);

  async function saveDept() {
    await fetch(`/api/company/presence/departments/${departmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deptDraft),
    });
    setEditDept(false);
    void refresh();
  }

  async function roleAction(roleId: string, action: string) {
    setMenuRoleId(null);
    if (action === 'edit') {
      setRolePanel({ open: true, roleId });
      return;
    }
    await fetch(`/api/company/presence/roles/${roleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    void refresh();
  }

  async function confirmDeleteDept() {
    await fetch(`/api/company/presence/departments/${departmentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: deleteMode,
        targetDepartmentId: deleteMode === 'move' ? moveTarget : undefined,
      }),
    });
    setDeleteOpen(false);
    onBack();
  }

  if (loading && !view) {
    return (
      <div className="py-16 space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="h-40 rounded-3xl bg-muted" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-32 rounded-2xl bg-muted" />
          <div className="h-32 rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm text-muted-foreground">{error ?? 'Could not load department.'}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back to presence
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Company presence
      </Button>

      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-brand/30 via-transparent to-transparent" />
        <div className="relative">
          <p className="text-sm text-white/50 uppercase tracking-widest">{view.companyName}</p>
          <h2 className="text-3xl font-semibold mt-1">{view.name} Department</h2>
          <p className="text-white/70 mt-2 text-sm">{view.hiringActivity}</p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <StatBox label="Roles" value={view.hero.totalRoles} />
            <StatBox label="Open" value={view.hero.openPositions} />
            <StatBox label="Occupied" value={view.hero.occupiedPositions} />
            <StatBox label="Applications" value={view.hero.totalApplications} />
            <StatBox label="Growth" value={`+${view.hero.departmentGrowth}%`} />
            <StatBox label="Compatibility" value={`${view.hero.compatibilityAverage}%`} />
            <StatBox label="Skills" value={view.hero.topSkills[0] ?? '—'} />
          </div>
          {view.hero.topSkills.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-1">
              {view.hero.topSkills.map((sk) => (
                <Badge key={sk} className="bg-white/10 text-white border-white/20 text-[10px]">
                  {sk}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Department story</h3>
          <Button variant="outline" size="sm" onClick={() => setEditDept(!editDept)}>
            {editDept ? 'Cancel' : 'Edit'}
          </Button>
        </div>
        {editDept ? (
          <div className="space-y-3">
            <textarea
              className="min-h-[60px] w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="What this department does"
              value={deptDraft.culture}
              onChange={(e) => setDeptDraft({ ...deptDraft, culture: e.target.value })}
            />
            <textarea
              className="min-h-[60px] w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Culture"
              value={deptDraft.expectations}
              onChange={(e) => setDeptDraft({ ...deptDraft, expectations: e.target.value })}
            />
            <Button size="sm" variant="brand" onClick={() => void saveDept()}>
              Save department
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {view.culture ||
              view.expectations ||
              'Our team combines analytical thinking with strategic decision-making to support long-term innovation.'}
          </p>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Active roles
          </h3>
          <Button variant="brand" size="sm" onClick={() => setRolePanel({ open: true })}>
            <Plus className="h-4 w-4 mr-1" /> Add role
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {view.roles.map((role) => (
            <div
              key={role.id}
              className={cn(
                'group relative rounded-2xl border bg-card p-5 transition hover:border-brand/40 hover:shadow-lg cursor-pointer',
                role.roleStatus === 'filled' &&
                  'opacity-80 bg-muted/30 border-muted-foreground/20 grayscale-[0.15]'
              )}
              onClick={() => onOpenRole(role.id)}
              onKeyDown={(e) => e.key === 'Enter' && onOpenRole(role.id)}
              role="button"
              tabIndex={0}
            >
              <div className="absolute top-3 right-3">
                <button
                  type="button"
                  className="rounded-lg p-1.5 hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuRoleId(menuRoleId === role.id ? null : role.id);
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuRoleId === role.id ? (
                  <div
                    className="absolute right-0 top-8 z-10 w-40 rounded-xl border bg-card py-1 shadow-lg text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {['edit', 'duplicate', 'archive'].map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="block w-full px-3 py-2 text-left hover:bg-muted capitalize"
                        onClick={() => void roleAction(role.id, action)}
                      >
                        {action === 'archive' ? 'Archive role' : action}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <p className="font-semibold pr-8">{role.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {role.roleTypeLabel} · {role.remoteType}
                {role.location ? ` · ${role.location}` : ''}
              </p>
              {role.positionHolder ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/50 p-2">
                  <div className="h-9 w-9 rounded-lg bg-muted overflow-hidden shrink-0">
                    {role.positionHolder.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={role.positionHolder.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-5 w-5 m-2 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{role.positionHolder.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {role.positionHolder.previousUniversity ?? '—'}
                      {role.positionHolder.degree ? ` · ${role.positionHolder.degree}` : ''}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {role.roleStatus === 'filled' ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Filled · aspirational example
                  </Badge>
                ) : role.currentlyHiring ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700">Actively hiring</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-800 border-amber-300/60 bg-amber-500/10">
                    Not actively hiring
                  </Badge>
                )}
                {role.hiringPriority === 'high' ? (
                  <Badge variant="secondary">High priority</Badge>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 py-2 text-center">
                  <p className="font-semibold text-brand">{role.avgCompatibility}%</p>
                  <p className="text-muted-foreground">avg compatibility</p>
                </div>
                <div className="rounded-lg bg-muted/40 py-2 text-center">
                  <p className="font-semibold">{role.applicationCount}</p>
                  <p className="text-muted-foreground">applications</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {role.topSkills.map((sk) => (
                  <span key={sk} className="text-[10px] rounded-md bg-muted px-2 py-0.5">
                    {sk}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-brand flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                View role intelligence <ChevronRight className="h-3 w-3" />
              </p>
            </div>
          ))}
        </div>
        {view.roles.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No roles yet — add your first opportunity for students.
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" /> {view.name} team
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {view.team.map((m) => (
            <Card key={m.id}>
              <CardContent className="flex gap-3 py-4">
                <ProfileAvatar name={m.name} imageUrl={m.photoUrl} size="sm" className="rounded-xl" />
                <div>
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{m.memberType}</p>
                  {m.roleTitle ? <p className="text-xs mt-0.5">{m.roleTitle}</p> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="text-muted-foreground" onClick={() => setDeleteOpen(true)}>
          Delete department…
        </Button>
      </div>

      <CompanyRolePanel
        open={rolePanel.open}
        departmentId={departmentId}
        departmentName={view.name}
        roleId={rolePanel.roleId}
        onClose={() => setRolePanel({ open: false })}
        onSaved={() => void refresh()}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {view.name} department?</DialogTitle>
            <DialogDescription>
              Choose how to handle {view.roles.length} role(s). Archiving preserves analytics and history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {[
              ['archive_roles', 'Archive all roles (recommended)'],
              ['move', 'Move roles to another department'],
              ['delete_all', 'Delete everything permanently'],
            ].map(([mode, label]) => (
              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="delmode"
                  checked={deleteMode === mode}
                  onChange={() => setDeleteMode(mode as typeof deleteMode)}
                />
                {label}
              </label>
            ))}
            {deleteMode === 'move' ? (
              <select
                className="w-full h-10 rounded-lg border px-2 text-sm"
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
              >
                <option value="">Select department</option>
                {view.allDepartments
                  .filter((d) => d.id !== departmentId)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={() => void confirmDeleteDept()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
