import { requireSession } from '@/lib/session';
import { getUniversityContext } from '@/lib/university/context';
import { UniversityShell } from '@/components/university/university-shell';

export default async function UniversityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession('UNIVERSITY');
  const ctx = await getUniversityContext(session.user.id);

  return (
    <UniversityShell universityName={ctx?.university.name ?? 'University'}>
      {children}
    </UniversityShell>
  );
}
