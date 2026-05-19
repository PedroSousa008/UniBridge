'use client';

import { signOut, useSession } from 'next-auth/react';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { LanguageSwitcher } from './language-switcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getInitials } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/roles';
import type { UserRole } from '@prisma/client';
import { useEffect, useState } from 'react';

export function TopBar() {
  const { data: session } = useSession();
  const { tr, locale } = useI18n();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch('/api/notifications?unread=true')
      .then((res) => res.json())
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => setUnreadCount(0));
  }, [session?.user?.id]);

  const role = session?.user?.role;
  const roleLabel = role
    ? ROLE_LABELS[role as UserRole][locale === 'pt' ? 'pt' : 'en']
    : '';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/80 px-6 backdrop-blur-xl">
      <div className="md:hidden">
        <span className="text-sm font-semibold">{tr('common.appName')}</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Button variant="ghost" size="icon" className="relative" asChild>
          <a href="#" aria-label={tr('common.notifications')}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
            ) : null}
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted/50">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-xs font-semibold">
                {getInitials(session?.user?.name)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="font-medium leading-none">
                  {session?.user?.name || tr('common.profile')}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              {session?.user?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {tr('common.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
