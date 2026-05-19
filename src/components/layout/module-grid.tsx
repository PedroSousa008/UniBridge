import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface ModuleLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface ModuleGridProps {
  items: ModuleLink[];
  className?: string;
}

export function ModuleGrid({ items, className }: ModuleGridProps) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 transition-colors group-hover:bg-brand-muted">
            <item.icon className="h-5 w-5 text-foreground/70 group-hover:text-brand" />
          </div>
          <h3 className="font-semibold tracking-tight">{item.label}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        </Link>
      ))}
    </div>
  );
}
