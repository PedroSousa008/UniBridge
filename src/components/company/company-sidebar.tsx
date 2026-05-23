'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLogo } from '@/components/brand/app-logo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { companyNav } from '@/lib/navigation/roles';

const PRESENCE_HREF = '/company/presence';

interface CompanySidebarProps {
  companyName: string;
}

export function CompanySidebar({ companyName }: CompanySidebarProps) {
  const pathname = usePathname();
  const { tr } = useI18n();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/50 md:flex md:flex-col">
      <div className="flex h-16 items-center px-6">
        <AppLogo href="/company/home" size="sm" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {companyNav.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const label = href === PRESENCE_HREF ? companyName : tr(labelKey);

          return (
            <Link
              key={href}
              href={href}
              title={href === PRESENCE_HREF ? companyName : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-foreground text-background shadow-soft'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
