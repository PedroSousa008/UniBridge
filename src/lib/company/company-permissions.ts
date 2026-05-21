export type CompanyPermission = 'OWNER' | 'ADMIN' | 'RECRUITER' | 'VIEWER';

export const PERMISSION_LABELS: Record<CompanyPermission, string> = {
  OWNER: 'Main Owner',
  ADMIN: 'Admin',
  RECRUITER: 'Recruiter',
  VIEWER: 'Viewer',
};

export type CompanyAction =
  | 'manage_company_settings'
  | 'delete_company'
  | 'manage_permissions'
  | 'manage_team_accounts'
  | 'manage_partnerships'
  | 'manage_roles'
  | 'manage_opportunities'
  | 'manage_events'
  | 'manage_pipeline'
  | 'manage_startups'
  | 'view_insights'
  | 'manage_talent'
  | 'message_students'
  | 'view_all';

const ROLE_ACTIONS: Record<CompanyPermission, Set<CompanyAction>> = {
  OWNER: new Set([
    'manage_company_settings',
    'delete_company',
    'manage_permissions',
    'manage_team_accounts',
    'manage_partnerships',
    'manage_roles',
    'manage_opportunities',
    'manage_events',
    'manage_pipeline',
    'manage_startups',
    'view_insights',
    'manage_talent',
    'message_students',
    'view_all',
  ]),
  ADMIN: new Set([
    'manage_company_settings',
    'manage_partnerships',
    'manage_roles',
    'manage_opportunities',
    'manage_events',
    'manage_pipeline',
    'manage_startups',
    'view_insights',
    'manage_talent',
    'message_students',
    'view_all',
  ]),
  RECRUITER: new Set([
    'manage_talent',
    'manage_pipeline',
    'message_students',
    'view_insights',
    'view_all',
  ]),
  VIEWER: new Set(['view_all']),
};

export function canCompany(permission: CompanyPermission, action: CompanyAction): boolean {
  return ROLE_ACTIONS[permission]?.has(action) ?? false;
}

export function normalizePermission(value: string | null | undefined): CompanyPermission {
  const v = (value ?? 'VIEWER').toUpperCase();
  if (v === 'OWNER' || v === 'ADMIN' || v === 'RECRUITER' || v === 'VIEWER') return v;
  return 'VIEWER';
}
