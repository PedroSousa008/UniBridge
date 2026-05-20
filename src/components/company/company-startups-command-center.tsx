'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CompanyStartupsHub } from '@/lib/company/company-startups-hub';
import { Bookmark, Rocket, TrendingUp } from 'lucide-react';

export function CompanyStartupsCommandCenter({ initialHub }: { initialHub: CompanyStartupsHub }) {
  const [hub, setHub] = useState(initialHub);

  async function toggle(startupId: string, action: 'follow' | 'bookmark') {
    const res = await fetch('/api/company/startups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startupId, action }),
    });
    if (res.ok) setHub(await res.json());
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-gradient-to-r from-violet-500/5 to-transparent p-6">
        <p className="flex items-center gap-2 font-medium">
          <Rocket className="h-5 w-5 text-violet-600" />
          Startup Hub — university innovation ecosystem
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Founder profiles connect to student identity, skills, and compatibility — updates propagate automatically.
        </p>
        <div className="mt-4 flex gap-6 text-sm">
          <span>{hub.analytics.total} startups</span>
          <span>{hub.analytics.followed} followed</span>
        </div>
      </section>

      {hub.analytics.trending.length > 0 && (
        <section className="flex flex-wrap gap-2 items-center">
          <TrendingUp className="h-4 w-4" />
          {hub.analytics.trending.map((t) => (
            <Badge key={t.name} variant="secondary">
              {t.name} · {t.followers} followers
            </Badge>
          ))}
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {hub.startups.map((s) => (
          <div key={s.id} className="rounded-2xl border bg-card p-5">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.industry ?? 'Innovation'} · {s.stage}</p>
              </div>
              <Badge variant="outline">{s.readinessScore}% ready</Badge>
            </div>
            {s.tagline && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{s.tagline}</p>}
            <p className="mt-2 text-xs">
              Founder: {s.founderName} · {s.universityName ?? 'Uni'} · Team {s.teamSize}
            </p>
            {s.founderCard && (
              <p className="mt-2 text-xs text-muted-foreground">
                Profile {s.founderCard.profileStrength}% · Compatibility {s.founderCard.compatibilityScore ?? '—'}%
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant={s.isFollowed ? 'default' : 'outline'} onClick={() => void toggle(s.id, 'follow')}>
                Follow
              </Button>
              <Button size="sm" variant="outline" onClick={() => void toggle(s.id, 'bookmark')}>
                <Bookmark className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href={s.href} target="_blank">
                  View startup
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
