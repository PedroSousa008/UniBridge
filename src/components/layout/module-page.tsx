'use client';

import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/ui/empty-state';

interface ModulePageProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  description?: string;
  action?: React.ReactNode;
}

export function ModulePage({
  title,
  subtitle,
  icon,
  description,
  action,
}: ModulePageProps) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState
        icon={icon}
        title={title}
        description={description || 'Your data will appear here as you build your profile.'}
        action={action}
      />
    </div>
  );
}
