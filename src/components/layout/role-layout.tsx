'use client';

import type { UserRole } from '@prisma/client';
import { RoleShell } from './role-shell';
import {
  studentNav,
  teacherNav,
  universityNav,
  companyNav,
  ownerNav,
} from '@/lib/navigation/roles';

const NAV_BY_ROLE = {
  STUDENT: studentNav,
  TEACHER: teacherNav,
  UNIVERSITY: universityNav,
  COMPANY: companyNav,
  OWNER: ownerNav,
} as const;

export function RoleLayout({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  return <RoleShell nav={NAV_BY_ROLE[role]}>{children}</RoleShell>;
}
