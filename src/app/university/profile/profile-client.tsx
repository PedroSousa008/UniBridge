'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { SectionTabs } from '@/components/university/section-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'branding', label: 'Branding' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'billing', label: 'Billing' },
  { id: 'security', label: 'Security' },
];

const INTEGRATIONS = [
  { id: 'lms', name: 'Learning Management System', connected: false },
  { id: 'sso', name: 'Single Sign-On (SAML)', connected: false },
  { id: 'calendar', name: 'Google Calendar', connected: false },
  { id: 'slack', name: 'Slack notifications', connected: false },
];

export interface UniversityProfileClientProps {
  university: {
    id: string;
    name: string;
    slug: string;
    contactEmail: string | null;
    website: string | null;
    location: string | null;
    description: string | null;
    plan: string;
    accentColor: string | null;
  };
  admin: {
    name: string | null;
    email: string;
    position: string | null;
    institution: string | null;
  };
}

export function UniversityProfileClient({ university, admin }: UniversityProfileClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/university/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          contactEmail: fd.get('contactEmail'),
          website: fd.get('website'),
          location: fd.get('location'),
          description: fd.get('description'),
          position: fd.get('position'),
          institution: fd.get('institution'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setMessage('Settings saved.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="University settings"
        subtitle="Profile, branding, permissions, integrations, billing, and security."
      />

      <SectionTabs tabs={TABS} active={tab} onChange={setTab} className="mb-8" />

      {tab === 'profile' ? (
        <Card>
          <CardHeader>
            <CardTitle>Institution profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="max-w-lg space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">University name</label>
                <Input name="name" defaultValue={university.name} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Institution label</label>
                <Input name="institution" defaultValue={admin.institution ?? ''} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Your position</label>
                <Input name="position" defaultValue={admin.position ?? ''} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Contact email</label>
                <Input name="contactEmail" type="email" defaultValue={university.contactEmail ?? admin.email} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Website</label>
                <Input name="website" defaultValue={university.website ?? ''} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Location</label>
                <Input name="location" defaultValue={university.location ?? ''} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Description</label>
                <textarea
                  name="description"
                  defaultValue={university.description ?? ''}
                  className="min-h-[100px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Admin: {admin.name ?? admin.email} · Slug: {university.slug}
              </p>
              {error ? <p className="text-sm text-red-500">{error}</p> : null}
              {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'branding' ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-muted-foreground">Accent color (HSL)</p>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl border border-border"
                style={{
                  background: `hsl(${university.accentColor ?? '230 85% 56%'})`,
                }}
              />
              <span className="text-sm font-mono">{university.accentColor ?? '230 85% 56%'}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Logo and cover uploads will be available in a future release.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'permissions' ? (
        <Card>
          <CardContent className="p-6">
            <p className="font-medium">Admin access</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {admin.email} has full university administrator permissions.
            </p>
            <Badge variant="secondary" className="mt-4">
              Role: University admin
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'integrations' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {INTEGRATIONS.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.connected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
                <Badge variant={item.connected ? 'brand' : 'outline'}>
                  {item.connected ? 'Active' : 'Placeholder'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'billing' ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Current plan</p>
            <p className="mt-1 text-2xl font-semibold capitalize">{university.plan}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Billing portal and invoice history are placeholders for enterprise onboarding.
            </p>
            <Button variant="outline" className="mt-4" disabled>
              Manage billing
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tab === 'security' ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="font-medium">Account security</p>
            <p className="text-sm text-muted-foreground">
              Password changes are managed through your account provider. Two-factor authentication
              will be available soon.
            </p>
            <Button variant="outline" disabled>
              Enable 2FA
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
