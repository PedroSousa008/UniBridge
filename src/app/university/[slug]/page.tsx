import { notFound } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { ModulePage } from '@/components/layout/module-page';

const pages: Record<string, string> = {
  academics: 'Academic oversight and performance analytics.',
  career: 'Employability metrics and company partnerships.',
  innovation: 'Startup activity and innovation pipelines.',
  profile: 'University administration profile.',
};

export default async function UniversityModulePage({
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
      icon={Building2}
    />
  );
}
