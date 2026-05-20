'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CompanyProfileHub } from '@/lib/company/company-profile-hub';

export function CompanyProfileCommandCenter({ initialHub }: { initialHub: CompanyProfileHub }) {
  const [hub, setHub] = useState(initialHub);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: hub.user.name ?? '',
    companyName: hub.profile.companyName ?? '',
    industry: hub.profile.industry ?? '',
    website: hub.profile.website ?? '',
    headquarters: hub.profile.headquarters ?? '',
  });

  async function save() {
    setSaving(true);
    const res = await fetch('/api/company/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) setHub(await res.json());
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <section className="rounded-2xl border p-6">
        <p className="mb-4 text-sm font-medium">Company identity</p>
        <p className="mb-4 text-xs text-muted-foreground">
          Shown to students in Partnerships, Internships, and Opportunities — keep aligned with your public company card.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Display name</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Company name</label>
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Industry</label>
            <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Website</label>
            <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Headquarters</label>
            <Input value={form.headquarters} onChange={(e) => setForm({ ...form, headquarters: e.target.value })} />
          </div>
        </div>
        <Button className="mt-6 w-full" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save company profile'}
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-4">
        {[
          { label: 'Partnerships', value: hub.stats.partnerships },
          { label: 'Roles', value: hub.stats.internships },
          { label: 'Applications', value: hub.stats.applications },
          { label: 'Career paths', value: hub.stats.careerPaths },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-4 text-center">
            <p className="text-2xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
