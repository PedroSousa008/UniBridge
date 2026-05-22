import { AppLogo } from '@/components/brand/app-logo';

/** Prominent logo block for login / register pages. */
export function AuthBrandHeader({
  onDark = false,
  className,
}: {
  onDark?: boolean;
  className?: string;
}) {
  return (
    <AppLogo
      href="/"
      size="auth"
      tone={onDark ? 'light' : 'default'}
      showName
      className={className}
    />
  );
}
