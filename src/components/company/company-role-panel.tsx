'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageUpload } from '@/components/ui/image-upload';
import { SlidePanel } from '@/components/ui/slide-panel';
import type { RoleStatus } from '@/lib/company/company-presence-shared';
import { cn } from '@/lib/utils';
import {
  ECOSYSTEM_REQUIREMENT_TAGS,
  HIRING_PRIORITY_OPTIONS,
  ROLE_TYPE_OPTIONS,
} from '@/lib/company/company-presence-intelligence';
import type { CompanyRoleIntelligenceView } from '@/lib/company/company-department-hub';

type ChipList = 'nonNegotiables' | 'preferredQualities' | 'requiredSkills';

export function CompanyRolePanel({
  open,
  onClose,
  departmentId,
  departmentName,
  roleId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  departmentId: string;
  departmentName: string;
  roleId?: string;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [estimate, setEstimate] = useState({ strongMatches: 0, potentialMatches: 0 });
  const [form, setForm] = useState({
    title: '',
    roleType: 'internship',
    location: '',
    remoteType: 'hybrid',
    salaryMin: '',
    salaryMax: '',
    startDate: '',
    roleStatus: 'hiring' as RoleStatus,
    hiringPriority: 'high',
    holder: {
      photoUrl: '',
      name: '',
      age: '',
      previousUniversity: '',
      degree: '',
      graduationYear: '',
      bio: '',
      linkedInUrl: '',
      startedAt: '',
      careerPath: '',
      mentoringAvailable: false,
      messagesAvailable: false,
    },
    description: '',
    responsibilities: '',
    expectations: '',
    growthOpportunities: '',
    nonNegotiables: [] as string[],
    preferredQualities: [] as string[],
    requiredSkills: [] as string[],
    allStudents: true,
    finalYearOnly: false,
    cvOptional: false,
    videoIntroduction: false,
    startupPortfolio: true,
    deadline: '',
  });

  const runEstimate = useCallback(async () => {
    const res = await fetch('/api/company/presence/roles/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nonNegotiables: form.nonNegotiables,
        preferredQualities: form.preferredQualities,
        requiredSkills: form.requiredSkills,
        visibilitySettings: { allStudents: form.allStudents, finalYearOnly: form.finalYearOnly },
      }),
    });
    if (res.ok) setEstimate(await res.json());
  }, [form.nonNegotiables, form.preferredQualities, form.requiredSkills, form.allStudents, form.finalYearOnly]);

  useEffect(() => {
    if (!open) return;
    if (roleId) {
      void fetch(`/api/company/presence/roles/${roleId}`).then(async (res) => {
        if (!res.ok) return;
        const r = (await res.json()) as CompanyRoleIntelligenceView;
        setForm({
          title: r.title,
          roleType: r.roleType,
          location: r.location ?? '',
          remoteType: r.remoteType,
          salaryMin: '',
          salaryMax: '',
          startDate: '',
          roleStatus: r.roleStatus ?? (r.isFilled ? 'filled' : 'hiring'),
          hiringPriority: r.hiringPriority,
          holder: {
            photoUrl: r.positionHolder?.photoUrl ?? '',
            name: r.positionHolder?.name ?? '',
            age: r.positionHolder?.age != null ? String(r.positionHolder.age) : '',
            previousUniversity: r.positionHolder?.previousUniversity ?? '',
            degree: r.positionHolder?.degree ?? '',
            graduationYear: r.positionHolder?.graduationYear ?? '',
            bio: r.positionHolder?.bio ?? '',
            linkedInUrl: r.positionHolder?.linkedInUrl ?? '',
            startedAt: r.positionHolder?.startedAt?.slice(0, 10) ?? '',
            careerPath: r.positionHolder?.careerPath ?? '',
            mentoringAvailable: r.positionHolder?.mentoringAvailable ?? false,
            messagesAvailable: r.positionHolder?.messagesAvailable ?? false,
          },
          description: r.description ?? '',
          responsibilities: r.responsibilities ?? '',
          expectations: r.expectations ?? '',
          growthOpportunities: r.growthOpportunities ?? '',
          nonNegotiables: r.nonNegotiables,
          preferredQualities: r.preferredQualities,
          requiredSkills: r.requiredSkills,
          allStudents: r.visibilitySettings.allStudents,
          finalYearOnly: r.visibilitySettings.finalYearOnly,
          cvOptional: r.applicationSettings.cvOptional,
          videoIntroduction: r.applicationSettings.videoIntroduction,
          startupPortfolio: r.applicationSettings.startupPortfolio,
          deadline: r.applicationSettings.deadline?.slice(0, 10) ?? '',
        });
      });
    } else {
      setForm({
        title: '',
        roleType: 'internship',
        location: '',
        remoteType: 'hybrid',
        salaryMin: '',
        salaryMax: '',
        startDate: '',
        roleStatus: 'hiring',
        hiringPriority: 'high',
        holder: {
          photoUrl: '',
          name: '',
          age: '',
          previousUniversity: '',
          degree: '',
          graduationYear: '',
          bio: '',
          linkedInUrl: '',
          startedAt: '',
          careerPath: '',
          mentoringAvailable: false,
          messagesAvailable: false,
        },
        description: '',
        responsibilities: '',
        expectations: '',
        growthOpportunities: '',
        nonNegotiables: [],
        preferredQualities: [],
        requiredSkills: [],
        allStudents: true,
        finalYearOnly: false,
        cvOptional: false,
        videoIntroduction: false,
        startupPortfolio: true,
        deadline: '',
      });
    }
  }, [open, roleId]);

  useEffect(() => {
    if (!open || form.roleStatus !== 'hiring') return;
    const t = setTimeout(() => void runEstimate(), 400);
    return () => clearTimeout(t);
  }, [open, runEstimate, form.roleStatus]);

  function toggleChip(list: ChipList, tag: string) {
    setForm((f) => {
      const arr = f[list];
      return {
        ...f,
        [list]: arr.includes(tag) ? arr.filter((x) => x !== tag) : [...arr, tag],
      };
    });
  }

  async function save() {
    if (form.roleStatus === 'filled' && !form.holder.name.trim()) {
      return;
    }
    setSaving(true);
    const title = form.title || 'New role';
    await fetch('/api/company/presence/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: roleId,
        departmentId,
        title,
        roleType: form.roleType,
        location: form.location || null,
        remoteType: form.remoteType,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        startDate: form.startDate || null,
        roleStatus: form.roleStatus,
        isFilled: form.roleStatus === 'filled',
        hiringPriority: form.hiringPriority,
        positionHolder:
          form.roleStatus === 'filled'
            ? {
                name: form.holder.name.trim(),
                photoUrl: form.holder.photoUrl || null,
                age: form.holder.age ? Number(form.holder.age) : null,
                roleTitle: title,
                departmentName,
                previousUniversity: form.holder.previousUniversity || null,
                degree: form.holder.degree || null,
                graduationYear: form.holder.graduationYear || null,
                bio: form.holder.bio || null,
                linkedInUrl: form.holder.linkedInUrl || null,
                startedAt: form.holder.startedAt || null,
                careerPath: form.holder.careerPath || null,
                mentoringAvailable: form.holder.mentoringAvailable,
                messagesAvailable: form.holder.messagesAvailable,
              }
            : undefined,
        description: form.description,
        responsibilities: form.responsibilities,
        expectations: form.expectations,
        growthOpportunities: form.growthOpportunities,
        nonNegotiables: form.nonNegotiables,
        preferredQualities: form.preferredQualities,
        requiredSkills: form.requiredSkills,
        visibilitySettings: {
          allStudents: form.allStudents,
          finalYearOnly: form.finalYearOnly,
          universityIds: [],
          degrees: [],
        },
        applicationSettings: {
          cvOptional: form.cvOptional,
          videoIntroduction: form.videoIntroduction,
          startupPortfolio: form.startupPortfolio,
          deadline: form.deadline || null,
          customQuestions: [],
        },
        status: 'published',
      }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      wide
      title={roleId ? 'Edit role' : 'Add role'}
      subtitle={`${departmentName} department`}
    >
      <div className="space-y-8">
        <section>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Role status
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                form.roleStatus === 'hiring' && 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
              )}
              onClick={() => setForm({ ...form, roleStatus: 'hiring' })}
            >
              <p className="font-semibold">Hiring</p>
              <p className="text-xs text-muted-foreground mt-1">
                Open role with applications and full visibility settings.
              </p>
            </button>
            <button
              type="button"
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                form.roleStatus === 'filled' && 'border-muted-foreground/40 bg-muted/40 ring-1 ring-muted-foreground/20'
              )}
              onClick={() => setForm({ ...form, roleStatus: 'filled' })}
            >
              <p className="font-semibold">Filled</p>
              <p className="text-xs text-muted-foreground mt-1">
                Role is occupied — becomes an aspirational example for students.
              </p>
            </button>
          </div>
        </section>

        <section>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Basic information
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground">Role name</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <select
                className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"
                value={form.roleType}
                onChange={(e) => setForm({ ...form, roleType: e.target.value })}
              >
                {ROLE_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Work model</label>
              <select
                className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"
                value={form.remoteType}
                onChange={(e) => setForm({ ...form, remoteType: e.target.value })}
              >
                <option value="on_site">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Location</label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Hiring priority</label>
              <select
                className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"
                value={form.hiringPriority}
                onChange={(e) => setForm({ ...form, hiringPriority: e.target.value })}
              >
                {HIRING_PRIORITY_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Salary min</label>
              <Input type="number" value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Salary max</label>
              <Input type="number" value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Start date</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
          </div>
        </section>

        <section>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Role identity
          </p>
          <div className="space-y-3">
            {(['description', 'responsibilities', 'expectations', 'growthOpportunities'] as const).map((key) => (
              <textarea
                key={key}
                className="min-h-[72px] w-full rounded-xl border px-3 py-2 text-sm"
                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Non-negotiables
          </p>
          <ChipGrid selected={form.nonNegotiables} onToggle={(t) => toggleChip('nonNegotiables', t)} variant="required" />
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-4 mb-2">
            Preferred qualities
          </p>
          <ChipGrid selected={form.preferredQualities} onToggle={(t) => toggleChip('preferredQualities', t)} />
        </section>

        <section className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            Estimated compatible students
          </p>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="text-2xl font-bold text-brand tabular-nums">{estimate.strongMatches}</p>
              <p className="text-xs text-muted-foreground">strong matches</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{estimate.potentialMatches}</p>
              <p className="text-xs text-muted-foreground">potential matches</p>
            </div>
          </div>
        </section>

        {form.roleStatus === 'filled' ? (
          <section className="rounded-2xl border border-muted-foreground/25 bg-muted/20 p-5 space-y-4">
            <p className="text-sm font-semibold flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Position holder / current employee
            </p>
            <p className="text-xs text-muted-foreground">
              Required for filled roles. This person appears on the role card, student views, and your
              People section.
            </p>
            <ImageUpload
              label="Employee photo"
              value={form.holder.photoUrl}
              onChange={(url) => setForm({ ...form, holder: { ...form.holder, photoUrl: url } })}
              folder="company-team"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Full name *</label>
                <Input
                  value={form.holder.name}
                  onChange={(e) => setForm({ ...form, holder: { ...form.holder, name: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Age</label>
                <Input
                  type="number"
                  value={form.holder.age}
                  onChange={(e) => setForm({ ...form, holder: { ...form.holder, age: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Current role</label>
                <Input value={form.title || '—'} disabled className="bg-muted/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Department</label>
                <Input value={departmentName} disabled className="bg-muted/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Previous university</label>
                <Input
                  value={form.holder.previousUniversity}
                  onChange={(e) =>
                    setForm({ ...form, holder: { ...form.holder, previousUniversity: e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Previous degree</label>
                <Input
                  value={form.holder.degree}
                  onChange={(e) => setForm({ ...form, holder: { ...form.holder, degree: e.target.value } })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Graduation year (optional)</label>
                <Input
                  value={form.holder.graduationYear}
                  onChange={(e) =>
                    setForm({ ...form, holder: { ...form.holder, graduationYear: e.target.value } })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Started at company (optional)</label>
                <Input
                  type="date"
                  value={form.holder.startedAt}
                  onChange={(e) => setForm({ ...form, holder: { ...form.holder, startedAt: e.target.value } })}
                />
              </div>
            </div>
            <textarea
              className="min-h-[60px] w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Short professional bio (optional)"
              value={form.holder.bio}
              onChange={(e) => setForm({ ...form, holder: { ...form.holder, bio: e.target.value } })}
            />
            <Input
              placeholder="LinkedIn or portfolio link (optional)"
              value={form.holder.linkedInUrl}
              onChange={(e) => setForm({ ...form, holder: { ...form.holder, linkedInUrl: e.target.value } })}
            />
            <textarea
              className="min-h-[60px] w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Career path inside the company (optional)"
              value={form.holder.careerPath}
              onChange={(e) => setForm({ ...form, holder: { ...form.holder, careerPath: e.target.value } })}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs',
                  form.holder.mentoringAvailable && 'bg-brand text-white border-brand'
                )}
                onClick={() =>
                  setForm({
                    ...form,
                    holder: { ...form.holder, mentoringAvailable: !form.holder.mentoringAvailable },
                  })
                }
              >
                Mentoring: {form.holder.mentoringAvailable ? 'Yes' : 'No'}
              </button>
              <button
                type="button"
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs',
                  form.holder.messagesAvailable && 'bg-brand text-white border-brand'
                )}
                onClick={() =>
                  setForm({
                    ...form,
                    holder: { ...form.holder, messagesAvailable: !form.holder.messagesAvailable },
                  })
                }
              >
                Student messages: {form.holder.messagesAvailable ? 'Yes' : 'No'}
              </button>
            </div>
          </section>
        ) : null}

        {form.roleStatus === 'hiring' ? (
        <section>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
            Visibility & applications
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              className={cn('rounded-full border px-3 py-1 text-xs', form.allStudents && 'bg-primary text-primary-foreground')}
              onClick={() => setForm({ ...form, allStudents: true })}
            >
              All partner students
            </button>
            <button
              type="button"
              className={cn('rounded-full border px-3 py-1 text-xs', form.finalYearOnly && 'bg-primary text-primary-foreground')}
              onClick={() => setForm({ ...form, finalYearOnly: !form.finalYearOnly })}
            >
              Final-year only
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn('rounded-full border px-3 py-1 text-xs', form.cvOptional && 'bg-muted font-medium')}
              onClick={() => setForm({ ...form, cvOptional: !form.cvOptional })}
            >
              CV optional
            </button>
            <button
              type="button"
              className={cn('rounded-full border px-3 py-1 text-xs', form.videoIntroduction && 'bg-muted font-medium')}
              onClick={() => setForm({ ...form, videoIntroduction: !form.videoIntroduction })}
            >
              Video intro
            </button>
            <button
              type="button"
              className={cn('rounded-full border px-3 py-1 text-xs', form.startupPortfolio && 'bg-muted font-medium')}
              onClick={() => setForm({ ...form, startupPortfolio: !form.startupPortfolio })}
            >
              Startup portfolio
            </button>
          </div>
          <Input
            className="mt-3"
            type="date"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            placeholder="Application deadline"
          />
        </section>
        ) : null}

        <Button
          className="w-full"
          variant="brand"
          disabled={saving || (form.roleStatus === 'filled' && !form.holder.name.trim())}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {roleId ? 'Save role' : 'Publish role'}
        </Button>
      </div>
    </SlidePanel>
  );
}

function ChipGrid({
  selected,
  onToggle,
  variant,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
  variant?: 'required';
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ECOSYSTEM_REQUIREMENT_TAGS.map((tag) => {
        const active = selected.includes(tag.label) || selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.label)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition',
              active &&
                (variant === 'required'
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-800'
                  : 'border-brand/50 bg-brand/10 text-brand')
            )}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}
