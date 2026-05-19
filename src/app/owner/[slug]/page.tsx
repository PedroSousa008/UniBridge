import { notFound } from 'next/navigation';
import { Globe } from 'lucide-react';
import { ModulePage } from '@/components/layout/module-page';

const pages: Record<string, { title: string; subtitle: string }> = {
  universities: {
    title: 'Universities',
    subtitle: 'Rankings, engagement, onboarding, and employability metrics.',
  },
  talent: {
    title: 'Talent & Startups',
    subtitle: 'Emerging talent, founder discovery, and innovation analytics.',
  },
  business: {
    title: 'Business',
    subtitle: 'MRR, subscriptions, churn, and enterprise pipeline.',
  },
  control: {
    title: 'Control Center',
    subtitle: 'Feature flags, moderation, AI controls, and ecosystem settings.',
  },
};

export default async function OwnerModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();

  return (
    <ModulePage
      title={page.title}
      subtitle={page.subtitle}
      icon={Globe}
    />
  );
}
