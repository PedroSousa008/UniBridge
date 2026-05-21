import type { UserRole, Locale } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      locale: Locale;
      /** Canonical company owner user id (shared workspace) for COMPANY role */
      companyWorkspaceId?: string;
      companyPermission?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: UserRole;
    locale: Locale;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    locale: Locale;
    picture?: string | null;
    companyWorkspaceId?: string;
    companyPermission?: string;
  }
}
