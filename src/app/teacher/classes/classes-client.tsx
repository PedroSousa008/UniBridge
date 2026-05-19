'use client';

import Link from 'next/link';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export interface TeachingSubjectRow {
  id: string;
  name: string;
  code: string | null;
  courseName: string | null;
  semester: string | null;
  year: number | null;
  studentCount: number;
}

export interface CoordinatingCourseRow {
  id: string;
  name: string;
  department: string | null;
  studentCount: number;
  subjectCount: number;
}

export interface TeacherClassesClientProps {
  universityName: string | null;
  teachingSubjects: TeachingSubjectRow[];
  coordinatingCourses: CoordinatingCourseRow[];
}

export function TeacherClassesClient({
  universityName,
  teachingSubjects,
  coordinatingCourses,
}: TeacherClassesClientProps) {
  const notLinked = !universityName;
  const hasContent = teachingSubjects.length > 0 || coordinatingCourses.length > 0;

  return (
    <div>
      <PageHeader
        title="My classes"
        subtitle={
          notLinked
            ? 'Your university has not linked your account yet.'
            : `${universityName} — subjects you teach and courses you coordinate`
        }
      />

      {notLinked ? (
        <EmptyState
          iconName="book-open"
          title="Not linked to a university"
          description="Ask your university to invite you with your UniBridge email. When they assign you to subjects, they will appear here."
          className="py-16"
        />
      ) : !hasContent ? (
        <EmptyState
          iconName="book-open"
          title="No classes assigned"
          description="Your university can assign you as a subject teacher or course coordinator under Academics."
          className="py-16"
        />
      ) : (
        <div className="grid gap-8">
          {teachingSubjects.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Subjects I teach</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {teachingSubjects.map((s) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="text-base">{s.name}</CardTitle>
                        {s.code ? <Badge variant="secondary">{s.code}</Badge> : null}
                      </div>
                      {s.courseName ? (
                        <p className="text-sm text-muted-foreground">{s.courseName}</p>
                      ) : null}
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      {(s.year || s.semester) && (
                        <p>
                          {[s.year ? `Year ${s.year}` : null, s.semester].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="flex items-center gap-2 text-foreground">
                        <Users className="h-4 w-4" />
                        {s.studentCount} enrolled student{s.studentCount === 1 ? '' : 's'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {coordinatingCourses.length > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-semibold">Courses I coordinate</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {coordinatingCourses.map((c) => (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-brand" />
                        {c.name}
                      </CardTitle>
                      {c.department ? (
                        <p className="text-sm text-muted-foreground">{c.department}</p>
                      ) : null}
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p>
                        {c.studentCount} student{c.studentCount === 1 ? '' : 's'} · {c.subjectCount}{' '}
                        subject{c.subjectCount === 1 ? '' : 's'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <div className="mt-8">
        <Button variant="outline" size="sm" asChild>
          <Link href="/teacher/home">
            <BookOpen className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
