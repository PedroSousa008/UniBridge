'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, ExternalLink, GraduationCap, Handshake, MapPin } from 'lucide-react';
import type { PublicUniversityProfile } from '@/lib/university/public-university-profile';
import type { UserRole } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ROLE_HOME } from '@/lib/roles';

export function PublicUniversityProfileView({
  profile,
  viewerRole,
}: {
  profile: PublicUniversityProfile;
  viewerRole: UserRole | null;
}) {
  const backHref =
    viewerRole === 'COMPANY'
      ? '/company/profile'
      : viewerRole
        ? ROLE_HOME[viewerRole]
        : '/login';

  const backLabel =
    viewerRole === 'COMPANY' ? 'Back to company profile' : 'Back to dashboard';

  return (
    <div className="min-h-screen bg-background pb-16">
      <section className="relative overflow-hidden border-b">
        {profile.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.coverUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="relative mx-auto max-w-5xl px-6 py-8">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {backLabel}
            </Link>
          </Button>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="h-20 w-20 rounded-2xl bg-card border shadow-md overflow-hidden flex items-center justify-center shrink-0">
              {profile.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wide">
                University
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
              {profile.location ? (
                <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {profile.location}
                </p>
              ) : null}
              {profile.website ? (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm text-brand hover:underline"
                >
                  Visit website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-violet-500" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{profile.studentCount}</p>
                <p className="text-xs text-muted-foreground">Students on UniBridge</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Handshake className="h-8 w-8 text-cyan-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{profile.activePartnerships}</p>
                <p className="text-xs text-muted-foreground">Active company partnerships</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Building2 className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{profile.courseCount}</p>
                <p className="text-xs text-muted-foreground">Academic programs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {profile.description ? (
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-3">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {profile.description}
            </p>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            This university is on UniBridge. More public profile content is coming soon.
          </section>
        )}
      </div>
    </div>
  );
}
