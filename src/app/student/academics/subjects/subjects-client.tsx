'use client';

import Link from 'next/link';
import { BookOpen, GraduationCap, Mail, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export interface StudentSubjectRow {
  id: string;
  name: string;
  code: string | null;
  semester: string | null;
  year: number | null;
  courseName: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  teacherTitle: string | null;
}

export interface CourseTeacherRow {
  name: string;
  email: string;
  role: string;
}

export interface StudentSubjectsClientProps {
  universityName: string | null;
  courseName: string | null;
  program: string | null;
  yearOfStudy: number | null;
  subjects: StudentSubjectRow[];
  courseTeachers: CourseTeacherRow[];
}

export function StudentSubjectsClient({
  universityName,
  courseName,
  program,
  yearOfStudy,
  subjects,
  courseTeachers,
}: StudentSubjectsClientProps) {
  const notLinked = !universityName;

  return (
    <div>
      <PageHeader
        title="Subjects"
        subtitle={
          notLinked
            ? 'Your university has not linked your account yet.'
            : courseName
              ? `${universityName} · ${courseName}${yearOfStudy ? ` · Year ${yearOfStudy}` : ''}`
              : `${universityName}${program ? ` · ${program}` : ''}`
        }
      />

      {notLinked ? (
        <EmptyState
          iconName="book-open"
          title="Not enrolled yet"
          description="Ask your university to invite you using your UniBridge email. Once assigned to a course, your subjects will appear here automatically."
          className="py-16"
        />
      ) : !courseName ? (
        <EmptyState
          iconName="book-open"
          title="No course assigned"
          description="Your university linked your account but has not assigned a course yet. Subjects appear when you are placed on a course."
          className="py-16"
        />
      ) : subjects.length === 0 ? (
        <EmptyState
          iconName="book-open"
          title="No subjects yet"
          description="Your course has no subjects yet, or none match your year. Your university adds subjects under Academics."
          className="py-16"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {subjects.map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold">{s.name}</CardTitle>
                    {s.code ? <Badge variant="secondary">{s.code}</Badge> : null}
                  </div>
                  {s.courseName ? (
                    <p className="text-sm text-muted-foreground">{s.courseName}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(s.semester || s.year) && (
                    <p className="text-muted-foreground">
                      {[s.year ? `Year ${s.year}` : null, s.semester].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {s.teacherName ? (
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        <span className="font-medium text-foreground">{s.teacherName}</span>
                        <span className="text-muted-foreground"> · Subject teacher</span>
                      </span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">No teacher assigned yet</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="h-4 w-4 text-brand" />
                  Course teachers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {courseTeachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teachers assigned to your course yet.</p>
                ) : (
                  courseTeachers.map((t) => (
                    <div key={t.email} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                      <a
                        href={`mailto:${t.email}`}
                        className="mt-1 inline-flex items-center gap-1 text-xs text-brand hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {t.email}
                      </a>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Button variant="outline" size="sm" asChild>
          <Link href="/student/academics">
            <BookOpen className="h-4 w-4" />
            Back to Academics
          </Link>
        </Button>
      </div>
    </div>
  );
}
