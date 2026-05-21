'use client';

import Link from 'next/link';
import { Radio } from 'lucide-react';
import type { CompanyHomeHero } from '@/lib/company/company-home-ecosystem-hub';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function CompanyHomeHero({ hero }: { hero: CompanyHomeHero }) {
  const hasBanner = Boolean(hero.bannerUrl?.trim());

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-3xl min-h-[240px] text-white',
        !hasBanner && 'bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950'
      )}
    >
      {hasBanner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero.bannerUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div
        className={cn(
          'absolute inset-0',
          hasBanner
            ? 'bg-gradient-to-t from-black/90 via-black/55 to-black/25'
            : 'bg-gradient-to-t from-black/70 via-black/30 to-transparent'
        )}
      />

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs backdrop-blur-sm">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <Radio className="h-3.5 w-3.5 text-emerald-300" />
        Live ecosystem
      </div>

      <div className="relative z-10 flex min-h-[240px] flex-col justify-end px-6 pb-8 pt-12">
        <p className="text-xs uppercase tracking-[0.25em] text-white/50">Ecosystem pulse</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight drop-shadow-sm">{hero.companyName}</h1>
        {hero.headline ? (
          <p className="mt-2 text-sm text-white/80 max-w-2xl drop-shadow-sm">{hero.headline}</p>
        ) : null}
        <p className="mt-1 text-xs text-white/55">
          {[hero.industry, hero.headquarters].filter(Boolean).join(' · ') || 'UniBridge company workspace'}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {hero.liveSignals.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[10px] text-white/75"
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {hero.shortcuts.map((s) => (
            <Button
              key={s.href}
              size="sm"
              variant="secondary"
              asChild
              className="bg-white/10 text-white border-white/10 hover:bg-white/20"
            >
              <Link href={s.href}>{s.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
