'use client';

import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';
import type { RoleNavItem } from '@/lib/navigation/roles';

interface RoleShellProps {
  children: React.ReactNode;
  nav: RoleNavItem[];
}

export function RoleShell({ children, nav }: RoleShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={nav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
