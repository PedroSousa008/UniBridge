import { UserCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  xs: { box: 'h-8 w-8 rounded-lg', text: 'text-[10px]', icon: 'h-4 w-4' },
  sm: { box: 'h-10 w-10 rounded-lg', text: 'text-xs', icon: 'h-5 w-5' },
  md: { box: 'h-12 w-12 rounded-xl', text: 'text-sm', icon: 'h-6 w-6' },
  lg: { box: 'h-24 w-24 rounded-2xl', text: 'text-xl', icon: 'h-12 w-12' },
} as const;

/** Profile photo from User.image, CompanyTeamMember.photoUrl, or any stored HTTPS URL. */
export function ProfileAvatar({
  name,
  imageUrl,
  size = 'sm',
  className,
}: {
  name: string;
  imageUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const src = imageUrl?.trim() || null;
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        'bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border/40',
        s.box,
        className
      )}
    >
      {src && !src.startsWith('data:') ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : initials ? (
        <span className={cn('font-semibold text-brand', s.text)}>{initials}</span>
      ) : size === 'lg' ? (
        <UserCircle className={cn(s.icon, 'text-muted-foreground')} />
      ) : (
        <Users className={cn(s.icon, 'text-muted-foreground')} />
      )}
    </div>
  );
}
