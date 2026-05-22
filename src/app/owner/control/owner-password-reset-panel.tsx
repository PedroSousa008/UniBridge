'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PasswordResetRequestDto } from '@/lib/auth/password-reset';

export function OwnerPasswordResetPanel() {
  const [requests, setRequests] = useState<PasswordResetRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/owner/password-reset', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function handleAction(requestId: string, action: 'approve' | 'reject') {
    setActingId(requestId);
    setMsg(null);
    const res = await fetch('/api/owner/password-reset', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });
    const data = await res.json();
    if (res.ok) {
      setRequests(data.requests ?? []);
      setMsg(action === 'approve' ? 'Approved — user can set a new password on their profile.' : 'Request declined.');
    } else {
      setMsg(data.error ?? 'Action failed');
    }
    setActingId(null);
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Password reset requests</CardTitle>
        <p className="text-sm text-muted-foreground">
          Users who forgot their password request approval here. When approved, they set a new
          password under their email on Profile → Security.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
            >
              <div>
                <p className="font-medium">{r.userName ?? r.email}</p>
                <p className="text-sm text-muted-foreground">{r.email}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="outline">{r.role}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={actingId === r.id}
                  onClick={() => void handleAction(r.id, 'approve')}
                >
                  {actingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-4 w-4" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actingId === r.id}
                  onClick={() => void handleAction(r.id, 'reject')}
                >
                  <X className="mr-1 h-4 w-4" />
                  Decline
                </Button>
              </div>
            </div>
          ))
        )}
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </CardContent>
    </Card>
  );
}
