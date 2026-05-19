'use client';

import { Award, Briefcase, FileUser, FolderKanban, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/lib/i18n/context';
import type { IconName } from '@/lib/icons';

interface ProfileData {
  name?: string | null;
  headline?: string | null;
  bio?: string | null;
  profileStrength: number;
  universityName?: string | null;
  program?: string | null;
}

export function StudentProfileClient({ profile }: { profile: ProfileData }) {
  const { tr } = useI18n();

  const sections: { iconName: IconName; label: string; headerIcon: typeof Award }[] = [
    { iconName: 'award', label: tr('student.profile.achievements'), headerIcon: Award },
    { iconName: 'sparkles', label: tr('student.profile.certifications'), headerIcon: Sparkles },
    { iconName: 'folder-kanban', label: tr('student.profile.projects'), headerIcon: FolderKanban },
    { iconName: 'briefcase', label: tr('student.profile.internships'), headerIcon: Briefcase },
    { iconName: 'file-user', label: tr('student.profile.skills'), headerIcon: FileUser },
  ];

  return (
    <div>
      <PageHeader
        title={tr('student.profile.title')}
        subtitle={tr('student.profile.subtitle')}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{profile.name || tr('common.profile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile.headline ? (
              <p className="text-muted-foreground">{profile.headline}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{tr('common.comingSoon')}</p>
            )}
            {profile.universityName || profile.program ? (
              <p className="text-sm">
                {[profile.program, profile.universityName].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tr('student.home.profileStrength')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{profile.profileStrength}%</p>
            <Progress value={profile.profileStrength} className="mt-4" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ iconName, label, headerIcon: HeaderIcon }) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <HeaderIcon className="h-4 w-4" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                iconName={iconName}
                title={tr('common.emptyState')}
                description={tr('common.comingSoon')}
                className="py-8"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
