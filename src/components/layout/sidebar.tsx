'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLogo } from '@/components/brand/app-logo';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import type { RoleNavItem } from '@/lib/navigation/roles';

interface SidebarProps {
  items: RoleNavItem[];
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const { tr } = useI18n();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/50 md:flex md:flex-col">
      <div className="flex h-16 items-center px-6">
        <AppLogo href="/" size="sm" />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {items.map(({ href, labelKey, icon: Icon }) => {
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
