'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CompanyOpportunitiesHub } from '@/lib/company/company-opportunities-hub';
import { OPPORTUNITY_STAGES } from '@/lib/career/opportunities-intelligence';

const COMPANY_STAGES = OPPORTUNITY_STAGES.filter((s) =>
  !['saved', 'preparing'].includes(s.id)
);

export function CompanyOpportunitiesCommandCenter({ initialHub }: { initialHub: CompanyOpportunitiesHub }) {
  const [hub, setHub] = useState(initialHub);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const appId = searchParams.get('application');
    if (appId) setSelectedId(appId);
  }, [searchParams]);

  const fetchHub = useCallback(async () => {
    const res = await fetch('/api/company/opportunities');
    if (res.ok) setHub(await res.json());
  }, []);

  const selected = hub.pipeline.find((p) => p.applicationId === selectedId) ?? hub.pipeline[0] ?? null;

  async function advanceStatus(status: string) {
    if (!selected) return;
    setLoading(true);
    const res = await fetch('/api/company/opportunities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId: selected.applicationId, status }),
    });
    if (res.ok) setHub(await res.json());
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Your roles</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {hub.internships.map((i) => (
            <div key={i.id} className="min-w-[200px] shrink-0 rounded-xl border bg-card p-4">
              <p className="font-medium">{i.title}</p>
              <p className="text-xs text-muted-foreground">{i.universityName ?? 'Ecosystem'}</p>
              <p className="mt-2 text-sm">
                {i.applicationsCount} application{i.applicationsCount !== 1 ? 's' : ''}
              </p>
              <Badge variant="outline" className="mt-2 text-[10px]">
                {i.status}
              </Badge>
            </div>
          ))}
          {hub.internships.length === 0 && (
            <p className="text-sm text-muted-foreground">Roles published via partnerships appear here — synced with student Opportunities.</p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-1 rounded-2xl border p-4 max-h-[520px] overflow-y-auto">
          <p className="mb-3 text-sm font-medium">Hiring pipeline</p>
          <ul className="space-y-2">
            {hub.pipeline.map((p) => (
              <li key={p.applicationId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(p.applicationId)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                    selectedId === p.applicationId ? 'border-slate-900 bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <p className="font-medium">{p.studentName}</p>
                  <p className="text-xs text-muted-foreground">{p.roleTitle}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {p.stageLabel}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-2 rounded-2xl border p-6">
          {selected ? (
            <>
              <h3 className="text-xl font-semibold">{selected.studentName}</h3>
              <p className="text-muted-foreground">{selected.roleTitle}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span>Profile strength {selected.profileStrength}%</span>
                {selected.appliedAt && (
                  <span>Applied {new Date(selected.appliedAt).toLocaleDateString()}</span>
                )}
              </div>
              <p className="mt-6 text-sm font-medium">Move candidate</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMPANY_STAGES.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={selected.stage === s.id ? 'default' : 'outline'}
                    disabled={loading}
                    onClick={() => void advanceStatus(s.id)}
                  >
                    {loading && selected.stage === s.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      s.label
                    )}
                  </Button>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Status updates sync with the student Opportunities workspace in real time.
              </p>
              <Button variant="ghost" className="mt-4 px-0" asChild>
                <Link href={`/company/talent?student=${selected.studentUserId}`}>View talent profile context</Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a candidate from the pipeline.</p>
          )}
        </section>
      </div>
    </div>
  );
}
