'use client';

import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import type { IconName } from '@/lib/icons';

interface ModulePageProps {
  title: string;
  subtitle?: string;
  iconName: IconName;
  description?: string;
  action?: React.ReactNode;
}

export function ModulePage({
  title,
  subtitle,
  iconName,
  description,
  action,
}: ModulePageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        iconName={iconName}
        title={title}
        description={
          description ||
          'Your data will appear here as you build your profile.'
        }
        action={action}
      />
    </div>
  );
}
