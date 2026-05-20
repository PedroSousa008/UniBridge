'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlidePanel } from '@/components/ui/slide-panel';
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
    isFilled: false,
    hiringPriority: 'high',
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
          isFilled: r.isFilled,
          hiringPriority: r.hiringPriority,
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
        isFilled: false,
        hiringPriority: 'high',
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
    if (!open) return;
    const t = setTimeout(() => void runEstimate(), 400);
    return () => clearTimeout(t);
  }, [open, runEstimate]);

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
    setSaving(true);
    await fetch('/api/company/presence/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: roleId,
        departmentId,
        title: form.title || 'New role',
        roleType: form.roleType,
        location: form.location || null,
        remoteType: form.remoteType,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        startDate: form.startDate || null,
        isFilled: form.isFilled,
        hiringPriority: form.hiringPriority,
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
            <div className="flex items-end">
              <button
                type="button"
                className={cn(
                  'w-full rounded-xl border px-3 py-2.5 text-sm text-left transition',
                  !form.isFilled && 'border-emerald-500/50 bg-emerald-500/10'
                )}
                onClick={() => setForm({ ...form, isFilled: !form.isFilled })}
              >
                {form.isFilled ? 'Position has someone (filled)' : 'Open seat — easier for students to apply'}
              </button>
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

        <Button className="w-full" variant="brand" disabled={saving} onClick={() => void save()}>
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
