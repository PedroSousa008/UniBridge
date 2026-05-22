'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

export const APP_LOGO_PATH = '/logo.png';

const SIZES = {
  sm: 32,
  md: 36,
  lg: 40,
} as const;

export function AppLogo({
  href,
  showName = true,
  size = 'md',
  className,
  imageClassName,
}: {
  href?: string;
  showName?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
  imageClassName?: string;
}) {
  const { tr } = useI18n();
  const dim = SIZES[size];

  const inner = (
    <>
      <Image
        src={APP_LOGO_PATH}
        alt={tr('common.appName')}
        width={dim}
        height={dim}
        className={cn('shrink-0 rounded-xl object-contain', imageClassName)}
        priority={size !== 'sm'}
      />
      {showName ? (
        <span className={cn('font-semibold tracking-tight', size === 'lg' ? 'text-lg' : 'text-base')}>
          {tr('common.appName')}
        </span>
      ) : null}
    </>
  );

  const wrapClass = cn('flex items-center gap-2.5', className);

  if (href) {
    return (
      <Link href={href} className={wrapClass}>
        {inner}
      </Link>
    );
  }

  return <div className={wrapClass}>{inner}</div>;
}
