'use client';

import Link from 'next/link';
import { ArrowRight, Building2, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CompanyHomeHub } from '@/lib/company/company-home-hub';

export function CompanyHomeCommandCenter({ initialHub }: { initialHub: CompanyHomeHub }) {
  const hub = initialHub;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-8 text-white">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-3 border-white/20 bg-white/10 text-white">Recruitment intelligence</Badge>
            <h2 className="text-3xl font-semibold tracking-tight">{hub.company.name}</h2>
            <p className="mt-2 text-white/70">
              {[hub.company.industry, hub.company.headquarters].filter(Boolean).join(' · ') ||
                'Connected to UniBridge student ecosystem'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hub.ecosystemLinks.map((l) => (
              <Button key={l.href} variant="secondary" size="sm" asChild className="bg-white/10 text-white hover:bg-white/20">
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: 'University partners', value: hub.stats.activePartnerships, icon: Building2 },
          { label: 'Open roles', value: hub.stats.openRoles, icon: Target },
          { label: 'Applications', value: hub.stats.totalApplications, icon: Users },
          { label: 'Interview stage', value: hub.stats.interviewStage, icon: Target },
          { label: 'Talent pool', value: hub.stats.talentPool, icon: Users },
          { label: 'Career paths', value: hub.stats.publishedCareerPaths, icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-4">
            <Icon className="mb-2 h-4 w-4 text-muted-foreground" />
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-medium">Recent applications</p>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/company/opportunities">View pipeline</Link>
            </Button>
          </div>
          <ul className="space-y-3">
            {hub.recentApplications.map((a) => (
              <li key={a.id}>
                <Link href={a.href} className="flex items-center justify-between rounded-lg border px-4 py-3 transition hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{a.studentName}</p>
                    <p className="text-sm text-muted-foreground">{a.roleTitle}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{a.stageLabel}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
            {hub.recentApplications.length === 0 && (
              <p className="text-sm text-muted-foreground">Applications from students appear here when they apply to your roles.</p>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border p-6">
          <p className="mb-4 font-medium">University partnerships</p>
          <ul className="space-y-2">
            {hub.partnerships.map((p) => (
              <li key={p.id} className="flex justify-between rounded-lg border px-4 py-3 text-sm">
                <span>{p.universityName}</span>
                {p.tier ? <Badge variant="secondary">{p.tier}</Badge> : null}
              </li>
            ))}
            {hub.partnerships.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Active partnerships unlock verified talent from partner universities — aligned with student Partnerships hub.
              </p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
