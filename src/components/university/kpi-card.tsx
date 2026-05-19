'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: LucideIcon;
  href?: string;
}

export function KpiCard({ label, value, change, icon: Icon, href }: KpiCardProps) {
  const positive = change === undefined || change >= 0;

  const inner = (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all duration-200',
        href && 'hover:-translate-y-0.5 hover:shadow-elevated cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {Icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="h-9 w-9" />
        )}
        {change !== undefined ? (
          <span
            className={cn(
              'flex items-center gap-0.5 text-xs font-medium',
              positive ? 'text-emerald-600' : 'text-red-500'
            )}
          >
            {positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(change)}%
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
