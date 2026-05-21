import { UserCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: { box: 'h-12 w-12 rounded-xl', icon: 'h-6 w-6' },
  lg: { box: 'h-24 w-24 rounded-2xl', icon: 'h-12 w-12' },
} as const;

/** Same photo source as Presence / People (`CompanyTeamMember.photoUrl`). */
export function CompanyTeamMemberAvatar({
  name,
  photoUrl,
  size = 'sm',
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  const src = photoUrl?.trim() || null;

  return (
    <div
      className={cn(
        'bg-muted flex items-center justify-center shrink-0 overflow-hidden',
        s.box,
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : size === 'lg' ? (
        <UserCircle className={cn(s.icon, 'text-muted-foreground')} />
      ) : (
        <Users className={cn(s.icon, 'text-muted-foreground')} />
      )}
    </div>
  );
}
