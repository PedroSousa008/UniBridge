import type { UserRole } from '@prisma/client';

export const ROLE_HOME: Record<UserRole, string> = {
  STUDENT: '/student/home',
  TEACHER: '/teacher/home',
  UNIVERSITY: '/university/overview',
  COMPANY: '/company/home',
  OWNER: '/owner/ecosystem',
};

export const ROLE_PREFIX: Record<UserRole, string> = {
  STUDENT: '/student',
  TEACHER: '/teacher',
  UNIVERSITY: '/university',
  COMPANY: '/company',
  OWNER: '/owner',
};

export const PUBLIC_ROLES: UserRole[] = [
  'STUDENT',
  'TEACHER',
  'UNIVERSITY',
  'COMPANY',
];

export const ROLE_LABELS: Record<UserRole, { en: string; pt: string }> = {
  STUDENT: { en: 'Student', pt: 'Estudante' },
  TEACHER: { en: 'Teacher', pt: 'Professor' },
  UNIVERSITY: { en: 'University', pt: 'Universidade' },
  COMPANY: { en: 'Company', pt: 'Empresa' },
  OWNER: { en: 'Platform Owner', pt: 'Proprietário da Plataforma' },
};

export function roleFromPath(pathname: string): UserRole | null {
  if (pathname.startsWith('/student')) return 'STUDENT';
  if (pathname.startsWith('/teacher')) return 'TEACHER';
  if (pathname.startsWith('/university')) return 'UNIVERSITY';
  if (pathname.startsWith('/company')) return 'COMPANY';
  if (pathname.startsWith('/owner')) return 'OWNER';
  return null;
}
