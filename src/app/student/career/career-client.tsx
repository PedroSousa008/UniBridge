'use client';

import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  FileUser,
  LineChart,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ModuleGrid } from '@/components/layout/module-grid';
import { useI18n } from '@/lib/i18n/context';

export function StudentCareerClient() {
  const { tr } = useI18n();

  const modules = [
    { href: '/student/career/paths', label: tr('student.career.paths'), description: 'Personalized roadmap with compatibility scores', icon: TrendingUp },
    { href: '/student/career/compatibility', label: tr('student.career.compatibility'), description: 'AI-powered career intelligence & live scores', icon: Target },
    { href: '/student/career/mentor', label: tr('student.career.mentor'), description: 'AI-powered strategic guidance toward your goals', icon: Sparkles },
    { href: '/student/career/salary', label: tr('student.career.salary'), description: 'Future salary, lifestyle & life simulation', icon: Wallet },
    { href: '/student/career/partnerships', label: tr('student.career.partnerships'), description: 'University-connected career marketplace', icon: Building2 },
    { href: '/student/career/internships', label: tr('student.career.internships'), description: 'Discover, prepare & track your internship journey', icon: Briefcase },
    { href: '/student/career/opportunities', label: tr('student.career.opportunities'), description: 'Career pipeline, applications & interview tracking', icon: Award },
    { href: '/student/career/cv', label: tr('student.career.cv'), description: 'Verified professional identity from your ecosystem', icon: FileUser },
    { href: '/student/career/employability', label: tr('student.career.employability'), description: 'Your employability evolution — graph-first progression', icon: LineChart },
    { href: '/student/career/simulation', label: tr('student.career.simulation'), description: tr('common.comingSoon'), icon: BarChart3 },
    { href: '/student/career/skills', label: tr('student.career.skills'), description: 'Verified skill tree powered by your ecosystem', icon: Target },
  ];

  return (
    <div>
      <PageHeader title={tr('student.career.title')} subtitle={tr('student.career.subtitle')} />
      <ModuleGrid items={modules} />
    </div>
  );
}
