'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { TeacherWorkspaceGradingHub } from '@/lib/teacher/teacher-workspace-grading-hub';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { GraduationCap, Loader2, Sparkles } from 'lucide-react';

type SubmissionRow = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRef: string;
  submittedAt: string | null;
  draftScore: number | null;
  score: number | null;
  gradePublished: boolean;
  teacherFeedback: string | null;
};

export function TeacherWorkspaceGradingPanel({
  subjects,
  initialSubjectId,
}: {
  subjects: { id: string; name: string }[];
  initialSubjectId?: string;
}) {
  const [subjectId, setSubjectId] = useState(initialSubjectId || subjects[0]?.id || '');
  const [hub, setHub] = useState<TeacherWorkspaceGradingHub | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [gradeMeta, setGradeMeta] = useState<{ title: string; maxScore: number } | null>(null);
  const [gradeRows, setGradeRows] = useState<SubmissionRow[]>([]);
  const [gradeDrafts, setGradeDrafts] = useState<
    Record<string, { score: string; feedback: string }>
  >({});

  const loadHub = useCallback(async () => {
    if (!subjectId) return;
    setLoading(true);
    const res = await fetch(`/api/teacher/workspace/subjects/${subjectId}/grading`);
    if (res.ok) setHub(await res.json());
    else setHub(null);
    setLoading(false);
  }, [subjectId]);

  useEffect(() => {
    void loadHub();
  }, [loadHub]);

  async function loadGrading(assignmentId: string) {
    setSelectedAssignmentId(assignmentId);
    setLoading(true);
    const res = await fetch(`/api/teacher/workspace/grading/${assignmentId}`);
    if (res.ok) {
      const data = (await res.json()) as {
        assignment: { title: string; maxScore: number };
        submissions: SubmissionRow[];
      };
      setGradeMeta({ title: data.assignment.title, maxScore: data.assignment.maxScore });
      setGradeRows(data.submissions);
      const drafts: Record<string, { score: string; feedback: string }> = {};
      for (const s of data.submissions) {
        drafts[s.id] = {
          score: String(s.draftScore ?? s.score ?? ''),
          feedback: s.teacherFeedback ?? '',
        };
      }
      setGradeDrafts(drafts);
    }
    setLoading(false);
  }

  async function saveGrade(submissionId: string, publish: boolean) {
    const draft = gradeDrafts[submissionId];
    setLoading(true);
    setMsg(null);
    const res = await fetch('/api/teacher/workspace/grading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissionId,
        draftScore: draft?.score ? parseFloat(draft.score) : null,
        teacherFeedback: draft?.feedback ?? '',
        publish,
      }),
    });
    if (res.ok) {
      setMsg(
        publish
          ? 'Grade published — synced to student profile. Final grade recalculated.'
          : 'Draft saved.'
      );
      if (selectedAssignmentId) await loadGrading(selectedAssignmentId);
      await loadHub();
    } else {
      const data = await res.json();
      setMsg(data.error ?? 'Grading failed.');
    }
    setLoading(false);
  }

  if (!subjects.length) {
    return (
      <p className="text-sm text-muted-foreground">No subjects assigned for grading.</p>
    );
  }

  return (
    <div className="space-y-6">
      {msg ? <p className="text-sm rounded-xl border bg-muted/40 px-4 py-2">{msg}</p> : null}

      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background min-w-[220px]"
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value);
            setSelectedAssignmentId('');
            setGradeRows([]);
          }}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {loading && !hub ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      </div>

      {hub && !hub.structureComplete ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-6">
            <p className="font-medium text-sm">Evaluation structure not complete</p>
            <p className="text-sm text-muted-foreground mt-1">
              Finish setting up weights and components in Classes → Gradebook before grading here.
            </p>
            <Button size="sm" className="mt-4" asChild>
              <Link href={`/teacher/classes/${subjectId}/gradebook`}>Open Gradebook</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {hub?.operational ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Grading components
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
              {hub.components.map((c) => (
                <button
                  key={c.assignmentId}
                  type="button"
                  onClick={() => void loadGrading(c.assignmentId)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-2 text-left text-sm transition hover:bg-muted/40',
                    selectedAssignmentId === c.assignmentId &&
                      'border-violet-500/40 bg-violet-500/5'
                  )}
                >
                  <p className="font-medium">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.weight}% of final</p>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {c.publishedCount}/{c.totalStudents} published
                    </Badge>
                    {c.complete ? (
                      <Badge className="text-[10px] bg-emerald-600">Done</Badge>
                    ) : null}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                {gradeMeta?.title ?? 'Select a component'}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Grades sync via student email/account — each student only sees their own result.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[520px] overflow-y-auto">
              {!selectedAssignmentId ? (
                <p className="text-sm text-muted-foreground">
                  Choose a component to open the grading table.
                </p>
              ) : (
                gradeRows.map((row) => (
                  <div key={row.id} className="rounded-xl border p-3 space-y-2">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{row.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{row.studentEmail}</p>
                        <p className="text-[10px] text-muted-foreground/80">
                          Ref: {row.studentRef}
                        </p>
                      </div>
                      {row.gradePublished ? (
                        <Badge className="text-[10px]">Published</Badge>
                      ) : row.draftScore != null || row.score != null ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Draft
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Not graded
                        </Badge>
                      )}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input
                        type="number"
                        placeholder={`Grade / ${gradeMeta?.maxScore ?? 20}`}
                        value={gradeDrafts[row.id]?.score ?? ''}
                        onChange={(e) =>
                          setGradeDrafts({
                            ...gradeDrafts,
                            [row.id]: { ...gradeDrafts[row.id], score: e.target.value },
                          })
                        }
                      />
                      <Input
                        placeholder="Comments"
                        value={gradeDrafts[row.id]?.feedback ?? ''}
                        onChange={(e) =>
                          setGradeDrafts({
                            ...gradeDrafts,
                            [row.id]: { ...gradeDrafts[row.id], feedback: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        onClick={() => void saveGrade(row.id, false)}
                      >
                        Save draft
                      </Button>
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() => void saveGrade(row.id, true)}
                      >
                        {row.gradePublished ? 'Update & publish' : 'Publish grade'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {hub?.showFinalGradeCard ? (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Final grade — auto-calculated
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              All components published. Final grades update live on student gradebook and
              dashboards. Edit any component to recalculate automatically.
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">Student</th>
                  <th className="py-2 pr-4">Account</th>
                  <th className="py-2 pr-4">Ref</th>
                  <th className="py-2 text-right">Final / {hub.scaleMax}</th>
                </tr>
              </thead>
              <tbody>
                {hub.finalGrades.map((r) => (
                  <tr key={r.studentId} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{r.studentName}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.studentEmail}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{r.studentRef}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {r.finalGrade != null ? r.finalGrade : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : hub?.operational ? (
        <p className="text-xs text-muted-foreground text-center">
          Final grade card appears when every component has published grades for all students.
        </p>
      ) : null}
    </div>
  );
}
