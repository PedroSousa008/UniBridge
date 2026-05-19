'use client';

import Image from 'next/image';
import { Rocket, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { BuilderState } from './startup-builder-types';

export function StartupPreview({ state }: { state: BuilderState }) {
  const completedMilestones = state.milestones.filter((m) => m.status === 'completed').length;
  const progress =
    state.milestones.length > 0
      ? Math.round((completedMilestones / state.milestones.length) * 100)
      : 0;

  return (
    <div className="sticky top-6 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated">
      <div
        className="relative h-28 bg-gradient-to-br from-brand/30 via-muted to-background"
        style={
          state.identity.coverUrl
            ? { backgroundImage: `url(${state.identity.coverUrl})`, backgroundSize: 'cover' }
            : undefined
        }
      />
      <div className="relative px-5 pb-5">
        <div className="-mt-10 mb-3 flex items-end gap-3">
          {state.identity.logoUrl ? (
            <Image
              src={state.identity.logoUrl}
              alt=""
              width={72}
              height={72}
              className="h-[72px] w-[72px] rounded-2xl border-4 border-card object-cover bg-card"
              unoptimized
            />
          ) : (
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-4 border-card bg-muted">
              <Rocket className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 pb-1">
            <h3 className="truncate text-lg font-semibold">
              {state.identity.name || 'Your startup name'}
            </h3>
            <p className="truncate text-sm text-muted-foreground">
              {state.identity.tagline || 'Tagline appears here'}
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {state.identity.industry ? (
            <Badge variant="secondary">{state.identity.industry}</Badge>
          ) : null}
          {state.identity.stage ? <Badge variant="brand">{state.identity.stage}</Badge> : null}
        </div>

        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Readiness</span>
            <span className="font-medium">{state.readinessScore}%</span>
          </div>
          <Progress value={state.readinessScore} className="h-2" />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Milestone progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {state.members.length > 0 ? (
          <div className="mb-4">
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Users className="h-3 w-3" /> Founders
            </p>
            <div className="flex flex-wrap gap-2">
              {state.members.slice(0, 4).map((m, i) => (
                <Badge key={i} variant="outline">
                  {m.name || m.email || 'Founder'} · {m.role}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {state.openings.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Looking for</p>
            <div className="flex flex-wrap gap-1">
              {state.openings.slice(0, 4).map((o, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {o.role}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
