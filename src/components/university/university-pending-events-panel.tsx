'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  Radio,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { UniversityPendingEventItem } from '@/lib/university/university-pending-events';

export function UniversityPendingEventsPanel({
  initialEvents,
}: {
  initialEvents: UniversityPendingEventItem[];
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [modifyId, setModifyId] = useState<string | null>(null);
  const [modifyReason, setModifyReason] = useState('');

  const refresh = useCallback(async () => {
    const res = await fetch('/api/university/company-events');
    if (res.ok) {
      const data = await res.json();
      setEvents(data.events ?? []);
    }
    router.refresh();
  }, [router]);

  async function approve(eventId: string) {
    setLoadingId(eventId);
    const res = await fetch(`/api/university/company-events/${eventId}/approve`, {
      method: 'POST',
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      await refresh();
    }
    setLoadingId(null);
  }

  async function reject(eventId: string, reason?: string) {
    setLoadingId(eventId);
    const res = await fetch(`/api/university/company-events/${eventId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setModifyId(null);
      setModifyReason('');
      await refresh();
    }
    setLoadingId(null);
  }

  return (
    <Card
      id="event-approvals"
      className={cn(
        'mb-8 overflow-hidden border-amber-500/25',
        events.length > 0 && 'bg-gradient-to-br from-amber-500/5 via-card to-cyan-500/5'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-amber-600" />
            Partner event approvals
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40">
              <Radio className="h-3 w-3 animate-pulse text-emerald-600" />
              Live requests
            </Badge>
            {events.length > 0 ? (
              <Badge variant="secondary" className="tabular-nums">
                {events.length} pending
              </Badge>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Company partners submit ecosystem events here. Approve to sync student calendars, notifications, and RSVPs
          — before the dedicated university events workspace ships.
        </p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            No company events awaiting approval. When partners launch activities, they appear here instantly.
          </p>
        ) : (
          <ul className="space-y-4">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-2xl border bg-card/90 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex flex-wrap gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {ev.companyLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ev.companyLogoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{ev.title}</p>
                      <Badge
                        className="text-[10px] text-white border-0"
                        style={{ backgroundColor: ev.color }}
                      >
                        {ev.typeLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{ev.companyName}</p>
                    {ev.description ? (
                      <p className="text-sm mt-2 line-clamp-2 text-muted-foreground">{ev.description}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(ev.startsAt).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1 capitalize">
                        <MapPin className="h-3.5 w-3.5" />
                        {ev.isOnline ? 'Online' : ev.location ?? ev.eventFormat}
                      </span>
                      {ev.capacity != null ? <span>Cap {ev.capacity}</span> : null}
                      {ev.targetDegrees.length > 0 ? (
                        <span>Degrees: {ev.targetDegrees.slice(0, 2).join(', ')}</span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Submitted {new Date(ev.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {modifyId === ev.id ? (
                  <div className="mt-4 space-y-2 rounded-xl border bg-muted/30 p-3">
                    <Input
                      placeholder="What should the company change? (optional)"
                      value={modifyReason}
                      onChange={(e) => setModifyReason(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-600 border-rose-500/40"
                        disabled={loadingId === ev.id}
                        onClick={() => void reject(ev.id, modifyReason)}
                      >
                        Send back to company
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setModifyId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === ev.id}
                      onClick={() => {
                        setModifyId(ev.id);
                        setModifyReason('');
                      }}
                    >
                      Request changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:text-rose-700"
                      disabled={loadingId === ev.id}
                      onClick={() => void reject(ev.id)}
                    >
                      {loadingId === ev.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={loadingId === ev.id}
                      onClick={() => void approve(ev.id)}
                    >
                      {loadingId === ev.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Approve & publish
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
