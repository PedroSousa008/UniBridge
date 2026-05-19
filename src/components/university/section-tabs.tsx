'use client';

import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
}

interface SectionTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SectionTabs({ tabs, active, onChange, className }: SectionTabsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2 border-b border-border/60 pb-4', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
            active === tab.id
              ? 'bg-foreground text-background shadow-soft'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
