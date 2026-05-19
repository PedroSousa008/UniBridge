import { notFound } from 'next/navigation';
import { ModulePage } from '@/components/layout/module-page';

const modules: Record<string, { title: string; subtitle?: string }> = {
  subjects: { title: 'Subjects', subtitle: 'Your enrolled subjects will appear here.' },
  gradebook: { title: 'Gradebook', subtitle: 'Track grades across all subjects.' },
  assignments: { title: 'Assignments', subtitle: 'Manage and submit your assignments.' },
  exams: { title: 'Exams', subtitle: 'Upcoming and past exams.' },
  calendar: { title: 'Calendar', subtitle: 'Academic calendar and key dates.' },
  schedule: { title: 'Weekly Schedule', subtitle: 'Your weekly class schedule.' },
  documents: { title: 'Documents', subtitle: 'Course documents and materials.' },
  attendance: { title: 'Attendance', subtitle: 'Track your attendance records.' },
  announcements: { title: 'Announcements', subtitle: 'Updates from your teachers.' },
  messages: { title: 'Subject Messages', subtitle: 'Communicate with teachers and peers.' },
  resources: { title: 'Resources', subtitle: 'Learning resources and references.' },
};

export default async function AcademicsModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mod = modules[slug];
  if (!mod) notFound();

  return (
    <ModulePage
      title={mod.title}
      subtitle={mod.subtitle}
      iconName="book-open"
    />
  );
}
