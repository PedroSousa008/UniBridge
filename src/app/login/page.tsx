import Link from 'next/link';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-12 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-900">
            U
          </div>
          <span className="text-lg font-semibold">UniBridge</span>
        </Link>
        <div className="max-w-md space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-white/60">For companies</p>
          <h2 className="text-3xl font-semibold tracking-tight">
            Hire from a verified academic ecosystem.
          </h2>
          <p className="text-white/70 leading-relaxed">
            Connect with students who share profile visibility with companies, live application pipelines,
            and compatibility intelligence — the same data students build on UniBridge.
          </p>
        </div>
        <p className="text-xs text-white/40">© UniBridge — progression, not paperwork.</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-sm font-bold text-background">
              U
            </div>
            <span className="text-lg font-semibold">UniBridge</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choose your path in the ecosystem.</p>
          <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
