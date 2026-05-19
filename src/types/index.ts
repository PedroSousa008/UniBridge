import type { UserRole, Locale } from '@prisma/client';

export type { UserRole, Locale };

export interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
}

export interface DashboardStat {
  labelKey: string;
  value: string | number | null;
  hintKey?: string;
}
