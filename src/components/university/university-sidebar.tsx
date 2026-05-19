'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { universityNav } from '@/lib/navigation/roles';

interface UniversitySidebarProps {
  universityName: string;
}

export function UniversitySidebar({ universityName }: UniversitySidebarProps) {
  const pathname = usePathname();
  const { tr } = useI18n();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/50 md:flex md:flex-col">
      <div className="flex h-16 flex-col justify-center px-6">
        <Link href="/university/overview" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
            U
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight">
              {tr('common.appName')}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {universityName}
            </span>
          </div>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {universityNav.map(({ href, labelKey, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-foreground text-background shadow-soft'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tr(labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
