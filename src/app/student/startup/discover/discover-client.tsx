'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { STARTUP_STAGES } from '@/lib/startups/constants';

interface DiscoverStartup {
  id: string;
  name: string;
  tagline: string | null;
  industry: string | null;
  stage: string | null;
  logoUrl: string | null;
  readinessScore: number;
  progressPercent: number;
  lookingFor: string[];
  founder: { name: string | null };
  members: { user: { name: string | null } }[];
  openings: { role: string }[];
}

export function DiscoverStartupsClient() {
  const [startups, setStartups] = useState<DiscoverStartup[]>([]);
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');
  const [sort, setSort] = useState('newest');
  const [hiring, setHiring] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      if (industry) params.set('industry', industry);
      if (stage) params.set('stage', stage);
      if (sort) params.set('sort', sort);
      if (hiring) params.set('hiring', 'true');
      const res = await fetch(`/api/startups?${params}`);
      const data = await res.json();
      setStartups(data.startups ?? []);
      setLoading(false);
    }
    load();
  }, [industry, stage, sort, hiring]);

  return (
    <div>
      <PageHeader
        title="Discover ventures"
        subtitle="Explore student startups across UniBridge."
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Input
          placeholder="Filter by industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="">All stages</option>
          {STARTUP_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="readiness">Most ready</option>
          <option value="progress">Most progress</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hiring} onChange={(e) => setHiring(e.target.checked)} />
          Hiring team
        </label>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading ventures…</p>
      ) : startups.length === 0 ? (
        <EmptyState
          iconName="search"
          title="No startups found"
          description="Try different filters or create the first venture."
          className="py-16"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {startups.map((s) => (
            <Link
              key={s.id}
              href={`/student/startup/${s.id}`}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all hover:shadow-elevated"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="font-semibold">{s.name}</h3>
                {s.stage ? <Badge variant="brand">{s.stage}</Badge> : null}
              </div>
              {s.tagline ? (
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{s.tagline}</p>
              ) : null}
              {s.industry ? (
                <Badge variant="secondary" className="mb-3">
                  {s.industry}
                </Badge>
              ) : null}
              <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                <span>Readiness</span>
                <span>{Math.round(s.readinessScore)}%</span>
              </div>
              <Progress value={s.readinessScore} className="mb-3 h-1.5" />
              {s.openings.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Looking for: {s.openings.map((o) => o.role).join(', ')}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                by {s.founder.name} · {s.members.length} member(s)
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
