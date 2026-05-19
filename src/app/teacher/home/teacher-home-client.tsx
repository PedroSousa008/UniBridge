'use client';

import { BookOpen, MessageSquare, Sparkles, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleGrid } from '@/components/layout/module-grid';
import { useI18n } from '@/lib/i18n/context';

export function TeacherHomeClient() {
  const { tr } = useI18n();

  const quickLinks = [
    { href: '/teacher/classes', label: tr('teacher.nav.classes'), description: 'Subjects you teach and courses you coordinate', icon: BookOpen },
    { href: '/teacher/students', label: tr('teacher.nav.students'), description: tr('common.comingSoon'), icon: Users },
    { href: '/teacher/communication', label: tr('teacher.nav.communication'), description: tr('common.comingSoon'), icon: MessageSquare },
  ];

  return (
    <div>
      <PageHeader
        title={tr('teacher.home.title')}
        subtitle={tr('teacher.home.subtitle')}
      />
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {['Classes today', 'Pending grading', 'At-risk students'].map((label) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">—</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            AI Teaching Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            iconName="sparkles"
            title={tr('common.emptyState')}
            description="Performance insights and intervention recommendations will appear as you manage classes."
            className="py-10"
          />
        </CardContent>
      </Card>
      <ModuleGrid items={quickLinks} />
    </div>
  );
}
