import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

/** Credentials + JWT only — do not use PrismaAdapter (breaks credential sign-in on Vercel). */
function getAuthSecret(): string | undefined {
  return (
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === 'development'
      ? 'dev-only-insecure-secret-change-in-production'
      : undefined)
  );
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() },
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              role: true,
              locale: true,
              image: true,
            },
          });
          if (!user?.passwordHash) return null;
          const ok = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!ok) return null;
          if (
            user.image &&
            (user.image.startsWith('data:') || user.image.length > 2048)
          ) {
            await prisma.user
              .update({ where: { id: user.id }, data: { image: null } })
              .catch(() => undefined);
          }
          if (user.role === 'COMPANY') {
            const { logWorkspaceActivity, resolveCompanyWorkspace } = await import(
              '@/lib/company/company-workspace'
            );
            const ws = await resolveCompanyWorkspace(user.id);
            if (ws) {
              await logWorkspaceActivity(
                ws.workspaceOwnerId,
                'login',
                `Signed in as ${user.email}`,
                user.id
              );
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            locale: user.locale,
          };
        } catch (error) {
          console.error('[auth] authorize error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      try {
        if (user) {
          token.id = user.id;
          token.role = user.role;
          token.locale = user.locale;
          token.name = user.name ?? undefined;
          delete token.picture;
          if (user.role === 'COMPANY') {
            const { resolveCompanyWorkspace } = await import('@/lib/company/company-workspace');
            const ws = await resolveCompanyWorkspace(user.id);
            if (ws) {
              token.companyWorkspaceId = ws.workspaceOwnerId;
              token.companyPermission = ws.permission;
            }
          }
        }
        if (token.role === 'COMPANY' && token.id) {
          const { resolveCompanyWorkspace } = await import('@/lib/company/company-workspace');
          const ws = await resolveCompanyWorkspace(token.id as string);
          if (ws) {
            token.companyWorkspaceId = ws.workspaceOwnerId;
            token.companyPermission = ws.permission;
          }
        }
        if (trigger === 'update' && token.id) {
          const row = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true },
          });
          if (row?.name) token.name = row.name;
        }
      } catch (error) {
        console.error('[auth] jwt callback error:', error);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.locale = token.locale;
        session.user.companyWorkspaceId = token.companyWorkspaceId as string | undefined;
        session.user.companyPermission = token.companyPermission as string | undefined;
        try {
          const row = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, image: true },
          });
          session.user.name = row?.name ?? (token.name as string) ?? session.user.name;
          let img = row?.image ?? null;
          if (img && (img.startsWith('data:') || img.length > 2048)) {
            await prisma.user
              .update({ where: { id: token.id as string }, data: { image: null } })
              .catch(() => undefined);
            img = null;
          }
          session.user.image = img;
        } catch (error) {
          console.error('[auth] session callback error:', error);
          session.user.name = (token.name as string) ?? session.user.name;
          session.user.image = null;
        }
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
