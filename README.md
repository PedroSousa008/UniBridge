# UniBridge

**The Operating System for Academic and Professional Growth.**

Phase 1 platform — desktop-first web app connecting universities, students, teachers, companies, and ecosystem intelligence.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **NextAuth** (credentials) + **Prisma** + **PostgreSQL**
- **Tailwind CSS** — Apple-style minimal design system
- **Vercel** — deployment
- **GitHub** — [PedroSousa008/UniBridge](https://github.com/PedroSousa008/UniBridge)

## Roles

| Role | Dashboard |
|------|-----------|
| Student | Future dashboard, Academics, Career, Startup Hub, Profile |
| Teacher | Classes, Students, Communication |
| University | Executive overview & analytics |
| Company | Recruitment intelligence |
| Owner | Owner OS (one account only) |

## Local setup

1. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — PostgreSQL (Neon, Supabase, etc.)
   - `NEXTAUTH_URL` — `http://localhost:3000`
   - `NEXTAUTH_SECRET` — random secret string

2. Install and run:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Vercel env vars

Add the same variables in the Vercel project settings before deploying.

## Owner account

Only **one** Platform Owner account can ever be created. After that, the Owner option disappears from registration.
