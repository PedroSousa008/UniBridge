import { ProfileAvatar } from '@/components/ui/profile-avatar';

/** Same photo source as Presence / People (`CompanyTeamMember.photoUrl`). */
export function CompanyTeamMemberAvatar({
  name,
  photoUrl,
  size = 'sm',
  className,
}: {
  name: string;
  photoUrl?: string | null;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  return (
    <ProfileAvatar
      name={name}
      imageUrl={photoUrl}
      size={size === 'lg' ? 'lg' : 'md'}
      className={className}
    />
  );
}
