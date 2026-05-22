'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type SecurityActivityItem = {
  id: string;
  action: string;
  detail: string;
  actorName?: string | null;
  createdAt: string;
};

export function ProfileSecuritySection({
  userEmail,
  showChangePassword = true,
  accessHistory = [],
}: {
  userEmail: string;
  showChangePassword?: boolean;
  accessHistory?: SecurityActivityItem[];
}) {
  const [resetStatus, setResetStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [newPasswordForm, setNewPasswordForm] = useState({ next: '', confirm: '' });

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/profile/password-reset/status', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'pending') setResetStatus('pending');
      else if (data.status === 'approved') setResetStatus('approved');
      else setResetStatus('none');
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function changePassword() {
    if (passwordForm.next !== passwordForm.confirm) {
      setMsg('New passwords do not match.');
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setPasswordForm({ current: '', next: '', confirm: '' });
      setMsg('Password updated.');
    } else {
      setMsg(data.error ?? 'Could not update password.');
    }
    setLoading(false);
  }

  async function requestReset() {
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/profile/password-reset/request', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      setMsg(data.message ?? 'Request submitted.');
      await loadStatus();
    } else {
      setMsg(data.error ?? 'Could not submit request.');
    }
    setLoading(false);
  }

  async function completeReset() {
    if (newPasswordForm.next !== newPasswordForm.confirm) {
      setMsg('Passwords do not match.');
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/profile/password-reset/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newPassword: newPasswordForm.next,
        confirmPassword: newPasswordForm.confirm,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewPasswordForm({ next: '', confirm: '' });
      setMsg(data.message ?? 'Password set successfully.');
      setResetStatus('none');
    } else {
      setMsg(data.error ?? 'Could not set password.');
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5" />
          Security & access history
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{userEmail}</span>
        </p>

        {showChangePassword ? (
          <div className="rounded-xl border p-4 space-y-3 max-w-md">
            <p className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Change password
            </p>
            <Input
              type="password"
              placeholder="Current password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
            />
            <Input
              type="password"
              placeholder="New password"
              value={passwordForm.next}
              onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
            />
            <Button onClick={() => void changePassword()} disabled={loading}>
              Update password
            </Button>
          </div>
        ) : null}

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 max-w-lg">
          <p className="text-sm font-medium">Forgot your password?</p>
          <p className="text-xs text-muted-foreground">
            Request a reset from the platform owner. Once approved, you can set a new password here
            for your account email.
          </p>

          {resetStatus === 'pending' ? (
            <Badge variant="secondary">Pending owner approval</Badge>
          ) : resetStatus === 'approved' ? (
            <Badge className="bg-emerald-600">Approved — set your new password below</Badge>
          ) : null}

          {resetStatus === 'approved' ? (
            <div className="space-y-2 pt-2">
              <Input
                type="password"
                placeholder="New password (min. 8 characters)"
                value={newPasswordForm.next}
                onChange={(e) => setNewPasswordForm({ ...newPasswordForm, next: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={newPasswordForm.confirm}
                onChange={(e) =>
                  setNewPasswordForm({ ...newPasswordForm, confirm: e.target.value })
                }
              />
              <Button onClick={() => void completeReset()} disabled={loading}>
                Set new password
              </Button>
            </div>
          ) : resetStatus === 'none' ? (
            <Button variant="outline" onClick={() => void requestReset()} disabled={loading}>
              Request password reset
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Waiting for the owner to review your request in the Control Center.
            </p>
          )}
        </div>

        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            Access history
          </p>
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {accessHistory.length === 0 ? (
              <li className="text-sm text-muted-foreground">Activity will appear here.</li>
            ) : (
              accessHistory.map((a) => (
                <li key={a.id} className="text-sm border-b pb-2">
                  <span className="font-medium">{a.action}</span> — {a.detail}
                  {a.actorName ? ` · ${a.actorName}` : ''}
                  <span className="block text-[10px] text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Working…
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
