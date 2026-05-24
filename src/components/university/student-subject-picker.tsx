'use client';

import { formatSubjectSemester } from '@/lib/academics/subject-semester';

export type PickableSubject = {
  id: string;
  name: string;
  courseName: string | null;
  year: number | null;
  semester: string | null;
  credits: number | null;
};

export function StudentSubjectPicker({
  subjects,
  selectedIds,
  onChange,
}: {
  subjects: PickableSubject[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = new Set(selectedIds);

  function toggle(id: string) {
    if (selected.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (subjects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground rounded-xl border border-dashed px-3 py-4">
        No subjects available yet. Add subjects under the Subjects tab first.
      </p>
    );
  }

  const sorted = [...subjects].sort((a, b) => {
    const course = (a.courseName ?? '').localeCompare(b.courseName ?? '');
    if (course !== 0) return course;
    const year = (a.year ?? 0) - (b.year ?? 0);
    if (year !== 0) return year;
    return (a.semester ?? '').localeCompare(b.semester ?? '');
  });

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Select the subjects this student is taking this semester. They can pick from any year or
        course.
      </p>
      <div className="max-h-52 overflow-y-auto rounded-xl border divide-y">
        {sorted.map((s) => {
          const meta = [
            s.courseName,
            s.year != null ? `Year ${s.year}` : null,
            formatSubjectSemester(s.semester),
            s.credits != null ? `${s.credits} ECTS` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{s.name}</span>
                <span className="block text-xs text-muted-foreground">{meta}</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{selectedIds.length} subject(s) selected</p>
    </div>
  );
}
