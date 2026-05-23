'use client';

import { CompanySidebar } from '@/components/company/company-sidebar';
import { TopBar } from '@/components/layout/top-bar';

export function CompanyShell({
  companyName,
  children,
}: {
  companyName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <CompanySidebar companyName={companyName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
