'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/context';
import { COMPANY_LOGIN_COPY, type CompanyAudience } from '@/lib/company/company-intelligence';
import { cn } from '@/lib/utils';

export function LoginForm({ initialAudience = 'student' }: { initialAudience?: CompanyAudience }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tr } = useI18n();
  const paramRole = searchParams.get('role');
  const [audience, setAudience] = useState<CompanyAudience>(
    paramRole === 'company' ? 'company' : initialAudience
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const copy = COMPANY_LOGIN_COPY[audience];
  const isCompany = audience === 'company';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    let res: { error?: string | null; ok?: boolean; status?: number; url?: string | null } | undefined;
    try {
      res = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
        callbackUrl: '/login/redirect',
      });
    } catch {
      setLoading(false);
      setError('Sign-in failed. Please try again in a moment.');
      return;
    }

    setLoading(false);

    if (!res) {
      setError('Sign-in failed. Please try again.');
      return;
    }

    if (res.error) {
      setError(
        res.status === 500
          ? 'Server error during sign-in. If this persists, contact support.'
          : 'Invalid email or password.'
      );
      return;
    }

    if (res.ok === false) {
      setError('Invalid email or password.');
      return;
    }

    const callbackUrl = searchParams.get('callbackUrl');
    if (callbackUrl) {
      router.push(callbackUrl);
    } else {
      router.push('/login/redirect');
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setAudience('student')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition',
            audience === 'student' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <GraduationCap className="h-4 w-4" />
          Student
        </button>
        <button
          type="button"
          onClick={() => setAudience('company')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition',
            audience === 'company' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Building2 className="h-4 w-4" />
          Company
        </button>
      </div>

      <div
        className={cn(
          'rounded-xl border px-4 py-3 text-sm transition-colors',
          isCompany
            ? 'border-slate-700/20 bg-slate-900/5 dark:border-slate-500/30 dark:bg-slate-900/40'
            : 'border-violet-500/20 bg-violet-500/5'
        )}
      >
        <p className="font-medium">{copy.title}</p>
        <p className="mt-1 text-muted-foreground">{copy.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {tr('common.email')}
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={isCompany ? 'talent@company.com' : 'you@university.edu'}
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
            {tr('common.password')}
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button
          type="submit"
          className={cn('w-full', isCompany && 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900')}
          disabled={loading}
        >
          {loading ? tr('common.loading') : copy.cta}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {tr('common.dontHaveAccount')}{' '}
          <Link
            href={isCompany ? '/register?role=company' : '/register'}
            className="font-medium text-foreground hover:underline"
          >
            {tr('common.signUp')}
          </Link>
        </p>
      </form>
    </div>
  );
}
