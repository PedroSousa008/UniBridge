'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  GraduationCap,
  Mail,
  MessageSquare,
  Megaphone,
  StickyNote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Profile = NonNullable<
  Awaited<ReturnType<typeof import('@/lib/teacher/teacher-student-profile-hub').loadTeacherStudentAcademicProfile>>
>;

export function TeacherStudentAcademicProfile({
  profile,
  subjectId,
}: {
  profile: Profile;
  subjectId: string;
}) {
  const [note, setNote] = useState(profile.privateNote ?? '');
  const [saving, setSaving] = useState(false);

  async function saveNote() {
    setSaving(true);
    await fetch(`/api/teacher/students/${subjectId}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: profile.student.id, note }),
    });
    setSaving(false);
  }

  const s = profile.student;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        href={`/teacher/students/${subjectId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to class
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        <ProfileAvatar name={s.name} image={s.image} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{s.name}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Mail className="h-4 w-4" />
            {s.email}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {[s.courseName, s.yearOfStudy ? `Year ${s.yearOfStudy}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.alerts.map((a) => (
              <span
                key={a.id}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium border',
                  a.tone === 'critical' && 'bg-rose-500/10 text-rose-800 border-rose-500/25',
                  a.tone === 'warning' && 'bg-amber-500/10 text-amber-900 border-amber-500/25',
                  a.tone === 'info' && 'bg-sky-500/10 text-sky-900 border-sky-500/25'
                )}
              >
                {a.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={profile.links.message}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Send message
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href={profile.links.attendance} icon={GraduationCap} label="Attendance" />
        <QuickLink href={profile.links.gradebook} icon={ClipboardList} label="Gradebook" />
        <QuickLink href={profile.links.announcements} icon={Megaphone} label="Announcements" />
        <QuickLink href={profile.links.calendar} icon={Calendar} label="Calendar" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance — {profile.subject.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {profile.attendance ? (
              <>
                <p>
                  <span className="text-muted-foreground">Rate:</span>{' '}
                  <strong>
                    {profile.attendance.attendancePercent != null
                      ? `${profile.attendance.attendancePercent}%`
                      : '—'}
                  </strong>{' '}
                  · {profile.attendance.status}
                </p>
                <p className="text-muted-foreground">
                  Present {profile.attendance.presentCount} / {profile.attendance.totalClasses}{' '}
                  sessions
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No attendance data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engagement & participation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Engagement:</span> {profile.engagementLabel}
            </p>
            <p>
              <span className="text-muted-foreground">Participation:</span>{' '}
              {profile.participationLabel}
            </p>
            <p>
              <span className="text-muted-foreground">Announcement reads:</span>{' '}
              {profile.announcementReads}
            </p>
            <p>
              <span className="text-muted-foreground">Submissions (30d):</span>{' '}
              {profile.activity.submissionsThisMonth}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Grades — current class
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm">
            Overall (published components only):{' '}
            <strong className="text-brand text-lg">
              {profile.currentClassGrades.overallGrade ?? '—'}
            </strong>
          </p>
          <ul className="space-y-2 text-sm">
            {profile.currentClassGrades.components.map((c) => (
              <li key={c.categoryId} className="flex justify-between border-b border-border/50 pb-1">
                <span>{c.name}</span>
                <span className="font-mono font-medium">{c.display}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic progression — all classes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.allClasses.map((c) => (
            <div
              key={c.subjectId}
              className={cn(
                'rounded-xl border px-3 py-2 text-sm',
                c.isCurrentClass && 'border-brand/40 bg-brand/5'
              )}
            >
              <div className="flex justify-between gap-2">
                <span className="font-medium">{c.subjectName}</span>
                <span className="font-mono">
                  {c.overallGrade != null ? c.overallGrade : '—'}
                </span>
              </div>
              {c.components.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {c.components
                    .slice(0, 3)
                    .map((x) => `${x.name}: ${x.display}`)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignments & completion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {profile.assignments.map((a) => (
            <div key={a.id} className="flex justify-between gap-2 border-b border-border/40 pb-1">
              <span>{a.title}</span>
              <span className="text-muted-foreground shrink-0">
                {a.submitted
                  ? a.grade != null
                    ? `Graded: ${a.grade}`
                    : 'Submitted'
                  : 'Missing'}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {profile.officeHours.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Office hours</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {profile.officeHours.map((o) => (
              <p key={o.id}>
                Day {o.dayOfWeek}: {o.startTime}–{o.endTime}
                {o.location ? ` · ${o.location}` : ''}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Private teacher notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Only you can see this. Students never have access.
          </p>
          <textarea
            className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Needs support, leadership potential, excellent oral communication…"
          />
          <Button onClick={() => void saveNote()} disabled={saving}>
            {saving ? 'Saving…' : 'Save private note'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof BookOpen;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-3 text-sm font-medium hover:border-brand/40 hover:text-brand transition-colors"
    >
      <Icon className="h-4 w-4 text-brand" />
      {label}
    </Link>
  );
}

function ProfileAvatar({ name, image }: { name: string; image: string | null }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={72}
        height={72}
        className="h-[72px] w-[72px] rounded-full object-cover border-2 border-brand/20"
      />
    );
  }
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand/15 text-xl font-bold text-brand border-2 border-brand/20">
      {initials}
    </div>
  );
}
