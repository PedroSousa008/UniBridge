'use client';

import { SessionProvider } from 'next-auth/react';
import { I18nProvider } from '@/lib/i18n/context';
import type { Locale } from '@/lib/i18n/translations';

export function Providers({
  children,
  locale = 'en',
}: {
  children: React.ReactNode;
  locale?: Locale;
}) {
  return (
    <SessionProvider>
      <I18nProvider initialLocale={locale}>{children}</I18nProvider>
    </SessionProvider>
  );
}
