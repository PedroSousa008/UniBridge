import { notFound } from 'next/navigation';
import { ModulePage } from '@/components/layout/module-page';

const pages: Record<string, string> = {
  talent: 'Filter and discover talent with compatibility analysis.',
  opportunities: 'Create internships, challenges, and competitions.',
  insights: 'Employability analytics and recruitment intelligence.',
  profile: 'Your company profile in the ecosystem.',
};

export default async function CompanyModulePage({
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
      iconName="bar-chart"
    />
  );
}
