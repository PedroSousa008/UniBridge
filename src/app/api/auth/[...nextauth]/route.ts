import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

/** bcrypt + Prisma require Node.js (not Edge). */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nextAuthHandler = NextAuth(authOptions);

type RouteContext = { params: Promise<{ nextauth: string[] }> };

async function wrappedHandler(
  req: Request,
  context: RouteContext
): Promise<Response> {
  try {
    return await nextAuthHandler(req, context);
  } catch (error) {
    console.error('[nextauth] handler error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    const wantsJson =
      req.url.includes('json=true') ||
      req.headers.get('accept')?.includes('application/json');
    if (wantsJson) {
      return new Response(
        JSON.stringify({
          url: `${process.env.NEXTAUTH_URL ?? ''}/api/auth/error?error=Configuration`,
          error: message,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Authentication error', { status: 500 });
  }
}

export const GET = wrappedHandler;
export const POST = wrappedHandler;
