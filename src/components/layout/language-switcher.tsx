'use client';

import { useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import type { Locale } from '@/lib/i18n/translations';

export function LanguageSwitcher() {
  const { locale, setLocale, tr } = useI18n();

  const toggle = () => {
    setLocale((locale === 'en' ? 'pt' : 'en') as Locale);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className="text-xs font-medium uppercase tracking-wide"
    >
      {locale === 'en' ? tr('common.portuguese') : tr('common.english')}
    </Button>
  );
}
