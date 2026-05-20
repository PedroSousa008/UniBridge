'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CompanyEventsHub } from '@/lib/company/company-events-hub';
import { Loader2 } from 'lucide-react';

export function CompanyEventsCommandCenter({
  initialHub,
  universities,
}: {
  initialHub: CompanyEventsHub;
  universities: { id: string; name: string }[];
}) {
  const [hub, setHub] = useState(initialHub);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    universityId: universities[0]?.id ?? '',
    title: '',
    description: '',
    location: '',
    isOnline: false,
    targetDegrees: '',
    targetYears: '2,3',
    startsAt: '',
    endsAt: '',
    capacity: '50',
  });

  async function createEvent() {
    setLoading(true);
    const res = await fetch('/api/company/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        universityId: form.universityId,
        title: form.title,
        description: form.description,
        location: form.location,
        isOnline: form.isOnline,
        targetDegrees: form.targetDegrees.split(',').map((s) => s.trim()).filter(Boolean),
        targetYears: form.targetYears.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n)),
        capacity: parseInt(form.capacity, 10),
        startsAt: form.startsAt,
        endsAt: form.endsAt,
      }),
    });
    if (res.ok) {
      setHub(await res.json());
      setShowCreate(false);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'RSVPs', value: hub.analytics.totalRsvps },
          { label: 'Approved', value: hub.analytics.approvedEvents },
          { label: 'Pending approval', value: hub.analytics.pendingApproval },
          { label: 'Avg attendance', value: `${hub.analytics.avgAttendance}%` },
        ].map((m) => (
          <div key={m.label} className="rounded-2xl border p-4">
            <p className="text-2xl font-semibold">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </section>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Events require university approval — then calendars and notifications sync automatically to matching students.
        </p>
        <Button onClick={() => setShowCreate(!showCreate)}>Create event</Button>
      </div>

      {showCreate && (
        <section className="rounded-2xl border p-6 space-y-3">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={form.universityId}
            onChange={(e) => setForm({ ...form, universityId: e.target.value })}
          >
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <Input placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea
            className="w-full min-h-[80px] rounded-lg border px-3 py-2 text-sm"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
            <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
          </div>
          <Input placeholder="Target degrees (comma-separated)" value={form.targetDegrees} onChange={(e) => setForm({ ...form, targetDegrees: e.target.value })} />
          <Input placeholder="Target years e.g. 2,3" value={form.targetYears} onChange={(e) => setForm({ ...form, targetYears: e.target.value })} />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Button onClick={() => void createEvent()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit for university approval'}
          </Button>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {hub.events.map((e) => (
          <div key={e.id} className="rounded-2xl border overflow-hidden">
            {e.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.coverUrl} alt="" className="h-32 w-full object-cover" />
            )}
            <div className="p-4">
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{e.title}</p>
                <Badge variant={e.status === 'approved' ? 'default' : 'outline'}>{e.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{e.universityName}</p>
              <p className="text-xs mt-2">
                {new Date(e.startsAt).toLocaleString()} · {e.rsvpCount} RSVPs
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
