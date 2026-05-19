import { notFound } from 'next/navigation';
import { ModulePage } from '@/components/layout/module-page';

const pages: Record<string, string> = {
  classes: 'Manage your classes, schedules, and materials.',
  students: 'View student performance and progression.',
  communication: 'Announcements and messaging with students.',
  profile: 'Your professional teacher profile.',
};

export default async function TeacherModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const subtitle = pages[slug];
  if (!subtitle) notFound();

  return (
    <ModulePage
      title={slug.charAt(0).toUpperCase() + slug.slice(1)}
      subtitle={subtitle}
      iconName="book-open"
    />
  );
}
