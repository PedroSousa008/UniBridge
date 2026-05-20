'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, MapPin, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CompanyTalentHub } from '@/lib/company/company-talent-hub';

export function CompanyTalentCommandCenter({ initialHub }: { initialHub: CompanyTalentHub }) {
  const [hub, setHub] = useState(initialHub);
  const [filterUni, setFilterUni] = useState<string | 'all'>('all');

  const fetchHub = useCallback(async () => {
    const res = await fetch('/api/company/talent');
    if (res.ok) setHub(await res.json());
  }, []);

  useEffect(() => {
    void fetchHub();
  }, [fetchHub]);

  const filtered =
    filterUni === 'all' ? hub.candidates : hub.candidates.filter((c) => c.universityName === filterUni);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-muted/20 p-6">
        <p className="text-sm text-muted-foreground">
          Talent respects student <strong>visibility</strong> (Companies / Public) and <strong>Open To</strong> statuses from
          their Professional Identity profile. Applicants to your roles always appear here.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold">{hub.stats.total}</p>
            <p className="text-xs text-muted-foreground">Discoverable candidates</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{hub.stats.highCompatibility}</p>
            <p className="text-xs text-muted-foreground">70%+ compatibility avg</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{hub.stats.openToInternships}</p>
            <p className="text-xs text-muted-foreground">Open to internships</p>
          </div>
        </div>
      </section>

      {!hub.hasPartnerships && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          Activate university partnerships to discover students beyond your application pipeline.
        </p>
      )}

      {hub.filters.universities.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterUni('all')}
            className={cn('rounded-full border px-3 py-1 text-xs', filterUni === 'all' && 'border-primary bg-primary/10')}
          >
            All universities
          </button>
          {hub.filters.universities.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setFilterUni(u)}
              className={cn('rounded-full border px-3 py-1 text-xs', filterUni === u && 'border-primary bg-primary/10')}
            >
              {u}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((c) => (
          <div key={c.userId} className="rounded-2xl border bg-card p-5">
            <div className="flex gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-light">
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  c.name.charAt(0)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{c.name}</p>
                  {c.source === 'applicant' && (
                    <Badge className="gap-1 text-[10px]">
                      <BadgeCheck className="h-3 w-3" />
                      Applicant
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{c.headline ?? c.primaryRole ?? 'Student'}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {c.program ?? 'Program'} · {c.universityName}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-semibold">{c.employabilityScore}%</p>
                <p className="text-muted-foreground">Employability</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-semibold">{c.compatibilityAvg ?? '—'}%</p>
                <p className="text-muted-foreground">Compatibility</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-2">
                <p className="font-semibold">{c.profileStrength}%</p>
                <p className="text-muted-foreground">Profile</p>
              </div>
            </div>
            {c.compatibilityAvg != null && <Progress value={c.compatibilityAvg} className="mt-3 h-1" />}
            <div className="mt-3 flex flex-wrap gap-1">
              {c.openTo.map((o) => (
                <Badge key={o} variant="outline" className="text-[10px]">
                  {o}
                </Badge>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link href={c.href}>
                <Target className="mr-2 h-3.5 w-3.5" />
                {c.source === 'applicant' ? 'View in pipeline' : 'View candidate'}
              </Link>
            </Button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">
          No candidates match filters. Students must enable company visibility and recruiting status on their profile.
        </p>
      )}
    </div>
  );
}
