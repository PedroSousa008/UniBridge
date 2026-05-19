import { notFound } from 'next/navigation';
import { ModulePage } from '@/components/layout/module-page';

const modules: Record<string, { title: string; subtitle?: string }> = {
  paths: { title: 'Career Paths', subtitle: 'Explore structured career progression paths.' },
  mentor: { title: 'AI Career Mentor', subtitle: 'Strategic guidance powered by intelligent analysis.' },
  salary: { title: 'Salary Simulator', subtitle: 'Simulate salary growth across roles and markets.' },
  partnerships: { title: 'Company Partnerships', subtitle: 'Partner companies in the ecosystem.' },
  internships: { title: 'Internships', subtitle: 'Discover and apply to internships.' },
  opportunities: { title: 'Opportunities', subtitle: 'Career opportunities matched to your profile.' },
  cv: { title: 'CV Builder', subtitle: 'Build a professional CV from your profile.' },
  employability: { title: 'Employability Graph', subtitle: 'Visualize your employability progression.' },
  simulation: { title: 'Career Simulation', subtitle: 'Simulate your future career trajectory.' },
  skills: { title: 'Skills Tracking', subtitle: 'Track and develop your professional skills.' },
};

export default async function CareerModulePage({
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
      iconName="briefcase"
    />
  );
}
