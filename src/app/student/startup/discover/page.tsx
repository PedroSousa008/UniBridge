import { Search } from 'lucide-react';
import { ModulePage } from '@/components/layout/module-page';

export default function DiscoverStartupsPage() {
  return (
    <ModulePage
      title="Discover ventures"
      subtitle="Explore startups created by students in the ecosystem."
      icon={Search}
      description="Public startup profiles will appear here as founders publish their ventures."
    />
  );
}
