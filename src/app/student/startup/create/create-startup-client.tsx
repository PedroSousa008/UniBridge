'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';

export function CreateStartupClient() {
  const { tr } = useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/startups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tagline, industry, stage }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Failed to create startup');
      return;
    }

    const data = await res.json();
    router.push(`/student/startup/${data.startup.id}`);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title={tr('student.startup.create')}
        subtitle="Launch your venture inside the UniBridge ecosystem."
      />
      <Card className="max-w-xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Startup name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              placeholder="Tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
            <Input
              placeholder="Industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
            <Input
              placeholder="Stage (e.g. Idea, MVP, Growth)"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={loading}>
              <Rocket className="h-4 w-4" />
              {loading ? tr('common.loading') : tr('student.startup.create')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
