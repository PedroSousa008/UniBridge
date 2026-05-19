'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import type { UserRole } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n/context';
import { PUBLIC_ROLES, ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';

export function RegisterForm() {
  const router = useRouter();
  const { tr, locale } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [ownerAvailable, setOwnerAvailable] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/owner-available')
      .then((res) => res.json())
      .then((data) => setOwnerAvailable(data.available === true))
      .catch(() => setOwnerAvailable(false));
  }, []);

  const availableRoles: UserRole[] = ownerAvailable
    ? [...PUBLIC_ROLES, 'OWNER']
    : PUBLIC_ROLES;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        locale: locale === 'pt' ? 'PT' : 'EN',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || 'Registration failed');
      return;
    }

    const signInRes = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInRes?.error) {
      router.push('/login');
      return;
    }

    router.push('/login/redirect');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium">{tr('register.chooseRole')}</label>
        <div className="grid grid-cols-2 gap-2">
          {availableRoles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                'rounded-xl border px-3 py-3 text-left text-sm transition-all',
                role === r
                  ? 'border-foreground bg-foreground text-background shadow-soft'
                  : 'border-border bg-card hover:bg-muted/50'
              )}
            >
              <span className="font-medium">
                {ROLE_LABELS[r][locale === 'pt' ? 'pt' : 'en']}
              </span>
            </button>
          ))}
        </div>
        {!ownerAvailable ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {tr('register.ownerUnavailable')}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
          {tr('common.name')}
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium">
          {tr('common.email')}
        </label>
        <Input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium">
          {tr('common.password')}
        </label>
        <Input
          id="reg-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? tr('common.loading') : tr('common.createAccount')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {tr('common.alreadyHaveAccount')}{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          {tr('common.signIn')}
        </Link>
      </p>
    </form>
  );
}
