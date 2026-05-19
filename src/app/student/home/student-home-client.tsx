'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/context';

interface CareerTarget {
  id: string;
  roleTitle: string;
  companyName: string | null;
  compatibility: number;
}

interface Startup {
  id: string;
  name: string;
  tagline: string | null;
  stage: string | null;
}

interface AssignmentSubmission {
  id: string;
  assignment: { title: string; dueDate: string | Date };
}

interface Notification {
  id: string;
  title: string;
  message: string;
}

interface StudentHomeClientProps {
  userName?: string | null;
  profileStrength: number;
  careerTargets: CareerTarget[];
  startups: Startup[];
  pendingAssignments: AssignmentSubmission[];
  notifications: Notification[];
}

export function StudentHomeClient({
  userName,
  profileStrength,
  careerTargets,
  startups,
  pendingAssignments,
  notifications,
}: StudentHomeClientProps) {
  const { tr } = useI18n();

  const hasData =
    profileStrength > 0 ||
    careerTargets.length > 0 ||
    startups.length > 0 ||
    pendingAssignments.length > 0;

  return (
    <div>
      <PageHeader
        badge={tr('common.futureDashboard')}
        title={tr('student.home.title')}
        subtitle={tr('student.home.subtitle')}
      />

      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title={tr('student.home.emptyTitle')}
          description={tr('student.home.emptyDesc')}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/student/profile">{tr('common.getStarted')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/student/career">{tr('student.nav.career')}</Link>
              </Button>
            </div>
          }
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand" />
              {tr('student.home.compatibility')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {careerTargets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr('common.comingSoon')}</p>
            ) : (
              <div className="space-y-4">
                {careerTargets.map((target) => (
                  <div key={target.id} className="rounded-xl bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{target.roleTitle}</p>
                        {target.companyName ? (
                          <p className="text-sm text-muted-foreground">
                            {target.companyName}
                          </p>
                        ) : null}
                      </div>
                      <Badge variant="brand">{Math.round(target.compatibility)}%</Badge>
                    </div>
                    <Progress value={target.compatibility} className="mt-3" />
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" className="mt-4 px-0" asChild>
              <Link href="/student/career/compatibility">
                {tr('common.learnMore')}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tr('student.home.profileStrength')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-tight">
                {profileStrength}%
              </span>
            </div>
            <Progress value={profileStrength} className="mt-4" />
            <p className="mt-3 text-sm text-muted-foreground">
              {tr('common.comingSoon')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              {tr('student.home.aiMentor')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {tr('common.comingSoon')}
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/student/career/mentor">{tr('common.getStarted')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {tr('student.home.deadlines')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr('common.emptyState')}</p>
            ) : (
              <ul className="space-y-3">
                {pendingAssignments.map((item) => (
                  <li key={item.id} className="text-sm">
                    <p className="font-medium">{item.assignment.title}</p>
                    <p className="text-muted-foreground">
                      {new Date(item.assignment.dueDate).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              {tr('student.home.opportunities')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tr('common.emptyState')}</p>
            <Button variant="ghost" className="mt-3 px-0" asChild>
              <Link href="/student/career/opportunities">{tr('common.learnMore')}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4" />
              Startup updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {startups.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr('common.emptyState')}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {startups.map((startup) => (
                  <div key={startup.id} className="rounded-xl border border-border/60 p-4">
                    <p className="font-medium">{startup.name}</p>
                    {startup.tagline ? (
                      <p className="mt-1 text-sm text-muted-foreground">{startup.tagline}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/student/startup">{tr('student.nav.startup')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
