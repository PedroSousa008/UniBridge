'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Filter,
  Mail,
  Pencil,
  Phone,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  COMPLETION_STATUS_OPTIONS,
  completionStatusLabel,
  completionStatusTone,
  type CompletionStatus,
} from '@/lib/academics/completion-status';
import {
  ACADEMIC_STATUS_OPTIONS,
  courseThemeStyles,
  type CourseVisualTheme,
} from '@/lib/academics/course-visual-theme';
import { SUBJECT_SEMESTER_OPTIONS } from '@/lib/academics/subject-semester';
import type {
  StudentAcademicProfileSubjectRow,
  UniversityStudentAcademicProfile,
} from '@/lib/university/student-academic-profile-hub';

type SortKey = 'name' | 'grade' | 'credits' | 'status';
type StatusFilter = CompletionStatus | 'all';

const selectClassName =
  'flex h-10 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm';

function CreditsRing({
  completed,
  required,
  accent,
}: {
  completed: number;
  required: number;
  accent: string;
}) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const pct = required > 0 ? Math.min(100, (completed / required) * 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={accent}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-lg font-semibold text-white">{completed}</span>
        <span className="text-[10px] uppercase tracking-wider text-white/70">ECTS</span>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] uppercase tracking-wider text-white/60">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function themePattern(theme: CourseVisualTheme) {
  switch (theme) {
    case 'business':
      return 'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.12) 0%, transparent 45%), radial-gradient(circle at 10% 80%, rgba(13,148,136,0.25) 0%, transparent 50%)';
    case 'law':
      return 'radial-gradient(circle at 75% 15%, rgba(255,255,255,0.1) 0%, transparent 40%), radial-gradient(circle at 20% 90%, rgba(99,102,241,0.2) 0%, transparent 55%)';
    case 'engineering':
      return 'radial-gradient(circle at 90% 30%, rgba(14,165,233,0.2) 0%, transparent 45%), linear-gradient(135deg, transparent 60%, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.06) 62%, transparent 62%)';
    default:
      return 'radial-gradient(circle at 80% 25%, rgba(255,255,255,0.08) 0%, transparent 50%)';
  }
}

function SubjectTableRow({
  row,
  onEdit,
}: {
  row: StudentAcademicProfileSubjectRow;
  onEdit: () => void;
}) {
  return (
    <tr className="group border-b border-border/50 transition-colors hover:bg-muted/40 last:border-0">
      <td className="px-4 py-3.5">
        <div className="font-medium">{row.name}</div>
        {!row.isEnrolled ? (
          <span className="text-[10px] text-muted-foreground">Not enrolled</span>
        ) : null}
      </td>
      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{row.code ?? '—'}</td>
      <td className="px-4 py-3.5">{row.year ?? '—'}</td>
      <td className="px-4 py-3.5">{row.semesterLabel}</td>
      <td className="px-4 py-3.5">{row.credits ?? '—'}</td>
      <td className="px-4 py-3.5 text-muted-foreground">
        {row.professors.length > 0 ? row.professors.join(', ') : '—'}
      </td>
      <td className="px-4 py-3.5 font-mono font-medium">
        {row.grade != null ? row.grade.toFixed(1) : '—'}
      </td>
      <td className="px-4 py-3.5">
        <span
          className={cn(
            'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
            completionStatusTone(row.completionStatus)
          )}
        >
          {completionStatusLabel(row.completionStatus)}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="opacity-60 group-hover:opacity-100"
          onClick={onEdit}
          aria-label="Edit subject"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}



export function UniversityStudentAcademicProfileDrawer({
  studentId,
  open,
  onClose,
  onProfileUpdated,
}: {
  studentId: string | null;
  open: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
}) {
  const [profile, setProfile] = useState<UniversityStudentAcademicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [editSubject, setEditSubject] = useState<StudentAcademicProfileSubjectRow | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  const loadProfile = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/university/students/${id}/academic-profile`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load profile');
      }
      const data = await res.json();
      setProfile(data.profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !studentId) {
      setProfile(null);
      setSearch('');
      setStatusFilter('all');
      setSemesterFilter('all');
      setYearFilter('all');
      setHeroVisible(false);
      return;
    }
    loadProfile(studentId);
    const t = requestAnimationFrame(() => setHeroVisible(true));
    return () => cancelAnimationFrame(t);
  }, [open, studentId, loadProfile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const filteredSubjects = useMemo(() => {
    if (!profile) return [];
    let rows = [...profile.subjects];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.code?.toLowerCase().includes(q) ?? false) ||
          r.professors.some((p) => p.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.completionStatus === statusFilter);
    }
    if (semesterFilter !== 'all') {
      rows = rows.filter((r) => r.semester === semesterFilter);
    }
    if (yearFilter !== 'all') {
      rows = rows.filter((r) => String(r.year ?? '') === yearFilter);
    }

    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'grade':
          cmp = (a.grade ?? -1) - (b.grade ?? -1);
          break;
        case 'credits':
          cmp = (a.credits ?? 0) - (b.credits ?? 0);
          break;
        case 'status':
          cmp = a.completionStatus.localeCompare(b.completionStatus);
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      return sortAsc ? cmp : -cmp;
    });

    return rows;
  }, [profile, search, statusFilter, semesterFilter, yearFilter, sortKey, sortAsc]);

  const yearOptions = useMemo(() => {
    if (!profile) return [];
    return [...new Set(profile.subjects.map((s) => s.year).filter((y) => y != null))].sort(
      (a, b) => (a as number) - (b as number)
    ) as number[];
  }, [profile]);

  async function saveSubjectRecord(form: FormData) {
    if (!studentId || !editSubject) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/university/students/${studentId}/subject-records`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: editSubject.subjectId,
          grade: form.get('grade'),
          completionStatus: form.get('completionStatus'),
          adminNotes: form.get('adminNotes'),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      const data = await res.json();
      setProfile(data.profile);
      setEditSubject(null);
      onProfileUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfileMeta(form: FormData) {
    if (!studentId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/university/students/${studentId}/academic-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentNumber: form.get('studentNumber'),
          academicStatus: form.get('academicStatus'),
          currentSemester: form.get('currentSemester'),
          scholarshipStatus: form.get('scholarshipStatus'),
          personalEmail: form.get('personalEmail'),
          emergencyContact: form.get('emergencyContact'),
          yearOfStudy: form.get('yearOfStudy'),
          program: form.get('program'),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }
      const data = await res.json();
      setProfile(data.profile);
      setEditProfileOpen(false);
      onProfileUpdated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const courseTheme = profile?.course?.visualTheme ?? 'general';
  const themeStyles = courseThemeStyles(courseTheme, profile?.course?.themeColor);
  const creditsPct =
    profile && profile.student.requiredCredits > 0
      ? Math.round((profile.student.completedCredits / profile.student.requiredCredits) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[3px] animate-in fade-in duration-300"
        aria-label="Close profile"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-5xl flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : error && !profile ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="outline" onClick={() => studentId && loadProfile(studentId)}>
              Retry
            </Button>
          </div>
        ) : profile ? (
          <>
            <div
              className={cn(
                'relative shrink-0 overflow-hidden transition-opacity duration-500',
                heroVisible ? 'opacity-100' : 'opacity-0'
              )}
              style={{
                background: profile.course?.bannerUrl
                  ? undefined
                  : `${themePattern(courseTheme)}, ${themeStyles.gradient}`,
                backgroundImage: profile.course?.bannerUrl
                  ? `url(${profile.course.bannerUrl})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/20" />
              <div className="relative z-10 flex flex-col gap-6 p-6 pb-8 md:p-8">
                <div className="flex flex-wrap items-start gap-5">
                  <ProfileAvatar
                    name={profile.student.name}
                    imageUrl={profile.student.image}
                    size="lg"
                    className="ring-4 ring-white/20 shadow-2xl"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                          {profile.student.name}
                        </h2>
                        <p className="mt-1 text-sm text-white/75">
                          {profile.student.studentNumber} · {profile.student.universityName}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                        onClick={() => setEditProfileOpen(true)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit profile
                      </Button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className="bg-white/15 text-white border-white/20 hover:bg-white/15">
                        {profile.student.academicStatusLabel}
                      </Badge>
                      {profile.student.scholarshipStatus ? (
                        <Badge className="bg-amber-500/20 text-amber-100 border-amber-400/30 hover:bg-amber-500/20">
                          <Award className="mr-1 h-3 w-3" />
                          {profile.student.scholarshipStatus}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <CreditsRing
                    completed={profile.student.completedCredits}
                    required={profile.student.requiredCredits}
                    accent={themeStyles.accent}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <HeroStat
                    label="Degree / Course"
                    value={profile.student.courseName ?? profile.student.program ?? '—'}
                  />
                  <HeroStat label="Academic Year" value={profile.student.yearLabel} />
                  <HeroStat label="Semester" value={profile.student.currentSemesterLabel} />
                  <HeroStat
                    label="Credits Progress"
                    value={`${profile.student.completedCredits} / ${profile.student.requiredCredits} ECTS (${creditsPct}%)`}
                  />
                  <HeroStat
                    label="GPA / Average"
                    value={
                      profile.student.gpa != null ? `${profile.student.gpa.toFixed(2)} / 20` : '—'
                    }
                  />
                  <HeroStat
                    label="Engagement"
                    value={`${Math.round(profile.student.engagementScore)}%`}
                  />
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.student.email}
                  </span>
                  {profile.student.personalEmail ? (
                    <span className="inline-flex items-center gap-1.5 text-white/70">
                      <User className="h-3.5 w-3.5" />
                      {profile.student.personalEmail}
                    </span>
                  ) : null}
                  {profile.student.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {profile.student.phone}
                    </span>
                  ) : null}
                  {profile.student.emergencyContact ? (
                    <span className="inline-flex items-center gap-1.5 text-white/70">
                      <Shield className="h-3.5 w-3.5" />
                      {profile.student.emergencyContact}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 space-y-4">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="h-5 w-5 text-brand" />
                  Academic progression
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Curriculum for {profile.course?.name ?? 'assigned subjects'} —{' '}
                  {profile.subjects.length} subjects
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search subjects, codes, professors…"
                    className="pl-9 rounded-xl"
                  />
                </div>
                <select
                  className={cn(selectClassName, 'w-auto min-w-[140px]')}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                >
                  <option value="all">All statuses</option>
                  {COMPLETION_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  className={cn(selectClassName, 'w-auto min-w-[120px]')}
                  value={semesterFilter}
                  onChange={(e) => setSemesterFilter(e.target.value)}
                >
                  <option value="all">All semesters</option>
                  {SUBJECT_SEMESTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  className={cn(selectClassName, 'w-auto min-w-[100px]')}
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="all">All years</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      Year {y}
                    </option>
                  ))}
                </select>
                <select
                  className={cn(selectClassName, 'w-auto min-w-[130px]')}
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                >
                  <option value="name">Sort: Name</option>
                  <option value="grade">Sort: Grade</option>
                  <option value="credits">Sort: Credits</option>
                  <option value="status">Sort: Status</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setSortAsc((v) => !v)}
                >
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  {sortAsc ? 'Asc' : 'Desc'}
                </Button>
              </div>

              {error ? <p className="text-sm text-red-500 px-1">{error}</p> : null}

              <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Year</th>
                      <th className="px-4 py-3 font-medium">Semester</th>
                      <th className="px-4 py-3 font-medium">ECTS</th>
                      <th className="px-4 py-3 font-medium">Professor</th>
                      <th className="px-4 py-3 font-medium">Grade</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                          No subjects match your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredSubjects.map((row) => (
                        <SubjectTableRow
                          key={row.subjectId}
                          row={row}
                          onEdit={() => setEditSubject(row)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <Dialog open={!!editSubject} onOpenChange={(v) => !v && setEditSubject(null)}>
        <DialogContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveSubjectRecord(new FormData(e.currentTarget));
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit subject record</DialogTitle>
              <DialogDescription>{editSubject?.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input
                name="grade"
                type="number"
                step="0.01"
                min={0}
                max={20}
                placeholder="Final grade (0–20)"
                defaultValue={editSubject?.grade ?? ''}
              />
              <select
                name="completionStatus"
                className={selectClassName}
                defaultValue={editSubject?.completionStatus ?? 'not_started'}
              >
                {COMPLETION_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <textarea
                name="adminNotes"
                rows={3}
                placeholder="Admin / teacher notes"
                defaultValue={editSubject?.adminNotes ?? ''}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm resize-none"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="max-w-lg">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await saveProfileMeta(new FormData(e.currentTarget));
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit academic profile</DialogTitle>
              <DialogDescription>Update student identity and academic standing.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <Input
                name="studentNumber"
                placeholder="Student number"
                defaultValue={profile?.student.studentNumber ?? ''}
              />
              <Input
                name="program"
                placeholder="Program"
                defaultValue={profile?.student.program ?? ''}
              />
              <Input
                name="yearOfStudy"
                type="number"
                min={1}
                max={8}
                placeholder="Year of study"
                defaultValue={profile?.student.yearOfStudy ?? ''}
              />
              <select
                name="currentSemester"
                className={selectClassName}
                defaultValue={profile?.student.currentSemester ?? ''}
              >
                <option value="">Semester</option>
                {SUBJECT_SEMESTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                name="academicStatus"
                className={selectClassName}
                defaultValue={profile?.student.academicStatus ?? 'active'}
              >
                {ACADEMIC_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Input
                name="scholarshipStatus"
                placeholder="Scholarship status (optional)"
                defaultValue={profile?.student.scholarshipStatus ?? ''}
              />
              <Input
                name="personalEmail"
                type="email"
                placeholder="Personal email (optional)"
                defaultValue={profile?.student.personalEmail ?? ''}
              />
              <Input
                name="emergencyContact"
                placeholder="Emergency contact (optional)"
                defaultValue={profile?.student.emergencyContact ?? ''}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

