'use client';

import { UniversitySidebar } from './university-sidebar';
import { UniversityTopBar } from './university-top-bar';

export function UniversityShell({
  universityName,
  children,
}: {
  universityName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <UniversitySidebar universityName={universityName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <UniversityTopBar />
        <main className="flex-1 px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
