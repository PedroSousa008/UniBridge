'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bookmark,
  Heart,
  Mail,
  Pencil,
  Rocket,
  Send,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { INTEREST_TYPES } from '@/lib/startups/constants';

export interface StartupProfileData {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  industry: string | null;
  stage: string | null;
  website: string | null;
  readinessScore: number;
  progressPercent: number;
  problem: string | null;
  solution: string | null;
  targetCustomer: string | null;
  visionOneLiner: string | null;
  canEdit: boolean;
  isMember: boolean;
  founder: { id: string; name: string | null; email: string };
  members: {
    id: string;
    role: string;
    isMainFounder: boolean;
    user: { id: string; name: string | null; image: string | null };
  }[];
  media: { id: string; type: string; title: string | null; url: string }[];
  milestones: { label: string; status: string }[];
  openings: {
    id: string;
    role: string;
    description: string | null;
    compensation: string | null;
  }[];
  tractionPublic: { label: string; value: string }[];
}

export function StartupProfileView({
  startup,
  currentUserId,
}: {
  startup: StartupProfileData;
  currentUserId: string;
}) {
  const [message, setMessage] = useState('');
  const [interestType, setInterestType] = useState('join');

  async function sendInterest() {
    await fetch(`/api/startups/${startup.id}/interest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: interestType, message }),
    });
    setMessage('');
  }

  return (
    <div>
      <div
        className="relative mb-6 h-40 rounded-2xl bg-gradient-to-br from-brand/40 to-muted overflow-hidden"
        style={
          startup.coverUrl
            ? { backgroundImage: `url(${startup.coverUrl})`, backgroundSize: 'cover' }
            : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={startup.name}
          subtitle={startup.tagline || undefined}
          badge={startup.stage || undefined}
        />
        {startup.canEdit ? (
          <Button asChild size="sm">
            <Link href={`/student/startup/${startup.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit profile
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {startup.industry ? <Badge variant="secondary">{startup.industry}</Badge> : null}
        <Badge variant="brand">Readiness {Math.round(startup.readinessScore)}%</Badge>
        <Badge variant="outline">Progress {startup.progressPercent}%</Badge>
      </div>

      {!startup.isMember && startup.founder.id !== currentUserId ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Interested in this venture?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <select
              className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
              value={interestType}
              onChange={(e) => setInterestType(e.target.value)}
            >
              {INTEREST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Your message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={sendInterest}>
                <Send className="h-4 w-4" /> Submit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetch(`/api/startups/${startup.id}/follow`, { method: 'POST' })}
              >
                <Heart className="h-4 w-4" /> Follow
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetch(`/api/startups/${startup.id}/bookmark`, { method: 'POST' })}
              >
                <Bookmark className="h-4 w-4" /> Save
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${startup.founder.email}`}>
                  <Mail className="h-4 w-4" /> Contact founder
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pitch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {startup.problem ? (
                <div>
                  <p className="font-medium text-muted-foreground">Problem</p>
                  <p>{startup.problem}</p>
                </div>
              ) : null}
              {startup.solution ? (
                <div>
                  <p className="font-medium text-muted-foreground">Solution</p>
                  <p>{startup.solution}</p>
                </div>
              ) : null}
              {startup.visionOneLiner ? (
                <p className="italic border-l-2 border-brand pl-3">{startup.visionOneLiner}</p>
              ) : null}
            </CardContent>
          </Card>

          {startup.media.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Visual pitch</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                {startup.media.map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border p-3 text-sm hover:bg-muted/50"
                  >
                    <p className="font-medium">{m.title || m.type}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.url}</p>
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {startup.openings.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Looking for</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {startup.openings.map((o) => (
                  <div key={o.id} className="rounded-xl border p-4">
                    <Badge className="mb-2">{o.role}</Badge>
                    <p className="text-sm text-muted-foreground">{o.description}</p>
                    {o.compensation ? (
                      <p className="mt-1 text-xs">{o.compensation}</p>
                    ) : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          {startup.logoUrl ? (
            <Image
              src={startup.logoUrl}
              alt=""
              width={80}
              height={80}
              className="rounded-2xl"
              unoptimized
            />
          ) : (
            <Rocket className="h-16 w-16 text-muted-foreground" />
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" /> Team
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {startup.members.map((m) => (
                <Link
                  key={m.id}
                  href={`/student/profile`}
                  className="flex items-center justify-between text-sm hover:underline"
                >
                  <span>{m.user.name}</span>
                  <Badge variant="secondary">{m.role}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Milestones</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={startup.progressPercent} className="mb-3 h-2" />
              <ul className="space-y-1 text-sm">
                {startup.milestones
                  .filter((m) => m.status === 'completed')
                  .slice(0, 5)
                  .map((m, i) => (
                    <li key={i}>✓ {m.label}</li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          {startup.tractionPublic.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Traction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {startup.tractionPublic.map((t, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{t.label}</span>
                    <span className="font-medium">{t.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
