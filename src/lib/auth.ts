import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

/** Credentials + JWT only — do not use PrismaAdapter (breaks credential sign-in on Vercel). */
function getAuthSecret(): string | undefined {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
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
        if (!getAuthSecret()) {
          console.error('[auth] Missing NEXTAUTH_SECRET (or AUTH_SECRET) — cannot sign in');
          return null;
        }
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() },
          });
          if (!user?.passwordHash) return null;
          const ok = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!ok) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? null,
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
          token.picture = user.image ?? null;
          token.name = user.name ?? undefined;
        }
        if (trigger === 'update' && token.id) {
          const row = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { image: true, name: true },
          });
          if (row) {
            token.picture = row.image;
            token.name = row.name ?? undefined;
          }
        }
      } catch (error) {
        console.error('[auth] jwt callback error:', error);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
        session.user.locale = token.locale;
        session.user.image = (token.picture as string | null) ?? null;
        session.user.name = (token.name as string) ?? session.user.name;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === 'development',
};
