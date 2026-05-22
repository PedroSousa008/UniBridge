import { Suspense } from 'react';
import { AuthBrandHeader } from '@/components/brand/auth-brand-header';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg animate-fade-in">
        <AuthBrandHeader className="mb-8" />
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose your role and enter the ecosystem.
        </p>
        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
